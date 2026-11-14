begin;

create table public.stock_movements (
  id uuid primary key,
  product_id uuid not null references public.products(id),
  warehouse_id uuid not null references public.warehouses(id),
  destination_id uuid references public.warehouses(id),
  quantity integer not null check (quantity > 0),
  note text not null check (char_length(btrim(note)) between 1 and 500),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (destination_id is distinct from warehouse_id)
);
create index stock_movements_source_idx on public.stock_movements(warehouse_id, product_id);
create index stock_movements_destination_idx on public.stock_movements(destination_id, product_id);

alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from public, anon, authenticated;
grant select on public.stock_movements to authenticated;
create policy stock_movements_read on public.stock_movements for select to authenticated using (
  (select public.is_procurement_admin()) or exists (
    select 1 from public.user_warehouse_access
    where warehouse_id in (stock_movements.warehouse_id, stock_movements.destination_id)
  )
);

create view public.inventory_balances with (security_invoker = true) as
select warehouse_id, product_id, sum(delta) as quantity
from (
  select warehouse_id, product_id, quantity as delta from public.goods_receipts
  union all
  select warehouse_id, product_id, -quantity from public.stock_movements
  union all
  select destination_id, product_id, quantity from public.stock_movements where destination_id is not null
) ledger
where (select public.is_procurement_admin()) or exists (
  select 1 from public.user_warehouse_access a where a.warehouse_id = ledger.warehouse_id
)
group by warehouse_id, product_id;
revoke all on public.inventory_balances from public, anon, authenticated;
grant select on public.inventory_balances to authenticated;

create function public.record_stock_movement(p_id uuid, p_product uuid, p_source uuid,
  p_destination uuid, p_quantity integer, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous public.stock_movements;
  available bigint;
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'inventory:' || p_source::text || ':' || p_product::text, 0));
  select * into previous from public.stock_movements where id = p_id;
  if found then
    if (previous.product_id, previous.warehouse_id, previous.destination_id, previous.quantity, previous.note, previous.actor_id)
      is distinct from (p_product, p_source, p_destination, p_quantity, btrim(p_note), auth.uid()) then
      raise exception 'Movement already exists';
    end if;
    return;
  end if;

  select coalesce(sum(delta), 0) into available from (
    select quantity as delta from public.goods_receipts where warehouse_id = p_source and product_id = p_product
    union all
    select -quantity from public.stock_movements where warehouse_id = p_source and product_id = p_product
    union all
    select quantity from public.stock_movements where destination_id = p_source and product_id = p_product
  ) ledger;
  if p_quantity > available then raise exception 'Insufficient inventory'; end if;
  insert into public.stock_movements(id, product_id, warehouse_id, destination_id, quantity, note, actor_id)
  values (p_id, p_product, p_source, p_destination, p_quantity, btrim(p_note), auth.uid());
end;
$$;

revoke all on function public.record_stock_movement(uuid, uuid, uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.record_stock_movement(uuid, uuid, uuid, uuid, integer, text) to authenticated;
commit;
