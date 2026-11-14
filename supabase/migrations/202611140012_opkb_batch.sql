begin;

create function public.create_opkb_drafts(p_rows jsonb, p_opkb_number text, p_opkb_date date)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  item record;
  item_count integer;
  unique_count integer;
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Expected an array of items';
  end if;
  item_count := jsonb_array_length(p_rows);
  if item_count not between 2 and 30 or nullif(btrim(p_opkb_number), '') is null then
    raise exception using errcode = '22023', message = 'Invalid OPKB batch';
  end if;
  select count(distinct entry ->> 'id') into unique_count from jsonb_array_elements(p_rows) as rows(entry);
  if unique_count <> item_count then
    raise exception using errcode = '22023', message = 'Invalid item IDs';
  end if;

  for item in
    select * from jsonb_to_recordset(p_rows) as row(
      id uuid, purpose text, item_name text, quantity integer, need_by date,
      product uuid, requested_unit text, note text
    ) order by id
  loop
    perform public.save_request_with_opkb(item.id, null, item.purpose, item.item_name,
      item.quantity, item.need_by, item.product, p_opkb_number, p_opkb_date, item.requested_unit, item.note);
  end loop;
end;
$$;

revoke all on function public.create_opkb_drafts(jsonb, text, date) from public, anon, authenticated;
grant execute on function public.create_opkb_drafts(jsonb, text, date) to authenticated;

commit;
