-- =========================================================
-- TurOS Hotel Core
-- Migration: 007_hotel_core.sql
-- =========================================================

create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_code text,
  name text not null,

  star_rating smallint
    check (star_rating between 0 and 5),

  hotel_type text not null default 'hotel'
    check (
      hotel_type in (
        'hotel',
        'boutique_hotel',
        'apart_hotel',
        'resort',
        'hostel',
        'bungalow',
        'holiday_village',
        'other'
      )
    ),

  country_code text not null default 'TR',
  city text,
  district text,
  address text,

  phone text,
  email text,
  website text,

  latitude numeric(10,7),
  longitude numeric(10,7),

  check_in_time time not null default '14:00',
  check_out_time time not null default '12:00',

  currency text not null default 'TRY',

  tax_number text,
  tax_office text,

  contact_person text,
  contact_phone text,
  contact_email text,

  description text,
  notes text,

  is_active boolean not null default true,
  is_verified boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, hotel_code)
);


create table if not exists public.hotel_room_types (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_code text,
  name text not null,

  description text,

  max_adults integer not null default 2
    check (max_adults >= 0),

  max_children integer not null default 0
    check (max_children >= 0),

  max_infants integer not null default 0
    check (max_infants >= 0),

  max_occupancy integer not null default 2
    check (max_occupancy > 0),

  bed_type text,
  room_size_m2 numeric(8,2),

  total_rooms integer not null default 0
    check (total_rooms >= 0),

  amenities jsonb not null default '[]'::jsonb,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, room_type_code)
);


create table if not exists public.hotel_rooms (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete restrict,

  room_number text not null,
  floor_number text,

  room_status text not null default 'available'
    check (
      room_status in (
        'available',
        'occupied',
        'dirty',
        'cleaning',
        'inspection',
        'maintenance',
        'out_of_order',
        'blocked'
      )
    ),

  housekeeping_status text not null default 'clean'
    check (
      housekeeping_status in (
        'clean',
        'dirty',
        'cleaning',
        'inspected'
      )
    ),

  notes text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, room_number)
);


create table if not exists public.hotel_rate_plans (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid
    references public.hotel_room_types(id)
    on delete cascade,

  rate_code text,
  name text not null,

  meal_plan text not null default 'room_only'
    check (
      meal_plan in (
        'room_only',
        'breakfast',
        'half_board',
        'full_board',
        'all_inclusive',
        'ultra_all_inclusive'
      )
    ),

  cancellation_policy text,

  minimum_stay integer not null default 1
    check (minimum_stay >= 1),

  maximum_stay integer
    check (
      maximum_stay is null
      or maximum_stay >= minimum_stay
    ),

  base_adults integer not null default 2
    check (base_adults >= 1),

  child_pricing jsonb not null default '{}'::jsonb,

  currency text not null default 'TRY',

  is_refundable boolean not null default true,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, rate_code)
);


create table if not exists public.hotel_inventory (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete cascade,

  inventory_date date not null,

  total_inventory integer not null default 0
    check (total_inventory >= 0),

  reserved_inventory integer not null default 0
    check (reserved_inventory >= 0),

  blocked_inventory integer not null default 0
    check (blocked_inventory >= 0),

  available_inventory integer generated always as (
    greatest(
      total_inventory
      - reserved_inventory
      - blocked_inventory,
      0
    )
  ) stored,

  stop_sale boolean not null default false,

  minimum_stay integer not null default 1
    check (minimum_stay >= 1),

  closed_to_arrival boolean not null default false,
  closed_to_departure boolean not null default false,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, room_type_id, inventory_date)
);


create table if not exists public.hotel_daily_rates (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete cascade,

  rate_plan_id uuid not null
    references public.hotel_rate_plans(id)
    on delete cascade,

  rate_date date not null,

  base_price numeric(14,2) not null default 0
    check (base_price >= 0),

  single_price numeric(14,2)
    check (single_price is null or single_price >= 0),

  triple_price numeric(14,2)
    check (triple_price is null or triple_price >= 0),

  extra_adult_price numeric(14,2) not null default 0
    check (extra_adult_price >= 0),

  child_price numeric(14,2) not null default 0
    check (child_price >= 0),

  currency text not null default 'TRY',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(
    hotel_id,
    room_type_id,
    rate_plan_id,
    rate_date
  )
);


create index if not exists hotels_company_idx
on public.hotels(company_id);

create index if not exists hotel_room_types_hotel_idx
on public.hotel_room_types(hotel_id);

create index if not exists hotel_rooms_hotel_idx
on public.hotel_rooms(hotel_id);

create index if not exists hotel_rooms_status_idx
on public.hotel_rooms(
  hotel_id,
  room_status,
  housekeeping_status
);

create index if not exists hotel_inventory_date_idx
on public.hotel_inventory(
  hotel_id,
  inventory_date,
  room_type_id
);

create index if not exists hotel_daily_rates_date_idx
on public.hotel_daily_rates(
  hotel_id,
  rate_date,
  room_type_id
);


