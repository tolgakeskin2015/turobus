-- TUROBUS PMS
-- Check-in sırasında fiziksel oda atama motoru

create or replace function public.hotel_check_in_with_room(
  p_company_id uuid,
  p_reservation_id uuid,
  p_room_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations%rowtype;
  v_room public.hotel_rooms%rowtype;
begin

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Rezervasyon bulunamadı.';
  end if;

  if v_reservation.status = 'checked_in' then
    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'reservation_id', v_reservation.id,
      'room_id', v_reservation.room_id
    );
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception
      'Rezervasyon check-in işlemine uygun değil. Durum: %',
      v_reservation.status;
  end if;

  select *
  into v_room
  from public.hotel_rooms
  where id = p_room_id
    and company_id = p_company_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Seçilen oda bulunamadı.';
  end if;

  if v_room.hotel_id <> v_reservation.hotel_id then
    raise exception 'Seçilen oda rezervasyonun oteline ait değil.';
  end if;

  if v_room.room_type_id <> v_reservation.room_type_id then
    raise exception 'Seçilen oda rezervasyonun oda tipi ile uyuşmuyor.';
  end if;

  if v_room.housekeeping_status not in ('clean', 'inspected') then
    raise exception
      'Seçilen oda check-in için hazır değil. Housekeeping durumu: %',
      v_room.housekeeping_status;
  end if;

  if v_room.room_status = 'occupied' then
    raise exception 'Seçilen oda şu anda dolu.';
  end if;

  if exists (
    select 1
    from public.hotel_reservations r
    where r.company_id = p_company_id
      and r.room_id = p_room_id
      and r.id <> p_reservation_id
      and r.status = 'checked_in'
      and r.deleted_at is null
  ) then
    raise exception 'Seçilen oda başka bir aktif konaklama tarafından kullanılıyor.';
  end if;

  update public.hotel_reservations
  set
    room_id = p_room_id,
    status = 'checked_in',
    updated_at = now()
  where id = p_reservation_id
    and company_id = p_company_id;

  update public.hotel_rooms
  set
    room_status = 'occupied',
    updated_at = now()
  where id = p_room_id
    and company_id = p_company_id;

  insert into public.hotel_reservation_audit_logs (
    company_id,
    reservation_id,
    reservation_no,
    action_type,
    description
  )
  values (
    p_company_id,
    v_reservation.id,
    v_reservation.reservation_no,
    'checked_in',
    'Check-in sırasında fiziksel oda atandı. Oda: ' ||
    coalesce(v_room.room_number, '-')
  );

  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'reservation_id', v_reservation.id,
    'reservation_no', v_reservation.reservation_no,
    'room_id', v_room.id,
    'room_number', v_room.room_number,
    'status', 'checked_in'
  );

end;
$$;

grant execute
on function public.hotel_check_in_with_room(uuid, uuid, uuid)
to authenticated;
