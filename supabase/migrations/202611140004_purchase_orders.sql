begin;

create table public.quotations (
  id uuid primary key,
  request_id uuid not null references public.purchase_requests(id),
  vendor_id uuid not null references public.vendors(id),
  vendor_name text not null,
  unit_price numeric(19,2) not null check (unit_price > 0),
  valid_until date not null check (isfinite(valid_until)),
  note text not null check (char_length(note) <= 500),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index quotations_request_idx on public.quotations(request_id, created_at, id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  request_id uuid not null references public.purchase_requests(id),
  quotation_id uuid not null references public.quotations(id),
  vendor_id uuid not null references public.vendors(id),
  vendor_name text not null,
  product_id uuid references public.products(id),
  item_name text not null,
  item_sku text,
  item_unit text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(19,2) not null check (unit_price > 0),
  total numeric(25,2) generated always as (quantity * unit_price) stored,
  status text not null default 'draft' check (status in ('draft', 'sent', 'cancelled', 'received')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  sent_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id),
  cancellation_reason text check (char_length(cancellation_reason) between 1 and 500)
);
create unique index purchase_orders_active_request_idx on public.purchase_orders(request_id) where status <> 'cancelled';
create index purchase_orders_request_idx on public.purchase_orders(request_id, number desc);

create function public.is_procurement_admin()
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and active and role = 'admin_procurement'
  );
$$;
revoke all on function public.is_procurement_admin() from public, anon, authenticated;
grant execute on function public.is_procurement_admin() to authenticated;

alter table public.quotations enable row level security;
alter table public.purchase_orders enable row level security;
revoke all on public.quotations, public.purchase_orders from public, anon, authenticated;
grant select on public.quotations, public.purchase_orders to authenticated;
create policy quotation_read on public.quotations for select to authenticated using ((select public.is_procurement_admin()));
create policy purchase_order_read on public.purchase_orders for select to authenticated using ((select public.is_procurement_admin()));

create function public.record_quotation(p_id uuid, p_request uuid, p_vendor uuid, p_price numeric, p_valid date, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  vendor public.vendors;
  existing public.quotations;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  perform 1 from public.purchase_requests where id = p_request and status = 'approved' for update;
  if not found then raise exception 'Request is unavailable'; end if;
  select * into existing from public.quotations where id = p_id;
  if found then
    if (existing.request_id, existing.vendor_id, existing.unit_price, existing.valid_until, existing.note)
      is distinct from (p_request, p_vendor, p_price, p_valid, btrim(p_note)) then
      raise exception 'Quotation already exists';
    end if;
    return;
  end if;
  if p_price is null or p_price <= 0 or p_price >= 100000000000000000 or p_price <> round(p_price, 2)
    or p_valid is null or not isfinite(p_valid) or p_valid < (now() at time zone 'Asia/Jakarta')::date then
    raise invalid_parameter_value;
  end if;
  select * into vendor from public.vendors where id = p_vendor and active for share;
  if not found then raise exception 'Vendor is inactive'; end if;
  insert into public.quotations(id, request_id, vendor_id, vendor_name, unit_price, valid_until, note, created_by)
  values (p_id, p_request, p_vendor, vendor.name, p_price, p_valid, btrim(p_note), auth.uid());
end;
$$;

create function public.create_purchase_order(p_request uuid, p_quotation uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  request public.purchase_requests;
  quote public.quotations;
  orders public.purchase_orders;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  select * into request from public.purchase_requests where id = p_request and status = 'approved' for update;
  if not found then raise exception 'Request is unavailable'; end if;

  select * into orders from public.purchase_orders where request_id = p_request and status <> 'cancelled';
  if found then
    if orders.quotation_id = p_quotation then return orders.id; end if;
    raise exception 'An active order already exists';
  end if;
  select * into quote from public.quotations where id = p_quotation and request_id = p_request
    and valid_until >= (now() at time zone 'Asia/Jakarta')::date;
  if not found then raise exception 'Quotation expired or unavailable'; end if;
  perform 1 from public.vendors where id = quote.vendor_id and active for share;
  if not found then raise exception 'Vendor is inactive'; end if;

  insert into public.purchase_orders(request_id, quotation_id, vendor_id, vendor_name, product_id,
    item_name, item_sku, item_unit, quantity, unit_price, created_by)
  values (request.id, quote.id, quote.vendor_id, quote.vendor_name, request.product_id,
    request.item_name, request.item_sku, request.item_unit, request.quantity, quote.unit_price, auth.uid())
  returning * into orders;
  return orders.id;
end;
$$;

create function public.transition_purchase_order(p_order uuid, p_action text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  orders public.purchase_orders;
begin
  if not public.is_procurement_admin() then raise insufficient_privilege; end if;
  select * into orders from public.purchase_orders where id = p_order for update;
  if not found then raise exception 'Order unavailable'; end if;
  if p_action = 'send' and orders.status = 'draft' then
    perform 1 from public.quotations where id = orders.quotation_id
      and valid_until >= (now() at time zone 'Asia/Jakarta')::date;
    if not found then raise exception 'Quotation expired'; end if;
    perform 1 from public.vendors where id = orders.vendor_id and active for share;
    if not found then raise exception 'Vendor is inactive'; end if;
    update public.purchase_orders set status = 'sent', sent_at = now(), sent_by = auth.uid() where id = p_order;
  elsif p_action = 'cancel' and orders.status in ('draft', 'sent') and nullif(btrim(p_reason), '') is not null then
    update public.purchase_orders set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      cancellation_reason = btrim(p_reason) where id = p_order;
  else
    raise exception 'Order transition unavailable';
  end if;
end;
$$;

revoke all on function public.record_quotation(uuid, uuid, uuid, numeric, date, text),
  public.create_purchase_order(uuid, uuid), public.transition_purchase_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_quotation(uuid, uuid, uuid, numeric, date, text),
  public.create_purchase_order(uuid, uuid), public.transition_purchase_order(uuid, text, text) to authenticated;
commit;
