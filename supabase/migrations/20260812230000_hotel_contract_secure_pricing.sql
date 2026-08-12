begin;

alter table public.package_catalog_hotels
add column if not exists source_type text not null default 'manual';

alter table public.package_catalog_hotels
add column if not exists external_hotel_id text;

alter table public.package_catalog_hotels
add column if not exists external_source_name text;

alter table public.package_catalog_hotels
add column if not exists last_synced_at timestamptz;

alter table public.package_catalog_hotels
add column if not exists address text;

alter table public.package_catalog_hotels
add column if not exists latitude numeric;

alter table public.package_catalog_hotels
add column if not exists longitude numeric;

alter table public.package_catalog_hotels
add column if not exists check_in_time time;

alter table public.package_catalog_hotels
add column if not exists check_out_time time;

alter table public.package_catalog_hotels
add column if not exists amenities jsonb not null default '[]'::jsonb;

alter table public.package_catalog_hotels
add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_catalog_hotels_source_type_check'
  ) then
    alter table public.package_catalog_hotels
    add constraint package_catalog_hotels_source_type_check
    check (
      source_type in (
        'manual',
        'hotelrunner',
        'elektra',
        'booking',
        'custom_api'
      )
    );
  end if;
end;
$$;

create table if not exists public.package_hotel_media (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  package_hotel_id uuid not null,
  room_type_id uuid,
  media_type text not null default 'image',
  url text not null,
  title text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  source_type text not null default 'manual',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint package_hotel_media_type_check
  check (
    media_type in (
      'image',
      'video'
    )
  )
);

create index if not exists idx_package_hotel_media_hotel
on public.package_hotel_media (
  company_id,
  package_hotel_id,
  sort_order
);

create table if not exists public.package_hotel_room_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  package_hotel_id uuid not null,
  name text not null,
  code text,
  description text,
  max_adults integer not null default 2,
  max_children integer not null default 0,
  max_occupancy integer not null default 2,
  size_m2 numeric,
  bed_type text,
  amenities jsonb not null default '[]'::jsonb,
  source_type text not null default 'manual',
  external_room_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_hotel_room_types_hotel
on public.package_hotel_room_types (
  company_id,
  package_hotel_id,
  is_active
);

create table if not exists public.package_hotel_promotions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  package_hotel_id uuid not null,
  name text not null,
  promotion_type text not null default 'early_booking',
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  booking_from date,
  booking_to date,
  stay_from date,
  stay_to date,
  minimum_nights integer not null default 1,
  combinable boolean not null default false,
  priority integer not null default 100,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint package_hotel_promotions_type_check
  check (
    promotion_type in (
      'early_booking',
      'campaign',
      'long_stay',
      'last_minute',
      'special'
    )
  ),

  constraint package_hotel_promotions_discount_check
  check (
    discount_type in (
      'percent',
      'fixed'
    )
  )
);

create index if not exists idx_package_hotel_promotions_hotel
on public.package_hotel_promotions (
  company_id,
  package_hotel_id,
  is_active,
  stay_from,
  stay_to
);

create table if not exists public.package_hotel_child_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  package_hotel_id uuid not null,
  room_type_id uuid,
  child_order integer not null default 1,
  age_from numeric not null default 0,
  age_to numeric not null default 11.99,
  pricing_type text not null default 'percent',
  value numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint package_hotel_child_policy_type_check
  check (
    pricing_type in (
      'free',
      'percent',
      'fixed'
    )
  )
);

create index if not exists idx_package_hotel_child_policy
on public.package_hotel_child_policies (
  company_id,
  package_hotel_id,
  child_order,
  age_from,
  age_to
);

create table if not exists public.package_pricing_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique,
  default_markup_percent numeric not null default 20,
  minimum_margin_percent numeric not null default 10,
  rounding_step numeric not null default 10,
  sales_can_override_price boolean not null default false,
  managers_can_view_cost boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.package_hotel_media
enable row level security;

alter table public.package_hotel_room_types
enable row level security;

alter table public.package_hotel_promotions
enable row level security;

alter table public.package_hotel_child_policies
enable row level security;

alter table public.package_pricing_settings
enable row level security;

