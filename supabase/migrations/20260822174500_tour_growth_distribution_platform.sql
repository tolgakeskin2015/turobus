-- ============================================================
-- TUROBUS PACKAGE D — PHASE 30–36
--
-- 30 Nereye Gidebilirim
-- 31 Son Dakika
-- 32 Grup
-- 33 TuroPuan
-- 34 B2B
-- 35 SaaS
-- 36 White-label
--
-- No fake availability.
-- No fake subscription payment.
-- No fake domain verification.
-- ============================================================


-- ============================================================
-- 30 — DESTINATION DISCOVERY PROFILES
-- ============================================================

create table if not exists
public.tour_destination_discovery_profiles (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  name text
    not null,

  budget_min numeric(14,2)
    check (
      budget_min is null
      or budget_min >= 0
    ),

  budget_max numeric(14,2)
    check (
      budget_max is null
      or budget_max >= 0
    ),

  currency text
    not null
    default 'TRY',

  preferred_product_types jsonb
    not null
    default '[]'::jsonb,

  preferred_destination text,

  availability_only boolean
    not null
    default true,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  check (
    budget_min is null
    or budget_max is null
    or budget_max >= budget_min
  )
);


-- ============================================================
-- 31 — LAST MINUTE OFFERS
-- ============================================================

create table if not exists
public.tour_last_minute_offers (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  product_id uuid
    references public.tour_product_catalog(id)
    on delete cascade,

  title text
    not null,

  original_price numeric(14,2)
    not null
    default 0
    check (
      original_price >= 0
    ),

  offer_price numeric(14,2)
    not null
    default 0
    check (
      offer_price >= 0
    ),

  currency text
    not null
    default 'TRY',

  available_quantity integer
    check (
      available_quantity is null
      or available_quantity >= 0
    ),

  starts_at timestamptz
    not null
    default now(),

  expires_at timestamptz
    not null,

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'active',
        'expired',
        'cancelled'
      )
    ),

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  check (
    expires_at > starts_at
  ),

  check (
    original_price = 0
    or offer_price <= original_price
  )
);


create index if not exists
tour_last_minute_offers_active_idx
on public.tour_last_minute_offers (
  company_id,
  status,
  expires_at
);


-- ============================================================
-- 32 — GROUP REQUESTS
-- ============================================================

create table if not exists
public.tour_group_requests (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  request_number text
    not null,

  group_name text
    not null,

  contact_name text
    not null,

  contact_phone text,

  contact_email text,

  passenger_count integer
    not null
    check (
      passenger_count >= 2
    ),

  target_budget numeric(14,2)
    check (
      target_budget is null
      or target_budget >= 0
    ),

  currency text
    not null
    default 'TRY',

  requested_services jsonb
    not null
    default '[]'::jsonb,

  status text
    not null
    default 'new'
    check (
      status in (
        'new',
        'qualified',
        'quoted',
        'negotiation',
        'won',
        'lost',
        'cancelled'
      )
    ),

  assigned_user_id uuid,

  notes text,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    request_number
  )
);


create index if not exists
tour_group_requests_status_idx
on public.tour_group_requests (
  company_id,
  status,
  created_at desc
);


-- ============================================================
-- 33 — TUROPUAN
-- ============================================================

create table if not exists
public.turopuan_accounts (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  subject_type text
    not null
    check (
      subject_type in (
        'customer',
        'reservation',
        'agency',
        'staff'
      )
    ),

  subject_id uuid
    not null,

  balance bigint
    not null
    default 0
    check (
      balance >= 0
    ),

  lifetime_earned bigint
    not null
    default 0
    check (
      lifetime_earned >= 0
    ),

  lifetime_spent bigint
    not null
    default 0
    check (
      lifetime_spent >= 0
    ),

  status text
    not null
    default 'active'
    check (
      status in (
        'active',
        'suspended',
        'closed'
      )
    ),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    subject_type,
    subject_id
  )
);


