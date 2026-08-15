begin;

-- ============================================================
-- TUROBUS NETWORK BRIDGE V1
--
-- HOTEL OS + TOUR OS + PACKAGE OS
-- mevcut sistemleri silmeden ortak canlı envantere bağlar.
-- ============================================================


-- ============================================================
-- 1. NETWORK ENVANTER BIRIMLERI
--
-- HOTEL:
--   resource = otel
--   unit     = oda tipi
--
-- TOUR:
--   resource = tur
--   unit     = kalkis
-- ============================================================

create table if not exists
public.turobus_network_inventory_units (

  id uuid
  primary key
  default gen_random_uuid(),

  resource_id uuid
  not null
  references public.turobus_network_resources(id)
  on delete cascade,

  owner_company_id uuid
  not null
  references public.companies(id)
  on delete cascade,

  unit_type text
  not null,

  source_system text
  not null,

  source_ref_id uuid
  not null,

  parent_source_ref_id uuid,

  name text
  not null,

  currency text
  not null
  default 'TRY',

  marketplace_enabled boolean
  not null
  default false,

  is_active boolean
  not null
  default true,

  metadata jsonb
  not null
  default '{}'::jsonb,

  created_at timestamptz
  not null
  default now(),

  updated_at timestamptz
  not null
  default now()
);


alter table
public.turobus_network_inventory_units
drop constraint if exists
turobus_network_inventory_units_type_check;


alter table
public.turobus_network_inventory_units
add constraint
turobus_network_inventory_units_type_check
check (
  unit_type in (
    'hotel_room_type',
    'tour_departure',
    'activity_slot',
    'villa_date',
    'transfer_slot'
  )
);


create unique index if not exists
idx_turobus_network_inventory_unit_source

on public.turobus_network_inventory_units (
  owner_company_id,
  source_system,
  source_ref_id
);


create index if not exists
idx_turobus_network_inventory_units_resource

on public.turobus_network_inventory_units (
  resource_id,
  is_active
);


create index if not exists
idx_turobus_network_inventory_units_marketplace

on public.turobus_network_inventory_units (
  marketplace_enabled,
  unit_type
)

where marketplace_enabled = true;


alter table
public.turobus_network_inventory_units
enable row level security;


drop policy if exists
"network_units_read"
on public.turobus_network_inventory_units;


create policy
"network_units_read"
on public.turobus_network_inventory_units

for select
to authenticated

using (

  public.is_company_member(
    owner_company_id
  )

  or marketplace_enabled = true

  or exists (

    select 1

    from public.turobus_inventory_sources s

    where
      s.resource_id =
        turobus_network_inventory_units.resource_id

      and public.is_company_member(
        s.buyer_company_id
      )

      and s.is_active = true
  )
);


-- ============================================================
-- 2. NETWORK STOK / REZERVASYON AYIRMALARI
--
-- Her Package Booking Item sadece 1 aktif allocation alabilir.
-- Böylece double booking engellenir.
-- ============================================================

create table if not exists
public.turobus_network_allocations (

  id uuid
  primary key
  default gen_random_uuid(),

  buyer_company_id uuid
  not null
  references public.companies(id)
  on delete cascade,

  owner_company_id uuid
  not null
  references public.companies(id)
  on delete cascade,

  unit_id uuid
  not null
  references public.turobus_network_inventory_units(id)
  on delete restrict,

  package_booking_id uuid
  references public.package_bookings(id)
  on delete cascade,

  package_booking_item_id uuid
  references public.package_booking_items(id)
  on delete cascade,

  allocation_type text
  not null,

  quantity integer
  not null
  default 1,

  start_date date,

  end_date date,

  allocation_status text
  not null
  default 'reserved',

  hotel_reservation_id uuid
  references public.hotel_reservations(id)
  on delete set null,

  external_reference text,

  metadata jsonb
  not null
  default '{}'::jsonb,

  reserved_at timestamptz
  not null
  default now(),

  released_at timestamptz,

  created_at timestamptz
  not null
  default now(),

  updated_at timestamptz
  not null
  default now()
);


