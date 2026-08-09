-- TUROBUS PMS
-- Enterprise Room Assignment Engine
-- Oda ataması atomik, tarih kontrollü ve audit log'ludur.

create or replace function public.hotel_assign_reservation_room(
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
  v_conflict record;
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

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception
      'Oda planlama yalnızca bekleyen veya onaylı rezervasyonlarda yapılabilir. Durum: %',
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
    raise exception 'Oda bulunamadı.';
  end if;

  if v_room.hotel_id <> v_reservation.hotel_id then
    raise exception 'Rezervasyon farklı bir otelin odasına atanamaz.';
  end if;

  if v_room.room_type_id <> v_reservation.room_type_id then
    raise exception 'Rezervasyon yalnızca kendi oda tipindeki fiziksel odaya atanabilir.';
  end if;

  if v_room.room_status in ('maintenance', 'out_of_order', 'blocked') then
    raise exception
      'Oda operasyonel olarak kullanılamıyor. Durum: %',
      v_room.room_status;
  end if;

  select
    r.id,
    r.reservation_no,
    r.check_in,
    r.check_out
  into v_conflict
  from public.hotel_reservations r
  where r.company_id = p_company_id
    and r.room_id = p_room_id
    and r.id <> p_reservation_id
    and r.deleted_at is null
    and r.status in ('pending', 'confirmed', 'checked_in')
    and r.check_in < v_reservation.check_out
    and r.check_out > v_reservation.check_in
  order by r.check_in
  limit 1;

  if found then
    raise exception
      'Oda %, % numaralı rezervasyon nedeniyle % - % tarihleri arasında dolu.',
      v_room.room_number,
      v_conflict.reservation_no,
      v_conflict.check_in,
      v_conflict.check_out;
  end if;

  update public.hotel_reservations
  set
    room_id = p_room_id,
    updated_at = now()
  where id = p_reservation_id
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
    'room_assigned',
    'Fiziksel oda atandı. Oda: ' || coalesce(v_room.room_number, '-')
  );

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'reservation_no', v_reservation.reservation_no,
    'room_id', v_room.id,
    'room_number', v_room.room_number
  );

end;
$$;

grant execute
on function public.hotel_assign_reservation_room(uuid, uuid, uuid)
to authenticated;


create or replace function public.hotel_unassign_reservation_room(
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
  v_old_room_number text;
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

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception
      'Konaklama başlamış rezervasyonun odası bu işlemle kaldırılamaz.';
  end if;

  if v_reservation.room_id is not null then
    select room_number
    into v_old_room_number
    from public.hotel_rooms
    where id = v_reservation.room_id
      and company_id = p_company_id;
  end if;

  update public.hotel_reservations
  set
    room_id = null,
    updated_at = now()
  where id = p_reservation_id
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
    'room_unassigned',
    'Fiziksel oda ataması kaldırıldı. Önceki oda: ' ||
      coalesce(v_old_room_number, '-')
  );

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation.id,
    'reservation_no', v_reservation.reservation_no
  );

end;
$$;

grant execute
on function public.hotel_unassign_reservation_room(uuid, uuid)
to authenticated;
