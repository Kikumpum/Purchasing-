import { redirect } from "next/navigation";
import { requireRequestSession } from "@/features/requests/session";

export async function requireProcurementSession() {
  const session = await requireRequestSession();
  if (session.profile?.role !== "admin_procurement") redirect("/permintaan");
  return session.supabase;
}

export function procurementPage(value?: string) {
  return /^[1-9]\d{0,4}$/.test(value ?? "") ? Number(value) : 1;
}
