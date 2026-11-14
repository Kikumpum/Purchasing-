begin;
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 50),
  address text not null default '' check (char_length(address) <= 500),
  active boolean not null default true,
  version integer not null default 0 check (version >= 0)
);
alter table public.vendors enable row level security;
revoke all on public.vendors from public, anon, authenticated;
grant select, insert (code, name, email, phone, address),
  update (code, name, email, phone, address, active, version) on public.vendors to authenticated;
create policy vendors_procurement on public.vendors for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role = 'admin_procurement'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role = 'admin_procurement'));
create index purchase_requests_procurement_queue_idx
  on public.purchase_requests (need_by, number) where status = 'approved';
commit;
