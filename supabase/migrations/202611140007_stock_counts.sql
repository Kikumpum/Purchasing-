begin;

create table public.stock_counts (
  id uuid primary key,
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  expected_quantity bigint not null check (expected_quantity >= 0),
  actual_quantity integer not null check (actual_quantity >= 0),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  counted_by uuid not null references public.profiles(id),
  counted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);
create index stock_counts_warehouse_idx on public.stock_counts(warehouse_id, counted_at desc);

alter table public.stock_counts enable row level security;
revoke all on public.stock_counts from public, anon, authenticated;
grant select on public.stock_counts to authenticated;
create policy stock_counts_read on public.stock_counts for select to authenticated using (
  (select public.is_procurement_admin()) or exists (
    select 1 from public.user_warehouse_access where warehouse_id = stock_counts.warehouse_id
  )
);

create or replace view public.inventory_balances with (security_invoker = true) as
select warehouse_id, product_id, sum(delta)::bigint as quantity
from (
  select warehouse_id, product_id, quantity::bigint as delta from public.goods_receipts
  union all
  select warehouse_id, product_id, -quantity::bigint from public.stock_movements
  union all
  select destination_id, product_id, quantity::bigint from public.stock_movements where destination_id is not null
  union all
  select warehouse_id, product_id, actual_quantity - expected_quantity from public.stock_counts where status = 'approved'
) ledger
where (select public.is_procurement_admin()) or exists (
  select 1 from public.user_warehouse_access a where a.warehouse_id = ledger.warehouse_id
)
group by warehouse_id, product_id;

create function public.calculate_inventory_quantity(p_warehouse uuid, p_product uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(delta), 0)::bigint from (
    select quantity as delta from public.goods_receipts where warehouse_id = p_warehouse and product_id = p_product
    union all
    select -quantity from public.stock_movements where warehouse_id = p_warehouse and product_id = p_product
    union all
    select quantity from public.stock_movements where destination_id = p_warehouse and product_id = p_product
    union all
    select actual_quantity - expected_quantity from public.stock_counts
      where warehouse_id = p_warehouse and product_id = p_product and status = 'approved'
  ) ledger;
$$;
revoke all on function public.calculate_inventory_quantity(uuid, uuid) from public, anon, authenticated;

create or replace function public.record_stock_movement(p_id uuid, p_product uuid, p_source uuid,
  p_destination uuid, p_quantity integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous public.stock_movements;
  available bigint;
  warehouse_lock uuid;
begin
  if not exists (
    select 1 from public.profiles p join public.user_warehouse_access a on a.user_id = p.id
    where p.id = auth.uid() and p.role = 'warehouse' and p.active and a.warehouse_id = p_source
  ) then raise insufficient_privilege; end if;

  if p_destination is not null and not exists (
    select 1 from public.user_warehouse_access where user_id = auth.uid() and warehouse_id = p_destination
  ) then raise insufficient_privilege; end if;

  if p_id is null or p_product is null or p_source is null or p_source = p_destination
    or p_quantity is null or p_quantity <= 0 then raise invalid_parameter_value; end if;

  for warehouse_lock in select distinct id from unnest(array[p_source, p_destination]) as keys(id)
    where id is not null order by id
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      'inventory:' || warehouse_lock::text || ':' || p_product::text, 0));
  end loop;
  select * into previous from public.stock_movements where id = p_id;
  if found then
    if (previous.product_id, previous.warehouse_id, previous.destination_id, previous.quantity, previous.note, previous.actor_id)
      is distinct from (p_product, p_source, p_destination, p_quantity, btrim(p_note), auth.uid()) then
      raise exception 'Movement already exists';
    end if;
    return;
  end if;

  available := public.calculate_inventory_quantity(p_source, p_product);
  if p_quantity > available then raise exception 'Insufficient inventory'; end if;
  insert into public.stock_movements(id, product_id, warehouse_id, destination_id, quantity, note, actor_id)
  values (p_id, p_product, p_source, p_destination, p_quantity, btrim(p_note), auth.uid());
end;
$$;

create or replace function public.receive_purchase_order(p_receipt uuid, p_order uuid, p_quantity integer, p_note text)
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
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || orders.warehouse_id::text || ':' || orders.product_id::text, 0));
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

create function public.submit_stock_count(p_id uuid, p_warehouse uuid, p_product uuid, p_actual integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  existing public.stock_counts;
begin
  if not exists (
    select 1 from public.user_warehouse_access a join public.profiles p on a.user_id = p.id
    where p.id = auth.uid() and p.active and p.role = 'warehouse' and a.warehouse_id = p_warehouse
  ) then raise insufficient_privilege; end if;
  if p_product is null or p_actual is null or p_actual not between 0 and 99999999 then
    raise invalid_parameter_value;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || p_warehouse::text || ':' || p_product::text, 0));
  select * into existing from public.stock_counts where id = p_id;
  if found then
    if (existing.warehouse_id, existing.product_id, existing.actual_quantity, existing.note, existing.counted_by)
      is distinct from (p_warehouse, p_product, p_actual, btrim(p_note), auth.uid()) then
      raise exception 'Stock count already exists';
    end if;
    return;
  end if;
  insert into public.stock_counts(id, warehouse_id, product_id, expected_quantity, actual_quantity, note, counted_by)
  values (p_id, p_warehouse, p_product, public.calculate_inventory_quantity(p_warehouse, p_product),
    p_actual, btrim(p_note), auth.uid());
end;
$$;

create function public.review_stock_count(p_id uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  count_record public.stock_counts;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  if p_action is null or p_action not in ('approved', 'rejected') then raise invalid_parameter_value; end if;
  select * into count_record from public.stock_counts where id = p_id and status = 'pending' for update;
  if not found or count_record.counted_by = auth.uid() then raise insufficient_privilege; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || count_record.warehouse_id::text || ':' || count_record.product_id::text, 0));
  if p_action = 'approved' and public.calculate_inventory_quantity(count_record.warehouse_id, count_record.product_id)
    <> count_record.expected_quantity then raise exception 'Inventory changed since count'; end if;
  update public.stock_counts set status = p_action, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
end;
$$;
revoke all on function public.submit_stock_count(uuid, uuid, uuid, integer, text),
  public.review_stock_count(uuid, text) from public, anon, authenticated;
grant execute on function public.submit_stock_count(uuid, uuid, uuid, integer, text),
  public.review_stock_count(uuid, text) to authenticated;
commit;
