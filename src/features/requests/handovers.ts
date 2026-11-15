import type { createSupabaseServerClient } from "@/lib/supabase/server";

export const handoverDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
});

type Handover = {
  id: string;
  quantity: number;
  created_at: string;
  warehouse_name: string;
  recipient: string | null;
  shipping_reference: string | null;
};

export async function loadHandovers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string,
): Promise<Handover[] | null> {
  const { data, error } = await supabase.rpc("request_handover_history", { p_id: id });
  return !error && Array.isArray(data) ? data : null;
}