create or replace function public.package_user_company_role(
  p_company_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cm.role::text
  from public.company_members cm
  where cm.company_id = p_company_id
    and cm.user_id = auth.uid()
    and coalesce(cm.is_active, true) = true
  limit 1;
$$;

create or replace function public.package_user_can_view_costs(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.package_user_company_role(
      p_company_id
    ) in (
      'super_admin',
      'company_owner',
      'operation_manager',
      'accounting'
    ),
    false
  );
$$;

drop policy if exists package_hotel_media_member
on public.package_hotel_media;

create policy package_hotel_media_member
on public.package_hotel_media
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_hotel_media.company_id
      and cm.user_id = auth.uid()
      and coalesce(cm.is_active, true) = true
  )
);

drop policy if exists package_hotel_room_types_member
on public.package_hotel_room_types;

create policy package_hotel_room_types_member
on public.package_hotel_room_types
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_hotel_room_types.company_id
      and cm.user_id = auth.uid()
      and coalesce(cm.is_active, true) = true
  )
);

drop policy if exists package_hotel_promotions_admin
on public.package_hotel_promotions;

create policy package_hotel_promotions_admin
on public.package_hotel_promotions
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);

drop policy if exists package_hotel_child_policy_admin
on public.package_hotel_child_policies;

create policy package_hotel_child_policy_admin
on public.package_hotel_child_policies
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);

drop policy if exists package_pricing_settings_admin
on public.package_pricing_settings;

create policy package_pricing_settings_admin
on public.package_pricing_settings
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename =
        'package_hotel_rates'
      and permissive = 'RESTRICTIVE'
      and policyname =
        'package_hotel_rates_sensitive_cost'
  loop
    execute format(
      'drop policy %I on public.package_hotel_rates',
      r.policyname
    );
  end loop;
end;
$$;

create policy package_hotel_rates_sensitive_cost
on public.package_hotel_rates
as restrictive
for select
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
);

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename =
        'package_activities'
      and permissive = 'RESTRICTIVE'
      and policyname =
        'package_activities_sensitive_cost'
  loop
    execute format(
      'drop policy %I on public.package_activities',
      r.policyname
    );
  end loop;
end;
$$;

create policy package_activities_sensitive_cost
on public.package_activities
as restrictive
for select
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
);

create or replace function
public.get_package_builder_catalog_secure()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id = v_uid
    and coalesce(cm.is_active, true) = true
  order by cm.created_at asc
  limit 1;

  if v_company_id is null then
    raise exception
      'Aktif şirket üyeliği bulunamadı.';
  end if;

  insert into public.package_pricing_settings (
    company_id
  )
  values (
    v_company_id
  )
  on conflict (
    company_id
  )
  do nothing;

  select jsonb_build_object(
    'company_id',
      v_company_id,

    'hotels',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                h.id,
              'name',
                h.name,
              'city',
                h.city,
              'district',
                h.district,
              'star_rating',
                h.star_rating,
              'cover_image_url',
                h.cover_image_url
            )
            order by h.name
          )
          from public.package_catalog_hotels h
          where h.company_id =
            v_company_id
            and h.is_active = true
        ),
        '[]'::jsonb
      ),

    'rates',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                r.id,
              'package_hotel_id',
                r.package_hotel_id,
              'room_type_name',
                r.room_type_name,
              'board_type',
                r.board_type,
              'valid_from',
                r.valid_from,
              'valid_to',
                r.valid_to,
              'occupancy_adults',
                r.occupancy_adults,
              'occupancy_children',
                r.occupancy_children,
              'allotment',
                r.allotment,
              'minimum_stay',
                r.minimum_stay,
              'stop_sale',
                r.stop_sale
            )
          )
          from public.package_hotel_rates r
          where r.company_id =
            v_company_id
            and r.is_active = true
        ),
        '[]'::jsonb
      ),

    'activities',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                a.id,
              'name',
                a.name,
              'pricing_unit',
                a.pricing_unit,
              'requires_slot',
                a.requires_slot
            )
            order by a.name
          )
          from public.package_activities a
          where a.company_id =
            v_company_id
            and a.is_active = true
        ),
        '[]'::jsonb
      ),

    'can_view_costs',
      public.package_user_can_view_costs(
        v_company_id
      )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute
on function public.get_package_builder_catalog_secure()
to authenticated;