alter table
public.turobus_network_allocations
drop constraint if exists
turobus_network_allocations_type_check;


alter table
public.turobus_network_allocations
add constraint
turobus_network_allocations_type_check
check (
  allocation_type in (
    'hotel',
    'tour',
    'activity',
    'villa',
    'transfer'
  )
);


alter table
public.turobus_network_allocations
drop constraint if exists
turobus_network_allocations_status_check;


alter table
public.turobus_network_allocations
add constraint
turobus_network_allocations_status_check
check (
  allocation_status in (
    'reserved',
    'confirmed',
    'completed',
    'released',
    'cancelled'
  )
);


alter table
public.turobus_network_allocations
drop constraint if exists
turobus_network_allocations_quantity_check;


alter table
public.turobus_network_allocations
add constraint
turobus_network_allocations_quantity_check
check (
  quantity > 0
);


create unique index if not exists
idx_turobus_network_active_package_item

on public.turobus_network_allocations (
  package_booking_item_id
)

where
  package_booking_item_id is not null

  and allocation_status in (
    'reserved',
    'confirmed'
  );


create index if not exists
idx_turobus_network_allocations_unit

on public.turobus_network_allocations (
  unit_id,
  allocation_status
);


alter table
public.turobus_network_allocations
enable row level security;


drop policy if exists
"network_allocations_company_access"
on public.turobus_network_allocations;


create policy
"network_allocations_company_access"
on public.turobus_network_allocations

for select
to authenticated

using (

  public.is_company_member(
    buyer_company_id
  )

  or

  public.is_company_member(
    owner_company_id
  )
);


-- ============================================================
-- 3. HOTEL OS VE TOUR OS'U NETWORK'E SENKRONIZE ET
-- ============================================================

create or replace function
public.sync_turobus_network_sources()
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_hotels integer := 0;
  v_room_types integer := 0;
  v_tours integer := 0;
  v_departures integer := 0;

