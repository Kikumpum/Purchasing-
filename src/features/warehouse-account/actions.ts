"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { warehouseRequestSchema, type WarehouseAccountRequestState } from "./request";

export async function submitWarehouseAccountRequest(
  _previous: WarehouseAccountRequestState,
  formData: FormData,
): Promise<WarehouseAccountRequestState> {
  const nameInput = formData.get("name");
  const emailInput = formData.get("email");
  const fields = {
    name: typeof nameInput === "string" ? nameInput.slice(0, 120) : "",
    email: typeof emailInput === "string" ? emailInput.slice(0, 254) : "",
  };
  const parsed = warehouseRequestSchema.safeParse({ name: nameInput, email: emailInput });
  if (!parsed.success) return { status: "invalid", ...fields };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("submit_warehouse_account_request", {
      p_name: parsed.data.name, p_email: parsed.data.email,
    });
    if (error?.code === "22023") return { status: "invalid", ...fields };
    if (error || typeof data !== "boolean") return { status: "unavailable", ...fields };
    return data ? { status: "sent" } : { status: "limited", ...fields };
  } catch {
    return { status: "unavailable", ...fields };
  }
}