create table if not exists
public.turopuan_ledger (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  account_id uuid
    not null
    references public.turopuan_accounts(id)
    on delete cascade,

  entry_type text
    not null
    check (
      entry_type in (
        'earn',
        'redeem',
        'adjustment_positive',
        'adjustment_negative',
        'expire'
      )
    ),

  points bigint
    not null
    check (
      points > 0
    ),

  balance_after bigint
    not null
    check (
      balance_after >= 0
    ),

  reference_type text,

  reference_id uuid,

  description text,

  idempotency_key text
    not null,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    idempotency_key
  )
);


create index if not exists
turopuan_ledger_account_idx
on public.turopuan_ledger (
  company_id,
  account_id,
  created_at desc
);


-- ============================================================
-- 34 — B2B
-- ============================================================

create table if not exists
public.tour_b2b_accounts (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  name text
    not null,

  account_code text
    not null,

  external_company_id uuid,

  contact_name text,

  contact_phone text,

  contact_email text,

  commission_percent numeric(7,4)
    not null
    default 0
    check (
      commission_percent >= 0
      and commission_percent <= 100
    ),

  discount_percent numeric(7,4)
    not null
    default 0
    check (
      discount_percent >= 0
      and discount_percent <= 100
    ),

  credit_limit numeric(14,2)
    not null
    default 0
    check (
      credit_limit >= 0
    ),

  currency text
    not null
    default 'TRY',

  status text
    not null
    default 'active'
    check (
      status in (
        'active',
        'suspended',
        'closed'
      )
    ),

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    account_code
  )
);


create table if not exists
public.tour_b2b_price_rules (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  b2b_account_id uuid
    not null
    references public.tour_b2b_accounts(id)
    on delete cascade,

  product_type text
    check (
      product_type is null
      or
      product_type in (
        'transfer',
        'hotel',
        'activity',
        'tour',
        'car_rental'
      )
    ),

  product_id uuid
    references public.tour_product_catalog(id)
    on delete cascade,

  discount_percent numeric(7,4)
    not null
    default 0
    check (
      discount_percent >= 0
      and discount_percent <= 100
    ),

  commission_percent numeric(7,4)
    not null
    default 0
    check (
      commission_percent >= 0
      and commission_percent <= 100
    ),

  active boolean
    not null
    default true,

  valid_from date,

  valid_to date,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  check (
    valid_to is null
    or valid_from is null
    or valid_to >= valid_from
  )
);


-- ============================================================
-- 35 — SAAS SUBSCRIPTION REGISTRY
-- ============================================================

create table if not exists
public.tour_saas_subscriptions (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  plan_key text
    not null,

  status text
    not null
    default 'trial'
    check (
      status in (
        'trial',
        'active',
        'suspended',
        'cancelled'
      )
    ),

  seat_limit integer
    not null
    default 1
    check (
      seat_limit > 0
    ),

  module_flags jsonb
    not null
    default '{}'::jsonb,

  monthly_price numeric(14,2)
    not null
    default 0
    check (
      monthly_price >= 0
    ),

  currency text
    not null
    default 'TRY',

  billing_source text
    not null
    default 'manual'
    check (
      billing_source in (
        'manual',
        'provider'
      )
    ),

  provider_subscription_id text,

  trial_ends_at timestamptz,

  current_period_starts_at timestamptz,

  current_period_ends_at timestamptz,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id
  )
);


-- ============================================================
-- 36 — WHITE-LABEL
-- ============================================================

create table if not exists
public.tour_white_label_settings (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  brand_name text,

  custom_domain text,

  domain_verified_at timestamptz,

  logo_url text,

  primary_color text,

  accent_color text,

  support_email text,

  support_phone text,

  hide_turobus_branding boolean
    not null
    default false,

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'ready',
        'active',
        'suspended'
      )
    ),

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id
  )
);


-- ============================================================
-- UPDATED AT
-- ============================================================

create or replace function
public.touch_tour_growth_distribution_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
tour_group_requests_touch
on public.tour_group_requests;

