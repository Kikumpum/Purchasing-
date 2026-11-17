begin;

create table public.warehouse_account_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 3 and 254),
  status text not null default 'pending' check (status in ('pending', 'invited', 'declined')),
  submitted_at timestamptz not null default now()
);

alter table public.warehouse_account_requests enable row level security;
revoke all on public.warehouse_account_requests from public, anon, authenticated;

create unique index warehouse_account_requests_pending_email_idx
  on public.warehouse_account_requests(email) where status = 'pending';
create index warehouse_account_requests_submitted_at_idx
  on public.warehouse_account_requests(submitted_at);

create function public.submit_warehouse_account_request(p_name text, p_email text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  applicant_name text := btrim(p_name);
  applicant_email text := lower(btrim(p_email));
begin
  if applicant_name is null or char_length(applicant_name) not between 2 and 120
    or applicant_name ~ '[[:cntrl:]]'
    or applicant_email is null or char_length(applicant_email) > 254
    or applicant_email !~ '^[A-Za-z0-9._%+!#$&''*/=?^{}|~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'
  then
    raise exception 'Invalid warehouse account request' using errcode = '22023';
  end if;

  -- Keep the shared submission limit and deduplication atomic across instances.
  perform pg_advisory_xact_lock(632644859284836394);
  if (
    select count(*) from (
      select 1 from public.warehouse_account_requests
      where submitted_at >= now() - interval '1 hour'
      limit 100
    ) as recent
  ) >= 100 then
    return false;
  end if;

  insert into public.warehouse_account_requests (name, email)
  values (applicant_name, applicant_email)
  on conflict (email) where status = 'pending' do nothing;
  return true;
end;
$$;

revoke all on function public.submit_warehouse_account_request(text, text) from public, anon, authenticated;
grant execute on function public.submit_warehouse_account_request(text, text) to anon, authenticated;

create function public.warehouse_account_requests_available()
returns boolean language sql stable set search_path = ''
as $$ select true $$;

revoke all on function public.warehouse_account_requests_available() from public, anon, authenticated;
grant execute on function public.warehouse_account_requests_available() to anon, authenticated;

commit;
