create or replace function public.hotel_check_in(
  p_reservation_id uuid,
  p_company_id uuid
)
returns public.hotel_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations;
  v_room public.hotel_rooms;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_reservation_id::text, 0)
  );

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Rezervasyon bulunamadı.';
  end if;

  if not public.is_company_member(
    v_reservation.company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  if v_reservation.status = 'checked_in' then
    raise exception
      'Bu rezervasyon için daha önce check-in yapılmış.';
  end if;

  if v_reservation.status in (
    'checked_out',
    'cancelled',
    'no_show'
  ) then
    raise exception
      'Bu rezervasyon check-in işlemine uygun değil.';
  end if;

  if v_reservation.room_id is null then
    raise exception
      'Check-in öncesinde fiziksel oda atanmalıdır.';
  end if;

  select *
  into v_room
  from public.hotel_rooms
  where id = v_reservation.room_id
    and company_id = v_reservation.company_id
    and hotel_id = v_reservation.hotel_id
  for update;

  if not found then
    raise exception
      'Rezervasyona atanmış oda bulunamadı.';
  end if;

  if v_room.room_status in (
    'maintenance',
    'out_of_order',
    'blocked'
  ) then
    raise exception
      'Seçilen oda bakımda, bloke veya kullanım dışı.';
  end if;

  if exists (
    select 1
    from public.hotel_reservations r
    where r.company_id =
      v_reservation.company_id
      and r.room_id =
        v_reservation.room_id
      and r.status = 'checked_in'
      and r.id <> v_reservation.id
  ) then
    raise exception
      'Seçilen odada halen konaklayan başka bir misafir bulunuyor.';
  end if;

  update public.hotel_reservations
  set
    status = 'checked_in',
    updated_at = now()
  where id = v_reservation.id
  returning *
  into v_reservation;

  update public.hotel_rooms
  set
    room_status = 'occupied',
    housekeeping_status = 'clean',
    updated_at = now()
  where id = v_reservation.room_id;

  return v_reservation;
end;
$$;


create or replace function public.hotel_check_out(
  p_reservation_id uuid,
  p_company_id uuid
)
returns public.hotel_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(p_reservation_id::text, 0)
  );

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Rezervasyon bulunamadı.';
  end if;

  if not public.is_company_member(
    v_reservation.company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  if v_reservation.status =
    'checked_out' then
    raise exception
      'Bu rezervasyon için daha önce check-out yapılmış.';
  end if;

  if v_reservation.status <>
    'checked_in' then
    raise exception
      'Check-out işlemi yalnızca konaklayan rezervasyonlarda yapılabilir.';
  end if;

  update public.hotel_reservations
  set
    status = 'checked_out',
    updated_at = now()
  where id = v_reservation.id
  returning *
  into v_reservation;

  if v_reservation.room_id is not null then
    update public.hotel_rooms
    set
      room_status = 'available',
      housekeeping_status = 'dirty',
      updated_at = now()
    where id = v_reservation.room_id
      and company_id =
        v_reservation.company_id;
  end if;

  return v_reservation;
end;
$$;


grant execute
on function public.hotel_check_in(uuid, uuid)
to authenticated;

grant execute
on function public.hotel_check_out(uuid, uuid)
to authenticated;