begin

  -- --------------------------------------------------------
  -- HOTELS -> NETWORK RESOURCE
  -- --------------------------------------------------------

  insert into
  public.turobus_network_resources (

    owner_company_id,
    resource_type,
    source_system,
    source_id,
    name,
    city,
    district,
    is_active,
    marketplace_enabled,
    metadata
  )

  select

    h.company_id,
    'hotel',
    'hotel_os',
    h.id,
    h.name,
    h.city,
    h.district,
    h.is_active,
    false,

    jsonb_build_object(

      'hotel_code',
        h.hotel_code,

      'star_rating',
        h.star_rating,

      'hotel_type',
        h.hotel_type,

      'currency',
        h.currency,

      'verified',
        h.is_verified
    )

  from public.hotels h

  where
    h.company_id is not null

  on conflict (
    owner_company_id,
    source_system,
    source_id
  )

  do update set

    name =
      excluded.name,

    city =
      excluded.city,

    district =
      excluded.district,

    is_active =
      excluded.is_active,

    metadata =
      excluded.metadata,

    updated_at =
      now();


  get diagnostics
    v_hotels = row_count;


  -- --------------------------------------------------------
  -- HOTEL ROOM TYPES -> NETWORK UNIT
  -- --------------------------------------------------------

  insert into
  public.turobus_network_inventory_units (

    resource_id,
    owner_company_id,
    unit_type,
    source_system,
    source_ref_id,
    parent_source_ref_id,
    name,
    currency,
    marketplace_enabled,
    is_active,
    metadata
  )

  select

    r.id,
    rt.company_id,
    'hotel_room_type',
    'hotel_os',
    rt.id,
    rt.hotel_id,
    rt.name,

    coalesce(
      h.currency,
      'TRY'
    ),

    false,

    (
      rt.is_active = true

      and coalesce(
        rt.stop_sell,
        false
      ) = false
    ),

    jsonb_build_object(

      'hotel_id',
        rt.hotel_id,

      'room_type_code',
        rt.room_type_code,

      'max_adults',
        rt.max_adults,

      'max_children',
        rt.max_children,

      'max_infants',
        rt.max_infants,

      'max_occupancy',
        rt.max_occupancy,

      'total_rooms',
        rt.total_rooms,

      'overbooking_limit',
        rt.overbooking_limit,

      'stop_sell',
        rt.stop_sell,

      'bed_type',
        rt.bed_type
    )

  from public.hotel_room_types rt

  join public.hotels h
    on h.id =
      rt.hotel_id

  join public.turobus_network_resources r
    on r.owner_company_id =
      rt.company_id

   and r.source_system =
      'hotel_os'

   and r.source_id =
      rt.hotel_id

  on conflict (
    owner_company_id,
    source_system,
    source_ref_id
  )

  do update set

    resource_id =
      excluded.resource_id,

    parent_source_ref_id =
      excluded.parent_source_ref_id,

    name =
      excluded.name,

    currency =
      excluded.currency,

    is_active =
      excluded.is_active,

    metadata =
      excluded.metadata,

    updated_at =
      now();


  get diagnostics
    v_room_types = row_count;


  -- --------------------------------------------------------
  -- TOURS -> NETWORK RESOURCE
  -- --------------------------------------------------------

  insert into
  public.turobus_network_resources (

    owner_company_id,
    resource_type,
    source_system,
    source_id,
    name,
    city,
    district,
    is_active,
    marketplace_enabled,
    metadata
  )

  select

    t.company_id,
    'tour',
    'tour_os',
    t.id,
    t.title,
    t.city,
    t.district,

    (
      coalesce(
        t.status,
        'active'
      ) = 'active'
    ),

    false,

    jsonb_build_object(

      'slug',
        t.slug,

      'category',
        t.category,

      'duration',
        t.duration,

      'meeting_point',
        t.meeting_point,

      'adult_price',
        t.adult_price,

      'child_price',
        t.child_price,

      'currency',
        coalesce(
          t.currency,
          'TRY'
        ),

      'max_people',
        t.max_people,

      'cover_image',
        t.cover_image
    )

  from public.tours t

  where
    t.company_id is not null

  on conflict (
    owner_company_id,
    source_system,
    source_id
  )

  do update set

    name =
      excluded.name,

    city =
      excluded.city,

    district =
      excluded.district,

    is_active =
      excluded.is_active,

    metadata =
      excluded.metadata,

    updated_at =
      now();


  get diagnostics
    v_tours = row_count;


  -- --------------------------------------------------------
  -- TOUR DEPARTURES -> NETWORK UNIT
  -- --------------------------------------------------------

  insert into
  public.turobus_network_inventory_units (

    resource_id,
    owner_company_id,
    unit_type,
    source_system,
    source_ref_id,
    parent_source_ref_id,
    name,
    currency,
    marketplace_enabled,
    is_active,
    metadata
  )

  select

    r.id,
    d.company_id,
    'tour_departure',
    'tour_os',
    d.id,
    d.tour_id,

    t.title
    || ' — '
    || to_char(
      d.departure_date,
      'DD.MM.YYYY'
    ),

    coalesce(
      t.currency,
      'TRY'
    ),

    false,

    (
      d.status = 'active'

      and d.reserved_count <
          d.capacity
    ),

    jsonb_build_object(

      'tour_id',
        d.tour_id,

      'departure_date',
        d.departure_date,

      'capacity',
        d.capacity,

      'reserved_count',
        d.reserved_count,

      'available',
        greatest(
          d.capacity -
          d.reserved_count,
          0
        ),

      'adult_price',
        coalesce(
          d.adult_price,
          t.adult_price
        ),

      'child_price',
        coalesce(
          d.child_price,
          t.child_price
        ),

      'status',
        d.status
    )

  from public.tour_departures d

  join public.tours t
    on t.id =
      d.tour_id

  join public.turobus_network_resources r
    on r.owner_company_id =
      d.company_id

   and r.source_system =
      'tour_os'

   and r.source_id =
      d.tour_id

  on conflict (
    owner_company_id,
    source_system,
    source_ref_id
  )

  do update set

    resource_id =
      excluded.resource_id,

    name =
      excluded.name,

    currency =
      excluded.currency,

    is_active =
      excluded.is_active,

    metadata =
      excluded.metadata,

    updated_at =
      now();


  get diagnostics
    v_departures = row_count;


  return jsonb_build_object(

    'ok',
      true,

    'hotels',
      v_hotels,

    'hotel_room_types',
      v_room_types,

    'tours',
      v_tours,

    'tour_departures',
      v_departures
  );

