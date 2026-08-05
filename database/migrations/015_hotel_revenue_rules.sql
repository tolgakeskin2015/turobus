create table if not exists public.hotel_child_rules (
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

  rate_plan_id uuid
    references public.hotel_rate_plans(id)
    on delete cascade,

  name text not null,

  minimum_age integer not null default 0
    check (minimum_age >= 0),

  maximum_age integer not null
    check (maximum_age >= minimum_age),

  pricing_method text not null default 'percentage'
    check (
      pricing_method in (
        'free',
        'percentage',
        'fixed_amount',
        'adult_price',
        'override_price'
      )
    ),

  pricing_value numeric(14,4) not null default 0,

  maximum_children integer
    check (
      maximum_children is null
      or maximum_children >= 0
    ),

  priority integer not null default 100,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.hotel_weekday_rules (
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

  rate_plan_id uuid
    references public.hotel_rate_plans(id)
    on delete cascade,

  name text not null,

  weekdays smallint[] not null
    default array[1,2,3,4,5,6,7]::smallint[],

  adjustment_type text not null default 'percentage'
    check (
      adjustment_type in (
        'percentage',
        'fixed_amount',
        'multiplier',
        'override_price'
      )
    ),

  adjustment_value numeric(14,4) not null default 0,

  start_date date,
  end_date date,

  priority integer not null default 100,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    end_date is null
    or start_date is null
    or end_date >= start_date
  )
);


create table if not exists public.hotel_pricing_rules (
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

  rate_plan_id uuid
    references public.hotel_rate_plans(id)
    on delete cascade,

  rule_name text not null,

  rule_type text not null
    check (
      rule_type in (
        'occupancy',
        'season',
        'weekday',
        'child',
        'early_booking',
        'last_minute',
        'length_of_stay',
        'channel',
        'promotion',
        'event',
        'manual'
      )
    ),

  condition_json jsonb not null default '{}'::jsonb,
  action_json jsonb not null default '{}'::jsonb,

  priority integer not null default 100,

  stacking_mode text not null default 'stack'
    check (
      stacking_mode in (
        'stack',
        'exclusive',
        'best_price',
        'highest_price',
        'stop_after_apply'
      )
    ),

  valid_from timestamptz,
  valid_until timestamptz,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    valid_until is null
    or valid_from is null
    or valid_until >= valid_from
  )
);


create index if not exists hotel_child_rules_lookup_idx
on public.hotel_child_rules (
  hotel_id,
  room_type_id,
  minimum_age,
  maximum_age
);

create index if not exists hotel_weekday_rules_lookup_idx
on public.hotel_weekday_rules (
  hotel_id,
  room_type_id,
  priority
);

create index if not exists hotel_pricing_rules_lookup_idx
on public.hotel_pricing_rules (
  hotel_id,
  rule_type,
  priority,
  is_active
);


alter table public.hotel_child_rules
enable row level security;

alter table public.hotel_weekday_rules
enable row level security;

alter table public.hotel_pricing_rules
enable row level security;


grant select, insert, update, delete
on
  public.hotel_child_rules,
  public.hotel_weekday_rules,
  public.hotel_pricing_rules
to authenticated;


drop policy if exists "Members manage hotel child rules"
on public.hotel_child_rules;

create policy "Members manage hotel child rules"
on public.hotel_child_rules
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists "Members manage hotel weekday rules"
on public.hotel_weekday_rules;

create policy "Members manage hotel weekday rules"
on public.hotel_weekday_rules
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists "Members manage hotel pricing rules"
on public.hotel_pricing_rules;

create policy "Members manage hotel pricing rules"
on public.hotel_pricing_rules
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
