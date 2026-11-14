"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createWarehouse(form: FormData) {
  const input = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,39}$/),
    name: z.string().trim().min(1).max(160),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.from("warehouses").insert(input.data);
  redirect(error ? "/gudang?error=warehouse" : "/gudang?saved=1");
}

export async function receiveOrder(form: FormData) {
  const input = z.object({
    id: z.uuid(),
    order: z.uuid(),
    quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)),
    note: z.string().trim().max(500),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const { id, order, quantity, note } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("receive_purchase_order", {
    p_receipt: id, p_order: order, p_quantity: quantity, p_note: note,
  });
  redirect(error ? "/gudang?error=receipt" : "/gudang?saved=1");
}

export async function recordMovement(form: FormData) {
  const input = z.object({
    id: z.uuid(), product: z.uuid(), source: z.uuid(), destination: z.union([z.uuid(), z.literal("")]),
    quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)),
    note: z.string().trim().min(1).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const { id, product, source, destination, quantity, note } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("record_stock_movement", {
    p_id: id, p_product: product, p_source: source, p_destination: destination || null,
    p_quantity: quantity, p_note: note,
  });
  redirect(error ? "/gudang?error=movement" : "/gudang?saved=1");
}

export async function issueReservation(form: FormData) {
  const input = z.object({
    id: z.uuid(), reservation: z.uuid(),
    quantity: z.string().regex(/^\d{1,7}$/).transform(Number).pipe(z.number().int().min(1).max(1000000)),
    note: z.string().trim().min(1).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const { id, reservation, quantity, note } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("issue_reserved_stock", {
    p_id: id, p_reservation: reservation, p_quantity: quantity, p_note: note,
  });
  redirect(error ? "/gudang?error=issue" : "/gudang?saved=1");
}

export async function submitCount(form: FormData) {
  const input = z.object({
    id: z.uuid(), warehouse: z.uuid(), product: z.uuid(),
    actual: z.string().regex(/^\d{1,8}$/).transform(Number),
    note: z.string().trim().min(1).max(500),
  }).safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const { id, warehouse, product, actual, note } = input.data;
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("submit_stock_count", {
    p_id: id, p_warehouse: warehouse, p_product: product, p_actual: actual, p_note: note,
  });
  redirect(error ? "/gudang?error=count" : "/gudang?saved=1");
}

export async function reviewCount(form: FormData) {
  const input = z.object({ id: z.uuid(), review: z.enum(["approved", "rejected"]) })
    .safeParse(Object.fromEntries(form));
  if (!input.success) redirect("/gudang?error=input");
  const supabase = await createSupabaseServerClient({ writableCookies: true });
  const { error } = await supabase.rpc("review_stock_count", { p_id: input.data.id, p_action: input.data.review });
  redirect(error ? "/gudang?error=count-review" : "/gudang?saved=1");
}
