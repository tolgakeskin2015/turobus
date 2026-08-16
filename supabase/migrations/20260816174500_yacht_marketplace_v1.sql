begin;

create extension if not exists pgcrypto;

-- ============================================================
-- TUROBUS YACHT MARKETPLACE V1
-- Independent marketplace core
-- ============================================================

create table if not exists public.yacht_marketplace_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  slug text not null unique,
  name text not null,

  yacht_type text not null default 'motor_yacht'
    check (
      yacht_type in (
        'motor_yacht',
        'gulet',
        'catamaran',
        'sailing',
        'daily_boat'
      )
    ),

  city text not null,
  marina text,
  departure_point text,

  description text,

  length_m numeric(8,2),
  build_year integer,
  cabins integer not null default 0,
  bathrooms integer not null default 0,
  max_guests integer not null default 1,
  crew_count integer not null default 0,

  captain_included boolean not null default true,
  fuel_included boolean not null default false,
  meals_included boolean not null default false,

  base_daily_price numeric(14,2) not null default 0,
  base_hourly_price numeric(14,2),
  currency text not null default 'TRY',

  minimum_days integer not null default 1,

  cover_url text,
  gallery jsonb not null default '[]'::jsonb,
  amenities jsonb not null default '[]'::jsonb,

  verified boolean not null default false,
  featured boolean not null default false,
  marketplace_enabled boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.yacht_marketplace_rates (
  id uuid primary key default gen_random_uuid(),

  yacht_id uuid not null
    references public.yacht_marketplace_items(id)
    on delete cascade,

  start_date date not null,
  end_date date not null,

  daily_price numeric(14,2) not null,
  minimum_days integer,

  created_at timestamptz not null default now(),

  check (end_date >= start_date)
);


create table if not exists public.yacht_marketplace_blocks (
  id uuid primary key default gen_random_uuid(),

  yacht_id uuid not null
    references public.yacht_marketplace_items(id)
    on delete cascade,

  start_date date not null,
  end_date date not null,

  reason text,

  created_at timestamptz not null default now(),

  check (end_date > start_date)
);


create table if not exists public.yacht_marketplace_reservations (
  id uuid primary key default gen_random_uuid(),

  reservation_code text not null unique,

  yacht_id uuid not null
    references public.yacht_marketplace_items(id),

  check_in date not null,
  check_out date not null,

  guests integer not null,

  customer_name text not null,
  customer_phone text not null,
  customer_email text,

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

  subtotal numeric(14,2) not null default 0,
  service_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,

  turobus_commission numeric(14,2) not null default 0,

  public_token uuid not null default gen_random_uuid(),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (check_out > check_in)
);


create index if not exists idx_yacht_marketplace_location
  on public.yacht_marketplace_items(city, marina);

create index if not exists idx_yacht_marketplace_enabled
  on public.yacht_marketplace_items(marketplace_enabled, is_active);

create index if not exists idx_yacht_reservation_dates
  on public.yacht_marketplace_reservations(yacht_id, check_in, check_out);

create index if not exists idx_yacht_blocks_dates
  on public.yacht_marketplace_blocks(yacht_id, start_date, end_date);


alter table public.yacht_marketplace_items enable row level security;
alter table public.yacht_marketplace_rates enable row level security;
alter table public.yacht_marketplace_blocks enable row level security;
alter table public.yacht_marketplace_reservations enable row level security;


-- Public users never read tables directly.
revoke all on public.yacht_marketplace_items from anon;
revoke all on public.yacht_marketplace_rates from anon;
revoke all on public.yacht_marketplace_blocks from anon;
revoke all on public.yacht_marketplace_reservations from anon;


-- ============================================================
-- AVAILABILITY HELPER
-- ============================================================

create or replace function public.yacht_marketplace_is_available(
  p_yacht_id uuid,
  p_check_in date,
  p_check_out date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from public.yacht_marketplace_blocks b
      where b.yacht_id = p_yacht_id
        and daterange(
          b.start_date,
          b.end_date,
          '[)'
        ) &&
        daterange(
          p_check_in,
          p_check_out,
          '[)'
        )
    )
    and
    not exists (
      select 1
      from public.yacht_marketplace_reservations r
      where r.yacht_id = p_yacht_id
        and r.status in ('pending', 'confirmed')
        and daterange(
          r.check_in,
          r.check_out,
          '[)'
        ) &&
        daterange(
          p_check_in,
          p_check_out,
          '[)'
        )
    );
