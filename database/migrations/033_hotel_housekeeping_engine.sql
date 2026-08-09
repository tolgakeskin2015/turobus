-- TUROBUS PMS
-- Professional Housekeeping Engine

create or replace function public.hotel_housekeeping_update_status(
  p_company_id uuid,
  p_room_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room public.hotel_rooms%rowtype;
begin

  if p_status not in (
    'dirty',
    'cleaning',
    'clean',
    'inspected',
    'out_of_order'
  ) then
    raise exception 'Geçersiz housekeeping durumu: %', p_status;
  end if;

  select *
  into v_room
  from public.hotel_rooms
  where id = p_room_id
    and company_id = p_company_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Oda bulunamadı.';
  end if;

  -- Dolu oda temizlenebilir ancak inspected yapılamaz.
  if
    p_status = 'inspected'
    and v_room.room_status = 'occupied'
  then
    raise exception
      'Konaklama devam eden oda inspected durumuna alınamaz.';
  end if;

  update public.hotel_rooms
  set
    housekeeping_status = p_status,
    updated_at = now()
  where id = p_room_id
    and company_id = p_company_id;

  return jsonb_build_object(
    'success', true,
    'room_id', v_room.id,
    'room_number', v_room.room_number,
    'room_status', v_room.room_status,
    'housekeeping_status', p_status
  );

end;
$$;

grant execute
on function public.hotel_housekeeping_update_status(uuid, uuid, text)
to authenticated;


create or replace function public.hotel_housekeeping_start_cleaning(
  p_company_id uuid,
  p_room_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.hotel_housekeeping_update_status(
    p_company_id,
    p_room_id,
    'cleaning'
  );
$$;

grant execute
on function public.hotel_housekeeping_start_cleaning(uuid, uuid)
to authenticated;


create or replace function public.hotel_housekeeping_mark_clean(
  p_company_id uuid,
  p_room_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.hotel_housekeeping_update_status(
    p_company_id,
    p_room_id,
    'clean'
  );
$$;

grant execute
on function public.hotel_housekeeping_mark_clean(uuid, uuid)
to authenticated;


create or replace function public.hotel_housekeeping_inspect_room(
  p_company_id uuid,
  p_room_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select public.hotel_housekeeping_update_status(
    p_company_id,
    p_room_id,
    'inspected'
  );
$$;

grant execute
on function public.hotel_housekeeping_inspect_room(uuid, uuid)
to authenticated;
