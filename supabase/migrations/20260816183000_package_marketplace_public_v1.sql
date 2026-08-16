begin;

create extension if not exists pgcrypto;

-- ============================================================
-- TUROBUS PACKAGE MARKETPLACE V1
--
-- Holiday / Honeymoon / Family / Adventure / Premium
--
-- Packages may combine:
-- hotel / villa / tour / activity / yacht / transfer
--
-- Marketplace commission ONLY marketplace sourced sales.
-- ============================================================


create table if not exists public.package_marketplace_items (
  id uuid primary key default gen_random_uuid(),

  company_id uuid,

  slug text not null unique,
  name text not null,

  package_type text not null
    check (
      package_type in (
        'holiday',
        'honeymoon',
        'family',
        'adventure',
        'premium'
      )
    ),

  city text,
  district text,

  short_description text,
  description text,

  nights integer not null default 1,
  days integer not null default 2,

  min_guests integer not null default 2,
  max_guests integer not null default 2,

  base_price numeric(14,2) not null default 0,
  old_price numeric(14,2),
  currency text not null default 'TRY',

  cover_url text,
  gallery jsonb not null default '[]'::jsonb,

  included_items jsonb not null default '[]'::jsonb,
  optional_items jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,

  accommodation_type text,
  meal_plan text,

  transfer_included boolean not null default false,

  featured boolean not null default false,
  verified boolean not null default false,

  marketplace_enabled boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.package_marketplace_departures (
  id uuid primary key default gen_random_uuid(),

  package_id uuid not null
    references public.package_marketplace_items(id)
    on delete cascade,

  start_date date not null,
  end_date date not null,

  capacity integer not null default 20,
  sold_count integer not null default 0,

  price numeric(14,2),
  currency text not null default 'TRY',

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  check (end_date >= start_date),
  check (capacity >= 0),
  check (sold_count >= 0)
);


create table if not exists public.package_marketplace_reservations (
  id uuid primary key default gen_random_uuid(),

  reservation_code text not null unique,

  package_id uuid not null
    references public.package_marketplace_items(id),

  departure_id uuid
    references public.package_marketplace_departures(id),

  guests integer not null,

  customer_name text not null,
  customer_phone text not null,
  customer_email text,

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
        'cancelled',
        'expired'
      )
    ),

  currency text not null default 'TRY',

  package_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,

  turobus_commission numeric(14,2) not null default 0,

  public_token uuid not null default gen_random_uuid(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists idx_package_marketplace_type
on public.package_marketplace_items(
  package_type,
  city,
  marketplace_enabled,
  is_active
);


create index if not exists idx_package_departure_dates
on public.package_marketplace_departures(
  package_id,
  start_date,
  end_date
);


alter table public.package_marketplace_items
enable row level security;

alter table public.package_marketplace_departures
enable row level security;

alter table public.package_marketplace_reservations
enable row level security;


revoke all
on public.package_marketplace_items
from anon;

revoke all
on public.package_marketplace_departures
from anon;

revoke all
on public.package_marketplace_reservations
from anon;


-- ============================================================
-- PUBLIC CATALOG
-- ============================================================

create or replace function public.get_public_package_marketplace(
  p_destination text default null,
  p_package_type text default null,
  p_guests integer default null,
  p_start_date date default null
)
returns table(
  id uuid,
  slug text,
  name text,

  package_type text,

  city text,
  district text,

  short_description text,

  nights integer,
  days integer,

  min_guests integer,
  max_guests integer,

  base_price numeric,
  old_price numeric,
  currency text,

  cover_url text,

  accommodation_type text,
  meal_plan text,

  transfer_included boolean,

  featured boolean,
  verified boolean,

  next_departure date,
  available_capacity integer
)
language sql
stable
security definer
set search_path = public
as $$

  select
    p.id,
    p.slug,
    p.name,

    p.package_type,

    p.city,
    p.district,

    p.short_description,

    p.nights,
    p.days,

    p.min_guests,
    p.max_guests,

    p.base_price,
    p.old_price,
    p.currency,

    p.cover_url,

    p.accommodation_type,
    p.meal_plan,

    p.transfer_included,

    p.featured,
    p.verified,

    (
      select d.start_date
      from public.package_marketplace_departures d
      where d.package_id = p.id
        and d.is_active = true
        and d.start_date >= coalesce(
          p_start_date,
          current_date
        )
        and d.capacity > d.sold_count
      order by d.start_date
      limit 1
    ) as next_departure,

    (
      select greatest(
        d.capacity - d.sold_count,
        0
      )
      from public.package_marketplace_departures d
      where d.package_id = p.id
        and d.is_active = true
        and d.start_date >= coalesce(
          p_start_date,
          current_date
        )
        and d.capacity > d.sold_count
      order by d.start_date
      limit 1
    ) as available_capacity

  from public.package_marketplace_items p

  where
    p.marketplace_enabled = true
    and p.is_active = true

    and (
      p_destination is null
      or trim(p_destination) = ''
      or lower(
        coalesce(
          p.city,
          ''
        )
      )
        like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'

      or lower(
        coalesce(
          p.district,
          ''
        )
      )
        like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'

      or lower(
        p.name
      )
        like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'
    )

    and (
      p_package_type is null
      or trim(
        p_package_type
      ) = ''
      or p.package_type =
        p_package_type
    )

    and (
      p_guests is null
      or (
        p_guests >=
          p.min_guests
        and
        p_guests <=
          p.max_guests
      )
    )

  order by
    p.featured desc,
    p.verified desc,
    p.base_price asc,
    p.name;

$$;


-- ============================================================
-- DETAIL
-- ============================================================

create or replace function public.get_public_package_detail(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_package public.package_marketplace_items%rowtype;
  v_departures jsonb;
begin

  select *
  into v_package
  from public.package_marketplace_items
  where slug = p_slug
    and marketplace_enabled = true
    and is_active = true;


  if not found then
    raise exception 'Paket bulunamadı';
  end if;


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            d.id,

          'start_date',
            d.start_date,

          'end_date',
            d.end_date,

          'capacity',
            d.capacity,

          'sold_count',
            d.sold_count,

          'available_capacity',
            greatest(
              d.capacity -
              d.sold_count,
              0
            ),

          'price',
            coalesce(
              d.price,
              v_package.base_price
            ),

          'currency',
            coalesce(
              d.currency,
              v_package.currency
            )
        )
        order by d.start_date
      ),
      '[]'::jsonb
    )
  into v_departures
  from public.package_marketplace_departures d
  where d.package_id =
    v_package.id
    and d.is_active = true
    and d.start_date >=
      current_date;


  return jsonb_build_object(
    'id',
      v_package.id,

    'slug',
      v_package.slug,

    'name',
      v_package.name,

    'package_type',
      v_package.package_type,

    'city',
      v_package.city,

    'district',
      v_package.district,

    'short_description',
      v_package.short_description,

    'description',
      v_package.description,

    'nights',
      v_package.nights,

    'days',
      v_package.days,

    'min_guests',
      v_package.min_guests,

    'max_guests',
      v_package.max_guests,

    'base_price',
      v_package.base_price,

    'old_price',
      v_package.old_price,

    'currency',
      v_package.currency,

    'cover_url',
      v_package.cover_url,

    'gallery',
      v_package.gallery,

    'included_items',
      v_package.included_items,

    'optional_items',
      v_package.optional_items,

    'highlights',
      v_package.highlights,

    'accommodation_type',
      v_package.accommodation_type,

    'meal_plan',
      v_package.meal_plan,

    'transfer_included',
      v_package.transfer_included,

    'verified',
      v_package.verified,

    'departures',
      v_departures
  );

