-- TUROBUS RMS
-- 30 Day Revenue Forecast Engine v1

create table if not exists public.hotel_revenue_forecasts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  hotel_id uuid not null,
  forecast_date date not null,

  inventory integer not null default 0,
  booked_rooms integer not null default 0,
  projected_rooms integer not null default 0,

  booked_occupancy numeric(8,2) not null default 0,
  projected_occupancy numeric(8,2) not null default 0,

  booked_revenue numeric(14,2) not null default 0,
  projected_revenue numeric(14,2) not null default 0,

  adr numeric(14,2) not null default 0,
  revpar numeric(14,2) not null default 0,

  days_ahead integer not null default 0,
  confidence numeric(8,2) not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    company_id,
    hotel_id,
    forecast_date
  )
);

create index if not exists
idx_hotel_revenue_forecasts_lookup
on public.hotel_revenue_forecasts (
  company_id,
  hotel_id,
  forecast_date
);


create or replace function public.hotel_generate_revenue_forecast(
  p_company_id uuid,
  p_hotel_id uuid,
  p_start_date date default current_date,
  p_days integer default 30
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_date date;
  v_days_ahead integer;

  v_inventory integer;
  v_booked integer;
  v_projected integer;

  v_booked_occ numeric;
  v_projected_occ numeric;

  v_booked_revenue numeric;
  v_projected_revenue numeric;

  v_adr numeric;
  v_revpar numeric;

  v_pickup_factor numeric;
  v_confidence numeric;

  v_total_projected_revenue numeric := 0;
  v_total_projected_rooms integer := 0;
  v_total_inventory integer := 0;
begin

  if p_days < 1 or p_days > 365 then
    raise exception
      'Forecast gün sayısı 1 ile 365 arasında olmalıdır.';
  end if;

  for v_days_ahead in 0..(p_days - 1)
  loop

    v_date :=
      p_start_date + v_days_ahead;

    -- Operasyonel oda kapasitesi
    select count(*)
    into v_inventory
    from public.hotel_rooms r
    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.is_active = true
      and coalesce(
        r.room_status,
        'available'
      ) not in (
        'maintenance',
        'out_of_order',
        'blocked'
      );

    -- O gün için mevcut rezervasyon sayısı
    select count(*)
    into v_booked
    from public.hotel_reservations r
    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.deleted_at is null
      and r.status in (
        'pending',
        'confirmed',
        'checked_in'
      )
      and r.check_in <= v_date
      and r.check_out > v_date;

    -- O güne düşen oda geliri
    select coalesce(
      sum(
        case
          when coalesce(r.nights, 0) > 0
          then
            coalesce(r.total_price, 0) /
            greatest(r.nights, 1)
          else 0
        end
      ),
      0
    )
    into v_booked_revenue
    from public.hotel_reservations r
    where r.company_id = p_company_id
      and r.hotel_id = p_hotel_id
      and r.deleted_at is null
      and r.status in (
        'pending',
        'confirmed',
        'checked_in'
      )
      and r.check_in <= v_date
      and r.check_out > v_date;

    if v_inventory > 0 then
      v_booked_occ :=
        round(
          (
            v_booked::numeric /
            v_inventory::numeric
          ) * 100,
          2
        );
    else
      v_booked_occ := 0;
    end if;

    if v_booked > 0 then
      v_adr :=
        round(
          v_booked_revenue /
          v_booked,
          2
        );
    else
      v_adr := 0;
    end if;

    -- Basit pickup modeli v1.
    -- Yakın tarihlerde rezervasyonların büyük kısmı oluşmuş kabul edilir.
    -- İleri tarihlerde pickup potansiyeli yükselir.

    if v_days_ahead <= 2 then
      v_pickup_factor := 1.02;
      v_confidence := 95;

    elsif v_days_ahead <= 7 then
      v_pickup_factor := 1.08;
      v_confidence := 88;

    elsif v_days_ahead <= 14 then
      v_pickup_factor := 1.15;
      v_confidence := 78;

    elsif v_days_ahead <= 21 then
      v_pickup_factor := 1.22;
      v_confidence := 68;

    else
      v_pickup_factor := 1.30;
      v_confidence := 58;
    end if;

    v_projected :=
      least(
        v_inventory,
        greatest(
          v_booked,
          ceil(
            v_booked *
            v_pickup_factor
          )::integer
        )
      );

    -- Henüz rezervasyon yoksa anlamsız sıfır forecast yerine
    -- yalnızca mevcut veriye bağlı kal.
    if v_booked = 0 then
      v_projected := 0;
    end if;

    if v_inventory > 0 then
      v_projected_occ :=
        round(
          (
            v_projected::numeric /
            v_inventory::numeric
          ) * 100,
          2
        );
    else
      v_projected_occ := 0;
    end if;

    if v_booked > 0 then
      v_projected_revenue :=
        round(
          v_adr *
          v_projected,
          2
        );
    else
      v_projected_revenue := 0;
    end if;

    if v_inventory > 0 then
      v_revpar :=
        round(
          v_projected_revenue /
          v_inventory,
          2
        );
    else
      v_revpar := 0;
    end if;

    insert into public.hotel_revenue_forecasts (
      company_id,
      hotel_id,
      forecast_date,

      inventory,
      booked_rooms,
      projected_rooms,

      booked_occupancy,
      projected_occupancy,

      booked_revenue,
      projected_revenue,

      adr,
      revpar,

      days_ahead,
      confidence,

      updated_at
    )
    values (
      p_company_id,
      p_hotel_id,
      v_date,

      v_inventory,
      v_booked,
      v_projected,

      v_booked_occ,
      v_projected_occ,

      v_booked_revenue,
      v_projected_revenue,

      v_adr,
      v_revpar,

      v_days_ahead,
      v_confidence,

      now()
    )
    on conflict (
      company_id,
      hotel_id,
      forecast_date
    )
    do update set
      inventory =
        excluded.inventory,

      booked_rooms =
        excluded.booked_rooms,

      projected_rooms =
        excluded.projected_rooms,

      booked_occupancy =
        excluded.booked_occupancy,

      projected_occupancy =
        excluded.projected_occupancy,

      booked_revenue =
        excluded.booked_revenue,

      projected_revenue =
        excluded.projected_revenue,

      adr =
        excluded.adr,

      revpar =
        excluded.revpar,

      days_ahead =
        excluded.days_ahead,

      confidence =
        excluded.confidence,

      updated_at = now();

    v_total_projected_revenue :=
      v_total_projected_revenue +
      v_projected_revenue;

    v_total_projected_rooms :=
      v_total_projected_rooms +
      v_projected;

    v_total_inventory :=
      v_total_inventory +
      v_inventory;

  end loop;

  return jsonb_build_object(
    'success', true,

    'start_date',
      p_start_date,

    'days',
      p_days,

    'projected_revenue',
      round(
        v_total_projected_revenue,
        2
      ),

    'projected_room_nights',
      v_total_projected_rooms,

    'available_room_nights',
      v_total_inventory,

    'projected_occupancy',
      case
        when v_total_inventory > 0
        then round(
          (
            v_total_projected_rooms::numeric /
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
on function public.hotel_generate_revenue_forecast(
  uuid,
  uuid,
  date,
  integer
)
to authenticated;


create or replace view public.hotel_revenue_forecast_view as
select
  f.*,
  h.name as hotel_name

from public.hotel_revenue_forecasts f

join public.hotels h
  on h.id = f.hotel_id;

grant select
on public.hotel_revenue_forecast_view
to authenticated;
