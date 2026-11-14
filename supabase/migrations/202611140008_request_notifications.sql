begin;

create table public.request_notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id),
  request_id uuid not null references public.purchase_requests(id),
  history_id bigint not null references public.purchase_request_status_history(id),
  status text not null check (status in ('pending_approval', 'approved', 'rejected', 'revision_requested')),
  created_at timestamptz not null,
  read_at timestamptz,
  unique (recipient_id, history_id)
);
create index request_notifications_recipient_idx on public.request_notifications(recipient_id, created_at desc, id desc);

alter table public.request_notifications enable row level security;
revoke all on public.request_notifications from public, anon, authenticated;
grant select on public.request_notifications to authenticated;
create policy request_notifications_self on public.request_notifications for select to authenticated using (
  recipient_id = (select auth.uid()) and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.active
  )
);

create function public.notify_request_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  select case when new.status = 'pending_approval' then approver_id else requester_id end
    into recipient from public.purchase_requests where id = new.request_id;
  if recipient is not null then
    insert into public.request_notifications(recipient_id, request_id, history_id, status, created_at)
    values (recipient, new.request_id, new.id, new.status, new.created_at);
  end if;
  return new;
end;
$$;
revoke all on function public.notify_request_status() from public, anon, authenticated;

create trigger notify_request_status after insert on public.purchase_request_status_history
for each row when (new.status in ('pending_approval', 'approved', 'rejected', 'revision_requested'))
execute function public.notify_request_status();

create function public.mark_request_notification_read(p_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.request_notifications n set read_at = now()
  where n.id = p_id and n.recipient_id = auth.uid() and n.read_at is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
end;
$$;
revoke all on function public.mark_request_notification_read(bigint) from public, anon, authenticated;
grant execute on function public.mark_request_notification_read(bigint) to authenticated;
commit;