create trigger
tour_group_requests_touch
before update
on public.tour_group_requests
for each row
execute function
public.touch_tour_growth_distribution_updated_at();


drop trigger if exists
turopuan_accounts_touch
on public.turopuan_accounts;

create trigger
turopuan_accounts_touch
before update
on public.turopuan_accounts
for each row
execute function
public.touch_tour_growth_distribution_updated_at();


drop trigger if exists
tour_b2b_accounts_touch
on public.tour_b2b_accounts;

create trigger
tour_b2b_accounts_touch
before update
on public.tour_b2b_accounts
for each row
execute function
public.touch_tour_growth_distribution_updated_at();


drop trigger if exists
tour_saas_subscriptions_touch
on public.tour_saas_subscriptions;

create trigger
tour_saas_subscriptions_touch
before update
on public.tour_saas_subscriptions
for each row
execute function
public.touch_tour_growth_distribution_updated_at();


drop trigger if exists
tour_white_label_settings_touch
on public.tour_white_label_settings;

create trigger
tour_white_label_settings_touch
before update
on public.tour_white_label_settings
for each row
execute function
public.touch_tour_growth_distribution_updated_at();


-- ============================================================
-- IMMUTABLE TUROPUAN LEDGER
-- ============================================================

create or replace function
public.prevent_turopuan_ledger_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'TuroPuan ledger is immutable';
end;
$$;


drop trigger if exists
turopuan_ledger_no_update
on public.turopuan_ledger;

create trigger
turopuan_ledger_no_update
before update
on public.turopuan_ledger
for each row
execute function
public.prevent_turopuan_ledger_mutation();


drop trigger if exists
turopuan_ledger_no_delete
on public.turopuan_ledger;

create trigger
turopuan_ledger_no_delete
before delete
on public.turopuan_ledger
for each row
execute function
public.prevent_turopuan_ledger_mutation();


-- ============================================================
-- 30 — SAVE DISCOVERY PROFILE
-- ============================================================

