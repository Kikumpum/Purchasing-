begin;

alter table public.stock_movements
  add column recipient text check (char_length(btrim(recipient)) between 1 and 160),
  add column shipping_reference text check (char_length(btrim(shipping_reference)) between 1 and 120),
  add constraint stock_movement_handover_scope check (
    (recipient is null and shipping_reference is null)
    or (recipient is not null and reservation_id is not null)
  );

create function public.issue_reserved_stock_with_handover(
  p_id uuid, p_reservation uuid, p_quantity integer, p_note text,
  p_recipient text, p_shipping_reference text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous public.stock_movements;
begin
  p_recipient := nullif(btrim(p_recipient), '');
  p_shipping_reference := nullif(btrim(p_shipping_reference), '');
  if p_recipient is null then raise invalid_parameter_value; end if;

  -- Serialize with existing issue calls before checking whether this is a replay.
  perform 1 from public.stock_reservations where id = p_reservation for update;
  select * into previous from public.stock_movements where id = p_id;
  perform public.issue_reserved_stock(p_id, p_reservation, p_quantity, p_note);

  if previous.id is not null then
    if (previous.recipient, previous.shipping_reference) is distinct from (p_recipient, p_shipping_reference) then
      raise exception 'Handover details differ from the existing movement';
    end if;
    return;
  end if;

  update public.stock_movements
    set recipient = p_recipient, shipping_reference = p_shipping_reference
    where id = p_id;
end;
$$;

revoke all on function public.issue_reserved_stock_with_handover(uuid, uuid, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.issue_reserved_stock_with_handover(uuid, uuid, integer, text, text, text)
  to authenticated;

commit;
