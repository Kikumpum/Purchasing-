begin;

create function public.approve_opkb_requests(p_reference text, p_ids uuid[], p_versions integer[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  item record;
  item_count integer := coalesce(cardinality(p_ids), 0);
begin
  if p_reference is null or char_length(btrim(p_reference)) not between 1 and 80
    or item_count not between 1 and 25 or cardinality(p_versions) is distinct from item_count
    or (select count(distinct id) from unnest(p_ids) as ids(id)) <> item_count then
    raise invalid_parameter_value;
  end if;

  for item in select * from unnest(p_ids, p_versions) as selected(id, version) order by id
  loop
    if item.version is null or not exists (
      select 1 from public.purchase_requests
      where id = item.id and version = item.version and opkb_number = btrim(p_reference)
    ) then
      raise exception 'Request changed or unavailable';
    end if;
    perform public.transition_purchase_request(item.id, item.version, 'approve', '');
  end loop;
end;
$$;

revoke all on function public.approve_opkb_requests(text, uuid[], integer[]) from public, anon, authenticated;
grant execute on function public.approve_opkb_requests(text, uuid[], integer[]) to authenticated;

commit;
