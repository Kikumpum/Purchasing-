begin;

create table public.stock_reservations (
  id uuid primary key,
  request_id uuid not null references public.purchase_requests(id),
  warehouse_id uuid not null references public.warehouses(id),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz
);
create index stock_reservations_request_idx on public.stock_reservations(request_id) where cancelled_at is null;
create index stock_reservations_inventory_idx on public.stock_reservations(warehouse_id, product_id) where cancelled_at is null;

alter table public.stock_movements add column reservation_id uuid references public.stock_reservations(id);
create index stock_movements_reservation_idx on public.stock_movements(reservation_id) where reservation_id is not null;

alter table public.stock_reservations enable row level security;
revoke all on public.stock_reservations from public, anon, authenticated;
grant select on public.stock_reservations to authenticated;
create policy stock_reservations_read on public.stock_reservations for select to authenticated using (
  (select public.is_procurement_admin()) or exists (
    select 1 from public.user_warehouse_access a where a.warehouse_id = stock_reservations.warehouse_id
  )
);

create view public.stock_reservation_balances with (security_invoker = true) as
select r.*, r.quantity - coalesce((
  select sum(m.quantity) from public.stock_movements m where m.reservation_id = r.id
), 0) as remaining
from public.stock_reservations r where r.cancelled_at is null;

revoke all on public.stock_reservation_balances from public, anon, authenticated;
grant select on public.stock_reservation_balances to authenticated;

create view public.inventory_availability with (security_invoker = true) as
select b.warehouse_id, b.product_id, b.quantity,
  coalesce(r.reserved, 0)::bigint as reserved,
  (b.quantity - coalesce(r.reserved, 0))::bigint as available
from public.inventory_balances b
left join (
  select warehouse_id, product_id, sum(remaining) as reserved
  from public.stock_reservation_balances group by warehouse_id, product_id
) r using (warehouse_id, product_id);
revoke all on public.inventory_availability from public, anon, authenticated;
grant select on public.inventory_availability to authenticated;

create function public.reserved_stock_quantity(p_warehouse uuid, p_product uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(remaining), 0)::bigint from public.stock_reservation_balances
  where warehouse_id = p_warehouse and product_id = p_product;
$$;
revoke all on function public.reserved_stock_quantity(uuid, uuid) from public, anon, authenticated;

create function public.reserve_request_stock(p_id uuid, p_request uuid, p_warehouse uuid, p_quantity integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  pr public.purchase_requests;
  existing public.stock_reservations;
  allocated bigint;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  if p_quantity is null or p_quantity <= 0 then raise invalid_parameter_value; end if;
  select * into pr from public.purchase_requests where id = p_request and status = 'approved' for update;
  if not found or pr.product_id is null then raise exception 'Request needs a catalog product'; end if;
  select * into existing from public.stock_reservations where id = p_id;
  if found then
    if (existing.request_id, existing.warehouse_id, existing.quantity, existing.created_by)
      is distinct from (p_request, p_warehouse, p_quantity, auth.uid()) then
      raise exception 'Reservation already exists';
    end if;
    return;
  end if;
  if exists (select 1 from public.purchase_orders where request_id = p_request and status <> 'cancelled') then
    raise exception 'Active purchase order exists';
  end if;
  perform 1 from public.warehouses where id = p_warehouse and active for share;
  if not found then raise exception 'Warehouse unavailable'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || p_warehouse::text || ':' || pr.product_id::text, 0));
  select coalesce(sum(quantity), 0) into allocated from public.stock_reservations
    where request_id = p_request and cancelled_at is null;
  if allocated + p_quantity > pr.quantity or p_quantity >
    public.calculate_inventory_quantity(p_warehouse, pr.product_id) -
      public.reserved_stock_quantity(p_warehouse, pr.product_id) then
    raise exception 'Insufficient stock or request quantity';
  end if;
  insert into public.stock_reservations(id, request_id, warehouse_id, product_id, quantity, created_by)
  values (p_id, p_request, p_warehouse, pr.product_id, p_quantity, auth.uid());
end;
$$;

