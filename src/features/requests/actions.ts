"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(form: FormData) {
  const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) })
    .safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!input.success) redirect("/masuk?error=credentials");
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) redirect("/masuk?error=credentials");
  redirect("/permintaan");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/permintaan?error=logout");
  redirect("/masuk");
}

const requestFields = z.object({
  id: z.uuid(),
  version: z.string().regex(/^\d{1,9}$/).transform(Number).nullable(),
  purpose: z.string().trim().min(1).max(500),
  item: z.string().trim().min(1).max(160),
  quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)),
  needBy: z.iso.date(),
});

export async function saveRequest(form: FormData) {
  const input = requestFields.safeParse({
    id: form.get("id"), version: form.get("version") || null,
    purpose: form.get("purpose"), item: form.get("item"),
    quantity: form.get("quantity"), needBy: form.get("needBy"),
  });
  if (!input.success) redirect("/permintaan?error=input");
  const { id, version, purpose, item, quantity, needBy } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("save_purchase_request", {
    p_id: id, p_version: version, p_purpose: purpose,
    p_item: item, p_quantity: quantity, p_need_by: needBy,
  });
  if (error) redirect("/permintaan?error=conflict");
  redirect(`/permintaan/${id}`);
}

const transitionFields = z.object({
  id: z.uuid(),
  version: z.string().regex(/^\d{1,9}$/).transform(Number),
  action: z.enum(["submit", "approve", "reject", "revise"]),
  note: z.string().trim().max(500),
});

export async function transitionRequest(form: FormData) {
  const input = transitionFields.safeParse({
    id: form.get("id"), version: form.get("version"),
    action: form.get("action"), note: form.get("note") ?? "",
  });
  if (!input.success) redirect("/permintaan?error=input");
  const { id, version, action, note } = input.data;
  const href = `/permintaan/${id}`;
  if ((action === "reject" || action === "revise") && !note) redirect(`${href}?error=note`);
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("transition_purchase_request", {
    p_id: id, p_version: version, p_action: action, p_note: note,
  });
  if (error) redirect(`${href}?error=${error.code === "P0002" ? "approver" : "conflict"}`);
  redirect(href);
}