end;
$$;


revoke all
on function
public.sync_turobus_network_sources()
from public;


grant execute
on function
public.sync_turobus_network_sources()
to authenticated;


-- ============================================================
-- 4. TEK NETWORK CATALOG / MUSAITLIK RPC
--
-- Package Builder daha sonra sadece bunu okuyacak.
-- ============================================================

create or replace function
public.get_turobus_network_live_catalog(

  p_company_id uuid,

  p_start_date date
    default null,

  p_end_date date
    default null,

  p_resource_type text
    default null

)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_result jsonb;

begin

  if not public.is_company_member(
    p_company_id
  )
  then

    raise exception
      'Company membership required';

  end if;


  perform
    public.sync_turobus_network_sources();


  select

    jsonb_build_object(

      'resources',

      coalesce(

        jsonb_agg(
          item
          order by
            item ->> 'resource_type',
            item ->> 'name'
        ),

        '[]'::jsonb
      )
    )

  into
    v_result

  from (

    select

      jsonb_build_object(

        'resource_id',
          r.id,

        'resource_type',
          r.resource_type,

        'source_system',
          r.source_system,

        'source_id',
          r.source_id,

        'owner_company_id',
          r.owner_company_id,

        'name',
          r.name,

        'city',
          r.city,

        'district',
          r.district,

        'marketplace_enabled',
          r.marketplace_enabled,

        'metadata',
          r.metadata,

        'units',

        coalesce(

          (

            select
              jsonb_agg(
                unit_data
                order by
                  unit_data ->> 'name'
              )

            from (

              select

                jsonb_build_object(

                  'unit_id',
                    u.id,

                  'unit_type',
                    u.unit_type,

                  'source_ref_id',
                    u.source_ref_id,

                  'name',
                    u.name,

                  'currency',
                    u.currency,

                  'marketplace_enabled',
                    u.marketplace_enabled,

                  'is_active',
                    u.is_active,

                  'metadata',
                    u.metadata,

                  'availability',

                    case

                      -- =====================================
                      -- HOTEL AVAILABILITY
                      -- =====================================

                      when
                        u.unit_type =
                          'hotel_room_type'

                      then (

                        select
                          jsonb_build_object(

                            'configured',
                              count(*) > 0,

                            'available',

                              case

                                when
                                  count(*) = 0

                                then null

                                else
                                  greatest(
                                    min(
                                      i.total_inventory
                                      -
                                      i.reserved_inventory
                                      -
                                      i.blocked_inventory
                                    ),
                                    0
                                  )

                              end,

                            'stop_sale',

                              coalesce(
                                bool_or(
                                  i.stop_sale
                                ),
                                false
                              ),

                            'minimum_stay',

                              coalesce(
                                max(
                                  i.minimum_stay
                                ),
                                1
                              )
                          )

                        from
                          public.hotel_inventory i

                        where
                          i.room_type_id =
                            u.source_ref_id

                          and (
                            p_start_date is null

                            or i.inventory_date >=
                               p_start_date
                          )

                          and (
                            p_end_date is null

                            or i.inventory_date <
                               p_end_date
                          )
                      )


                      -- =====================================
                      -- TOUR AVAILABILITY
                      -- =====================================

                      when
                        u.unit_type =
                          'tour_departure'

                      then (

                        select
                          jsonb_build_object(

                            'configured',
                              true,

                            'available',

                              greatest(
                                d.capacity
                                -
                                d.reserved_count,
                                0
                              ),

                            'capacity',
                              d.capacity,

                            'reserved',
                              d.reserved_count,

                            'departure_date',
                              d.departure_date,

                            'status',
                              d.status,

                            'adult_price',

                              coalesce(
                                d.adult_price,
                                t.adult_price
                              ),

                            'child_price',

                              coalesce(
                                d.child_price,
                                t.child_price
                              )
                          )

                        from
                          public.tour_departures d

                        join public.tours t
                          on t.id =
                            d.tour_id

                        where
                          d.id =
                            u.source_ref_id
                      )


                      else

                        jsonb_build_object(
                          'configured',
                          false
                        )

                    end

                ) as unit_data

              from
                public.turobus_network_inventory_units u

              where
                u.resource_id =
                  r.id

                and u.is_active =
                  true

            ) units_source

          ),

          '[]'::jsonb
        )

      ) as item

    from
      public.turobus_network_resources r

    where
      r.is_active =
        true

      and (
        p_resource_type is null

        or r.resource_type =
           p_resource_type
      )

      and (

        r.owner_company_id =
          p_company_id

        or r.marketplace_enabled =
           true

        or exists (

          select 1

          from
            public.turobus_inventory_sources s

          where
            s.resource_id =
              r.id

            and
            s.buyer_company_id =
              p_company_id

            and
            s.is_active =
              true
        )
      )

  ) catalog;


  return
    coalesce(
      v_result,
      jsonb_build_object(
        'resources',
        '[]'::jsonb
      )
    );