create or replace function
public.save_tour_destination_discovery_profile(
  p_tour_id uuid,
  p_name text,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_preferred_product_types jsonb default '[]'::jsonb,
  p_preferred_destination text default null,
  p_availability_only boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_company_id uuid;
  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id = p_tour_id;


  if not found then
    raise exception 'Tour not found';
  end if;


  if not public.is_active_company_member(
    v_company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    p_budget_min is not null
    and p_budget_min < 0
  then
    raise exception 'Invalid minimum budget';
  end if;


  if
    p_budget_max is not null
    and p_budget_max < 0
  then
    raise exception 'Invalid maximum budget';
  end if;


  if
    p_budget_min is not null
    and p_budget_max is not null
    and p_budget_max < p_budget_min
  then
    raise exception 'Invalid budget range';
  end if;


  insert into
  public.tour_destination_discovery_profiles (
    company_id,
    tour_id,
    name,
    budget_min,
    budget_max,
    preferred_product_types,
    preferred_destination,
    availability_only,
    created_by
  )
  values (
    v_company_id,
    p_tour_id,
    btrim(p_name),
    p_budget_min,
    p_budget_max,
    coalesce(
      p_preferred_product_types,
      '[]'::jsonb
    ),
    nullif(
      btrim(
        coalesce(
          p_preferred_destination,
          ''
        )
      ),
      ''
    ),
    p_availability_only,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 30 — REAL CATALOG DISCOVERY
-- ============================================================

create or replace function
public.discover_tour_destinations(
  p_tour_id uuid,
  p_budget_max numeric default null,
  p_product_type text default null,
  p_destination_query text default null,
  p_availability_only boolean default true
)
returns table (
  destination text,
  currency text,
  minimum_price numeric,
  maximum_price numeric,
  product_count bigint,
  available_product_count bigint,
  product_types text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id = p_tour_id;


  if not found then
    raise exception 'Tour not found';
  end if;


  if not public.is_active_company_member(
    v_company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  return query

  select
    coalesce(
      nullif(
        btrim(
          p.destination
        ),
        ''
      ),
      'Belirtilmemiş'
    ) as destination,

    p.currency,

    min(
      p.sale_price
    ) as minimum_price,

    max(
      p.sale_price
    ) as maximum_price,

    count(*) as product_count,

    count(*) filter (
      where
        p.available_quantity is null
        or
        p.available_quantity > 0
    ) as available_product_count,

    array_agg(
      distinct
      p.product_type
      order by
      p.product_type
    ) as product_types

  from
    public.tour_product_catalog p

  where
    p.company_id =
      v_company_id

    and
    p.tour_id =
      p_tour_id

    and
    p.active =
      true

    and
    (
      p_budget_max is null
      or
      p.sale_price <=
        p_budget_max
    )

    and
    (
      p_product_type is null
      or
      p.product_type =
        p_product_type
    )

    and
    (
      p_destination_query is null
      or
      coalesce(
        p.destination,
        ''
      )
      ilike
        '%' ||
        p_destination_query ||
        '%'
    )

    and
    (
      not p_availability_only
      or
      p.available_quantity is null
      or
      p.available_quantity > 0
    )

  group by
    coalesce(
      nullif(
        btrim(
          p.destination
        ),
        ''
      ),
      'Belirtilmemiş'
    ),
    p.currency

  order by
    min(
      p.sale_price
    ) asc;

end;
$$;


-- ============================================================
-- 31 — CREATE LAST MINUTE OFFER
-- ============================================================

create or replace function
public.create_tour_last_minute_offer(
  p_product_id uuid,
  p_title text,
  p_offer_price numeric,
  p_expires_at timestamptz,
  p_available_quantity integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_product
    public.tour_product_catalog%rowtype;

  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select *
  into v_product
  from public.tour_product_catalog
  where
    id = p_product_id
    and
    active = true;


  if not found then
    raise exception 'Active product not found';
  end if;


  if not public.is_active_company_member(
    v_product.company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  if coalesce(
    p_offer_price,
    -1
  ) < 0
  then
    raise exception 'Invalid offer price';
  end if;


  if
    v_product.sale_price > 0
    and
    p_offer_price >
      v_product.sale_price
  then
    raise exception
      'Last minute price cannot exceed current sale price';
  end if;


  if p_expires_at <= now() then
    raise exception
      'Offer expiration must be in future';
  end if;


  insert into
  public.tour_last_minute_offers (
    company_id,
    tour_id,
    departure_id,
    product_id,
    title,
    original_price,
    offer_price,
    currency,
    available_quantity,
    starts_at,
    expires_at,
    status,
    created_by
  )
  values (
    v_product.company_id,
    v_product.tour_id,
    v_product.departure_id,
    v_product.id,
    btrim(
      p_title
    ),
    v_product.sale_price,
    p_offer_price,
    v_product.currency,
    coalesce(
      p_available_quantity,
      v_product.available_quantity
    ),
    now(),
    p_expires_at,
    'active',
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 32 — CREATE GROUP REQUEST
-- ============================================================

create or replace function
public.create_tour_group_request(
  p_tour_id uuid,
  p_departure_id uuid,
  p_group_name text,
  p_contact_name text,
  p_contact_phone text,
  p_contact_email text,
  p_passenger_count integer,
  p_target_budget numeric default null,
  p_requested_services jsonb default '[]'::jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_company_id uuid;
  v_number text;
  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id = p_tour_id;


  if not found then
    raise exception 'Tour not found';
  end if;


  if not public.is_active_company_member(
    v_company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  if p_passenger_count < 2 then
    raise exception
      'Group must contain at least two passengers';
  end if;


  if
    p_departure_id is not null
    and
    not exists (
      select 1
      from public.tour_departures d
      where
        d.id = p_departure_id
        and
        d.company_id =
          v_company_id
        and
        d.tour_id =
          p_tour_id
    )
  then
    raise exception
      'Departure scope mismatch';
  end if;


  v_number :=
    'GRP-' ||
    to_char(
      clock_timestamp(),
      'YYYYMMDD-HH24MISS'
    )
    ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        5
      )
    );


  insert into
  public.tour_group_requests (
    company_id,
    tour_id,
    departure_id,
    request_number,
    group_name,
    contact_name,
    contact_phone,
    contact_email,
    passenger_count,
    target_budget,
    requested_services,
    notes,
    created_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,
    v_number,
    btrim(
      p_group_name
    ),
    btrim(
      p_contact_name
    ),
    nullif(
      btrim(
        coalesce(
          p_contact_phone,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_contact_email,
          ''
        )
      ),
      ''
    ),
    p_passenger_count,
    p_target_budget,
    coalesce(
      p_requested_services,
      '[]'::jsonb
    ),
    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 33 — ENSURE TUROPUAN ACCOUNT
-- ============================================================

create or replace function
public.ensure_turopuan_account(
  p_company_id uuid,
  p_subject_type text,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;


  if not public.is_active_company_member(
    p_company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  if p_subject_type not in (
    'customer',
    'reservation',
    'agency',
    'staff'
  )
  then
    raise exception
      'Invalid TuroPuan subject type';
  end if;


  insert into
  public.turopuan_accounts (
    company_id,
    subject_type,
    subject_id
  )
  values (
    p_company_id,
    p_subject_type,
    p_subject_id
  )
  on conflict (
    company_id,
    subject_type,
    subject_id
  )
  do update
  set
    status =
      public.turopuan_accounts.status

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 33 — AWARD TUROPUAN
-- ============================================================

create or replace function
public.award_turopuan(
  p_account_id uuid,
  p_points bigint,
  p_description text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_idempotency_key text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_account
    public.turopuan_accounts%rowtype;

  v_key text;

  v_new_balance bigint;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  if p_points <= 0 then
    raise exception 'Points must be positive';
  end if;


  select *
  into v_account
  from public.turopuan_accounts
  where id = p_account_id
  for update;


  if not found then
    raise exception 'TuroPuan account not found';
  end if;


  if not public.is_active_company_member(
    v_account.company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  if v_account.status <>
    'active'
  then
    raise exception
      'TuroPuan account is not active';
  end if;


  v_key :=
    coalesce(
      nullif(
        btrim(
          coalesce(
            p_idempotency_key,
            ''
          )
        ),
        ''
      ),
      gen_random_uuid()::text
    );


  if exists (
    select 1
    from public.turopuan_ledger l
    where
      l.company_id =
        v_account.company_id
      and
      l.idempotency_key =
        v_key
  )
  then

    return
      v_account.balance;

  end if;


  v_new_balance :=
    v_account.balance +
    p_points;


  update
  public.turopuan_accounts
  set
    balance =
      v_new_balance,

    lifetime_earned =
      lifetime_earned +
      p_points

  where id =
    v_account.id;


  insert into
  public.turopuan_ledger (
    company_id,
    account_id,
    entry_type,
    points,
    balance_after,
    reference_type,
    reference_id,
    description,
    idempotency_key,
    created_by
  )
  values (
    v_account.company_id,
    v_account.id,
    'earn',
    p_points,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_description,
    v_key,
    v_actor
  );


  return v_new_balance;

end;
$$;


-- ============================================================
-- 33 — REDEEM TUROPUAN
-- ============================================================

create or replace function
public.redeem_turopuan(
  p_account_id uuid,
  p_points bigint,
  p_description text,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_idempotency_key text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_account
    public.turopuan_accounts%rowtype;

  v_key text;

  v_new_balance bigint;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  if p_points <= 0 then
    raise exception 'Points must be positive';
  end if;


  select *
  into v_account
  from public.turopuan_accounts
  where id = p_account_id
  for update;


  if not found then
    raise exception 'TuroPuan account not found';
  end if;


  if not public.is_tour_refund_finance_authorized(
    v_account.company_id
  )
  then
    raise exception
      'Finance authority required';
  end if;


  if v_account.status <>
    'active'
  then
    raise exception
      'TuroPuan account is not active';
  end if;


  if v_account.balance <
    p_points
  then
    raise exception
      'Insufficient TuroPuan balance';
  end if;


  v_key :=
    coalesce(
      nullif(
        btrim(
          coalesce(
            p_idempotency_key,
            ''
          )
        ),
        ''
      ),
      gen_random_uuid()::text
    );


  if exists (
    select 1
    from public.turopuan_ledger l
    where
      l.company_id =
        v_account.company_id
      and
      l.idempotency_key =
        v_key
  )
  then

    return
      v_account.balance;

  end if;


  v_new_balance :=
    v_account.balance -
    p_points;


  update
  public.turopuan_accounts
  set
    balance =
      v_new_balance,

    lifetime_spent =
      lifetime_spent +
      p_points

  where id =
    v_account.id;


  insert into
  public.turopuan_ledger (
    company_id,
    account_id,
    entry_type,
    points,
    balance_after,
    reference_type,
    reference_id,
    description,
    idempotency_key,
    created_by
  )
  values (
    v_account.company_id,
    v_account.id,
    'redeem',
    p_points,
    v_new_balance,
    p_reference_type,
    p_reference_id,
    p_description,
    v_key,
    v_actor
  );


  return v_new_balance;

end;
$$;


-- ============================================================
-- 34 — CREATE B2B ACCOUNT
-- ============================================================

create or replace function
public.create_tour_b2b_account(
  p_company_id uuid,
  p_name text,
  p_account_code text,
  p_contact_name text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_commission_percent numeric default 0,
  p_discount_percent numeric default 0,
  p_credit_limit numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  if not public.is_tour_refund_finance_authorized(
    p_company_id
  )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    p_commission_percent < 0
    or
    p_commission_percent > 100
  then
    raise exception
      'Invalid commission percent';
  end if;


  if
    p_discount_percent < 0
    or
    p_discount_percent > 100
  then
    raise exception
      'Invalid discount percent';
  end if;


  if p_credit_limit < 0 then
    raise exception
      'Invalid credit limit';
  end if;


  insert into
  public.tour_b2b_accounts (
    company_id,
    name,
    account_code,
    contact_name,
    contact_phone,
    contact_email,
    commission_percent,
    discount_percent,
    credit_limit,
    created_by
  )
  values (
    p_company_id,
    btrim(
      p_name
    ),
    upper(
      btrim(
        p_account_code
      )
    ),
    p_contact_name,
    p_contact_phone,
    p_contact_email,
    p_commission_percent,
    p_discount_percent,
    p_credit_limit,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 34 — CREATE B2B PRICE RULE
-- ============================================================

create or replace function
public.create_tour_b2b_price_rule(
  p_b2b_account_id uuid,
  p_product_type text default null,
  p_product_id uuid default null,
  p_discount_percent numeric default 0,
  p_commission_percent numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_account
    public.tour_b2b_accounts%rowtype;

  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  select *
  into v_account
  from public.tour_b2b_accounts
  where id =
    p_b2b_account_id;


  if not found then
    raise exception 'B2B account not found';
  end if;


  if not public.is_tour_refund_finance_authorized(
    v_account.company_id
  )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    p_product_id is not null
    and
    not exists (
      select 1
      from public.tour_product_catalog p
      where
        p.id =
          p_product_id
        and
        p.company_id =
          v_account.company_id
    )
  then
    raise exception
      'Product scope mismatch';
  end if;


  insert into
  public.tour_b2b_price_rules (
    company_id,
    b2b_account_id,
    product_type,
    product_id,
    discount_percent,
    commission_percent,
    created_by
  )
  values (
    v_account.company_id,
    v_account.id,
    p_product_type,
    p_product_id,
    p_discount_percent,
    p_commission_percent,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 35 — CONFIGURE SAAS SUBSCRIPTION
-- ============================================================

create or replace function
public.configure_tour_saas_subscription(
  p_company_id uuid,
  p_plan_key text,
  p_status text,
  p_seat_limit integer,
  p_monthly_price numeric,
  p_module_flags jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  if not public.is_tour_refund_finance_authorized(
    p_company_id
  )
  then
    raise exception
      'Finance authority required';
  end if;


  if p_status not in (
    'trial',
    'active',
    'suspended',
    'cancelled'
  )
  then
    raise exception
      'Invalid SaaS status';
  end if;


  if p_seat_limit <= 0 then
    raise exception
      'Seat limit must be positive';
  end if;


  if p_monthly_price < 0 then
    raise exception
      'Invalid monthly price';
  end if;


  insert into
  public.tour_saas_subscriptions (
    company_id,
    plan_key,
    status,
    seat_limit,
    module_flags,
    monthly_price,
    billing_source,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    btrim(
      p_plan_key
    ),
    p_status,
    p_seat_limit,
    coalesce(
      p_module_flags,
      '{}'::jsonb
    ),
    p_monthly_price,
    'manual',
    v_actor,
    v_actor
  )
  on conflict (
    company_id
  )
  do update
  set
    plan_key =
      excluded.plan_key,

    status =
      excluded.status,

    seat_limit =
      excluded.seat_limit,

    module_flags =
      excluded.module_flags,

    monthly_price =
      excluded.monthly_price,

    billing_source =
      'manual',

    provider_subscription_id =
      null,

    updated_by =
      v_actor

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- 36 — CONFIGURE WHITE LABEL
-- DOES NOT VERIFY DOMAIN
-- ============================================================

create or replace function
public.configure_tour_white_label(
  p_company_id uuid,
  p_brand_name text,
  p_custom_domain text default null,
  p_logo_url text default null,
  p_primary_color text default null,
  p_accent_color text default null,
  p_support_email text default null,
  p_support_phone text default null,
  p_hide_turobus_branding boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception 'Authentication required';
  end if;


  if not public.is_active_company_member(
    p_company_id
  )
  then
    raise exception
      'Active company membership required';
  end if;


  insert into
  public.tour_white_label_settings (
    company_id,
    brand_name,
    custom_domain,
    domain_verified_at,
    logo_url,
    primary_color,
    accent_color,
    support_email,
    support_phone,
    hide_turobus_branding,
    status,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    nullif(
      btrim(
        coalesce(
          p_brand_name,
          ''
        )
      ),
      ''
    ),
    nullif(
      lower(
        btrim(
          coalesce(
            p_custom_domain,
            ''
          )
        )
      ),
      ''
    ),
    null,
    nullif(
      btrim(
        coalesce(
          p_logo_url,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_primary_color,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_accent_color,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_support_email,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_support_phone,
          ''
        )
      ),
      ''
    ),
    p_hide_turobus_branding,
    'draft',
    v_actor,
    v_actor
  )
  on conflict (
    company_id
  )
  do update
  set
    brand_name =
      excluded.brand_name,

    custom_domain =
      excluded.custom_domain,

    domain_verified_at =
      case
        when
          public.tour_white_label_settings.custom_domain
          is distinct from
          excluded.custom_domain
        then
          null
        else
          public.tour_white_label_settings.domain_verified_at
      end,

    logo_url =
      excluded.logo_url,

    primary_color =
      excluded.primary_color,

    accent_color =
      excluded.accent_color,

    support_email =
      excluded.support_email,

    support_phone =
      excluded.support_phone,

    hide_turobus_branding =
      excluded.hide_turobus_branding,

    status =
      case
        when
          public.tour_white_label_settings.custom_domain
          is distinct from
          excluded.custom_domain
        then
          'draft'
        else
          public.tour_white_label_settings.status
      end,

    updated_by =
      v_actor

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function
public.save_tour_destination_discovery_profile(
  uuid,
  text,
  numeric,
  numeric,
  jsonb,
  text,
  boolean
)
from public;

grant execute
on function
public.save_tour_destination_discovery_profile(
  uuid,
  text,
  numeric,
  numeric,
  jsonb,
  text,
  boolean
)
to authenticated;


revoke all
on function
public.discover_tour_destinations(
  uuid,
  numeric,
  text,
  text,
  boolean
)
from public;

grant execute
on function
public.discover_tour_destinations(
  uuid,
  numeric,
  text,
  text,
  boolean
)
to authenticated;


revoke all
on function
public.create_tour_last_minute_offer(
  uuid,
  text,
  numeric,
  timestamptz,
  integer
)
from public;

grant execute
on function
public.create_tour_last_minute_offer(
  uuid,
  text,
  numeric,
  timestamptz,
  integer
)
to authenticated;


revoke all
on function
public.create_tour_group_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  numeric,
  jsonb,
  text
)
from public;

grant execute
on function
public.create_tour_group_request(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  integer,
  numeric,
  jsonb,
  text
)
to authenticated;


revoke all
on function
public.ensure_turopuan_account(
  uuid,
  text,
  uuid
)
from public;

grant execute
on function
public.ensure_turopuan_account(
  uuid,
  text,
  uuid
)
to authenticated;


revoke all
on function
public.award_turopuan(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text
)
from public;

grant execute
on function
public.award_turopuan(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text
)
to authenticated;


revoke all
on function
public.redeem_turopuan(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text
)
from public;

grant execute
on function
public.redeem_turopuan(
  uuid,
  bigint,
  text,
  text,
  uuid,
  text
)
to authenticated;


revoke all
on function
public.create_tour_b2b_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function
public.create_tour_b2b_account(
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;


revoke all
on function
public.create_tour_b2b_price_rule(
  uuid,
  text,
  uuid,
  numeric,
  numeric
)
from public;

grant execute
on function
public.create_tour_b2b_price_rule(
  uuid,
  text,
  uuid,
  numeric,
  numeric
)
to authenticated;


revoke all
on function
public.configure_tour_saas_subscription(
  uuid,
  text,
  text,
  integer,
  numeric,
  jsonb
)
from public;

grant execute
on function
public.configure_tour_saas_subscription(
  uuid,
  text,
  text,
  integer,
  numeric,
  jsonb
)
to authenticated;


revoke all
on function
public.configure_tour_white_label(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
from public;

grant execute
on function
public.configure_tour_white_label(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_destination_discovery_profiles
enable row level security;

alter table
public.tour_last_minute_offers
enable row level security;

alter table
public.tour_group_requests
enable row level security;

alter table
public.turopuan_accounts
enable row level security;

alter table
public.turopuan_ledger
enable row level security;

alter table
public.tour_b2b_accounts
enable row level security;

alter table
public.tour_b2b_price_rules
enable row level security;

alter table
public.tour_saas_subscriptions
enable row level security;

alter table
public.tour_white_label_settings
enable row level security;


create policy
tour_destination_discovery_profiles_select
on public.tour_destination_discovery_profiles
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_last_minute_offers_select
on public.tour_last_minute_offers
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_group_requests_select
on public.tour_group_requests
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
turopuan_accounts_select
on public.turopuan_accounts
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
turopuan_ledger_select
on public.turopuan_ledger
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_b2b_accounts_select
on public.tour_b2b_accounts
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_b2b_price_rules_select
on public.tour_b2b_price_rules
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_saas_subscriptions_select
on public.tour_saas_subscriptions
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_white_label_settings_select
on public.tour_white_label_settings
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
public.tour_saas_subscriptions
is
  'SaaS entitlement/subscription registry. billing_source=manual does not imply successful payment.';


comment on table
public.tour_white_label_settings
is
  'White-label branding registry. domain_verified_at remains null until an external verification flow confirms ownership.';


comment on table
public.tour_last_minute_offers
is
  'Last-minute commercial offers backed by real Tour OS catalog products; no external live availability is inferred.';

