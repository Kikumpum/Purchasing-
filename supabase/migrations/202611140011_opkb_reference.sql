begin;

alter table public.purchase_requests
  add column opkb_number text check (char_length(opkb_number) between 1 and 80),
  add column opkb_date date,
  add column requested_unit text check (char_length(requested_unit) between 1 and 30),
  add column request_note text check (char_length(request_note) between 1 and 500);

create function public.save_request_with_opkb(
  p_id uuid, p_version integer, p_purpose text, p_item text, p_quantity integer,
  p_need_by date, p_product uuid, p_opkb_number text, p_opkb_date date,
  p_requested_unit text, p_note text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing public.purchase_requests;
  saved uuid;
begin
  p_opkb_number := nullif(btrim(p_opkb_number), '');
  p_requested_unit := case when p_product is null then nullif(btrim(p_requested_unit), '') end;
  p_note := nullif(btrim(p_note), '');

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 0));
  select * into existing from public.purchase_requests
    where id = p_id and requester_id = auth.uid();

  -- Reuse the role, ownership, version, and draft checks in the existing save.
  saved := public.save_catalog_request(
    p_id, p_version, p_purpose, p_item, p_quantity, p_need_by, p_product
  );
  if existing.id is not null and p_version is null then
    if (existing.opkb_number, existing.opkb_date, existing.requested_unit, existing.request_note)
      is distinct from (p_opkb_number, p_opkb_date, p_requested_unit, p_note) then
      raise exception using errcode = 'P0001', message = 'Request changed or unavailable';
    end if;
    return saved;
  end if;

  update public.purchase_requests
    set opkb_number = p_opkb_number, opkb_date = p_opkb_date,
        requested_unit = p_requested_unit, request_note = p_note
    where id = saved;
  return saved;
end;
$$;

revoke all on function public.save_request_with_opkb(
  uuid, integer, text, text, integer, date, uuid, text, date, text, text
) from public, anon, authenticated;
grant execute on function public.save_request_with_opkb(
  uuid, integer, text, text, integer, date, uuid, text, date, text, text
) to authenticated;

commit;
