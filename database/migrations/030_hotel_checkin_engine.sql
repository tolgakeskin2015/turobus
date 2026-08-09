cd ~/Projects/turobusy -- TUROBUS HOTEL PMS -- Professional atomic check-in 
engine

create or replace function public.hotel_check_in_reservation( echo "===== 
IMPORT BOLUMU ====="  p_company_id uuid, sed -n '1,70p' 
app/dashboard/hotel/channel-manager/page.tsx p_reservation_id uuid ) returns 
jsonb language plpgsql security invoker set search_path = public as $$ 
declare
  v_reservation public.hotel_reservations%rowtype; v_room 
  public.hotel_rooms%rowtype;
echobegin echo "===== SIMULATE KULLANIMI =====" sed -n '500,610p' 
app/dashboard/hotel/channel-manager/page.tsx -- Reservation lock
  select * into v_reservation from public.hotel_reservations where id = 
  p_reservation_id
echo and company_id = p_company_id echo "===== SIMULATE TANIMI ====="  and 
deleted_at is null grep -Rni \ for update;
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=.git \
  "export.*simulateQueueItem\|function simulateQueueItem\|const simulateQueueItem" \
  app lib 2>/dev/null

  if not found then
    raise exception 'Rezervasyon bulunamadı.';
  end if;

  -- Already checked-in = idempotent
  if v_reservation.status = 'checked_in' then
    return jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'reservation_id', v_reservation.id,
      'reservation_no', v_reservation.reservation_no,
      'status', v_reservation.status,
      'room_id', v_reservation.room_id
    );
  end if;

  if v_reservation.status not in ('pending', 'confirmed') then
    raise exception
      'Bu rezervasyon check-in işlemine uygun değil. Mevcut durum: %',
      v_reservation.status;
  end if;

  if v_reservation.room_id is null then
    raise exception
      'Check-in yapmadan önce rezervasyona fiziksel oda atanmalıdır.';
  end if;

  -- Room lock
  select *
  into v_room
  from public.hotel_rooms
  where id = v_reservation.room_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Rezervasyona atanmış oda bulunamadı.';
  end if;

  -- Another checked-in reservation cannot occupy same room
  if exists (
    select 1
    from public.hotel_reservations r
    where r.company_id = p_company_id
      and r.room_id = v_reservation.room_id
      and r.id <> v_reservation.id
      and r.status = 'checked_in'
      and r.deleted_at is null
  ) then
    raise exception
      'Bu oda başka bir aktif konaklama tarafından kullanılıyor.';
  end if;

  -- Reservation becomes checked-in
  update public.hotel_reservations
  set
    status = 'checked_in',
    updated_at = now()
  where id = v_reservation.id
    and company_id = p_company_id;

  -- Physical room becomes occupied.
  -- Housekeeping status intentionally stays unchanged:
  -- a clean/inspected room must not become dirty merely because guest checked in.
  update public.hotel_rooms
  set
    room_status = 'occupied',
    updated_at = now()
  where id = v_room.id
    and company_id = p_company_id;

  -- PMS audit trail
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
    'Misafir check-in işlemi tamamlandı. Oda: ' ||
      coalesce(v_room.room_number, '-')
  );

  return jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'reservation_id', v_reservation.id,
    'reservation_no', v_reservation.reservation_no,
    'status', 'checked_in',
    'room_id', v_room.id,
    'room_number', v_room.room_number
  );

end;
$$;

grant execute
on function public.hotel_check_in_reservation(uuid, uuid)
to authenticated;
