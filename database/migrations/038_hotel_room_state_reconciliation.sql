-- TUROBUS PMS
-- Enterprise Room State Reconciliation Engine
--
-- Amaç:
-- hotel_reservations ile hotel_rooms arasındaki operasyon durumunu kontrol etmek.
--
-- p_apply = false -> sadece rapor
-- p_apply = true  -> düzeltmeleri uygula

create or replace function public.hotel_reconcile_room_states(
  p_company_id uuid,
  p_hotel_id uuid default null,
  p_apply boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_should_be_occupied integer := 0;
  v_missing_occupied integer := 0;
  v_false_occupied integer := 0;
  v_fixed_occupied integer := 0;
  v_fixed_available integer := 0;
begin

  -- ---------------------------------------------------------
  -- Aktif checked_in rezervasyona bağlı fiziksel oda sayısı
  -- ---------------------------------------------------------

  select count(distinct r.room_id)
  into v_should_be_occupied
  from public.hotel_reservations r
  where r.company_id = p_company_id
    and (
      p_hotel_id is null
      or r.hotel_id = p_hotel_id
    )
    and r.deleted_at is null
    and r.status = 'checked_in'
    and r.room_id is not null;


  -- ---------------------------------------------------------
  -- Checked-in rezervasyon var fakat oda occupied değil
  -- ---------------------------------------------------------

  select count(*)
  into v_missing_occupied
  from public.hotel_rooms room
  where room.company_id = p_company_id

    and (
      p_hotel_id is null
      or room.hotel_id = p_hotel_id
    )

    and room.is_active = true

    and exists (
      select 1
      from public.hotel_reservations r
      where r.company_id = p_company_id
        and r.room_id = room.id
        and r.deleted_at is null
        and r.status = 'checked_in'
    )

    and coalesce(
      room.room_status,
      'available'
    ) <> 'occupied';


  -- ---------------------------------------------------------
  -- Oda occupied fakat aktif checked_in rezervasyon yok
  -- ---------------------------------------------------------

  select count(*)
  into v_false_occupied
  from public.hotel_rooms room
  where room.company_id = p_company_id

    and (
      p_hotel_id is null
      or room.hotel_id = p_hotel_id
    )

    and room.is_active = true

    and room.room_status = 'occupied'

    and not exists (
      select 1
      from public.hotel_reservations r
      where r.company_id = p_company_id
        and r.room_id = room.id
        and r.deleted_at is null
        and r.status = 'checked_in'
    );


  -- ---------------------------------------------------------
  -- APPLY MODU
  -- ---------------------------------------------------------

  if p_apply then

    -- Checked-in rezervasyon bağlı odaları occupied yap.
    update public.hotel_rooms room
    set
      room_status = 'occupied',
      updated_at = now()
    where room.company_id = p_company_id

      and (
        p_hotel_id is null
        or room.hotel_id = p_hotel_id
      )

      and room.is_active = true

      and exists (
        select 1
        from public.hotel_reservations r
        where r.company_id = p_company_id
          and r.room_id = room.id
          and r.deleted_at is null
          and r.status = 'checked_in'
      )

      and coalesce(
        room.room_status,
        'available'
      ) <> 'occupied';

    get diagnostics
      v_fixed_occupied = row_count;


    -- Yanlış occupied durumlarını available yap.
    --
    -- Maintenance / OOO / blocked gibi statülere dokunmuyoruz.
    update public.hotel_rooms room
    set
      room_status = 'available',
      updated_at = now()
    where room.company_id = p_company_id

      and (
        p_hotel_id is null
        or room.hotel_id = p_hotel_id
      )

      and room.is_active = true

      and room.room_status = 'occupied'

      and not exists (
        select 1
        from public.hotel_reservations r
        where r.company_id = p_company_id
          and r.room_id = room.id
          and r.deleted_at is null
          and r.status = 'checked_in'
      );

    get diagnostics
      v_fixed_available = row_count;

  end if;


  return jsonb_build_object(
    'success', true,

    'mode',
      case
        when p_apply
        then 'apply'
        else 'report'
      end,

    'rooms_that_should_be_occupied',
      v_should_be_occupied,

    'checked_in_rooms_not_occupied',
      v_missing_occupied,

    'occupied_rooms_without_guest',
      v_false_occupied,

    'fixed_to_occupied',
      v_fixed_occupied,

    'fixed_to_available',
      v_fixed_available
  );

end;
$$;


grant execute
on function public.hotel_reconcile_room_states(
  uuid,
  uuid,
  boolean
)
to authenticated;
