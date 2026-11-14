"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function manageReservation(form: FormData) {
  const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("reserve"), request: z.uuid(), id: z.uuid(), warehouse: z.uuid(),
      quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)) }),
    z.object({ action: z.literal("cancel"), request: z.uuid(), id: z.uuid() }),
  ]).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/pengadaan?error=input");
  const data = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = data.action === "reserve"
    ? await supabase.rpc("reserve_request_stock", {
      p_id: data.id, p_request: data.request, p_warehouse: data.warehouse, p_quantity: data.quantity,
    })
    : await supabase.rpc("cancel_stock_reservation", { p_id: data.id });
  redirect(`/pengadaan/${data.request}${result.error ? "?error=reservation" : ""}`);
}

const quotationFields = z.object({
  request: z.uuid(), id: z.uuid(), vendor: z.uuid(),
  price: z.string().regex(/^\d{1,17}(\.\d{1,2})?$/),
  valid: z.iso.date(), note: z.string().trim().max(500),
});

export async function recordQuotation(form: FormData) {
  const input = quotationFields.safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/pengadaan?error=input");
  const { request, id, vendor, price, valid, note } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = await supabase.rpc("record_quotation", {
    p_id: id, p_request: request, p_vendor: vendor, p_price: price, p_valid: valid, p_note: note,
  });
  redirect(`/pengadaan/${request}${result.error ? "?error=quotation" : ""}`);
}

export async function createPurchaseOrder(form: FormData) {
  const input = z.object({ request: z.uuid(), quotation: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/pengadaan?error=input");
  const { request, quotation } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = await supabase.rpc("create_purchase_order", { p_request: request, p_quotation: quotation });
  redirect(`/pengadaan/${request}${result.error ? "?error=order" : ""}`);
}

export async function transitionPurchaseOrder(form: FormData) {
  const input = z.object({
    request: z.uuid(), order: z.uuid(), action: z.enum(["send", "cancel"]),
    reason: z.string().trim().max(500).default(""),
    warehouse: z.uuid().optional(), product: z.uuid().optional(),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/pengadaan?error=input");
  const { request, order, action, reason, warehouse, product } = input.data;
  if (action === "send" && !warehouse) redirect(`/pengadaan/${request}?error=transition`);
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const result = action === "send"
    ? await supabase.rpc("send_purchase_order_to_warehouse", { p_order: order, p_warehouse: warehouse, p_product: product ?? null })
    : await supabase.rpc("cancel_purchase_order", { p_order: order, p_reason: reason });
  redirect(`/pengadaan/${request}${result.error ? "?error=transition" : ""}`);
}
