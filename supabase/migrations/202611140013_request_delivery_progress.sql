begin;

create function public.request_delivery_progress(p_id uuid)
returns table(
  issued bigint, awaiting_handover bigint, po_number bigint, po_status text,
  ordered integer, received bigint, vendor_name text, warehouse_name text
)
language sql stable security definer set search_path = '' as $$
  select fulfillment.issued, fulfillment.awaiting_handover, po.number, po.status,
    po.quantity, coalesce(receipts.quantity, 0), po.vendor_name, warehouse.name
  from public.request_fulfillment(p_id) as fulfillment
  left join public.purchase_orders po
    on po.request_id = p_id and po.status <> 'cancelled'
  left join public.warehouses warehouse on warehouse.id = po.warehouse_id
  left join lateral (
    select sum(receipt.quantity) as quantity from public.goods_receipts receipt
    where receipt.order_id = po.id
  ) receipts on true;
$$;

revoke all on function public.request_delivery_progress(uuid) from public, anon, authenticated;
grant execute on function public.request_delivery_progress(uuid) to authenticated;

commit;
