"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(form: FormData) {
  const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) })
    .safeParse({ email: String(form.get("email") ?? "").trim(), password: form.get("password") });
  if (!input.success) redirect("/masuk?error=credentials");
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.auth.signInWithPassword(input.data);
  if (error) redirect("/masuk?error=credentials");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/permintaan?error=logout");
  redirect("/masuk");
}

export async function requestPasswordReset(form: FormData) {
  const email = z.email().max(254).safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) redirect("/masuk?pemulihan=email");
  const { config } = readSupabaseConfig(process.env);
  if (!config) redirect("/konfigurasi");
  const supabase = createClient(config.url, config.key, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false },
  });
  await supabase.auth.resetPasswordForEmail(email.data);
  // Keep the response uniform for unknown addresses and provider errors.
  redirect("/masuk?pemulihan=dikirim");
}

const itemFields = z.object({
  id: z.uuid(),
  purpose: z.string().trim().min(1).max(500),
  item: z.string().trim().max(160),
  product: z.uuid().nullable(),
  quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)),
  needBy: z.iso.date(),
  requestedUnit: z.string().trim().max(30),
  note: z.string().trim().max(500),
}).refine((item) => Boolean(item.product || item.item));

const opkbFields = z.object({
  opkbNumber: z.string().trim().max(80),
  opkbDate: z.iso.date().nullable(),
});

function readItem(form: FormData, id: FormDataEntryValue | null, prefix = "") {
  return {
    id, purpose: form.get(prefix + "purpose"), item: form.get(prefix + "item") ?? "",
    product: form.get(prefix + "product") || null, quantity: form.get(prefix + "quantity"),
    needBy: form.get(prefix + "needBy"), requestedUnit: form.get(prefix + "requestedUnit") ?? "",
    note: form.get(prefix + "note") ?? "",
  };
}

function readOpkb(form: FormData) {
  return opkbFields.safeParse({ opkbNumber: form.get("opkbNumber") ?? "", opkbDate: form.get("opkbDate") || null });
}

export async function saveRequest(form: FormData) {
  const input = itemFields.safeParse(readItem(form, form.get("id")));
  const opkb = readOpkb(form);
  const version = z.string().regex(/^\d{1,9}$/).transform(Number).safeParse(form.get("version"));
  if (!input.success || !opkb.success || !version.success) redirect("/permintaan?error=input");
  const error = await storeRequest(input.data, opkb.data, version.data);
  if (error) redirect("/permintaan?error=conflict");
  redirect(`/permintaan/${input.data.id}`);
}

async function storeRequest(data: z.infer<typeof itemFields>, opkb: z.infer<typeof opkbFields>, version: number | null) {
  const { id, purpose, item, product, quantity, needBy, requestedUnit, note } = data;
  const { opkbNumber, opkbDate } = opkb;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("save_request_with_opkb", {
    p_id: id, p_version: version, p_purpose: purpose,
    p_item: item, p_quantity: quantity, p_need_by: needBy, p_product: product,
    p_opkb_number: opkbNumber || null, p_opkb_date: opkbDate,
    p_requested_unit: requestedUnit || null, p_note: note || null,
  });
  return error;
}

export async function saveNewRequests(_previous: string | null, form: FormData): Promise<string> {
  const ids = z.array(z.uuid()).min(1).max(30).safeParse(form.getAll("rows"));
  const opkb = readOpkb(form);
  if (!ids.success || !opkb.success || new Set(ids.data).size !== ids.data.length) return "Periksa nomor OPKB dan daftar barang.";
  const items = z.array(itemFields).safeParse(ids.data.map((id) => readItem(form, id, `${id}.`)));
  if (!items.success) return "Periksa nama barang, kuantitas, tanggal kebutuhan, dan isian setiap barang.";
  const { opkbNumber, opkbDate } = opkb.data;
  const saveError = "Draft gagal disimpan. Periksa barang yang dipilih atau coba lagi.";
  if (items.data.length === 1) {
    const [item] = items.data;
    if (await storeRequest(item, opkb.data, null)) return saveError;
    redirect(`/permintaan/${item.id}`);
  }
  if (!opkbNumber) return "Isi nomor OPKB untuk menyimpan beberapa barang sekaligus.";
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("create_opkb_drafts", {
    p_opkb_number: opkbNumber, p_opkb_date: opkbDate,
    p_rows: items.data.map((item) => ({
      id: item.id, purpose: item.purpose, item_name: item.item, quantity: item.quantity,
      need_by: item.needBy, product: item.product, requested_unit: item.requestedUnit, note: item.note,
    })),
  });
  if (error) return saveError;
  redirect(`/permintaan?${new URLSearchParams({ opkb: opkbNumber, tersimpan: String(items.data.length) })}`);
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

export async function updateOpkbRequests(form: FormData) {
  const action = z.enum(["submit", "approve"]).safeParse(form.get("operation"));
  if (!action.success) redirect("/permintaan?error=input");
  const submitting = action.data === "submit";
  const reference = z.string().trim().min(1).max(80).safeParse(form.get("reference"));
  if (!reference.success) redirect("/permintaan?error=approval");
  const query = new URLSearchParams({ opkb: reference.data });
  const rows = z.array(z.string().regex(/^[0-9a-f-]{36}:\d{1,9}$/i)).min(1).max(25)
    .safeParse(form.getAll("selected"));
  if (!rows.success) {
    query.set("error", "approval-selection");
  } else {
    const items = rows.data.map((row) => row.split(":"));
    const ids = z.array(z.uuid()).safeParse(items.map(([id]) => id));
    if (!ids.success) redirect(`/permintaan?${query}&error=approval`);
    const supabase = await createSupabaseServerClient({ writableCookies: true });
    const { error } = await supabase.rpc("transition_opkb_requests", {
      p_action: action.data,
      p_reference: reference.data, p_ids: ids.data, p_versions: items.map(([, version]) => Number(version)),
    });
    if (error) query.set("error", submitting ? (error.code === "P0002" ? "approver" : "submit") : "approval");
    else query.set(submitting ? "diajukan" : "disetujui", String(ids.data.length));
  }
  redirect(`/permintaan?${query}`);
}
