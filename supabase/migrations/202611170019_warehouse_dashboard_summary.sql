begin;

create index purchase_orders_open_warehouse_idx
  on public.purchase_orders(warehouse_id, number desc)
  where status in ('sent', 'partial');

create function public.warehouse_dashboard_receiving()
returns jsonb language sql stable security definer set search_path = '' as $$
  with assigned as (
    select w.id, w.name
    from public.user_warehouse_access a
    join public.profiles p on p.id = a.user_id
    join public.warehouses w on w.id = a.warehouse_id
    where a.user_id = auth.uid() and p.active and p.role = 'warehouse'
  ), counts as (
    select count(*) as pending, count(*) filter (where o.status = 'partial') as partial
    from assigned a
    join public.purchase_orders o on o.warehouse_id = a.id
    where o.status in ('sent', 'partial')
  ), upcoming as (
    select o.id, o.number, o.item_name, o.item_unit, a.name as warehouse_name, o.quantity
    from assigned a
    join public.purchase_orders o on o.warehouse_id = a.id
    where o.status in ('sent', 'partial')
    order by o.number desc
    limit 6
  )
  select jsonb_build_object(
    'pending', counts.pending,
    'partial', counts.partial,
    'orders', coalesce((
      select jsonb_agg(to_jsonb(u) || jsonb_build_object('received', (
        select coalesce(sum(r.quantity), 0) from public.goods_receipts r where r.order_id = u.id
      )) order by u.number desc)
      from upcoming u
    ), '[]'::jsonb)
  )
  from counts;
$$;

revoke all on function public.warehouse_dashboard_receiving() from public, anon, authenticated;
grant execute on function public.warehouse_dashboard_receiving() to authenticated;

commit;
