begin;

-- ============================================================
-- TUROBUS PACKAGE EXPERIENCE MARKETPLACE V2
--
-- Package = complete holiday experience
--
-- domestic / international
-- hotel / villa / mixed accommodation
-- flight / bus / own transport
-- transfer / activity / yacht / spa / dining / photography
-- gift choices / optional experiences
--
-- Existing package marketplace tables are preserved.
-- ============================================================


alter table public.package_marketplace_items
  add column if not exists travel_scope text
    not null default 'domestic';

alter table public.package_marketplace_items
  add column if not exists country text
    default 'Türkiye';

alter table public.package_marketplace_items
  add column if not exists destination_region text;

alter table public.package_marketplace_items
  add column if not exists accommodation_mode text
    not null default 'hotel';

alter table public.package_marketplace_items
  add column if not exists transport_mode text
    not null default 'none';

alter table public.package_marketplace_items
  add column if not exists package_mode text
    not null default 'ready';

alter table public.package_marketplace_items
  add column if not exists experience_theme text;

alter table public.package_marketplace_items
  add column if not exists gift_choice_count integer
    not null default 0;

alter table public.package_marketplace_items
  add column if not exists customizable boolean
    not null default false;

alter table public.package_marketplace_items
  add column if not exists hero_caption text;

alter table public.package_marketplace_items
  add column if not exists badge_labels jsonb
    not null default '[]'::jsonb;


-- ============================================================
-- PACKAGE COMPONENTS
-- ============================================================

create table if not exists public.package_marketplace_components (
  id uuid primary key default gen_random_uuid(),

  package_id uuid not null
    references public.package_marketplace_items(id)
    on delete cascade,

  component_key text not null,

  component_type text not null
    check (
      component_type in (
        'accommodation',
        'flight',
        'bus',
        'transfer',
        'activity',
        'tour',
        'yacht',
        'boat',
        'spa',
        'wellness',
        'dining',
        'photography',
        'guide',
        'gift',
        'insurance',
        'other'
      )
    ),

  title text not null,
  subtitle text,
  description text,

  source_type text,
  source_id uuid,

  image_url text,

  is_included boolean not null default true,
  is_optional boolean not null default false,
  is_gift_option boolean not null default false,

  price_delta numeric(14,2) not null default 0,

  price_basis text not null default 'booking'
    check (
      price_basis in (
        'booking',
        'person'
      )
    ),

  quantity integer not null default 1,

  sort_order integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique(
    package_id,
    component_key
  )
);


create index if not exists idx_package_components_package
on public.package_marketplace_components(
  package_id,
  sort_order
);


alter table public.package_marketplace_components
enable row level security;

revoke all
on public.package_marketplace_components
from anon;


-- ============================================================
-- RESERVATION EXPERIENCE SELECTIONS
-- ============================================================

alter table public.package_marketplace_reservations
  add column if not exists selected_optional_components jsonb
    not null default '[]'::jsonb;

alter table public.package_marketplace_reservations
  add column if not exists selected_gift_components jsonb
    not null default '[]'::jsonb;

alter table public.package_marketplace_reservations
  add column if not exists optional_total numeric(14,2)
    not null default 0;


-- ============================================================
-- PROFESSIONAL PUBLIC CATALOG V2
-- ============================================================