create function public.issue_reserved_stock(p_id uuid, p_reservation uuid, p_quantity integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  reserved public.stock_reservations;
  existing public.stock_movements;
  issued bigint;
begin
  select * into reserved from public.stock_reservations where id = p_reservation for update;
  if not found or not exists (
    select 1 from public.user_warehouse_access a join public.profiles p on p.id = a.user_id
    where p.id = auth.uid() and p.active and p.role = 'warehouse' and a.warehouse_id = reserved.warehouse_id
  ) then raise insufficient_privilege; end if;
  if p_quantity is null or p_quantity <= 0 then raise invalid_parameter_value; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || reserved.warehouse_id::text || ':' || reserved.product_id::text, 0));
  select * into existing from public.stock_movements where id = p_id;
  if found then
    if (existing.reservation_id, existing.quantity, existing.note, existing.actor_id)
      is distinct from (p_reservation, p_quantity, btrim(p_note), auth.uid()) then
      raise exception 'Movement already exists';
    end if;
    return;
  end if;
  select coalesce(sum(quantity), 0) into issued from public.stock_movements where reservation_id = p_reservation;
  if reserved.cancelled_at is not null or issued + p_quantity > reserved.quantity then
    raise exception 'Reservation unavailable';
  end if;
  insert into public.stock_movements(id, product_id, warehouse_id, quantity, note, actor_id, reservation_id)
  values (p_id, reserved.product_id, reserved.warehouse_id, p_quantity, btrim(p_note), auth.uid(), p_reservation);
end;
$$;

create function public.cancel_stock_reservation(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  reserved public.stock_reservations;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  perform 1 from public.purchase_requests p join public.stock_reservations r on r.request_id = p.id
    where r.id = p_id for update of p;
  select * into reserved from public.stock_reservations where id = p_id for update;
  if not found then raise exception 'Reservation unavailable'; end if;
  if reserved.cancelled_at is not null then return; end if;
  if exists (select 1 from public.purchase_orders where request_id = reserved.request_id and status <> 'cancelled') then
    raise exception 'Active purchase order exists';
  end if;
  if exists (select 1 from public.stock_movements where reservation_id = p_id) then
    raise exception 'Reservation already issued';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || reserved.warehouse_id::text || ':' || reserved.product_id::text, 0));
  update public.stock_reservations set cancelled_at = now(), cancelled_by = auth.uid() where id = p_id;
end;
$$;

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

  available := public.calculate_inventory_quantity(p_source, p_product)
    - public.reserved_stock_quantity(p_source, p_product);
  if p_quantity > available then raise exception 'Insufficient inventory'; end if;
  insert into public.stock_movements(id, product_id, warehouse_id, destination_id, quantity, note, actor_id)
  values (p_id, p_product, p_source, p_destination, p_quantity, btrim(p_note), auth.uid());
end;
$$;

create or replace function public.review_stock_count(p_id uuid, p_action text)
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
  if p_action = 'approved' and count_record.actual_quantity <
    public.reserved_stock_quantity(count_record.warehouse_id, count_record.product_id) then
    raise exception 'Count is below reserved quantity';
  end if;
  update public.stock_counts set status = p_action, reviewed_by = auth.uid(), reviewed_at = now() where id = p_id;
end;
$$;

create or replace function public.create_purchase_order(p_request uuid, p_quotation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request public.purchase_requests;
  quote public.quotations;
  orders public.purchase_orders;
  remaining integer;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  select * into request from public.purchase_requests where id = p_request and status = 'approved' for update;
  if not found then raise exception 'Request is unavailable'; end if;

  select * into orders from public.purchase_orders where request_id = p_request and status <> 'cancelled';
  if found then
    if orders.quotation_id = p_quotation then return orders.id; end if;
    raise exception 'An active order already exists';
  end if;
  select request.quantity - coalesce(sum(quantity), 0) into remaining
  from public.stock_reservations where request_id = request.id and cancelled_at is null;
  if remaining <= 0 then raise exception 'Request is covered by stock'; end if;
  select * into quote from public.quotations where id = p_quotation and request_id = p_request
    and valid_until >= (now() at time zone 'Asia/Jakarta')::date;
  if not found then raise exception 'Quotation expired or unavailable'; end if;
  perform 1 from public.vendors where id = quote.vendor_id and active for share;
  if not found then raise exception 'Vendor is inactive'; end if;

  insert into public.purchase_orders(request_id, quotation_id, vendor_id, vendor_name, product_id,
    item_name, item_sku, item_unit, quantity, unit_price, created_by)
  values (request.id, quote.id, quote.vendor_id, quote.vendor_name, request.product_id,
    request.item_name, request.item_sku, request.item_unit, remaining, quote.unit_price, auth.uid())
  returning * into orders;
  return orders.id;
end;
$$;

revoke all on function public.reserve_request_stock(uuid, uuid, uuid, integer),
  public.issue_reserved_stock(uuid, uuid, integer, text), public.cancel_stock_reservation(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_request_stock(uuid, uuid, uuid, integer),
  public.issue_reserved_stock(uuid, uuid, integer, text), public.cancel_stock_reservation(uuid) to authenticated;
commit;