end;
$$;


-- ============================================================
-- PACKAGE QUOTE
-- ============================================================

create or replace function public.quote_public_package_booking(
  p_package_id uuid,
  p_departure_id uuid,
  p_guests integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_package public.package_marketplace_items%rowtype;
  v_departure public.package_marketplace_departures%rowtype;

  v_price numeric(14,2);
  v_capacity integer;
  v_total numeric(14,2);
begin

  select *
  into v_package
  from public.package_marketplace_items
  where id = p_package_id
    and marketplace_enabled = true
    and is_active = true;


  if not found then
    raise exception 'Paket bulunamadı';
  end if;


  if p_guests <
      v_package.min_guests
     or
     p_guests >
      v_package.max_guests
  then
    raise exception 'Misafir sayısı pakete uygun değil';
  end if;


  select *
  into v_departure
  from public.package_marketplace_departures
  where id = p_departure_id
    and package_id = p_package_id
    and is_active = true;


  if not found then
    raise exception 'Paket tarihi bulunamadı';
  end if;


  v_capacity :=
    greatest(
      v_departure.capacity -
      v_departure.sold_count,
      0
    );


  if v_capacity <
      p_guests
  then
    return jsonb_build_object(
      'available',
        false,

      'available_capacity',
        v_capacity
    );
  end if;


  v_price :=
    coalesce(
      v_departure.price,
      v_package.base_price
    );


  v_total :=
    v_price *
    p_guests;


  return jsonb_build_object(
    'available',
      true,

    'available_capacity',
      v_capacity,

    'unit_price',
      v_price,

    'guests',
      p_guests,

    'grand_total',
      v_total,

    'currency',
      coalesce(
        v_departure.currency,
        v_package.currency
      ),

    'start_date',
      v_departure.start_date,

    'end_date',
      v_departure.end_date
  );

end;
$$;


-- ============================================================
-- RESERVATION
-- ============================================================

create or replace function public.create_public_package_reservation(
  p_package_id uuid,
  p_departure_id uuid,

  p_guests integer,

  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,

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

  v_total numeric(14,2);
  v_currency text;
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
      p_departure_id::text
    )
  );


  v_quote :=
    public.quote_public_package_booking(
      p_package_id,
      p_departure_id,
      p_guests
    );


  if not coalesce(
    (
      v_quote ->>
      'available'
    )::boolean,
    false
  )
  then
    raise exception 'Seçilen paket tarihinde yeterli kontenjan kalmadı';
  end if;


  v_total :=
    (
      v_quote ->>
      'grand_total'
    )::numeric;


  v_currency :=
    v_quote ->>
    'currency';


  -- Turobus commission ONLY Marketplace sourced booking.
  v_commission :=
    round(
      v_total *
      0.10,
      2
    );


  v_code :=
    'PK-' ||
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


  insert into public.package_marketplace_reservations(
    reservation_code,

    package_id,
    departure_id,

    guests,

    customer_name,
    customer_phone,
    customer_email,

    notes,

    sales_channel,
    status,

    currency,

    package_total,
    grand_total,

    turobus_commission
  )
  values(
    v_code,

    p_package_id,
    p_departure_id,

    p_guests,

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
          p_notes,
          ''
        )
      ),
      ''
    ),

    'turobus_marketplace',
    'pending',

    v_currency,

    v_total,
    v_total,

    v_commission
  )
  returning id
  into v_id;


  update public.package_marketplace_departures
  set sold_count =
    sold_count +
    p_guests
  where id =
    p_departure_id;


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
on function public.get_public_package_marketplace(text,text,integer,date)
from public;

revoke all
on function public.get_public_package_detail(text)
from public;

revoke all
on function public.quote_public_package_booking(uuid,uuid,integer)
from public;

revoke all
on function public.create_public_package_reservation(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
)
from public;


grant execute
on function public.get_public_package_marketplace(text,text,integer,date)
to anon, authenticated;

grant execute
on function public.get_public_package_detail(text)
to anon, authenticated;

grant execute
on function public.quote_public_package_booking(uuid,uuid,integer)
to anon, authenticated;

grant execute
on function public.create_public_package_reservation(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
)
to anon, authenticated;

commit;
