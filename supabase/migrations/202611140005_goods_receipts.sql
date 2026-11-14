begin;

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  active boolean not null default true
);
create table public.user_warehouse_access (
  user_id uuid not null references public.profiles(id),
  warehouse_id uuid not null references public.warehouses(id),
  primary key (user_id, warehouse_id)
);
alter table public.warehouses enable row level security;
alter table public.user_warehouse_access enable row level security;
revoke all on public.warehouses, public.user_warehouse_access from public, anon, authenticated;
grant select on public.warehouses, public.user_warehouse_access to authenticated;
grant insert (code, name) on public.warehouses to authenticated;
create policy own_warehouse_access on public.user_warehouse_access for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'warehouse'
  )
);
create policy warehouse_read on public.warehouses for select to authenticated using (
  (select public.is_procurement_admin()) or exists (
    select 1 from public.user_warehouse_access where warehouse_id = warehouses.id
  )
);
create policy warehouse_create on public.warehouses for insert to authenticated with check ((select public.is_procurement_admin()));

alter table public.purchase_orders add column warehouse_id uuid references public.warehouses(id);
alter table public.purchase_orders drop constraint purchase_orders_status_check;
alter table public.purchase_orders add check (status in ('draft', 'sent', 'cancelled', 'partial', 'received'));

create table public.goods_receipts (
  id uuid primary key,
  order_id uuid not null references public.purchase_orders(id),
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  item_name text not null,
  item_unit text,
  quantity integer not null check (quantity > 0),
  note text not null check (char_length(note) <= 500),
  received_by uuid not null references public.profiles(id),
  received_at timestamptz not null default now()
);
create index goods_receipts_order_idx on public.goods_receipts(order_id);

alter table public.goods_receipts enable row level security;
revoke all on public.goods_receipts from public, anon, authenticated;
grant select on public.goods_receipts to authenticated;
create policy receipt_read on public.goods_receipts for select to authenticated using (
  (select public.is_procurement_admin()) or exists (
    select 1 from public.user_warehouse_access where warehouse_id = goods_receipts.warehouse_id
  )
);

create function public.send_purchase_order_to_warehouse(p_order uuid, p_warehouse uuid, p_product uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  product public.products;
  orders public.purchase_orders;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  perform 1 from public.warehouses where id = p_warehouse and active for share;
  if not found then raise exception 'Warehouse unavailable'; end if;
  select * into orders from public.purchase_orders where id = p_order and status = 'draft' for update;
  if not found then raise exception 'Draft unavailable'; end if;
  select * into product from public.products where id = coalesce(orders.product_id, p_product) and active for share;
  if not found then raise exception 'An active catalog product is required'; end if;
  perform public.transition_purchase_order(p_order, 'send', '');
  update public.purchase_orders set warehouse_id = p_warehouse, product_id = product.id,
    item_sku = coalesce(orders.item_sku, product.sku), item_unit = coalesce(orders.item_unit, product.unit)
  where id = p_order;
end;
$$;

create function public.receive_purchase_order(p_receipt uuid, p_order uuid, p_quantity integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  orders public.purchase_orders;
  already_received bigint;
  previous public.goods_receipts;
begin
  select * into orders from public.purchase_orders where id = p_order for update;
  if not found or not exists (
    select 1 from public.user_warehouse_access a join public.profiles p on p.id = a.user_id
    where p.id = auth.uid() and p.active and p.role = 'warehouse' and a.warehouse_id = orders.warehouse_id
  ) then raise insufficient_privilege; end if;

  select * into previous from public.goods_receipts where id = p_receipt;
  if found then
    if (previous.order_id, previous.quantity, previous.note, previous.received_by)
      is distinct from (p_order, p_quantity, btrim(p_note), auth.uid()) then
      raise exception 'Receipt already exists';
    end if;
    return;
  end if;
  if orders.status not in ('sent', 'partial') or orders.product_id is null then
    raise exception 'Order cannot be received';
  end if;
  select coalesce(sum(quantity), 0) into already_received from public.goods_receipts where order_id = p_order;
  if p_quantity is null or p_quantity <= 0 or already_received + p_quantity > orders.quantity then
    raise invalid_parameter_value;
  end if;
  insert into public.goods_receipts(id, order_id, warehouse_id, product_id, item_name, item_unit, quantity, note, received_by)
  values (p_receipt, p_order, orders.warehouse_id, orders.product_id, orders.item_name, orders.item_unit,
    p_quantity, btrim(p_note), auth.uid());
  update public.purchase_orders set status = case when already_received + p_quantity = orders.quantity
    then 'received' else 'partial' end where id = p_order;
end;
$$;

create function public.warehouse_orders()
returns table(id uuid, number bigint, item_name text, item_sku text, item_unit text,
  warehouse_name text, quantity integer, received bigint, status text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.number, o.item_name, o.item_sku, o.item_unit, w.name, o.quantity,
    (select coalesce(sum(r.quantity), 0) from public.goods_receipts r where r.order_id = o.id), o.status
  from public.purchase_orders o
  join public.warehouses w on w.id = o.warehouse_id
  join public.user_warehouse_access a on a.warehouse_id = w.id and a.user_id = auth.uid()
  join public.profiles p on p.id = a.user_id and p.active and p.role = 'warehouse'
  where o.status in ('sent', 'partial', 'received')
  order by o.number desc;
$$;

create view public.received_inventory with (security_invoker = true) as
select warehouse_id, product_id, sum(quantity) as received_quantity,
  min(item_name) as item_name, min(item_unit) as item_unit
from public.goods_receipts group by warehouse_id, product_id;
revoke all on public.received_inventory from public, anon, authenticated;
grant select on public.received_inventory to authenticated;

revoke all on function public.send_purchase_order_to_warehouse(uuid, uuid, uuid),
  public.receive_purchase_order(uuid, uuid, integer, text), public.warehouse_orders() from public, anon, authenticated;
grant execute on function public.send_purchase_order_to_warehouse(uuid, uuid, uuid),
  public.receive_purchase_order(uuid, uuid, integer, text), public.warehouse_orders() to authenticated;

-- Only the destination-aware command may send new orders after this migration.
revoke execute on function public.transition_purchase_order(uuid, text, text) from authenticated;
create function public.cancel_purchase_order(p_order uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.transition_purchase_order(p_order, 'cancel', p_reason);
end;
$$;
revoke all on function public.cancel_purchase_order(uuid, text) from public, anon, authenticated;
grant execute on function public.cancel_purchase_order(uuid, text) to authenticated;
commit;
