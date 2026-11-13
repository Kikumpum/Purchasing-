begin;

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  department_id uuid not null references public.departments(id),
  role text not null check (role in ('employee', 'manager', 'admin_procurement', 'warehouse')),
  active boolean not null default true
);

alter table public.departments add column approver_id uuid references public.profiles(id);

create sequence public.purchase_request_number_seq;

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),
  number bigint not null unique default nextval('public.purchase_request_number_seq'),
  requester_id uuid not null references public.profiles(id),
  department_id uuid not null references public.departments(id),
  approver_id uuid references public.profiles(id),
  purpose text not null check (char_length(btrim(purpose)) between 1 and 500),
  item_name text not null check (char_length(btrim(item_name)) between 1 and 160),
  quantity integer not null check (quantity between 1 and 1000000),
  need_by date not null check (isfinite(need_by)),
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested')),
  version integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.purchase_request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.purchase_requests(id),
  actor_id uuid not null references public.profiles(id),
  status text not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index purchase_requests_requester_idx on public.purchase_requests(requester_id, created_at desc);
create index purchase_requests_department_idx on public.purchase_requests(department_id, created_at desc);
create index purchase_request_history_idx on public.purchase_request_status_history(request_id, id);

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_request_status_history enable row level security;

revoke all on public.departments, public.profiles, public.purchase_requests,
  public.purchase_request_status_history from public, anon, authenticated;
revoke all on sequence public.purchase_request_number_seq,
  public.purchase_request_status_history_id_seq from public, anon, authenticated;

grant select on public.profiles, public.purchase_requests, public.purchase_request_status_history to authenticated;

create policy profile_self on public.profiles for select to authenticated
  using (id = (select auth.uid()) and active);

create policy request_read on public.purchase_requests for select to authenticated
  using (exists (
    select 1 from public.profiles as actor
    where actor.id = (select auth.uid()) and actor.active and (
      actor.id = requester_id
      or (actor.role = 'manager' and actor.department_id = purchase_requests.department_id and status <> 'draft')
      or (actor.role = 'admin_procurement' and status = 'approved')
    )
  ));

create policy history_read on public.purchase_request_status_history for select to authenticated
  using (exists (
    select 1 from public.purchase_requests
    where id = purchase_request_status_history.request_id
  ));

create function public.save_purchase_request(
  p_id uuid, p_version integer, p_purpose text, p_item text, p_quantity integer, p_need_by date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  saved_id uuid;
begin
  select * into actor from public.profiles where id = auth.uid() and active for share;
  if actor.id is null or actor.role <> 'employee' or p_id is null then
    raise exception using errcode = '42501', message = 'Request access denied';
  end if;

  if p_version is null then
    insert into public.purchase_requests (id, requester_id, department_id, purpose, item_name, quantity, need_by)
    values (p_id, actor.id, actor.department_id, btrim(p_purpose), btrim(p_item), p_quantity, p_need_by)
    on conflict (id) do nothing
    returning id into saved_id;

    if saved_id is not null then
      insert into public.purchase_request_status_history(request_id, actor_id, status)
      values (saved_id, actor.id, 'draft');
      return saved_id;
    end if;

    select id into saved_id from public.purchase_requests
    where id = p_id and requester_id = actor.id and version = 0 and
      purpose = btrim(p_purpose) and item_name = btrim(p_item) and quantity = p_quantity and need_by = p_need_by;
  else
    update public.purchase_requests
    set purpose = btrim(p_purpose), item_name = btrim(p_item), quantity = p_quantity,
        need_by = p_need_by, version = version + 1
    where id = p_id and requester_id = actor.id and department_id = actor.department_id and
      version = p_version and status in ('draft', 'revision_requested')
    returning id into saved_id;
  end if;

  if saved_id is null then
    raise exception using errcode = 'P0001', message = 'Request changed or unavailable';
  end if;

  return saved_id;
end;
$$;

create function public.transition_purchase_request(p_id uuid, p_version integer, p_action text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor public.profiles;
  pr public.purchase_requests;
  next_status text;
  approver uuid;
  clean_note text := nullif(btrim(p_note), '');
begin
  select * into actor from public.profiles where id = auth.uid() and active for share;
  if actor.id is null then
    raise exception using errcode = '42501', message = 'Request access denied';
  end if;

  select * into pr from public.purchase_requests where id = p_id for update;
  if pr.id is null or pr.version is distinct from p_version then
    raise exception using errcode = 'P0001', message = 'Request changed or unavailable';
  end if;
  approver := pr.approver_id;

  if p_action = 'submit' and actor.role = 'employee' and pr.requester_id = actor.id
     and pr.department_id = actor.department_id and pr.status in ('draft', 'revision_requested') then
    select manager.id into approver
    from public.departments as department
    join public.profiles as manager on manager.id = department.approver_id
    where department.id = pr.department_id and manager.department_id = department.id
      and manager.active and manager.role = 'manager' and manager.id <> actor.id
    for share of department, manager;
    if approver is null then
      raise exception using errcode = 'P0002', message = 'Department approver missing';
    end if;
    next_status := 'pending_approval';
  elsif actor.role = 'manager' and pr.approver_id = actor.id and pr.requester_id <> actor.id
    and pr.department_id = actor.department_id and pr.status = 'pending_approval' then
    next_status := case p_action
      when 'approve' then 'approved'
      when 'reject' then 'rejected'
      when 'revise' then 'revision_requested'
    end;
  end if;

  if next_status is null then
    raise exception using errcode = '42501', message = 'Request transition denied';
  end if;
  if next_status in ('rejected', 'revision_requested') and clean_note is null then
    raise exception using errcode = '22023', message = 'Decision note required';
  end if;

  update public.purchase_requests
  set status = next_status, approver_id = approver, version = version + 1
  where id = pr.id;

  insert into public.purchase_request_status_history(request_id, actor_id, status, note)
  values (pr.id, actor.id, next_status, clean_note);
end;
$$;

revoke all on function public.save_purchase_request(uuid, integer, text, text, integer, date) from public, anon, authenticated;
revoke all on function public.transition_purchase_request(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.save_purchase_request(uuid, integer, text, text, integer, date) to authenticated;
grant execute on function public.transition_purchase_request(uuid, integer, text, text) to authenticated;

commit;
