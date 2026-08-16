begin;

create extension if not exists pgcrypto;

-- ============================================================
-- TUROBUS TRANSFER MARKETPLACE V1
-- Airport / Intercity / Marina / Hourly chauffeur
-- ============================================================

create table if not exists public.transfer_marketplace_services (
  id uuid primary key default gen_random_uuid(),

  company_id uuid,

  slug text not null unique,
  name text not null,

  service_type text not null
    check (
      service_type in (
        'airport',
        'intercity',
        'marina',
        'hourly'
      )
    ),

  vehicle_type text not null
    check (
      vehicle_type in (
        'sedan',
        'vip_van',
        'minivan',
        'sprinter',
        'minibus'
      )
    ),

  origin_city text not null,
  origin_name text not null,

  destination_city text not null,
  destination_name text not null,

  description text,

  max_passengers integer not null default 1,
  max_luggage integer not null default 1,

  fleet_count integer not null default 1,

  base_price numeric(14,2) not null default 0,
  return_multiplier numeric(8,4) not null default 1.90,

  night_surcharge_rate numeric(8,4) not null default 0.15,
  child_seat_price numeric(14,2) not null default 0,

  included_waiting_minutes integer not null default 60,

  currency text not null default 'TRY',

  estimated_minutes integer,
  distance_km numeric(10,2),

  cover_url text,

  amenities jsonb not null default '[]'::jsonb,

  meet_and_greet boolean not null default true,
  flight_tracking_supported boolean not null default false,

  verified boolean not null default false,
  featured boolean not null default false,

  marketplace_enabled boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.transfer_marketplace_blocks (
  id uuid primary key default gen_random_uuid(),

  service_id uuid not null
    references public.transfer_marketplace_services(id)
    on delete cascade,

  start_at timestamptz not null,
  end_at timestamptz not null,

  reason text,

  created_at timestamptz not null default now(),

  check (end_at > start_at)
);


create table if not exists public.transfer_marketplace_reservations (
  id uuid primary key default gen_random_uuid(),

  reservation_code text not null unique,

  service_id uuid not null
    references public.transfer_marketplace_services(id),

  pickup_at timestamptz not null,
  return_at timestamptz,

  is_round_trip boolean not null default false,

  passengers integer not null,
  luggage integer not null default 0,
  child_seats integer not null default 0,

  pickup_address text,
  destination_address text,

  flight_number text,
  return_flight_number text,

  customer_name text not null,
  customer_phone text not null,
  customer_email text,

  meet_sign_name text,

  notes text,

  sales_channel text not null default 'turobus_marketplace'
    check (
      sales_channel in (
        'turobus_marketplace',
        'direct',
        'b2b',
        'manual'
      )
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'driver_assigned',
        'completed',
        'cancelled',
        'expired'
      )
    ),

  currency text not null default 'TRY',

  outbound_total numeric(14,2) not null default 0,
  return_total numeric(14,2) not null default 0,
  extras_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,

  turobus_commission numeric(14,2) not null default 0,

  public_token uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists idx_transfer_service_route
on public.transfer_marketplace_services(
  origin_city,
  destination_city,
  service_type
);


create index if not exists idx_transfer_service_marketplace
on public.transfer_marketplace_services(
  marketplace_enabled,
  is_active
);


create index if not exists idx_transfer_reservation_time
on public.transfer_marketplace_reservations(
  service_id,
  pickup_at
);


alter table public.transfer_marketplace_services
enable row level security;

alter table public.transfer_marketplace_blocks
enable row level security;

alter table public.transfer_marketplace_reservations
enable row level security;


revoke all
on public.transfer_marketplace_services
from anon;

revoke all
on public.transfer_marketplace_blocks
from anon;

revoke all
on public.transfer_marketplace_reservations
from anon;


-- ============================================================
-- AVAILABLE FLEET
-- We treat each reservation as one vehicle.
-- Uses a 3-hour operational buffer.
-- ============================================================

create or replace function public.transfer_marketplace_available_fleet(
  p_service_id uuid,
  p_pickup_at timestamptz
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fleet integer;
  v_booked integer;
  v_blocked boolean;
begin

  select fleet_count
  into v_fleet
  from public.transfer_marketplace_services
  where id = p_service_id
    and marketplace_enabled = true
    and is_active = true;

  if not found then
    return 0;
  end if;


  select exists(
    select 1
    from public.transfer_marketplace_blocks b
    where b.service_id = p_service_id
      and p_pickup_at >= b.start_at
      and p_pickup_at < b.end_at
  )
  into v_blocked;


  if v_blocked then
    return 0;
  end if;


  select count(*)
  into v_booked
  from public.transfer_marketplace_reservations r
  where r.service_id = p_service_id
    and r.status in (
      'pending',
      'confirmed',
      'driver_assigned'
    )
    and r.pickup_at >=
      p_pickup_at - interval '3 hours'
    and r.pickup_at <
      p_pickup_at + interval '3 hours';


  return greatest(
    v_fleet - v_booked,
    0
  );

end;
$$;


-- ============================================================
-- PUBLIC CATALOG
-- ============================================================

create or replace function public.get_public_transfer_marketplace(
  p_origin text default null,
  p_destination text default null,
  p_service_type text default null,
  p_passengers integer default null,
  p_pickup_at timestamptz default null
)
returns table(
  id uuid,
  slug text,
  name text,

  service_type text,
  vehicle_type text,

  origin_city text,
  origin_name text,

  destination_city text,
  destination_name text,

  max_passengers integer,
  max_luggage integer,

  fleet_count integer,

  base_price numeric,
  currency text,

  estimated_minutes integer,
  distance_km numeric,

  included_waiting_minutes integer,

  cover_url text,

  meet_and_greet boolean,
  flight_tracking_supported boolean,

  verified boolean,
  featured boolean,

  available_fleet integer
)
language sql
stable
security definer
set search_path = public
as $$

  select
    s.id,
    s.slug,
    s.name,

    s.service_type,
    s.vehicle_type,

    s.origin_city,
    s.origin_name,

    s.destination_city,
    s.destination_name,

    s.max_passengers,
    s.max_luggage,

    s.fleet_count,

    s.base_price,
    s.currency,

    s.estimated_minutes,
    s.distance_km,

    s.included_waiting_minutes,

    s.cover_url,

    s.meet_and_greet,
    s.flight_tracking_supported,

    s.verified,
    s.featured,

    case
      when p_pickup_at is null
      then s.fleet_count
      else public.transfer_marketplace_available_fleet(
        s.id,
        p_pickup_at
      )
    end as available_fleet

  from public.transfer_marketplace_services s

  where
    s.marketplace_enabled = true
    and s.is_active = true

    and (
      p_origin is null
      or trim(p_origin) = ''
      or lower(s.origin_city)
        like '%' || lower(trim(p_origin)) || '%'
      or lower(s.origin_name)
        like '%' || lower(trim(p_origin)) || '%'
    )

    and (
      p_destination is null
      or trim(p_destination) = ''
      or lower(s.destination_city)
        like '%' || lower(trim(p_destination)) || '%'
      or lower(s.destination_name)
        like '%' || lower(trim(p_destination)) || '%'
    )

    and (
      p_service_type is null
      or trim(p_service_type) = ''
      or s.service_type = p_service_type
    )

    and (
      p_passengers is null
      or p_passengers <= s.max_passengers
    )

    and (
      p_pickup_at is null
      or public.transfer_marketplace_available_fleet(
        s.id,
        p_pickup_at
      ) > 0
    )

  order by
    s.featured desc,
    s.verified desc,
    s.base_price asc,
    s.name;

$$;


-- ============================================================
-- PUBLIC DETAIL
-- ============================================================

create or replace function public.get_public_transfer_detail(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.transfer_marketplace_services%rowtype;
begin

  select *
  into v_service
  from public.transfer_marketplace_services
  where slug = p_slug
    and marketplace_enabled = true
    and is_active = true;


  if not found then
    raise exception 'Transfer hizmeti bulunamadı';
  end if;


  return jsonb_build_object(
    'id', v_service.id,
    'slug', v_service.slug,
    'name', v_service.name,

    'service_type', v_service.service_type,
    'vehicle_type', v_service.vehicle_type,

    'origin_city', v_service.origin_city,
    'origin_name', v_service.origin_name,

    'destination_city', v_service.destination_city,
    'destination_name', v_service.destination_name,

    'description', v_service.description,

    'max_passengers', v_service.max_passengers,
    'max_luggage', v_service.max_luggage,

    'fleet_count', v_service.fleet_count,

    'base_price', v_service.base_price,
    'return_multiplier', v_service.return_multiplier,

    'night_surcharge_rate', v_service.night_surcharge_rate,
    'child_seat_price', v_service.child_seat_price,

    'included_waiting_minutes', v_service.included_waiting_minutes,

    'currency', v_service.currency,

    'estimated_minutes', v_service.estimated_minutes,
    'distance_km', v_service.distance_km,

    'cover_url', v_service.cover_url,
    'amenities', v_service.amenities,

    'meet_and_greet', v_service.meet_and_greet,

    'flight_tracking_supported',
      v_service.flight_tracking_supported,

    'verified', v_service.verified
  );

end;
$$;


-- ============================================================
-- PRICE QUOTE
-- ============================================================

create or replace function public.quote_public_transfer(
  p_service_id uuid,
  p_pickup_at timestamptz,
  p_passengers integer,
  p_luggage integer default 0,
  p_child_seats integer default 0,
  p_is_round_trip boolean default false,
  p_return_at timestamptz default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service public.transfer_marketplace_services%rowtype;

  v_available integer;

  v_outbound numeric(14,2);
  v_return numeric(14,2) := 0;
  v_extras numeric(14,2);
  v_total numeric(14,2);

  v_hour integer;
  v_night boolean;

  v_return_hour integer;
  v_return_night boolean := false;
begin

  select *
  into v_service
  from public.transfer_marketplace_services
  where id = p_service_id
    and marketplace_enabled = true
    and is_active = true;


  if not found then
    raise exception 'Transfer hizmeti bulunamadı';
  end if;


  if p_passengers < 1
     or p_passengers > v_service.max_passengers
  then
    raise exception 'Yolcu kapasitesi uygun değil';
  end if;


  if p_luggage < 0
     or p_luggage > v_service.max_luggage
  then
    raise exception 'Bagaj kapasitesi uygun değil';
  end if;


  if p_child_seats < 0
     or p_child_seats > p_passengers
  then
    raise exception 'Çocuk koltuğu sayısı uygun değil';
  end if;


  v_available :=
    public.transfer_marketplace_available_fleet(
      p_service_id,
      p_pickup_at
    );


  if v_available <= 0 then

    return jsonb_build_object(
      'available', false,
      'available_fleet', 0
    );

  end if;


  v_hour :=
    extract(
      hour from p_pickup_at
    );


  v_night :=
    v_hour >= 22
    or v_hour < 6;


  v_outbound :=
    v_service.base_price;


  if v_night then
    v_outbound :=
      v_outbound *
      (
        1 +
        v_service.night_surcharge_rate
      );
  end if;


  if p_is_round_trip then

    if p_return_at is null then
      raise exception 'Dönüş tarihi ve saati gerekli';
    end if;


    if p_return_at <= p_pickup_at then
      raise exception 'Dönüş zamanı gidişten sonra olmalıdır';
    end if;


    v_return_hour :=
      extract(
        hour from p_return_at
      );


    v_return_night :=
      v_return_hour >= 22
      or v_return_hour < 6;


    v_return :=
      v_service.base_price *
      (
        v_service.return_multiplier - 1
      );


    if v_return_night then

      v_return :=
        v_return *
        (
          1 +
          v_service.night_surcharge_rate
        );

    end if;

  end if;


  v_extras :=
    v_service.child_seat_price *
    p_child_seats;


  v_total :=
    round(
      v_outbound +
      v_return +
      v_extras,
      2
    );


  return jsonb_build_object(
    'available', true,

    'available_fleet', v_available,

    'outbound_total',
      round(v_outbound, 2),

    'return_total',
      round(v_return, 2),

    'extras_total',
      round(v_extras, 2),

    'grand_total',
      v_total,

    'currency',
      v_service.currency,

    'night_surcharge_applied',
      v_night,

    'return_night_surcharge_applied',
      v_return_night,

    'included_waiting_minutes',
      v_service.included_waiting_minutes
  );

end;
$$;


-- ============================================================
-- RESERVATION CREATE
-- Turobus commission ONLY marketplace sale.
-- ============================================================

create or replace function public.create_public_transfer_reservation(
  p_service_id uuid,

  p_pickup_at timestamptz,
  p_return_at timestamptz,

  p_is_round_trip boolean,

  p_passengers integer,
  p_luggage integer,
  p_child_seats integer,

  p_pickup_address text,
  p_destination_address text,

  p_flight_number text,
  p_return_flight_number text,

  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,

  p_meet_sign_name text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote jsonb;

  v_code text;
  v_id uuid;

  v_currency text;

  v_outbound numeric(14,2);
  v_return numeric(14,2);
  v_extras numeric(14,2);
  v_total numeric(14,2);

  v_commission numeric(14,2);
begin

  if length(
    trim(
      coalesce(
        p_customer_name,
        ''
      )
    )
  ) < 2
  then
    raise exception 'Ad soyad gerekli';
  end if;


  if length(
    trim(
      coalesce(
        p_customer_phone,
        ''
      )
    )
  ) < 7
  then
    raise exception 'Telefon gerekli';
  end if;


  perform pg_advisory_xact_lock(
    hashtext(
      p_service_id::text
    )
  );


  v_quote :=
    public.quote_public_transfer(
      p_service_id,
      p_pickup_at,
      p_passengers,
      p_luggage,
      p_child_seats,
      p_is_round_trip,
      p_return_at
    );


  if not coalesce(
    (
      v_quote ->> 'available'
    )::boolean,
    false
  )
  then
    raise exception 'Seçilen saatte uygun araç kalmadı';
  end if;


  v_currency :=
    v_quote ->> 'currency';

  v_outbound :=
    (
      v_quote ->> 'outbound_total'
    )::numeric;

  v_return :=
    (
      v_quote ->> 'return_total'
    )::numeric;

  v_extras :=
    (
      v_quote ->> 'extras_total'
    )::numeric;

  v_total :=
    (
      v_quote ->> 'grand_total'
    )::numeric;


  -- Commission exists ONLY because sales_channel is marketplace.
  v_commission :=
    round(
      v_total * 0.10,
      2
    );


  v_code :=
    'TR-' ||
    upper(
      substring(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        )
        from 1 for 8
      )
    );


  insert into public.transfer_marketplace_reservations(
    reservation_code,

    service_id,

    pickup_at,
    return_at,

    is_round_trip,

    passengers,
    luggage,
    child_seats,

    pickup_address,
    destination_address,

    flight_number,
    return_flight_number,

    customer_name,
    customer_phone,
    customer_email,

    meet_sign_name,

    notes,

    sales_channel,
    status,

    currency,

    outbound_total,
    return_total,
    extras_total,
    grand_total,

    turobus_commission
  )
  values(
    v_code,

    p_service_id,

    p_pickup_at,
    case
      when p_is_round_trip
      then p_return_at
      else null
    end,

    p_is_round_trip,

    p_passengers,
    p_luggage,
    p_child_seats,

    nullif(
      trim(
        coalesce(
          p_pickup_address,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_destination_address,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_flight_number,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_return_flight_number,
          ''
        )
      ),
      ''
    ),

    trim(
      p_customer_name
    ),

    trim(
      p_customer_phone
    ),

    nullif(
      trim(
        coalesce(
          p_customer_email,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_meet_sign_name,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    'turobus_marketplace',
    'pending',

    v_currency,

    v_outbound,
    v_return,
    v_extras,
    v_total,

    v_commission
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'id',
      v_id,

    'reservation_code',
      v_code,

    'status',
      'pending',

    'currency',
      v_currency,

    'grand_total',
      v_total
  );

end;
$$;


revoke all
on function public.transfer_marketplace_available_fleet(uuid,timestamptz)
from public;

revoke all
on function public.get_public_transfer_marketplace(text,text,text,integer,timestamptz)
from public;

revoke all
on function public.get_public_transfer_detail(text)
from public;

revoke all
on function public.quote_public_transfer(uuid,timestamptz,integer,integer,integer,boolean,timestamptz)
from public;

revoke all
on function public.create_public_transfer_reservation(
  uuid,
  timestamptz,
  timestamptz,
  boolean,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;


grant execute
on function public.transfer_marketplace_available_fleet(uuid,timestamptz)
to anon, authenticated;

grant execute
on function public.get_public_transfer_marketplace(text,text,text,integer,timestamptz)
to anon, authenticated;

grant execute
on function public.get_public_transfer_detail(text)
to anon, authenticated;

grant execute
on function public.quote_public_transfer(uuid,timestamptz,integer,integer,integer,boolean,timestamptz)
to anon, authenticated;

grant execute
on function public.create_public_transfer_reservation(
  uuid,
  timestamptz,
  timestamptz,
  boolean,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to anon, authenticated;

commit;
