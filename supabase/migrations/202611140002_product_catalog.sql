begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (sku ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  unit text not null check (char_length(btrim(unit)) between 1 and 30),
  active boolean not null default true,
  version integer not null default 0
);

alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated;
grant select, insert (sku, name, unit), update (sku, name, unit, active, version)
  on public.products to authenticated;

create policy catalog_read on public.products for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and (products.active or p.role = 'admin_procurement'))
);

create policy catalog_create on public.products for insert to authenticated with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin_procurement')
);

create policy catalog_update on public.products for update to authenticated using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin_procurement')
) with check (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin_procurement')
);

alter table public.purchase_requests
  add column product_id uuid references public.products(id),
  add column item_sku text,
  add column item_unit text,
  add constraint request_product_snapshot check (
    (product_id is null and item_sku is null and item_unit is null)
    or (product_id is not null and item_sku is not null and item_unit is not null)
  );

alter function public.save_purchase_request(uuid, integer, text, text, integer, date)
  rename to save_purchase_request_base;
revoke all on function public.save_purchase_request_base(uuid, integer, text, text, integer, date)
  from public, anon, authenticated;

create function public.save_catalog_request(
  p_id uuid, p_version integer, p_purpose text, p_item text, p_quantity integer, p_need_by date, p_product uuid
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  existing public.purchase_requests;
  product public.products;
  saved uuid;
begin
  select * into actor from public.profiles where id = auth.uid() and active for share;
  if actor.id is null or actor.role <> 'employee' then
    raise exception using errcode = '42501', message = 'Request access denied';
  end if;

  -- Serialize initial retries and edits for the same request ID.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into existing from public.purchase_requests
    where id = p_id and requester_id = actor.id for update;

  if existing.id is not null and p_version is null
    and existing.product_id is distinct from p_product then
    raise exception using errcode = 'P0001', message = 'Request changed or unavailable';
  end if;

  if p_product is not null then
    if existing.product_id = p_product then
      p_item := existing.item_name;
      product.sku := existing.item_sku;
      product.unit := existing.item_unit;
    else
      select * into product from public.products where id = p_product and active for share;
      if product.id is null then
        raise exception using errcode = '22023', message = 'Product unavailable';
      end if;
      p_item := product.name;
    end if;
  end if;

  saved := public.save_purchase_request_base(p_id, p_version, p_purpose, p_item, p_quantity, p_need_by);
  update public.purchase_requests set product_id = p_product, item_sku = product.sku, item_unit = product.unit
    where id = saved and product_id is distinct from p_product;
  return saved;
end;
$$;

-- Keep the pre-release application usable while the new build rolls out.
create function public.save_purchase_request(
  p_id uuid, p_version integer, p_purpose text, p_item text, p_quantity integer, p_need_by date
)
returns uuid language sql security invoker set search_path = '' as $$
  select public.save_catalog_request(p_id, p_version, p_purpose, p_item, p_quantity, p_need_by, null);
$$;

revoke all on function public.save_catalog_request(uuid, integer, text, text, integer, date, uuid)
  from public, anon, authenticated;
revoke all on function public.save_purchase_request(uuid, integer, text, text, integer, date)
  from public, anon, authenticated;
grant execute on function public.save_catalog_request(uuid, integer, text, text, integer, date, uuid) to authenticated;
grant execute on function public.save_purchase_request(uuid, integer, text, text, integer, date) to authenticated;

commit;
