"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const vendorFields = z.object({
  id: z.uuid().nullable(),
  version: z.string().regex(/^\d{1,9}$/).transform(Number).nullable(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,39}$/),
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().max(254).pipe(z.union([z.email(), z.literal("")])),
  phone: z.string().trim().max(50),
  address: z.string().trim().max(500),
}).refine(({ id, version }) => (id === null) === (version === null));

export async function saveVendor(form: FormData) {
  const input = vendorFields.safeParse({
    id: form.get("id"), version: form.get("version"), code: form.get("code"),
    name: form.get("name"), email: form.get("email"), phone: form.get("phone"),
    address: form.get("address"),
  });
  if (!input.success) redirect("/pengadaan/vendor?error=input");
  const { id, version, ...vendor } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = id && version !== null
    ? await supabase.from("vendors").update({ ...vendor, active: form.get("active") === "on", version: version + 1 })
      .eq("id", id).eq("version", version).select("id").maybeSingle()
    : await supabase.from("vendors").insert(vendor).select("id").single();
  if (result.error?.code === "23505") redirect("/pengadaan/vendor?error=duplicate");
  if (result.error || !result.data) redirect("/pengadaan/vendor?error=save");
  redirect("/pengadaan/vendor?saved=1");
}