create or replace function
public.calculate_package_builder_price_secure(
  p_rate_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_activities jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_rate record;
  v_settings record;
  v_nights integer;
  v_hotel_cost numeric := 0;
  v_activity_cost numeric := 0;
  v_total_cost numeric := 0;
  v_sale_price numeric := 0;
  v_markup numeric := 20;
  v_rounding numeric := 10;
  v_activity jsonb;
  v_activity_row record;
  v_quantity numeric;
  v_can_view boolean := false;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id = v_uid
    and coalesce(cm.is_active, true) = true
  order by cm.created_at asc
  limit 1;

  if v_company_id is null then
    raise exception
      'Aktif şirket üyeliği bulunamadı.';
  end if;

  v_nights :=
    p_check_out -
    p_check_in;

  if v_nights < 1 then
    raise exception
      'Geçerli giriş ve çıkış tarihi seçin.';
  end if;

  select *
  into v_rate
  from public.package_hotel_rates r
  where r.id = p_rate_id
    and r.company_id =
      v_company_id
    and r.is_active = true
  limit 1;

  if not found then
    raise exception
      'Otel fiyat dönemi bulunamadı.';
  end if;

  if v_rate.stop_sale then
    raise exception
      'Bu otel dönemi satışa kapalı.';
  end if;

  if v_rate.valid_from >
     p_check_in
     or
     v_rate.valid_to <
     p_check_out
  then
    raise exception
      'Seçilen tarihler fiyat dönemine uygun değil.';
  end if;

  if v_rate.minimum_stay >
     v_nights
  then
    raise exception
      'Minimum konaklama şartı sağlanmıyor.';
  end if;

  if v_rate.occupancy_adults <
     p_adults
     or
     v_rate.occupancy_children <
     p_children
  then
    raise exception
      'Oda kapasitesi kişi sayısına uygun değil.';
  end if;

  if v_rate.allotment is not null
     and v_rate.allotment <= 0
  then
    raise exception
      'Bu oda için kontenjan bulunmuyor.';
  end if;

  select *
  into v_settings
  from public.package_pricing_settings ps
  where ps.company_id =
    v_company_id
  limit 1;

  if not found then
    insert into public.package_pricing_settings (
      company_id
    )
    values (
      v_company_id
    )
    returning *
    into v_settings;
  end if;

  v_markup :=
    coalesce(
      v_settings.default_markup_percent,
      20
    );

  v_rounding :=
    greatest(
      coalesce(
        v_settings.rounding_step,
        10
      ),
      1
    );

  v_hotel_cost :=
    greatest(
      coalesce(
        v_rate.nightly_cost,
        0
      ),
      0
    ) *
    v_nights;

  for v_activity in
    select value
    from jsonb_array_elements(
      coalesce(
        p_activities,
        '[]'::jsonb
      )
    )
  loop
    select *
    into v_activity_row
    from public.package_activities a
    where a.id =
      (
        v_activity ->> 'activityId'
      )::uuid
      and a.company_id =
        v_company_id
      and a.is_active = true
    limit 1;

    if found then
      v_quantity :=
        greatest(
          coalesce(
            (
              v_activity ->> 'quantity'
            )::numeric,
            1
          ),
          1
        );

      v_activity_cost :=
        v_activity_cost +
        (
          greatest(
            coalesce(
              v_activity_row.default_cost,
              0
            ),
            0
          ) *
          v_quantity
        );
    end if;
  end loop;

  v_total_cost :=
    v_hotel_cost +
    v_activity_cost;

  v_sale_price :=
    ceil(
      (
        v_total_cost *
        (
          1 +
          (
            v_markup /
            100
          )
        )
      ) /
      v_rounding
    ) *
    v_rounding;

  v_can_view :=
    public.package_user_can_view_costs(
      v_company_id
    );

  return
    jsonb_build_object(
      'sale_price',
        v_sale_price,
      'currency',
        'TRY',
      'nights',
        v_nights,
      'can_view_costs',
        v_can_view
    )
    ||
    case
      when v_can_view then
        jsonb_build_object(
          'hotel_cost',
            v_hotel_cost,
          'activity_cost',
            v_activity_cost,
          'total_cost',
            v_total_cost,
          'markup_percent',
            v_markup
        )
      else
        '{}'::jsonb
    end;
end;
$$;

grant execute
on function public.calculate_package_builder_price_secure(
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb
)
to authenticated;

create or replace function
public.create_package_quote_secure(
  p_customer_name text,
  p_customer_phone text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_hotel_id uuid,
  p_rate_id uuid,
  p_activities jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_hotel record;
  v_rate record;
  v_settings record;
  v_nights integer;
  v_hotel_cost numeric := 0;
  v_activity_cost numeric := 0;
  v_total_cost numeric := 0;
  v_sale_price numeric := 0;
  v_markup numeric := 20;
  v_rounding numeric := 10;
  v_factor numeric := 0;
  v_hotel_sale numeric := 0;
  v_quote_id uuid;
  v_quote_code text;
  v_activity jsonb;
  v_activity_row record;
  v_quantity numeric;
  v_activity_total numeric;
  v_activity_sale numeric;
  v_sort integer := 1;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if coalesce(
    trim(
      p_customer_name
    ),
    ''
  ) = '' then
    raise exception
      'Müşteri adı zorunludur.';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id = v_uid
    and coalesce(cm.is_active, true) = true
  order by cm.created_at asc
  limit 1;

  if v_company_id is null then
    raise exception
      'Aktif şirket üyeliği bulunamadı.';
  end if;

  v_nights :=
    p_check_out -
    p_check_in;

  if v_nights < 1 then
    raise exception
      'Geçerli tarih seçin.';
  end if;

  select *
  into v_hotel
  from public.package_catalog_hotels h
  where h.id = p_hotel_id
    and h.company_id =
      v_company_id
    and h.is_active = true
  limit 1;

  if not found then
    raise exception
      'Otel bulunamadı.';
  end if;

  select *
  into v_rate
  from public.package_hotel_rates r
  where r.id = p_rate_id
    and r.package_hotel_id =
      p_hotel_id
    and r.company_id =
      v_company_id
    and r.is_active = true
  limit 1;

  if not found then
    raise exception
      'Oda fiyatı bulunamadı.';
  end if;

  if v_rate.stop_sale then
    raise exception
      'Otel satışa kapalı.';
  end if;

  if v_rate.valid_from >
     p_check_in
     or
     v_rate.valid_to <
     p_check_out
  then
    raise exception
      'Tarih fiyat dönemine uygun değil.';
  end if;

  if v_rate.minimum_stay >
     v_nights
  then
    raise exception
      'Minimum konaklama şartı sağlanmıyor.';
  end if;

  if v_rate.occupancy_adults <
     p_adults
     or
     v_rate.occupancy_children <
     p_children
  then
    raise exception
      'Oda kapasitesi uygun değil.';
  end if;

  if v_rate.allotment is not null
     and v_rate.allotment <= 0
  then
    raise exception
      'Kontenjan bulunmuyor.';
  end if;

  select *
  into v_settings
  from public.package_pricing_settings ps
  where ps.company_id =
    v_company_id
  limit 1;

  if not found then
    insert into public.package_pricing_settings (
      company_id
    )
    values (
      v_company_id
    )
    returning *
    into v_settings;
  end if;

  v_markup :=
    coalesce(
      v_settings.default_markup_percent,
      20
    );

  v_rounding :=
    greatest(
      coalesce(
        v_settings.rounding_step,
        10
      ),
      1
    );

  v_hotel_cost :=
    greatest(
      coalesce(
        v_rate.nightly_cost,
        0
      ),
      0
    ) *
    v_nights;

  for v_activity in
    select value
    from jsonb_array_elements(
      coalesce(
        p_activities,
        '[]'::jsonb
      )
    )
  loop
    select *
    into v_activity_row
    from public.package_activities a
    where a.id =
      (
        v_activity ->> 'activityId'
      )::uuid
      and a.company_id =
        v_company_id
      and a.is_active = true
    limit 1;

    if found then
      v_quantity :=
        greatest(
          coalesce(
            (
              v_activity ->> 'quantity'
            )::numeric,
            1
          ),
          1
        );

      v_activity_total :=
        greatest(
          coalesce(
            v_activity_row.default_cost,
            0
          ),
          0
        ) *
        v_quantity;

      v_activity_cost :=
        v_activity_cost +
        v_activity_total;
    end if;
  end loop;

  v_total_cost :=
    v_hotel_cost +
    v_activity_cost;

  v_sale_price :=
    ceil(
      (
        v_total_cost *
        (
          1 +
          (
            v_markup /
            100
          )
        )
      ) /
      v_rounding
    ) *
    v_rounding;

  if v_total_cost <= 0
     or v_sale_price <= 0
  then
    raise exception
      'Paket fiyatı hesaplanamadı.';
  end if;

  v_factor :=
    v_sale_price /
    v_total_cost;

  v_hotel_sale :=
    v_hotel_cost *
    v_factor;

  v_quote_code :=
    'PKT-' ||
    right(
      (
        extract(
          epoch from clock_timestamp()
        ) *
        1000
      )::bigint::text,
      8
    );

  insert into public.package_quotes (
    company_id,
    quote_code,
    customer_name,
    customer_phone,
    sales_user_id,
    package_type,
    destination,
    check_in,
    check_out,
    adults,
    children,
    nights,
    currency,
    total_cost,
    gross_profit,
    sale_price,
    margin_percent,
    pricing_mode,
    pricing_value,
    status
  )
  values (
    v_company_id,
    v_quote_code,
    trim(
      p_customer_name
    ),
    nullif(
      trim(
        coalesce(
          p_customer_phone,
          ''
        )
      ),
      ''
    ),
    v_uid,
    'holiday',
    v_hotel.city,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    v_nights,
    'TRY',
    v_total_cost,
    v_sale_price -
      v_total_cost,
    v_sale_price,
    case
      when v_sale_price > 0
      then
        (
          (
            v_sale_price -
            v_total_cost
          ) /
          v_sale_price
        ) * 100
      else 0
    end,
    'markup_percent',
    v_markup,
    'draft'
  )
  returning id
  into v_quote_id;

  insert into public.package_quote_items (
    company_id,
    quote_id,
    item_type,
    reference_id,
    supplier_id,
    name,
    service_date,
    quantity,
    unit_cost,
    total_cost,
    unit_sale_price,
    total_sale_price,
    currency,
    cost_snapshot,
    sort_order
  )
  values (
    v_company_id,
    v_quote_id,
    'hotel',
    v_hotel.id,
    v_hotel.supplier_id,
    v_hotel.name ||
      ' · ' ||
      v_rate.room_type_name ||
      ' · ' ||
      v_rate.board_type,
    p_check_in,
    v_nights,
    v_rate.nightly_cost,
    v_hotel_cost,
    case
      when v_nights > 0
      then
        v_hotel_sale /
        v_nights
      else 0
    end,
    v_hotel_sale,
    'TRY',
    jsonb_build_object(
      'hotel',
        v_hotel.name,
      'room_type',
        v_rate.room_type_name,
      'board',
        v_rate.board_type,
      'nights',
        v_nights,
      'source_type',
        v_hotel.source_type
    ),
    0
  );

  for v_activity in
    select value
    from jsonb_array_elements(
      coalesce(
        p_activities,
        '[]'::jsonb
      )
    )
  loop
    select *
    into v_activity_row
    from public.package_activities a
    where a.id =
      (
        v_activity ->> 'activityId'
      )::uuid
      and a.company_id =
        v_company_id
      and a.is_active = true
    limit 1;

    if found then
      v_quantity :=
        greatest(
          coalesce(
            (
              v_activity ->> 'quantity'
            )::numeric,
            1
          ),
          1
        );

      v_activity_total :=
        greatest(
          coalesce(
            v_activity_row.default_cost,
            0
          ),
          0
        ) *
        v_quantity;

      v_activity_sale :=
        v_activity_total *
        v_factor;

      insert into public.package_quote_items (
        company_id,
        quote_id,
        item_type,
        reference_id,
        supplier_id,
        name,
        service_date,
        quantity,
        unit_cost,
        total_cost,
        unit_sale_price,
        total_sale_price,
        currency,
        cost_snapshot,
        sort_order
      )
      values (
        v_company_id,
        v_quote_id,
        'activity',
        v_activity_row.id,
        v_activity_row.supplier_id,
        v_activity_row.name,
        null,
        v_quantity,
        v_activity_row.default_cost,
        v_activity_total,
        case
          when v_quantity > 0
          then
            v_activity_sale /
            v_quantity
          else 0
        end,
        v_activity_sale,
        'TRY',
        jsonb_build_object(
          'activity',
            v_activity_row.name,
          'requires_slot',
            v_activity_row.requires_slot
        ),
        v_sort
      );

      v_sort :=
        v_sort + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'success',
      true,
    'quote_id',
      v_quote_id,
    'quote_code',
      v_quote_code,
    'sale_price',
      v_sale_price
  );
end;
$$;

grant execute
on function public.create_package_quote_secure(
  text,
  text,
  date,
  date,
  integer,
  integer,
  uuid,
  uuid,
  jsonb
)
to authenticated;

commit;
