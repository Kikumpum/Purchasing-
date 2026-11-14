begin;

alter table public.stock_reservations add column receipt_id uuid unique references public.goods_receipts(id);

create or replace view public.stock_reservation_balances with (security_invoker = true) as
select r.id, r.request_id, r.warehouse_id, r.product_id, r.quantity, r.created_by, r.created_at,
  r.cancelled_by, r.cancelled_at, r.quantity - coalesce((
    select sum(m.quantity) from public.stock_movements m where m.reservation_id = r.id
  ), 0) as remaining, r.receipt_id
from public.stock_reservations r where r.cancelled_at is null;

-- Every receipt immediately makes its units available for handover to the
-- originating PR. The receipt RPC already holds the warehouse/product lock.
create function public.reserve_received_purchase()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stock_reservations(
    id, request_id, warehouse_id, product_id, quantity, created_by, receipt_id
  )
  select pg_catalog.gen_random_uuid(), po.request_id, new.warehouse_id, new.product_id,
    new.quantity, new.received_by, new.id
  from public.purchase_orders po where po.id = new.order_id;
  return new;
end;
$$;
revoke all on function public.reserve_received_purchase() from public, anon, authenticated;
create trigger reserve_received_purchase after insert on public.goods_receipts
for each row execute function public.reserve_received_purchase();

-- The underlying request policy determines who can see fulfillment.
create function public.request_fulfillment(p_id uuid)
returns table(issued bigint, awaiting_handover bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  pr public.purchase_requests;
  actor public.profiles;
begin
  select * into actor from public.profiles where id = auth.uid() and active;
  select * into pr from public.purchase_requests where id = p_id and status = 'approved';
  if not found or actor.id is null or not (
    actor.id = pr.requester_id or actor.role = 'admin_procurement'
    or (actor.role = 'manager' and actor.department_id = pr.department_id)
  ) then
    return;
  end if;
  return query
  select
    coalesce(sum(r.quantity - r.remaining), 0)::bigint,
    coalesce(sum(r.remaining), 0)::bigint
  from public.stock_reservation_balances r where r.request_id = p_id;
end;
$$;
revoke all on function public.request_fulfillment(uuid) from public, anon, authenticated;
grant execute on function public.request_fulfillment(uuid) to authenticated;
commit;
