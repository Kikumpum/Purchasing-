begin;

alter table public.purchase_requests drop constraint purchase_requests_status_check;
alter table public.purchase_requests add constraint purchase_requests_status_check
  check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'revision_requested', 'cancelled'));

alter policy request_read on public.purchase_requests using (exists (
  select 1 from public.profiles actor
  where actor.id = (select auth.uid()) and actor.active and (
    actor.id = requester_id
    or (actor.role = 'manager' and actor.department_id = purchase_requests.department_id
      and status <> 'draft' and (status <> 'cancelled' or approver_id is not null))
    or (actor.role = 'admin_procurement' and status = 'approved')
  )
));

create function public.withdraw_purchase_request(p_id uuid, p_version integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor public.profiles;
  previous public.purchase_requests;
  reason text := nullif(btrim(p_reason), '');
begin
  select * into actor from public.profiles where id = auth.uid() and active for share;
  if actor.id is null or actor.role <> 'employee' then raise insufficient_privilege; end if;

  select * into previous from public.purchase_requests
    where id = p_id and requester_id = actor.id and department_id = actor.department_id for update;
  if not found or previous.version is distinct from p_version
    or previous.status not in ('draft', 'pending_approval', 'revision_requested') then
    raise exception 'Request changed or unavailable';
  end if;
  if (previous.status <> 'draft' and reason is null) or char_length(reason) > 500 then
    raise invalid_parameter_value;
  end if;

  update public.purchase_requests set status = 'cancelled', version = version + 1 where id = p_id;
  insert into public.purchase_request_status_history(request_id, actor_id, status, note)
  values (p_id, actor.id, 'cancelled', coalesce(reason, 'Draft dibuang oleh pemohon.'));
end;
$$;

revoke all on function public.withdraw_purchase_request(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.withdraw_purchase_request(uuid, integer, text) to authenticated;

commit;
