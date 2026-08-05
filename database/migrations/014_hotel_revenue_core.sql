create table if not exists public.hotel_seasons (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  name text not null,
  start_date date not null,
  end_date date not null,

  adjustment_type text not null default 'percentage'
    check (
      adjustment_type in (
        'percentage',
        'fixed_amount',
        'multiplier'
      )
    ),

  adjustment_value numeric(14,4) not null default 0,

  priority integer not null default 100,

  applies_to_weekdays smallint[]
    default array[1,2,3,4,5,6,7]::smallint[],

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_date >= start_date)
);


create table if not exists public.hotel_occupancy_rules (
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

  adults integer not null default 2
    check (adults >= 1),

  children integer not null default 0
    check (children >= 0),

  pricing_method text not null default 'multiplier'
    check (
      pricing_method in (
        'multiplier',
        'percentage',
        'fixed_amount',
        'override_price'
      )
    ),

  pricing_value numeric(14,4) not null default 1,

  extra_adult_price numeric(14,2),
  extra_child_price numeric(14,2),

  minimum_occupancy integer not null default 1,
  maximum_occupancy integer not null default 2,

  priority integer not null default 100,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    hotel_id,
    room_type_id,
    adults,
    children
  ),

  check (maximum_occupancy >= minimum_occupancy)
);


create index if not exists hotel_seasons_hotel_dates_idx
on public.hotel_seasons (
  hotel_id,
  start_date,
  end_date
);

create index if not exists hotel_occupancy_rules_room_idx
on public.hotel_occupancy_rules (
  hotel_id,
  room_type_id,
  adults,
  children
);


alter table public.hotel_seasons
enable row level security;

alter table public.hotel_occupancy_rules
enable row level security;


grant select, insert, update, delete
on
  public.hotel_seasons,
  public.hotel_occupancy_rules
to authenticated;


drop policy if exists "Members manage hotel seasons"
on public.hotel_seasons;

create policy "Members manage hotel seasons"
on public.hotel_seasons
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists "Members manage hotel occupancy rules"
on public.hotel_occupancy_rules;

create policy "Members manage hotel occupancy rules"
on public.hotel_occupancy_rules
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
