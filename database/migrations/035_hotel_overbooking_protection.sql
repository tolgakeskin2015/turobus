-- TUROBUS PMS
-- Enterprise Overbooking Protection Engine
--
-- Koruma DB seviyesindedir.
-- CRM / PMS / Web / Channel Manager fark etmeksizin
-- hotel_reservations tablosuna gelen tüm satışları korur.

alter table public.hotel_room_types
  add column if not exists overbooking_limit integer not null default 0;

alter table public.hotel_room_types
  add column if not exists stop_sell boolean not null default false;

alter table public.hotel_room_types
  add column if not exists stop_sell_reason text;


-- ============================================================
-- AVAILABILITY CHECK
-- ============================================================

create or replace function public.hotel_check_room_type_availability(
  p_company_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_exclude_reservation_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_type public.hotel_room_types%rowtype;

  v_physical_rooms integer := 0;
  v_inventory integer := 0;
  v_reserved integer := 0;
  v_available integer := 0;
begin

  if p_check_in is null or p_check_out is null then
    raise exception 'Giriş ve çıkış tarihleri zorunludur.';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Çıkış tarihi giriş tarihinden sonra olmalıdır.';
  end if;

  select *
  into v_room_type
  from public.hotel_room_types
  where id = p_room_type_id
    and company_id = p_company_id
    and hotel_id = p_hotel_id;

  if not found then
    raise exception 'Oda tipi bulunamadı.';
  end if;

  if coalesce(v_room_type.stop_sell, false) then
    return jsonb_build_object(
      'available', false,
      'stop_sell', true,
      'reason',
        coalesce(
          v_room_type.stop_sell_reason,
          'Bu oda tipi satışa kapalı.'
        ),
      'inventory', 0,
      'reserved', 0,
      'remaining', 0
    );
  end if;

  -- Gerçek fiziksel oda sayısı.
  -- Bakım / kullanım dışı / bloke odalar satış kapasitesine dahil edilmez.
  select count(*)
  into v_physical_rooms
  from public.hotel_rooms r
  where r.company_id = p_company_id
    and r.hotel_id = p_hotel_id
    and r.room_type_id = p_room_type_id
    and r.is_active = true
    and coalesce(r.room_status, 'available')
      not in (
        'maintenance',
        'out_of_order',
        'blocked'
      );

  -- Eğer total_rooms tanımlıysa en güvenli olan düşük kapasiteyi kullan.
  if coalesce(v_room_type.total_rooms, 0) > 0
     and v_physical_rooms > 0 then

    v_inventory :=
      least(
        v_room_type.total_rooms,
        v_physical_rooms
      );

  elsif coalesce(v_room_type.total_rooms, 0) > 0 then

    v_inventory :=
      v_room_type.total_rooms;

  else

    v_inventory :=
      v_physical_rooms;

  end if;

  -- Kontrollü overbooking kotası varsa kapasiteye eklenir.
  v_inventory :=
    greatest(
      0,
      v_inventory +
      greatest(
        coalesce(
          v_room_type.overbooking_limit,
          0
        ),
        0
      )
    );

  select count(*)
  into v_reserved
  from public.hotel_reservations r
  where r.company_id = p_company_id
    and r.hotel_id = p_hotel_id
    and r.room_type_id = p_room_type_id
    and r.deleted_at is null
    and r.status in (
      'pending',
      'confirmed',
      'checked_in'
    )
    and r.check_in < p_check_out
    and r.check_out > p_check_in
    and (
      p_exclude_reservation_id is null
      or r.id <> p_exclude_reservation_id
    );

  v_available :=
    greatest(
      v_inventory - v_reserved,
      0
    );

  return jsonb_build_object(
    'available',
      v_reserved < v_inventory,

    'stop_sell',
      false,

    'inventory',
      v_inventory,

    'reserved',
      v_reserved,

    'remaining',
      v_available,

    'physical_rooms',
      v_physical_rooms,

    'overbooking_limit',
      coalesce(
        v_room_type.overbooking_limit,
        0
      )
  );

end;
$$;

grant execute
on function public.hotel_check_room_type_availability(
  uuid,
  uuid,
  uuid,
  date,
  date,
  uuid
)
to authenticated;


-- ============================================================
-- HARD PROTECTION TRIGGER
-- ============================================================

create or replace function public.hotel_enforce_overbooking_protection()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_result jsonb;
begin

  -- Satış kapasitesini etkilemeyen statüler kontrol edilmez.
  if new.status not in (
    'pending',
    'confirmed',
    'checked_in'
  ) then
    return new;
  end if;

  v_result :=
    public.hotel_check_room_type_availability(
      new.company_id,
      new.hotel_id,
      new.room_type_id,
      new.check_in,
      new.check_out,
      new.id
    );

  if coalesce(
    (v_result ->> 'stop_sell')::boolean,
    false
  ) then
    raise exception
      'STOP SELL: %',
      coalesce(
        v_result ->> 'reason',
        'Oda tipi satışa kapalı.'
      );
  end if;

  if not coalesce(
    (v_result ->> 'available')::boolean,
    false
  ) then
    raise exception
      'OVERBOOKING ENGELLENDİ: Bu oda tipinde belirtilen tarihler için müsait kontenjan kalmadı. Kapasite: %, mevcut rezervasyon: %.',
      coalesce(
        (v_result ->> 'inventory')::integer,
        0
      ),
      coalesce(
        (v_result ->> 'reserved')::integer,
        0
      );
  end if;

  return new;

end;
$$;


drop trigger if exists
  trg_hotel_overbooking_protection
on public.hotel_reservations;


create trigger trg_hotel_overbooking_protection
before insert or update of
  hotel_id,
  room_type_id,
  check_in,
  check_out,
  status
on public.hotel_reservations
for each row
execute function
  public.hotel_enforce_overbooking_protection();


-- ============================================================
-- OVERBOOKING RISK VIEW
-- ============================================================

create or replace view public.hotel_overbooking_risk as

select
  rt.company_id,
  rt.hotel_id,
  rt.id as room_type_id,
  rt.name as room_type_name,

  coalesce(
    rt.total_rooms,
    0
  ) as configured_inventory,

  coalesce(
    rt.overbooking_limit,
    0
  ) as overbooking_limit,

  coalesce(
    rt.stop_sell,
    false
  ) as stop_sell,

  count(r.id) filter (
    where
      r.deleted_at is null
      and r.status in (
        'pending',
        'confirmed',
        'checked_in'
      )
  ) as active_reservation_count

from public.hotel_room_types rt

left join public.hotel_reservations r
  on r.company_id = rt.company_id
  and r.hotel_id = rt.hotel_id
  and r.room_type_id = rt.id

group by
  rt.company_id,
  rt.hotel_id,
  rt.id,
  rt.name,
  rt.total_rooms,
  rt.overbooking_limit,
  rt.stop_sell;


grant select
on public.hotel_overbooking_risk
to authenticated;
