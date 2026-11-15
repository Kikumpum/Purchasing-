begin;

create function public.request_handover_history(p_id uuid)
returns table(id uuid, quantity integer, created_at timestamptz, warehouse_name text, recipient text, shipping_reference text)
language sql stable security definer set search_path = '' as $$
  select m.id, m.quantity, m.created_at, w.name, m.recipient, m.shipping_reference
  from public.request_fulfillment(p_id) as access_check
  join public.stock_reservations r on r.request_id = p_id and r.cancelled_at is null
  join public.stock_movements m on m.reservation_id = r.id
  join public.warehouses w on w.id = m.warehouse_id
  order by m.created_at desc, m.id desc
  limit 50;
$$;

revoke all on function public.request_handover_history(uuid) from public, anon, authenticated;
grant execute on function public.request_handover_history(uuid) to authenticated;

commit;