end;
$$;


revoke all
on function
public.get_turobus_network_live_catalog(
  uuid,
  date,
  date,
  text
)
from public;


grant execute
on function
public.get_turobus_network_live_catalog(
  uuid,
  date,
  date,
  text
)
to authenticated;


-- ============================================================
-- 5. HOTEL PACKAGE REZERVASYONU
--
-- Gercek Hotel OS inventory dusurur
-- ve Hotel OS rezervasyonu olusturur.
-- ============================================================

create or replace function
public.reserve_turobus_network_hotel(

  p_company_id uuid,

  p_package_booking_item_id uuid,

  p_unit_id uuid,

  p_check_in date,

  p_check_out date,

  p_room_quantity integer
    default 1

)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_item
    public.package_booking_items%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_unit
    public.turobus_network_inventory_units%rowtype;

  v_resource
    public.turobus_network_resources%rowtype;

  v_hotel_id uuid;

  v_available integer;

  v_required_nights integer;

  v_inventory_nights integer;

  v_hotel_reservation_id uuid;

  v_allocation_id uuid;

  v_reservation_no text;

begin

  if not public.is_company_member(
    p_company_id
  )
  then

    raise exception
      'Company membership required';

  end if;


  if
    p_check_out <=
    p_check_in
  then

    raise exception
      'Invalid hotel dates';

  end if;


  if
    coalesce(
      p_room_quantity,
      0
    ) < 1
  then

    raise exception
      'Room quantity must be positive';

  end if;


  select *
  into
    v_item

  from
    public.package_booking_items

  where
    id =
      p_package_booking_item_id

    and company_id =
      p_company_id

  for update;


  if not found
  then

    raise exception
      'Package booking item not found';

  end if;


  select *
  into
    v_booking

  from
    public.package_bookings

  where
    id =
      v_item.booking_id

    and company_id =
      p_company_id;


  if not found
  then

    raise exception
      'Package booking not found';

  end if;


  select *
  into
    v_unit

  from
    public.turobus_network_inventory_units

  where
    id =
      p_unit_id

    and unit_type =
      'hotel_room_type'

    and is_active =
      true;


  if not found
  then

    raise exception
      'Hotel network unit not found';

  end if;


  select *
  into
    v_resource

  from
    public.turobus_network_resources

  where
    id =
      v_unit.resource_id

    and resource_type =
      'hotel'

    and is_active =
      true;


  if not found
  then

    raise exception
      'Hotel network resource not found';

  end if;


  v_hotel_id :=
    v_unit.parent_source_ref_id;


  v_required_nights :=
    p_check_out -
    p_check_in;


  -- --------------------------------------------------------
  -- Butun gecelerde inventory kaydi var mi?
  -- --------------------------------------------------------

  select
    count(*)

  into
    v_inventory_nights

  from
    public.hotel_inventory i

  where
    i.hotel_id =
      v_hotel_id

    and i.room_type_id =
      v_unit.source_ref_id

    and i.inventory_date >=
      p_check_in

    and i.inventory_date <
      p_check_out;


  if
    v_inventory_nights <>
    v_required_nights
  then

    raise exception
      'Hotel inventory is not configured for every night';
  end if;


  -- Kilitle

  perform 1

  from
    public.hotel_inventory i

  where
    i.hotel_id =
      v_hotel_id

    and i.room_type_id =
      v_unit.source_ref_id

    and i.inventory_date >=
      p_check_in

    and i.inventory_date <
      p_check_out

  order by
    i.inventory_date

  for update;


  select

    min(
      i.total_inventory
      -
      i.reserved_inventory
      -
      i.blocked_inventory
    )

  into
    v_available

  from
    public.hotel_inventory i

  where
    i.hotel_id =
      v_hotel_id

    and i.room_type_id =
      v_unit.source_ref_id

    and i.inventory_date >=
      p_check_in

    and i.inventory_date <
      p_check_out

    and i.stop_sale =
      false;


  if
    v_available is null

    or v_available <
       p_room_quantity
  then

    raise exception
      'Hotel inventory is not available';
  end if;


  -- --------------------------------------------------------
  -- Stok dus
  -- --------------------------------------------------------

  update
    public.hotel_inventory

  set
    reserved_inventory =
      reserved_inventory
      +
      p_room_quantity,

    updated_at =
      now()

  where
    hotel_id =
      v_hotel_id

    and room_type_id =
      v_unit.source_ref_id

    and inventory_date >=
      p_check_in

    and inventory_date <
      p_check_out;


  -- --------------------------------------------------------
  -- Hotel OS rezervasyonu olustur
  -- --------------------------------------------------------

  v_reservation_no :=
    'TB-'
    ||
    upper(
      substring(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        10
      )
    );


  insert into
    public.hotel_reservations (

      company_id,
      hotel_id,
      room_type_id,
      reservation_no,
      source,
      status,
      check_in,
      check_out,
      adults,
      children,
      nights,
      currency,
      base_price,
      total_price,
      balance,
      notes

    )

  values (

    v_resource.owner_company_id,
    v_hotel_id,
    v_unit.source_ref_id,
    v_reservation_no,
    'tatilliyoruz',
    'confirmed',
    p_check_in,
    p_check_out,
    greatest(
      v_booking.adults,
      1
    ),
    greatest(
      v_booking.children,
      0
    ),
    v_required_nights,
    v_item.currency,
    v_item.total_cost,
    v_item.total_sale_price,
    v_item.total_sale_price,

    'Turobus Network · Package Booking '
    ||
    v_booking.booking_code

  )

  returning id
  into
    v_hotel_reservation_id;


  -- --------------------------------------------------------
  -- Allocation
  -- --------------------------------------------------------

  insert into
    public.turobus_network_allocations (

      buyer_company_id,
      owner_company_id,
      unit_id,
      package_booking_id,
      package_booking_item_id,
      allocation_type,
      quantity,
      start_date,
      end_date,
      allocation_status,
      hotel_reservation_id,
      metadata

    )

  values (

    p_company_id,
    v_resource.owner_company_id,
    p_unit_id,
    v_booking.id,
    v_item.id,
    'hotel',
    p_room_quantity,
    p_check_in,
    p_check_out,
    'confirmed',
    v_hotel_reservation_id,

    jsonb_build_object(

      'hotel_id',
        v_hotel_id,

      'room_type_id',
        v_unit.source_ref_id,

      'reservation_no',
        v_reservation_no

    )

  )

  returning id
  into
    v_allocation_id;


  update
    public.package_booking_items

  set

    network_resource_id =
      v_resource.id,

    inventory_source_type =
      'turobus_network',

    supplier_status =
      'confirmed',

    supplier_confirmed_at =
      now(),

    supplier_confirmation_code =
      v_reservation_no,

    updated_at =
      now()

  where
    id =
      v_item.id;


  return
    jsonb_build_object(

      'ok',
        true,

      'allocation_id',
        v_allocation_id,

      'hotel_reservation_id',
        v_hotel_reservation_id,

      'reservation_no',
        v_reservation_no,

      'remaining_inventory',
        v_available
        -
        p_room_quantity
    );

