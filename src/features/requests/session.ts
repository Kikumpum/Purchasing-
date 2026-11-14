import { redirect } from "next/navigation";
import { cache } from "react";
import { readSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const requireRequestSession = cache(async function requireRequestSession() {
  if (!readSupabaseConfig(process.env).config) redirect("/konfigurasi");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) redirect("/masuk");
  const profile = await supabase.from("profiles").select("id, display_name, role").eq("id", id).maybeSingle();
  return { supabase, profile: profile.data, profileError: Boolean(profile.error) };
});

export const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  revision_requested: "Perlu revisi",
};
