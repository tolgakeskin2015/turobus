-- TUROBUS PMS
-- Professional atomic check-out engine

create or replace function public.hotel_check_out_v2(
  p_company_id uuid,
  p_reservation_id uuid
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

  if v_reservation.status = 'checked_out' then
    return jsonb_build_object(
      'success', true,
      'already_checked_out', true,
      'reservation_id', v_reservation.id,
      'reservation_no', v_reservation.reservation_no,
      'status', v_reservation.status
    );
  end if;

  if v_reservation.status <> 'checked_in' then
    raise exception
      'Sadece konaklayan rezervasyonlar check-out yapılabilir. Mevcut durum: %',
      v_reservation.status;
  end if;

  if v_reservation.room_id is null then
    raise exception
      'Rezervasyona atanmış fiziksel oda bulunamadı.';
  end if;

  select *
  into v_room
  from public.hotel_rooms
  where id = v_reservation.room_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Rezervasyona bağlı oda bulunamadı.';
  end if;

  update public.hotel_reservations
  set
    status = 'checked_out',
    updated_at = now()
  where id = v_reservation.id
    and company_id = p_company_id;

  update public.hotel_rooms
  set
    room_status = 'available',
    housekeeping_status = 'dirty',
    updated_at = now()
  where id = v_room.id
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
    'checked_out',
    'Check-out tamamlandı. Oda housekeeping için dirty durumuna alındı. Oda: ' ||
      coalesce(v_room.room_number, '-')
  );

  return jsonb_build_object(
    'success', true,
    'already_checked_out', false,
    'reservation_id', v_reservation.id,
    'reservation_no', v_reservation.reservation_no,
    'room_id', v_room.id,
    'room_number', v_room.room_number,
    'status', 'checked_out',
    'room_status', 'available',
    'housekeeping_status', 'dirty'
  );

end;
$$;

grant execute
on function public.hotel_check_out_v2(uuid, uuid)
to authenticated;