end;
$$;


-- ============================================================
-- 6. TOUR PACKAGE KOLTUK REZERVASYONU
--
-- Tour OS departure reserved_count gercek olarak dusurulur.
-- ============================================================

create or replace function
public.reserve_turobus_network_tour(

  p_company_id uuid,

  p_package_booking_item_id uuid,

  p_unit_id uuid,

  p_quantity integer
    default 1

)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_item
    public.package_booking_items%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_unit
    public.turobus_network_inventory_units%rowtype;

  v_resource
    public.turobus_network_resources%rowtype;

  v_departure
    public.tour_departures%rowtype;

  v_allocation_id uuid;

  v_remaining integer;

begin

  if not public.is_company_member(
    p_company_id
  )
  then

    raise exception
      'Company membership required';

  end if;


  if
    coalesce(
      p_quantity,
      0
    ) < 1
  then

    raise exception
      'Quantity must be positive';

  end if;


  select *
  into
    v_item

  from
    public.package_booking_items

  where
    id =
      p_package_booking_item_id

    and company_id =
      p_company_id

  for update;


  if not found
  then

    raise exception
      'Package booking item not found';

  end if;


  select *
  into
    v_booking

  from
    public.package_bookings

  where
    id =
      v_item.booking_id

    and company_id =
      p_company_id;


  select *
  into
    v_unit

  from
    public.turobus_network_inventory_units

  where
    id =
      p_unit_id

    and unit_type =
      'tour_departure'

    and is_active =
      true;


  if not found
  then

    raise exception
      'Tour departure network unit not found';

  end if;


  select *
  into
    v_resource

  from
    public.turobus_network_resources

  where
    id =
      v_unit.resource_id

    and resource_type =
      'tour';


  select *
  into
    v_departure

  from
    public.tour_departures

  where
    id =
      v_unit.source_ref_id

  for update;


  if not found
  then

    raise exception
      'Tour departure not found';

  end if;


  if
    v_departure.status <>
    'active'
  then

    raise exception
      'Tour departure is not active';

  end if;


  if
    (
      v_departure.capacity
      -
      v_departure.reserved_count
    )
    <
    p_quantity
  then

    raise exception
      'Tour departure capacity is not available';
  end if;


  update
    public.tour_departures

  set

    reserved_count =
      reserved_count
      +
      p_quantity,

    status =
      case

        when
          reserved_count
          +
          p_quantity
          >=
          capacity

        then
          'full'

        else
          status

      end,

    updated_at =
      now()

  where
    id =
      v_departure.id;


  v_remaining :=
    v_departure.capacity
    -
    v_departure.reserved_count
    -
    p_quantity;


  insert into
    public.turobus_network_allocations (

      buyer_company_id,
      owner_company_id,
      unit_id,
      package_booking_id,
      package_booking_item_id,
      allocation_type,
      quantity,
      start_date,
      end_date,
      allocation_status,
      metadata

    )

  values (

    p_company_id,
    v_resource.owner_company_id,
    p_unit_id,
    v_booking.id,
    v_item.id,
    'tour',
    p_quantity,
    v_departure.departure_date,
    v_departure.departure_date,
    'confirmed',

    jsonb_build_object(

      'tour_id',
        v_departure.tour_id,

      'departure_id',
        v_departure.id,

      'departure_date',
        v_departure.departure_date

    )

  )

  returning id
  into
    v_allocation_id;


  update
    public.package_booking_items

  set

    network_resource_id =
      v_resource.id,

    inventory_source_type =
      'turobus_network',

    supplier_status =
      'confirmed',

    supplier_confirmed_at =
      now(),

    supplier_confirmation_code =
      'TB-TOUR-'
      ||
      upper(
        substring(
          replace(
            v_allocation_id::text,
            '-',
            ''
          ),
          1,
          8
        )
      ),

    updated_at =
      now()

  where
    id =
      v_item.id;


  return
    jsonb_build_object(

      'ok',
        true,

      'allocation_id',
        v_allocation_id,

      'departure_id',
        v_departure.id,

      'remaining_capacity',
        greatest(
          v_remaining,
          0
        )
    );

