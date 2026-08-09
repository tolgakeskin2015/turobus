-- TUROBUS RMS
-- Revenue Intelligence Live Rate Fix
--
-- current_rate artık ADR değil,
-- hotel_daily_rates içindeki gerçek günlük base_price üzerinden okunur.

create or replace function public.hotel_calculate_revenue_intelligence(
  p_company_id uuid,
  p_hotel_id uuid,
  p_business_date date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room_type record;
  v_inventory integer;
  v_reserved integer;
  v_remaining integer;

  v_occ numeric;
  v_room_revenue numeric;
  v_adr numeric;
  v_revpar numeric;

  v_current_rate numeric;
  v_recommended numeric;
  v_adjustment numeric;
  v_reason text;

  v_total_inventory integer := 0;
  v_total_reserved integer := 0;
  v_total_revenue numeric := 0;
begin

  for v_room_type in

    select
      rt.id,
      rt.name,
      rt.total_rooms

    from public.hotel_room_types rt

    where rt.company_id = p_company_id
      and rt.hotel_id = p_hotel_id

  loop

    select count(*)
    into v_inventory

    from public.hotel_rooms r

    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.room_type_id = v_room_type.id
      and r.is_active = true

      and coalesce(
        r.room_status,
        'available'
      ) not in (
        'maintenance',
        'out_of_order',
        'blocked'
      );


    if coalesce(
      v_room_type.total_rooms,
      0
    ) > 0
    and v_inventory > 0 then

      v_inventory :=
        least(
          v_inventory,
          v_room_type.total_rooms
        );

    elsif coalesce(
      v_room_type.total_rooms,
      0
    ) > 0 then

      v_inventory :=
        v_room_type.total_rooms;

    end if;


    select count(*)
    into v_reserved

    from public.hotel_reservations r

    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.room_type_id = v_room_type.id
      and r.deleted_at is null

      and r.status in (
        'pending',
        'confirmed',
        'checked_in'
      )

      and r.check_in <= p_business_date
      and r.check_out > p_business_date;


    v_remaining :=
      greatest(
        v_inventory - v_reserved,
        0
      );


    if v_inventory > 0 then

      v_occ :=
        round(
          (
            v_reserved::numeric /
            v_inventory::numeric
          ) * 100,
          2
        );

    else

      v_occ := 0;

    end if;


    select coalesce(
      sum(
        case
          when coalesce(
            r.nights,
            0
          ) > 0
          then
            coalesce(
              r.total_price,
              0
            ) /
            greatest(
              r.nights,
              1
            )
          else 0
        end
      ),
      0
    )
    into v_room_revenue

    from public.hotel_reservations r

    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.room_type_id = v_room_type.id
      and r.deleted_at is null

      and r.status in (
        'confirmed',
        'checked_in',
        'checked_out'
      )

      and r.check_in <= p_business_date
      and r.check_out > p_business_date;


    if v_reserved > 0 then

      v_adr :=
        round(
          v_room_revenue /
          v_reserved,
          2
        );

    else

      v_adr := 0;

    end if;


    if v_inventory > 0 then

      v_revpar :=
        round(
          v_room_revenue /
          v_inventory,
          2
        );

    else

      v_revpar := 0;

    end if;


    -- ========================================================
    -- GERCEK GUNLUK FIYAT
    -- ========================================================

    select dr.base_price
    into v_current_rate

    from public.hotel_daily_rates dr

    join public.hotel_rate_plans rp
      on rp.id = dr.rate_plan_id

    where dr.company_id = p_company_id
      and dr.hotel_id = p_hotel_id
      and dr.room_type_id = v_room_type.id
      and dr.rate_date = p_business_date
      and dr.is_active = true
      and rp.is_active = true

    order by
      dr.base_price asc,
      dr.created_at asc

    limit 1;


    -- Günlük fiyat tanımlı değilse ADR fallback.
    v_current_rate :=
      coalesce(
        v_current_rate,
        v_adr,
        0
      );


    -- ========================================================
    -- YIELD RULES
    -- ========================================================

    if v_occ >= 95 then

      v_adjustment := 25;
      v_reason :=
        'Kritik yüksek doluluk. Son odalar premium fiyatlanmalı.';

    elsif v_occ >= 90 then

      v_adjustment := 18;
      v_reason :=
        'Çok yüksek doluluk. Güçlü fiyat artışı öneriliyor.';

    elsif v_occ >= 80 then

      v_adjustment := 12;
      v_reason :=
        'Yüksek doluluk. Fiyat artışı öneriliyor.';

    elsif v_occ >= 70 then

      v_adjustment := 7;
      v_reason :=
        'Sağlıklı doluluk. Kontrollü fiyat artışı öneriliyor.';

    elsif v_occ >= 50 then

      v_adjustment := 0;
      v_reason :=
        'Dengeli doluluk. Mevcut fiyat korunabilir.';

    elsif v_occ >= 30 then

      v_adjustment := -8;
      v_reason :=
        'Düşük doluluk. Kontrollü fiyat avantajı öneriliyor.';

    else

      v_adjustment := -15;
      v_reason :=
        'Çok düşük doluluk. Talep yaratıcı fiyat aksiyonu öneriliyor.';

    end if;


    if v_current_rate > 0 then

      v_recommended :=
        round(
          v_current_rate *
          (
            1 +
            v_adjustment / 100
          ),
          2
        );

    else

      v_recommended := 0;

    end if;


    insert into public.hotel_revenue_recommendations (
      company_id,
      hotel_id,
      room_type_id,
      business_date,

      occupancy_rate,
      adr,
      revpar,

      inventory,
      reserved_rooms,
      remaining_rooms,

      current_rate,
      recommended_rate,
      adjustment_percent,

      reason,
      status,
      updated_at
    )
    values (
      p_company_id,
      p_hotel_id,
      v_room_type.id,
      p_business_date,

      v_occ,
      v_adr,
      v_revpar,

      v_inventory,
      v_reserved,
      v_remaining,

      v_current_rate,
      v_recommended,
      v_adjustment,

      v_reason,
      'suggested',
      now()
    )

    on conflict (
      company_id,
      hotel_id,
      room_type_id,
      business_date
    )

    do update set
      occupancy_rate =
        excluded.occupancy_rate,

      adr =
        excluded.adr,

      revpar =
        excluded.revpar,

      inventory =
        excluded.inventory,

      reserved_rooms =
        excluded.reserved_rooms,

      remaining_rooms =
        excluded.remaining_rooms,

      current_rate =
        excluded.current_rate,

      recommended_rate =
        excluded.recommended_rate,

      adjustment_percent =
        excluded.adjustment_percent,

      reason =
        excluded.reason,

      status = 'suggested',

      updated_at = now();


    v_total_inventory :=
      v_total_inventory +
      v_inventory;

    v_total_reserved :=
      v_total_reserved +
      v_reserved;

    v_total_revenue :=
      v_total_revenue +
      v_room_revenue;

  end loop;


  return jsonb_build_object(
    'success', true,

    'business_date',
      p_business_date,

    'inventory',
      v_total_inventory,

    'reserved_rooms',
      v_total_reserved,

    'room_revenue',
      round(
        v_total_revenue,
        2
      ),

    'occupancy_rate',
      case
        when v_total_inventory > 0
        then round(
          (
            v_total_reserved::numeric /
            v_total_inventory::numeric
          ) * 100,
          2
        )
        else 0
      end
  );

end;
$$;


grant execute
on function public.hotel_calculate_revenue_intelligence(
  uuid,
  uuid,
  date
)
to authenticated;
