-- ============================================================
-- TUROBUS PACKAGE C — PHASE 22–29
--
-- 22 Smart Filters
-- 23 Price Alerts
-- 24 Price Calendar
-- 25 Comparison
-- 26 Transfer
-- 27 Hotel
-- 28 Activity / Tour
-- 29 Car Rental
--
-- This is a canonical commercial layer.
-- Existing vertical source systems are preserved.
-- No fake live price/provider data.
-- ============================================================


-- ============================================================
-- CANONICAL PRODUCT CATALOG
-- ============================================================

create table if not exists
public.tour_product_catalog (
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

  product_type text
    not null
    check (
      product_type in (
        'transfer',
        'hotel',
        'activity',
        'tour',
        'car_rental'
      )
    ),

  title text
    not null,

  subtitle text,

  destination text,

  location_text text,

  source_system text
    not null
    default 'manual',

  source_reference text,

  source_payload jsonb
    not null
    default '{}'::jsonb,

  cost_price numeric(14,2)
    not null
    default 0
    check (
      cost_price >= 0
    ),

  sale_price numeric(14,2)
    not null
    default 0
    check (
      sale_price >= 0
    ),

  currency text
    not null
    default 'TRY',

  capacity integer
    check (
      capacity is null
      or capacity >= 0
    ),

  available_quantity integer
    check (
      available_quantity is null
      or available_quantity >= 0
    ),

  valid_from date,

  valid_to date,

  active boolean
    not null
    default true,

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

  check (
    valid_to is null
    or
    valid_from is null
    or
    valid_to >= valid_from
  )
);


create index if not exists
tour_product_catalog_search_idx
on public.tour_product_catalog (
  company_id,
  tour_id,
  product_type,
  active
);


create index if not exists
tour_product_catalog_destination_idx
on public.tour_product_catalog (
  company_id,
  destination
);


create index if not exists
tour_product_catalog_departure_idx
on public.tour_product_catalog (
  company_id,
  departure_id,
  product_type
);


-- ============================================================
-- PHASE 24 — PRICE CALENDAR
-- ============================================================

create table if not exists
public.tour_product_price_periods (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  product_id uuid
    not null
    references public.tour_product_catalog(id)
    on delete cascade,

  valid_from date
    not null,

  valid_to date
    not null,

  cost_price numeric(14,2)
    not null
    default 0
    check (
      cost_price >= 0
    ),

  sale_price numeric(14,2)
    not null
    default 0
    check (
      sale_price >= 0
    ),

  available_quantity integer
    check (
      available_quantity is null
      or available_quantity >= 0
    ),

  currency text
    not null
    default 'TRY',

  note text,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  check (
    valid_to >= valid_from
  ),

  unique (
    product_id,
    valid_from,
    valid_to
  )
);


create index if not exists
tour_product_price_periods_lookup_idx
on public.tour_product_price_periods (
  company_id,
  product_id,
  valid_from,
  valid_to
);


-- ============================================================
-- PHASE 22 — SAVED SMART FILTERS
-- ============================================================

create table if not exists
public.tour_product_saved_filters (
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

  product_types jsonb
    not null
    default '[]'::jsonb,

  destination text,

  min_price numeric(14,2),

  max_price numeric(14,2),

  min_margin_percent numeric(9,4),

  availability_only boolean
    not null
    default false,

  filter_payload jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  check (
    min_price is null
    or min_price >= 0
  ),

  check (
    max_price is null
    or max_price >= 0
  ),

  check (
    min_price is null
    or max_price is null
    or max_price >= min_price
  )
);


-- ============================================================
-- PHASE 23 — PRICE ALERTS
-- ============================================================

create table if not exists
public.tour_product_price_alerts (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  product_id uuid
    not null
    references public.tour_product_catalog(id)
    on delete cascade,

  target_price numeric(14,2)
    not null
    check (
      target_price >= 0
    ),

  currency text
    not null
    default 'TRY',

  direction text
    not null
    default 'at_or_below'
    check (
      direction in (
        'at_or_below',
        'at_or_above'
      )
    ),

  active boolean
    not null
    default true,

  last_detected_price numeric(14,2),

  last_triggered_at timestamptz,

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create table if not exists
public.tour_product_price_alert_events (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  alert_id uuid
    not null
    references public.tour_product_price_alerts(id)
    on delete cascade,

  product_id uuid
    not null
    references public.tour_product_catalog(id)
    on delete cascade,

  detected_price numeric(14,2)
    not null,

  target_price numeric(14,2)
    not null,

  currency text
    not null,

  source text
    not null,

  idempotency_key text
    not null,

  acknowledged_at timestamptz,

  acknowledged_by uuid,

  created_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    idempotency_key
  )
);


