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
    check (
      single_price is null
      or single_price >= 0
    ),

  triple_price numeric(14,2)
    check (
      triple_price is null
      or triple_price >= 0
    ),

  extra_adult_price numeric(14,2) not null default 0
    check (extra_adult_price >= 0),

  child_price numeric(14,2) not null default 0
    check (child_price >= 0),

  currency text not null default 'TRY',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    hotel_id,
    room_type_id,
    rate_plan_id,
    rate_date
  )
);

create index if not exists hotel_daily_rates_date_idx
on public.hotel_daily_rates (
  hotel_id,
  rate_date,
  room_type_id
);