end;
$$;


-- ============================================================
-- 7. NETWORK ALLOCATION IPTAL / STOK GERI ACMA
-- ============================================================

create or replace function
public.release_turobus_network_allocation(

  p_company_id uuid,

  p_allocation_id uuid,

  p_reason text
    default null

)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_allocation
    public.turobus_network_allocations%rowtype;

  v_unit
    public.turobus_network_inventory_units%rowtype;

begin

  if not public.is_company_member(
    p_company_id
  )
  then

    raise exception
      'Company membership required';

  end if;


  select *
  into
    v_allocation

  from
    public.turobus_network_allocations

  where
    id =
      p_allocation_id

    and buyer_company_id =
      p_company_id

  for update;


  if not found
  then

    raise exception
      'Network allocation not found';

  end if;


  if
    v_allocation.allocation_status
    in (
      'released',
      'cancelled'
    )
  then

    return
      jsonb_build_object(

        'ok',
          true,

        'already_released',
          true
      );
  end if;


  select *
  into
    v_unit

  from
    public.turobus_network_inventory_units

  where
    id =
      v_allocation.unit_id;


  -- HOTEL

  if
    v_allocation.allocation_type =
      'hotel'
  then

    update
      public.hotel_inventory

    set

      reserved_inventory =
        greatest(
          reserved_inventory
          -
          v_allocation.quantity,
          0
        ),

      updated_at =
        now()

    where
      hotel_id =
        v_unit.parent_source_ref_id

      and room_type_id =
        v_unit.source_ref_id

      and inventory_date >=
        v_allocation.start_date

      and inventory_date <
        v_allocation.end_date;


    if
      v_allocation.hotel_reservation_id
      is not null
    then

      update
        public.hotel_reservations

      set

        status =
          'cancelled',

        notes =
          concat_ws(
            E'\n',
            notes,
            'Turobus allocation released: '
            ||
            coalesce(
              p_reason,
              'No reason'
            )
          ),

        updated_at =
          now()

      where
        id =
          v_allocation.hotel_reservation_id;

    end if;

  end if;


  -- TOUR

  if
    v_allocation.allocation_type =
      'tour'
  then

    update
      public.tour_departures

    set

      reserved_count =
        greatest(
          reserved_count
          -
          v_allocation.quantity,
          0
        ),

      status =
        case

          when status =
            'full'

          then
            'active'

          else
            status

        end,

      updated_at =
        now()

    where
      id =
        v_unit.source_ref_id;

  end if;


  update
    public.turobus_network_allocations

  set

    allocation_status =
      'released',

    released_at =
      now(),

    metadata =
      metadata
      ||
      jsonb_build_object(
        'release_reason',
        p_reason
      ),

    updated_at =
      now()

  where
    id =
      v_allocation.id;


  return
    jsonb_build_object(

      'ok',
        true,

      'released',
        true,

      'allocation_id',
        v_allocation.id
    );

end;
$$;


-- ============================================================
-- 8. EXECUTE PERMISSIONS
-- ============================================================

revoke all
on function
public.reserve_turobus_network_hotel(
  uuid,
  uuid,
  uuid,
  date,
  date,
  integer
)
from public;


grant execute
on function
public.reserve_turobus_network_hotel(
  uuid,
  uuid,
  uuid,
  date,
  date,
  integer
)
to authenticated;


revoke all
on function
public.reserve_turobus_network_tour(
  uuid,
  uuid,
  uuid,
  integer
)
from public;


grant execute
on function
public.reserve_turobus_network_tour(
  uuid,
  uuid,
  uuid,
  integer
)
to authenticated;


revoke all
on function
public.release_turobus_network_allocation(
  uuid,
  uuid,
  text
)
from public;


grant execute
on function
public.release_turobus_network_allocation(
  uuid,
  uuid,
  text
)
to authenticated;


-- ============================================================
-- 9. ILK SENKRONIZASYON
-- ============================================================

select
  public.sync_turobus_network_sources();


commit;