create index if not exists
tour_product_price_alert_events_open_idx
on public.tour_product_price_alert_events (
  company_id,
  acknowledged_at,
  created_at desc
);


-- ============================================================
-- PHASE 25 — COMPARISON
-- ============================================================

create table if not exists
public.tour_product_comparison_sets (
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

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create table if not exists
public.tour_product_comparison_items (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  comparison_set_id uuid
    not null
    references public.tour_product_comparison_sets(id)
    on delete cascade,

  product_id uuid
    not null
    references public.tour_product_catalog(id)
    on delete cascade,

  position integer
    not null
    default 0,

  created_at timestamptz
    not null
    default now(),

  unique (
    comparison_set_id,
    product_id
  )
);


-- ============================================================
-- PHASE 26–29 — COMMON RESERVATION PRODUCT SALES LAYER
-- ============================================================

create table if not exists
public.tour_reservation_product_items (
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

  reservation_id uuid
    not null
    references public.reservations(id)
    on delete cascade,

  product_id uuid
    not null
    references public.tour_product_catalog(id)
    on delete restrict,

  product_type text
    not null
    check (
      product_type in (
        'transfer',
        'hotel',
        'activity',
        'tour',
        'car_rental'
      )
    ),

  product_title text
    not null,

  service_date date,

  quantity numeric(12,2)
    not null
    default 1
    check (
      quantity > 0
    ),

  unit_cost numeric(14,2)
    not null
    default 0
    check (
      unit_cost >= 0
    ),

  unit_sale_price numeric(14,2)
    not null
    default 0
    check (
      unit_sale_price >= 0
    ),

  total_cost numeric(14,2)
    not null
    default 0
    check (
      total_cost >= 0
    ),

  total_sale_price numeric(14,2)
    not null
    default 0
    check (
      total_sale_price >= 0
    ),

  gross_profit numeric(14,2)
    not null
    default 0,

  currency text
    not null
    default 'TRY',

  status text
    not null
    default 'quoted'
    check (
      status in (
        'quoted',
        'confirmed',
        'cancelled',
        'completed'
      )
    ),

  source_snapshot jsonb
    not null
    default '{}'::jsonb,

  notes text,

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_reservation_product_items_reservation_idx
on public.tour_reservation_product_items (
  company_id,
  reservation_id,
  status
);


create index if not exists
tour_reservation_product_items_product_idx
on public.tour_reservation_product_items (
  company_id,
  product_id,
  service_date
);


-- ============================================================
-- UPDATED AT
-- ============================================================

create or replace function
public.touch_tour_product_catalog_updated_at()
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
tour_product_catalog_touch
on public.tour_product_catalog;


create trigger
tour_product_catalog_touch
before update
on public.tour_product_catalog
for each row
execute function
public.touch_tour_product_catalog_updated_at();


-- ============================================================
-- IMMUTABLE PRICE ALERT EVENTS
-- ============================================================

create or replace function
public.prevent_tour_product_price_alert_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Price alert events are immutable';
end;
$$;


drop trigger if exists
tour_product_price_alert_events_no_update
on public.tour_product_price_alert_events;


create trigger
tour_product_price_alert_events_no_update
before update
on public.tour_product_price_alert_events
for each row
when (
  old.acknowledged_at is not distinct from new.acknowledged_at
  and
  old.acknowledged_by is not distinct from new.acknowledged_by
)
execute function
public.prevent_tour_product_price_alert_event_mutation();


drop trigger if exists
tour_product_price_alert_events_no_delete
on public.tour_product_price_alert_events;


create trigger
tour_product_price_alert_events_no_delete
before delete
on public.tour_product_price_alert_events
for each row
execute function
public.prevent_tour_product_price_alert_event_mutation();


-- ============================================================
-- EFFECTIVE PRICE HELPER
-- ============================================================

create or replace function
public.get_tour_product_effective_price(
  p_product_id uuid,
  p_service_date date default current_date
)
returns table (
  sale_price numeric,
  cost_price numeric,
  currency text,
  available_quantity integer,
  source text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product
    public.tour_product_catalog%rowtype;

  v_period
    public.tour_product_price_periods%rowtype;
begin

  select *
  into v_product
  from public.tour_product_catalog
  where id =
    p_product_id;


  if not found then
    raise exception
      'Product not found';
  end if;


  if not
    public.is_active_company_member(
      v_product.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_period
  from public.tour_product_price_periods
  where
    product_id =
      v_product.id
    and
    p_service_date between
      valid_from
      and
      valid_to
  order by
    valid_from desc,
    created_at desc
  limit 1;


  if found then

    return query
    select
      v_period.sale_price,
      v_period.cost_price,
      v_period.currency,
      v_period.available_quantity,
      'price_calendar'::text;

  else

    return query
    select
      v_product.sale_price,
      v_product.cost_price,
      v_product.currency,
      v_product.available_quantity,
      'base_product'::text;

  end if;

end;
$$;


-- ============================================================
-- CREATE PRODUCT
-- ============================================================

create or replace function
public.create_tour_commercial_product(
  p_tour_id uuid,
  p_departure_id uuid,
  p_product_type text,
  p_title text,
  p_destination text,
  p_cost_price numeric,
  p_sale_price numeric,
  p_currency text default 'TRY',
  p_capacity integer default null,
  p_source_system text default 'manual',
  p_source_reference text default null
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

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select
    company_id
  into
    v_company_id
  from
    public.tours
  where
    id =
      p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    p_product_type not in (
      'transfer',
      'hotel',
      'activity',
      'tour',
      'car_rental'
    )
  then
    raise exception
      'Invalid product type';
  end if;


  if
    nullif(
      btrim(
        coalesce(
          p_title,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Product title required';
  end if;


  if
    coalesce(
      p_cost_price,
      0
    ) < 0
    or
    coalesce(
      p_sale_price,
      0
    ) < 0
  then
    raise exception
      'Invalid price';
  end if;


  if
    p_departure_id is not null
    and
    not exists (
      select 1
      from
        public.tour_departures d
      where
        d.id =
          p_departure_id
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


  insert into
  public.tour_product_catalog (
    company_id,
    tour_id,
    departure_id,

    product_type,

    title,

    destination,

    source_system,
    source_reference,

    cost_price,
    sale_price,

    currency,

    capacity,
    available_quantity,

    created_by,
    updated_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,

    p_product_type,

    btrim(
      p_title
    ),

    nullif(
      btrim(
        coalesce(
          p_destination,
          ''
        )
      ),
      ''
    ),

    coalesce(
      nullif(
        btrim(
          p_source_system
        ),
        ''
      ),
      'manual'
    ),

    nullif(
      btrim(
        coalesce(
          p_source_reference,
          ''
        )
      ),
      ''
    ),

    coalesce(
      p_cost_price,
      0
    ),

    coalesce(
      p_sale_price,
      0
    ),

    coalesce(
      nullif(
        btrim(
          p_currency
        ),
        ''
      ),
      'TRY'
    ),

    p_capacity,
    p_capacity,

    v_actor,
    v_actor
  )
  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- SET PRICE PERIOD
-- ============================================================

create or replace function
public.set_tour_product_price_period(
  p_product_id uuid,
  p_valid_from date,
  p_valid_to date,
  p_cost_price numeric,
  p_sale_price numeric,
  p_available_quantity integer default null,
  p_note text default null
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

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_product
  from
    public.tour_product_catalog
  where
    id =
      p_product_id;


  if not found then
    raise exception
      'Product not found';
  end if;


  if not
    public.is_active_company_member(
      v_product.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    p_valid_to <
      p_valid_from
  then
    raise exception
      'Invalid price period';
  end if;


  if
    coalesce(
      p_cost_price,
      0
    ) < 0
    or
    coalesce(
      p_sale_price,
      0
    ) < 0
  then
    raise exception
      'Invalid price';
  end if;


  insert into
  public.tour_product_price_periods (
    company_id,
    product_id,
    valid_from,
    valid_to,

    cost_price,
    sale_price,

    available_quantity,

    currency,
    note,

    created_by
  )
  values (
    v_product.company_id,
    v_product.id,
    p_valid_from,
    p_valid_to,

    coalesce(
      p_cost_price,
      0
    ),

    coalesce(
      p_sale_price,
      0
    ),

    p_available_quantity,

    v_product.currency,

    nullif(
      btrim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),

    v_actor
  )
  on conflict (
    product_id,
    valid_from,
    valid_to
  )
  do update
  set
    cost_price =
      excluded.cost_price,

    sale_price =
      excluded.sale_price,

    available_quantity =
      excluded.available_quantity,

    note =
      excluded.note

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- SAVED SMART FILTER
-- ============================================================

create or replace function
public.save_tour_product_filter(
  p_tour_id uuid,
  p_name text,
  p_product_types jsonb default '[]'::jsonb,
  p_destination text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_margin_percent numeric default null,
  p_availability_only boolean default false
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

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select
    company_id
  into
    v_company_id
  from
    public.tours
  where
    id =
      p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  insert into
  public.tour_product_saved_filters (
    company_id,
    tour_id,
    name,

    product_types,
    destination,

    min_price,
    max_price,

    min_margin_percent,

    availability_only,

    filter_payload,

    created_by
  )
  values (
    v_company_id,
    p_tour_id,
    btrim(
      p_name
    ),

    coalesce(
      p_product_types,
      '[]'::jsonb
    ),

    nullif(
      btrim(
        coalesce(
          p_destination,
          ''
        )
      ),
      ''
    ),

    p_min_price,
    p_max_price,

    p_min_margin_percent,

    p_availability_only,

    jsonb_build_object(
      'product_types',
      p_product_types,
      'destination',
      p_destination,
      'min_price',
      p_min_price,
      'max_price',
      p_max_price,
      'min_margin_percent',
      p_min_margin_percent,
      'availability_only',
      p_availability_only
    ),

    v_actor
  )
  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- PRICE ALERT
-- ============================================================

create or replace function
public.create_tour_product_price_alert(
  p_product_id uuid,
  p_target_price numeric,
  p_direction text default 'at_or_below'
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

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_product
  from
    public.tour_product_catalog
  where
    id =
      p_product_id;


  if not found then
    raise exception
      'Product not found';
  end if;


  if not
    public.is_active_company_member(
      v_product.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    coalesce(
      p_target_price,
      -1
    ) < 0
  then
    raise exception
      'Invalid target price';
  end if;


  if
    p_direction not in (
      'at_or_below',
      'at_or_above'
    )
  then
    raise exception
      'Invalid alert direction';
  end if;


  insert into
  public.tour_product_price_alerts (
    company_id,
    tour_id,
    product_id,

    target_price,
    currency,
    direction,

    created_by
  )
  values (
    v_product.company_id,
    v_product.tour_id,
    v_product.id,

    p_target_price,
    v_product.currency,
    p_direction,

    v_actor
  )
  returning id
  into v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- EVALUATE ONE PRICE ALERT
-- ============================================================

create or replace function
public.evaluate_tour_product_price_alert(
  p_alert_id uuid,
  p_detected_price numeric,
  p_source text default 'manual_evaluation'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_alert
    public.tour_product_price_alerts%rowtype;

  v_trigger boolean;

  v_key text;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_alert
  from
    public.tour_product_price_alerts
  where
    id =
      p_alert_id
  for update;


  if not found then
    raise exception
      'Price alert not found';
  end if;


  if not
    public.is_active_company_member(
      v_alert.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if not
    v_alert.active
  then
    return false;
  end if;


  if
    p_detected_price <
      0
  then
    raise exception
      'Invalid detected price';
  end if;


  v_trigger :=
    case
      when
        v_alert.direction =
          'at_or_below'
      then
        p_detected_price <=
          v_alert.target_price
      else
        p_detected_price >=
          v_alert.target_price
    end;


  update
    public.tour_product_price_alerts
  set
    last_detected_price =
      p_detected_price,

    last_triggered_at =
      case
        when v_trigger
        then now()
        else last_triggered_at
      end
  where
    id =
      v_alert.id;


  if
    v_trigger
  then

    v_key :=
      v_alert.id::text
      ||
      ':'
      ||
      p_detected_price::text
      ||
      ':'
      ||
      current_date::text;


    insert into
    public.tour_product_price_alert_events (
      company_id,
      alert_id,
      product_id,

      detected_price,
      target_price,
      currency,

      source,

      idempotency_key
    )
    values (
      v_alert.company_id,
      v_alert.id,
      v_alert.product_id,

      p_detected_price,
      v_alert.target_price,
      v_alert.currency,

      p_source,

      v_key
    )
    on conflict (
      company_id,
      idempotency_key
    )
    do nothing;

  end if;


  return
    v_trigger;

end;
$$;


-- ============================================================
-- INTERNAL AUTOMATIC PRICE ALERT TRIGGER
-- ============================================================

create or replace function
public.detect_tour_product_price_alerts_internal(
  p_company_id uuid,
  p_product_id uuid,
  p_detected_price numeric,
  p_currency text,
  p_source text
)
returns void
language plpgsql
set search_path = public
as $$
declare
  rec record;

  v_trigger boolean;

  v_key text;
begin

  for rec in

    select *
    from
      public.tour_product_price_alerts a
    where
      a.company_id =
        p_company_id
      and
      a.product_id =
        p_product_id
      and
      a.active =
        true
      and
      a.currency =
        p_currency

  loop

    v_trigger :=
      case
        when
          rec.direction =
            'at_or_below'
        then
          p_detected_price <=
            rec.target_price
        else
          p_detected_price >=
            rec.target_price
      end;


    update
      public.tour_product_price_alerts
    set
      last_detected_price =
        p_detected_price,

      last_triggered_at =
        case
          when v_trigger
          then now()
          else last_triggered_at
        end
    where
      id =
        rec.id;


    if v_trigger then

      v_key :=
        rec.id::text
        ||
        ':'
        ||
        p_detected_price::text
        ||
        ':'
        ||
        current_date::text;


      insert into
      public.tour_product_price_alert_events (
        company_id,
        alert_id,
        product_id,

        detected_price,
        target_price,
        currency,

        source,

        idempotency_key
      )
      values (
        p_company_id,
        rec.id,
        p_product_id,

        p_detected_price,
        rec.target_price,
        p_currency,

        p_source,

        v_key
      )
      on conflict (
        company_id,
        idempotency_key
      )
      do nothing;

    end if;

  end loop;

end;
$$;


create or replace function
public.on_tour_product_catalog_price_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    tg_op =
      'INSERT'
    or
    old.sale_price is distinct from
      new.sale_price
  then

    perform
      public.detect_tour_product_price_alerts_internal(
        new.company_id,
        new.id,
        new.sale_price,
        new.currency,
        'base_product'
      );

  end if;


  return new;

end;
$$;


drop trigger if exists
tour_product_catalog_price_alert_trigger
on public.tour_product_catalog;


create trigger
tour_product_catalog_price_alert_trigger
after insert or update of sale_price
on public.tour_product_catalog
for each row
execute function
public.on_tour_product_catalog_price_change();


create or replace function
public.on_tour_product_price_period_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  perform
    public.detect_tour_product_price_alerts_internal(
      new.company_id,
      new.product_id,
      new.sale_price,
      new.currency,
      'price_calendar'
    );


  return new;

end;
$$;


drop trigger if exists
tour_product_price_period_alert_trigger
on public.tour_product_price_periods;


create trigger
tour_product_price_period_alert_trigger
after insert or update of sale_price
on public.tour_product_price_periods
for each row
execute function
public.on_tour_product_price_period_change();


-- ============================================================
-- ACKNOWLEDGE PRICE ALERT EVENT
-- ============================================================

create or replace function
public.acknowledge_tour_product_price_alert_event(
  p_event_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select
    company_id
  into
    v_company_id
  from
    public.tour_product_price_alert_events
  where
    id =
      p_event_id;


  if not found then
    raise exception
      'Price alert event not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  update
    public.tour_product_price_alert_events
  set
    acknowledged_at =
      coalesce(
        acknowledged_at,
        now()
      ),

    acknowledged_by =
      coalesce(
        acknowledged_by,
        v_actor
      )
  where
    id =
      p_event_id;

end;
$$;


-- ============================================================
-- CREATE COMPARISON SET
-- ============================================================

create or replace function
public.create_tour_product_comparison(
  p_tour_id uuid,
  p_name text,
  p_product_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;

  v_set_id uuid;

  v_product_id uuid;

  v_position integer := 0;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select
    company_id
  into
    v_company_id
  from
    public.tours
  where
    id =
      p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    coalesce(
      array_length(
        p_product_ids,
        1
      ),
      0
    ) < 2
    or
    array_length(
      p_product_ids,
      1
    ) > 4
  then
    raise exception
      'Comparison requires 2 to 4 products';
  end if;


  if (
    select
      count(
        distinct x
      )
    from
      unnest(
        p_product_ids
      ) x
  ) <>
    array_length(
      p_product_ids,
      1
    )
  then
    raise exception
      'Duplicate comparison product';
  end if;


  insert into
  public.tour_product_comparison_sets (
    company_id,
    tour_id,
    name,
    created_by
  )
  values (
    v_company_id,
    p_tour_id,
    btrim(
      p_name
    ),
    v_actor
  )
  returning
    id
  into
    v_set_id;


  foreach
    v_product_id
  in array
    p_product_ids
  loop

    if not exists (
      select
        1
      from
        public.tour_product_catalog p
      where
        p.id =
          v_product_id
        and
        p.company_id =
          v_company_id
        and
        p.tour_id =
          p_tour_id
    )
    then
      raise exception
        'Comparison product scope mismatch';
    end if;


    v_position :=
      v_position + 1;


    insert into
    public.tour_product_comparison_items (
      company_id,
      comparison_set_id,
      product_id,
      position
    )
    values (
      v_company_id,
      v_set_id,
      v_product_id,
      v_position
    );

  end loop;


  return
    v_set_id;

end;
$$;


-- ============================================================
-- ADD PRODUCT TO RESERVATION
-- ============================================================

create or replace function
public.add_tour_product_to_reservation(
  p_reservation_id uuid,
  p_product_id uuid,
  p_quantity numeric default 1,
  p_service_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_reservation
    public.reservations%rowtype;

  v_product
    public.tour_product_catalog%rowtype;

  v_sale_price numeric;

  v_cost_price numeric;

  v_currency text;

  v_available integer;

  v_price_source text;

  v_total_sale numeric(14,2);

  v_total_cost numeric(14,2);

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if
    coalesce(
      p_quantity,
      0
    ) <= 0
  then
    raise exception
      'Quantity must be positive';
  end if;


  select *
  into v_reservation
  from
    public.reservations
  where
    id =
      p_reservation_id;


  if not found then
    raise exception
      'Reservation not found';
  end if;


  if not
    public.is_active_company_member(
      v_reservation.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_product
  from
    public.tour_product_catalog
  where
    id =
      p_product_id
    and
    company_id =
      v_reservation.company_id
    and
    tour_id =
      v_reservation.tour_id
    and
    active =
      true;


  if not found then
    raise exception
      'Active product not found for reservation tour';
  end if;


  if
    v_product.departure_id is not null
    and
    v_reservation.departure_id is distinct from
      v_product.departure_id
  then
    raise exception
      'Product departure mismatch';
  end if;


  select
    ep.sale_price,
    ep.cost_price,
    ep.currency,
    ep.available_quantity,
    ep.source

  into
    v_sale_price,
    v_cost_price,
    v_currency,
    v_available,
    v_price_source

  from
    public.get_tour_product_effective_price(
      v_product.id,
      coalesce(
        p_service_date,
        current_date
      )
    ) ep;


  if
    v_available is not null
    and
    p_quantity >
      v_available
  then
    raise exception
      'Insufficient product availability';
  end if;


  v_total_sale :=
    round(
      v_sale_price *
      p_quantity,
      2
    );


  v_total_cost :=
    round(
      v_cost_price *
      p_quantity,
      2
    );


  insert into
  public.tour_reservation_product_items (
    company_id,
    tour_id,
    departure_id,
    reservation_id,

    product_id,
    product_type,
    product_title,

    service_date,
    quantity,

    unit_cost,
    unit_sale_price,

    total_cost,
    total_sale_price,

    gross_profit,

    currency,

    source_snapshot,

    notes,

    created_by
  )
  values (
    v_reservation.company_id,
    v_reservation.tour_id,
    v_reservation.departure_id,
    v_reservation.id,

    v_product.id,
    v_product.product_type,
    v_product.title,

    p_service_date,
    p_quantity,

    v_cost_price,
    v_sale_price,

    v_total_cost,
    v_total_sale,

    v_total_sale -
      v_total_cost,

    v_currency,

    jsonb_build_object(
      'source_system',
      v_product.source_system,
      'source_reference',
      v_product.source_reference,
      'price_source',
      v_price_source,
      'catalog_product_id',
      v_product.id
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
  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function
public.get_tour_product_effective_price(
  uuid,
  date
)
from public;

grant execute
on function
public.get_tour_product_effective_price(
  uuid,
  date
)
to authenticated;


revoke all
on function
public.create_tour_commercial_product(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  integer,
  text,
  text
)
from public;

grant execute
on function
public.create_tour_commercial_product(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  integer,
  text,
  text
)
to authenticated;


revoke all
on function
public.set_tour_product_price_period(
  uuid,
  date,
  date,
  numeric,
  numeric,
  integer,
  text
)
from public;

grant execute
on function
public.set_tour_product_price_period(
  uuid,
  date,
  date,
  numeric,
  numeric,
  integer,
  text
)
to authenticated;


revoke all
on function
public.save_tour_product_filter(
  uuid,
  text,
  jsonb,
  text,
  numeric,
  numeric,
  numeric,
  boolean
)
from public;

grant execute
on function
public.save_tour_product_filter(
  uuid,
  text,
  jsonb,
  text,
  numeric,
  numeric,
  numeric,
  boolean
)
to authenticated;


revoke all
on function
public.create_tour_product_price_alert(
  uuid,
  numeric,
  text
)
from public;

grant execute
on function
public.create_tour_product_price_alert(
  uuid,
  numeric,
  text
)
to authenticated;


revoke all
on function
public.evaluate_tour_product_price_alert(
  uuid,
  numeric,
  text
)
from public;

grant execute
on function
public.evaluate_tour_product_price_alert(
  uuid,
  numeric,
  text
)
to authenticated;


revoke all
on function
public.acknowledge_tour_product_price_alert_event(uuid)
from public;

grant execute
on function
public.acknowledge_tour_product_price_alert_event(uuid)
to authenticated;


revoke all
on function
public.create_tour_product_comparison(
  uuid,
  text,
  uuid[]
)
from public;

grant execute
on function
public.create_tour_product_comparison(
  uuid,
  text,
  uuid[]
)
to authenticated;


revoke all
on function
public.add_tour_product_to_reservation(
  uuid,
  uuid,
  numeric,
  date,
  text
)
from public;

grant execute
on function
public.add_tour_product_to_reservation(
  uuid,
  uuid,
  numeric,
  date,
  text
)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_product_catalog
enable row level security;

alter table
public.tour_product_price_periods
enable row level security;

alter table
public.tour_product_saved_filters
enable row level security;

alter table
public.tour_product_price_alerts
enable row level security;

alter table
public.tour_product_price_alert_events
enable row level security;

alter table
public.tour_product_comparison_sets
enable row level security;

alter table
public.tour_product_comparison_items
enable row level security;

alter table
public.tour_reservation_product_items
enable row level security;


create policy
tour_product_catalog_select
on public.tour_product_catalog
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_price_periods_select
on public.tour_product_price_periods
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_saved_filters_select
on public.tour_product_saved_filters
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_price_alerts_select
on public.tour_product_price_alerts
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_price_alert_events_select
on public.tour_product_price_alert_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_comparison_sets_select
on public.tour_product_comparison_sets
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_product_comparison_items_select
on public.tour_product_comparison_items
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_reservation_product_items_select
on public.tour_reservation_product_items
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
public.tour_product_catalog
is
  'Canonical Tour OS commercial product layer for transfer, hotel, activity/tour and car rental products; existing vertical source systems remain authoritative.';


comment on table
public.tour_reservation_product_items
is
  'Commercial reservation line items. Does not silently mutate the existing sales/payment ledger.';

