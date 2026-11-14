"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const fields = z.object({
  id: z.uuid().nullable(),
  version: z.string().regex(/^\d{1,9}$/).transform(Number).nullable(),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,39}$/),
  name: z.string().trim().min(1).max(160),
  unit: z.string().trim().min(1).max(30),
});

export async function saveProduct(form: FormData) {
  const input = fields.safeParse({
    id: form.get("id"),
    version: form.get("version"),
    sku: form.get("sku"),
    name: form.get("name"),
    unit: form.get("unit"),
  });
  if (!input.success) redirect("/katalog?error=input");
  const { id, version, ...product } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = id && version !== null
    ? await supabase.from("products").update({
      ...product, active: form.get("active") === "on", version: version + 1,
    }).eq("id", id).eq("version", version).select("id").maybeSingle()
    : await supabase.from("products").insert(product).select("id").single();
  if (result.error?.code === "23505") redirect("/katalog?error=sku");
  if (result.error || !result.data) redirect("/katalog?error=save");
  redirect("/katalog?saved=1");
}