create or replace function public.get_public_package_marketplace_v2(
  p_destination text default null,
  p_package_type text default null,
  p_travel_scope text default null,
  p_accommodation_mode text default null,
  p_guests integer default null,
  p_start_date date default null
)
returns table(
  id uuid,
  slug text,
  name text,

  package_type text,
  travel_scope text,
  country text,
  destination_region text,

  city text,
  district text,

  accommodation_mode text,
  transport_mode text,
  package_mode text,
  experience_theme text,

  short_description text,
  hero_caption text,

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

  gift_choice_count integer,
  customizable boolean,

  badge_labels jsonb,

  featured boolean,
  verified boolean,

  next_departure date,
  available_capacity integer,

  included_component_count integer,
  optional_component_count integer,
  gift_component_count integer,

  component_preview jsonb
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
    p.travel_scope,
    p.country,
    p.destination_region,

    p.city,
    p.district,

    p.accommodation_mode,
    p.transport_mode,
    p.package_mode,
    p.experience_theme,

    p.short_description,
    p.hero_caption,

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

    p.gift_choice_count,
    p.customizable,

    p.badge_labels,

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
    ) as available_capacity,

    (
      select count(*)::integer
      from public.package_marketplace_components c
      where c.package_id = p.id
        and c.is_active = true
        and c.is_included = true
        and c.is_optional = false
        and c.is_gift_option = false
    ) as included_component_count,

    (
      select count(*)::integer
      from public.package_marketplace_components c
      where c.package_id = p.id
        and c.is_active = true
        and c.is_optional = true
    ) as optional_component_count,

    (
      select count(*)::integer
      from public.package_marketplace_components c
      where c.package_id = p.id
        and c.is_active = true
        and c.is_gift_option = true
    ) as gift_component_count,

    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
              x.id,

            'component_key',
              x.component_key,

            'component_type',
              x.component_type,

            'title',
              x.title,

            'image_url',
              x.image_url,

            'is_included',
              x.is_included,

            'is_optional',
              x.is_optional,

            'is_gift_option',
              x.is_gift_option
          )
          order by x.sort_order
        ),
        '[]'::jsonb
      )

      from (
        select *
        from public.package_marketplace_components c
        where c.package_id = p.id
          and c.is_active = true
        order by c.sort_order
        limit 6
      ) x
    ) as component_preview

  from public.package_marketplace_items p

  where
    p.marketplace_enabled = true
    and p.is_active = true

    and (
      p_destination is null
      or trim(p_destination) = ''

      or lower(
        coalesce(
          p.country,
          ''
        )
      ) like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'

      or lower(
        coalesce(
          p.city,
          ''
        )
      ) like
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
      ) like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'

      or lower(
        coalesce(
          p.destination_region,
          ''
        )
      ) like
        '%' ||
        lower(
          trim(
            p_destination
          )
        ) ||
        '%'

      or lower(
        p.name
      ) like
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
      p_travel_scope is null
      or trim(
        p_travel_scope
      ) = ''
      or p.travel_scope =
        p_travel_scope
    )

    and (
      p_accommodation_mode is null
      or trim(
        p_accommodation_mode
      ) = ''
      or p.accommodation_mode =
        p_accommodation_mode
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
-- PROFESSIONAL PACKAGE DETAIL V2
-- ============================================================

create or replace function public.get_public_package_experience_detail(
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
  v_components jsonb;
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


  select coalesce(
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


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          c.id,

        'component_key',
          c.component_key,

        'component_type',
          c.component_type,

        'title',
          c.title,

        'subtitle',
          c.subtitle,

        'description',
          c.description,

        'source_type',
          c.source_type,

        'source_id',
          c.source_id,

        'image_url',
          c.image_url,

        'is_included',
          c.is_included,

        'is_optional',
          c.is_optional,

        'is_gift_option',
          c.is_gift_option,

        'price_delta',
          c.price_delta,

        'price_basis',
          c.price_basis,

        'quantity',
          c.quantity
      )
      order by c.sort_order
    ),
    '[]'::jsonb
  )
  into v_components
  from public.package_marketplace_components c
  where c.package_id =
    v_package.id
    and c.is_active = true;


  return jsonb_build_object(
    'id',
      v_package.id,

    'slug',
      v_package.slug,

    'name',
      v_package.name,

    'package_type',
      v_package.package_type,

    'travel_scope',
      v_package.travel_scope,

    'country',
      v_package.country,

    'destination_region',
      v_package.destination_region,

    'city',
      v_package.city,

    'district',
      v_package.district,

    'accommodation_mode',
      v_package.accommodation_mode,

    'transport_mode',
      v_package.transport_mode,

    'package_mode',
      v_package.package_mode,

    'experience_theme',
      v_package.experience_theme,

    'customizable',
      v_package.customizable,

    'gift_choice_count',
      v_package.gift_choice_count,

    'hero_caption',
      v_package.hero_caption,

    'badge_labels',
      v_package.badge_labels,

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

    'accommodation_type',
      v_package.accommodation_type,

    'meal_plan',
      v_package.meal_plan,

    'verified',
      v_package.verified,

    'departures',
      v_departures,

    'components',
      v_components
  );

end;
$$;


-- ============================================================
-- QUOTE WITH OPTIONAL EXPERIENCES + GIFTS
-- ============================================================