$$;


-- ============================================================
-- QUOTE
-- ============================================================

create or replace function public.quote_public_yacht_booking(
  p_yacht_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_yacht public.yacht_marketplace_items%rowtype;
  v_days integer;
  v_daily numeric(14,2);
  v_subtotal numeric(14,2);
  v_service numeric(14,2);
  v_total numeric(14,2);
  v_available boolean;
begin

  select *
  into v_yacht
  from public.yacht_marketplace_items
  where id = p_yacht_id
    and marketplace_enabled = true
    and is_active = true;

  if not found then
    raise exception 'Yat bulunamadı';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Çıkış tarihi giriş tarihinden sonra olmalıdır';
  end if;

  if p_guests < 1 or p_guests > v_yacht.max_guests then
    raise exception 'Misafir kapasitesi uygun değil';
  end if;

  v_days := p_check_out - p_check_in;

  if v_days < v_yacht.minimum_days then
    raise exception 'Minimum kiralama süresi % gündür', v_yacht.minimum_days;
  end if;


  select coalesce(
    (
      select r.daily_price
      from public.yacht_marketplace_rates r
      where r.yacht_id = p_yacht_id
        and p_check_in between r.start_date and r.end_date
      order by r.start_date desc
      limit 1
    ),
    v_yacht.base_daily_price
  )
  into v_daily;


  v_available :=
    public.yacht_marketplace_is_available(
      p_yacht_id,
      p_check_in,
      p_check_out
    );


  v_subtotal :=
    v_daily * v_days;

  -- Public marketplace customer service amount.
  v_service :=
    round(v_subtotal * 0.05, 2);

  v_total :=
    v_subtotal + v_service;


  return jsonb_build_object(
    'available', v_available,
    'days', v_days,
    'daily_price', v_daily,
    'subtotal', v_subtotal,
    'service_total', v_service,
    'grand_total', v_total,
    'currency', v_yacht.currency,
    'minimum_days', v_yacht.minimum_days
  );

end;
$$;


-- ============================================================
-- PUBLIC LIST
-- ============================================================

create or replace function public.get_public_yacht_marketplace(
  p_location text default null,
  p_yacht_type text default null,
  p_guests integer default null,
  p_check_in date default null,
  p_check_out date default null
)
returns table(
  id uuid,
  slug text,
  name text,
  yacht_type text,
  city text,
  marina text,
  departure_point text,
  length_m numeric,
  cabins integer,
  bathrooms integer,
  max_guests integer,
  crew_count integer,
  captain_included boolean,
  fuel_included boolean,
  meals_included boolean,
  base_daily_price numeric,
  currency text,
  minimum_days integer,
  cover_url text,
  verified boolean,
  featured boolean
)
language sql
stable
security definer
set search_path = public
as $$

  select
    y.id,
    y.slug,
    y.name,
    y.yacht_type,
    y.city,
    y.marina,
    y.departure_point,
    y.length_m,
    y.cabins,
    y.bathrooms,
    y.max_guests,
    y.crew_count,
    y.captain_included,
    y.fuel_included,
    y.meals_included,
    y.base_daily_price,
    y.currency,
    y.minimum_days,
    y.cover_url,
    y.verified,
    y.featured

  from public.yacht_marketplace_items y

  where
    y.marketplace_enabled = true
    and y.is_active = true

    and (
      p_location is null
      or trim(p_location) = ''
      or lower(y.city) like '%' || lower(trim(p_location)) || '%'
      or lower(coalesce(y.marina, '')) like '%' || lower(trim(p_location)) || '%'
      or lower(coalesce(y.departure_point, '')) like '%' || lower(trim(p_location)) || '%'
    )

    and (
      p_yacht_type is null
      or trim(p_yacht_type) = ''
      or y.yacht_type = p_yacht_type
    )

    and (
      p_guests is null
      or p_guests <= y.max_guests
    )

    and (
      p_check_in is null
      or p_check_out is null
      or public.yacht_marketplace_is_available(
        y.id,
        p_check_in,
        p_check_out
      )
    )

  order by
    y.featured desc,
    y.verified desc,
    y.base_daily_price asc,
    y.name;

$$;


-- ============================================================
-- PUBLIC DETAIL
-- ============================================================

create or replace function public.get_public_yacht_detail(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_yacht public.yacht_marketplace_items%rowtype;
begin

  select *
  into v_yacht
  from public.yacht_marketplace_items
  where slug = p_slug
    and marketplace_enabled = true
    and is_active = true;

  if not found then
    raise exception 'Yat bulunamadı';
  end if;


  return jsonb_build_object(
    'id', v_yacht.id,
    'slug', v_yacht.slug,
    'name', v_yacht.name,
    'yacht_type', v_yacht.yacht_type,
    'city', v_yacht.city,
    'marina', v_yacht.marina,
    'departure_point', v_yacht.departure_point,
    'description', v_yacht.description,
    'length_m', v_yacht.length_m,
    'build_year', v_yacht.build_year,
    'cabins', v_yacht.cabins,
    'bathrooms', v_yacht.bathrooms,
    'max_guests', v_yacht.max_guests,
    'crew_count', v_yacht.crew_count,
    'captain_included', v_yacht.captain_included,
    'fuel_included', v_yacht.fuel_included,
    'meals_included', v_yacht.meals_included,
    'base_daily_price', v_yacht.base_daily_price,
    'currency', v_yacht.currency,
    'minimum_days', v_yacht.minimum_days,
    'cover_url', v_yacht.cover_url,
    'gallery', v_yacht.gallery,
    'amenities', v_yacht.amenities,
    'verified', v_yacht.verified
  );

end;
$$;


-- ============================================================
-- MARKETPLACE RESERVATION
-- Commission ONLY turobus_marketplace
-- ============================================================

create or replace function public.create_public_yacht_reservation(
  p_yacht_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_notes text default null
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
  v_subtotal numeric(14,2);
  v_service numeric(14,2);
  v_total numeric(14,2);
  v_commission numeric(14,2);
begin

  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Ad soyad gerekli';
  end if;

  if length(trim(coalesce(p_customer_phone, ''))) < 7 then
    raise exception 'Telefon gerekli';
  end if;


  -- Advisory transaction lock prevents two simultaneous bookings.
  perform pg_advisory_xact_lock(
    hashtext(p_yacht_id::text)
  );


  v_quote :=
    public.quote_public_yacht_booking(
      p_yacht_id,
      p_check_in,
      p_check_out,
      p_guests
    );


  if not coalesce(
    (v_quote ->> 'available')::boolean,
    false
  ) then
    raise exception 'Seçilen tarihler artık müsait değil';
  end if;


  v_currency :=
    v_quote ->> 'currency';

  v_subtotal :=
    (v_quote ->> 'subtotal')::numeric;

  v_service :=
    (v_quote ->> 'service_total')::numeric;

  v_total :=
    (v_quote ->> 'grand_total')::numeric;


  -- Turobus commission is created only because this reservation
  -- originates from turobus_marketplace.
  v_commission :=
    round(v_subtotal * 0.10, 2);


  v_code :=
    'YT-' ||
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


  insert into public.yacht_marketplace_reservations(
    reservation_code,
    yacht_id,
    check_in,
    check_out,
    guests,
    customer_name,
    customer_phone,
    customer_email,
    sales_channel,
    status,
    currency,
    subtotal,
    service_total,
    grand_total,
    turobus_commission,
    notes
  )
  values(
    v_code,
    p_yacht_id,
    p_check_in,
    p_check_out,
    p_guests,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    'turobus_marketplace',
    'pending',
    v_currency,
    v_subtotal,
    v_service,
    v_total,
    v_commission,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'id', v_id,
    'reservation_code', v_code,
    'status', 'pending',
    'currency', v_currency,
    'grand_total', v_total
  );

end;
$$;


revoke all
on function public.yacht_marketplace_is_available(uuid,date,date)
from public;

revoke all
on function public.quote_public_yacht_booking(uuid,date,date,integer)
from public;

revoke all
on function public.get_public_yacht_marketplace(text,text,integer,date,date)
from public;

revoke all
on function public.get_public_yacht_detail(text)
from public;

revoke all
on function public.create_public_yacht_reservation(
  uuid,date,date,integer,text,text,text,text
)
from public;


grant execute
on function public.yacht_marketplace_is_available(uuid,date,date)
to anon, authenticated;

grant execute
on function public.quote_public_yacht_booking(uuid,date,date,integer)
to anon, authenticated;

grant execute
on function public.get_public_yacht_marketplace(text,text,integer,date,date)
to anon, authenticated;

grant execute
on function public.get_public_yacht_detail(text)
to anon, authenticated;

grant execute
on function public.create_public_yacht_reservation(
  uuid,date,date,integer,text,text,text,text
)
to anon, authenticated;

commit;