create or replace function public.quote_public_package_experience(
  p_package_id uuid,
  p_departure_id uuid,
  p_guests integer,
  p_optional_component_ids uuid[] default array[]::uuid[],
  p_gift_component_ids uuid[] default array[]::uuid[]
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

  v_base_unit numeric(14,2);
  v_base_total numeric(14,2);

  v_optional_total numeric(14,2) := 0;

  v_capacity integer;

  v_invalid_optional integer;
  v_invalid_gift integer;

  v_gift_count integer;

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
  where id =
      p_departure_id
    and package_id =
      p_package_id
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


  select count(*)
  into v_invalid_optional
  from unnest(
    coalesce(
      p_optional_component_ids,
      array[]::uuid[]
    )
  ) selected_id

  where not exists (
    select 1
    from public.package_marketplace_components c
    where c.id =
      selected_id
      and c.package_id =
        p_package_id
      and c.is_active = true
      and c.is_optional = true
  );


  if v_invalid_optional > 0 then
    raise exception 'Geçersiz opsiyonel deneyim seçimi';
  end if;


  select count(*)
  into v_invalid_gift
  from unnest(
    coalesce(
      p_gift_component_ids,
      array[]::uuid[]
    )
  ) selected_id

  where not exists (
    select 1
    from public.package_marketplace_components c
    where c.id =
      selected_id
      and c.package_id =
        p_package_id
      and c.is_active = true
      and c.is_gift_option = true
  );


  if v_invalid_gift > 0 then
    raise exception 'Geçersiz hediye seçimi';
  end if;


  v_gift_count :=
    cardinality(
      coalesce(
        p_gift_component_ids,
        array[]::uuid[]
      )
    );


  if v_gift_count >
      v_package.gift_choice_count
  then

    raise exception
      'En fazla % hediye seçilebilir',
      v_package.gift_choice_count;

  end if;


  v_base_unit :=
    coalesce(
      v_departure.price,
      v_package.base_price
    );


  v_base_total :=
    v_base_unit *
    p_guests;


  select coalesce(
    sum(
      case
        when c.price_basis =
          'person'
        then
          c.price_delta *
          p_guests *
          c.quantity
        else
          c.price_delta *
          c.quantity
      end
    ),
    0
  )
  into v_optional_total
  from public.package_marketplace_components c
  where c.id = any(
    coalesce(
      p_optional_component_ids,
      array[]::uuid[]
    )
  )
  and c.package_id =
    p_package_id
  and c.is_active = true
  and c.is_optional = true;


  v_total :=
    v_base_total +
    v_optional_total;


  return jsonb_build_object(
    'available',
      true,

    'available_capacity',
      v_capacity,

    'base_unit_price',
      v_base_unit,

    'base_total',
      v_base_total,

    'optional_total',
      v_optional_total,

    'grand_total',
      v_total,

    'currency',
      coalesce(
        v_departure.currency,
        v_package.currency
      ),

    'guests',
      p_guests,

    'gift_choice_count',
      v_package.gift_choice_count,

    'selected_gift_count',
      v_gift_count,

    'start_date',
      v_departure.start_date,

    'end_date',
      v_departure.end_date
  );

end;
$$;


-- ============================================================
-- PROFESSIONAL EXPERIENCE RESERVATION
-- ============================================================

create or replace function public.create_public_package_experience_reservation(
  p_package_id uuid,
  p_departure_id uuid,

  p_guests integer,

  p_optional_component_ids uuid[] default array[]::uuid[],
  p_gift_component_ids uuid[] default array[]::uuid[],

  p_customer_name text default null,
  p_customer_phone text default null,
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

  v_base_total numeric(14,2);
  v_optional_total numeric(14,2);
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
    public.quote_public_package_experience(
      p_package_id,
      p_departure_id,
      p_guests,
      p_optional_component_ids,
      p_gift_component_ids
    );


  if not coalesce(
    (
      v_quote ->>
      'available'
    )::boolean,
    false
  )
  then
    raise exception 'Seçilen tarihte yeterli kontenjan kalmadı';
  end if;


  v_base_total :=
    (
      v_quote ->>
      'base_total'
    )::numeric;


  v_optional_total :=
    (
      v_quote ->>
      'optional_total'
    )::numeric;


  v_total :=
    (
      v_quote ->>
      'grand_total'
    )::numeric;


  v_currency :=
    v_quote ->>
    'currency';


  -- STRICT RULE:
  -- Turobus commission only because this is marketplace sourced.
  v_commission :=
    round(
      v_total *
      0.10,
      2
    );


  v_code :=
    'PX-' ||
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

    selected_optional_components,
    selected_gift_components,

    sales_channel,
    status,

    currency,

    package_total,
    optional_total,
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

    to_jsonb(
      coalesce(
        p_optional_component_ids,
        array[]::uuid[]
      )
    ),

    to_jsonb(
      coalesce(
        p_gift_component_ids,
        array[]::uuid[]
      )
    ),

    'turobus_marketplace',
    'pending',

    v_currency,

    v_base_total,
    v_optional_total,
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
on function public.get_public_package_marketplace_v2(
  text,
  text,
  text,
  text,
  integer,
  date
)
from public;


revoke all
on function public.get_public_package_experience_detail(text)
from public;


revoke all
on function public.quote_public_package_experience(
  uuid,
  uuid,
  integer,
  uuid[],
  uuid[]
)
from public;


revoke all
on function public.create_public_package_experience_reservation(
  uuid,
  uuid,
  integer,
  uuid[],
  uuid[],
  text,
  text,
  text,
  text
)
from public;


grant execute
on function public.get_public_package_marketplace_v2(
  text,
  text,
  text,
  text,
  integer,
  date
)
to anon, authenticated;


grant execute
on function public.get_public_package_experience_detail(text)
to anon, authenticated;


grant execute
on function public.quote_public_package_experience(
  uuid,
  uuid,
  integer,
  uuid[],
  uuid[]
)
to anon, authenticated;


grant execute
on function public.create_public_package_experience_reservation(
  uuid,
  uuid,
  integer,
  uuid[],
  uuid[],
  text,
  text,
  text,
  text
)
to anon, authenticated;


commit;
