begin;

create table if not exists public.package_booking_network_operations (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete cascade,

  quote_network_selection_id uuid not null
    references public.package_quote_network_selections(id)
    on delete cascade,

  allocation_id uuid
    references public.turobus_network_allocations(id)
    on delete set null,

  operation_status text not null default 'pending',

  confirmed_at timestamptz,
  released_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint package_network_operation_status_check
  check (
    operation_status in (
      'pending',
      'confirmed',
      'released',
      'failed',
      'cancelled'
    )
  )
);

create unique index if not exists
idx_package_network_operation_unique
on public.package_booking_network_operations (
  booking_id,
  quote_network_selection_id
);

alter table public.package_booking_network_operations
enable row level security;

drop policy if exists
package_network_operations_read
on public.package_booking_network_operations;

create policy package_network_operations_read
on public.package_booking_network_operations
for select
to authenticated
using (
  public.is_company_member(company_id)
);


-- ============================================================
-- REZERVASYONDAKI NETWORK URUNLERI
-- ============================================================

create or replace function
public.get_package_booking_network_operations(
  p_company_id uuid,
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select quote_id
  into v_quote_id
  from public.package_bookings
  where id = p_booking_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_quote_id is null then
    return jsonb_build_object(
      'items',
      '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'selection_id', s.id,
            'resource_type', s.resource_type,
            'quantity', s.quantity,

            'resource_id', r.id,
            'resource_name', r.name,
            'source_system', r.source_system,

            'unit_id', u.id,
            'unit_name', u.name,
            'unit_type', u.unit_type,

            'operation_status',
              coalesce(op.operation_status, 'pending'),

            'allocation_id',
              op.allocation_id,

            'confirmed_at',
              op.confirmed_at,

            'released_at',
              op.released_at,

            'allocation_status',
              a.allocation_status,

            'allocation_quantity',
              a.quantity,

            'allocation_start_date',
              a.start_date,

            'allocation_end_date',
              a.end_date,

            'hotel_reservation_id',
              a.hotel_reservation_id
          )
          order by r.name, u.name
        )

        from public.package_quote_network_selections s

        join public.turobus_network_resources r
          on r.id = s.network_resource_id

        join public.turobus_network_inventory_units u
          on u.id = s.network_unit_id

        left join public.package_booking_network_operations op
          on op.booking_id = p_booking_id
         and op.quote_network_selection_id = s.id

        left join public.turobus_network_allocations a
          on a.id = op.allocation_id

        where s.company_id = p_company_id
          and s.quote_id = v_quote_id
      ),
      '[]'::jsonb
    )
  );

end;
$$;

grant execute
on function public.get_package_booking_network_operations(uuid, uuid)
to authenticated;


-- ============================================================
-- GERCEK STOK AYIR
-- ============================================================

create or replace function
public.confirm_package_network_selection(
  p_company_id uuid,
  p_booking_id uuid,
  p_selection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_selection public.package_quote_network_selections%rowtype;
  v_unit public.turobus_network_inventory_units%rowtype;
  v_resource public.turobus_network_resources%rowtype;
  v_departure public.tour_departures%rowtype;

  v_existing_allocation uuid;
  v_existing_status text;

  v_allocation_id uuid;
  v_hotel_reservation_id uuid;

  v_available integer;
  v_remaining integer;

  v_nights integer;
  v_inventory_days integer;

  v_reservation_no text;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select *
  into v_booking
  from public.package_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'Cancelled booking cannot reserve inventory';
  end if;

  if v_booking.quote_id is null then
    raise exception 'Booking has no quote';
  end if;


  select *
  into v_selection
  from public.package_quote_network_selections
  where id = p_selection_id
    and company_id = p_company_id
    and quote_id = v_booking.quote_id;

  if not found then
    raise exception 'Network selection not found';
  end if;


  select
    op.allocation_id,
    op.operation_status
  into
    v_existing_allocation,
    v_existing_status
  from public.package_booking_network_operations op
  where op.booking_id = p_booking_id
    and op.quote_network_selection_id = p_selection_id;

  if v_existing_allocation is not null
     and exists (
       select 1
       from public.turobus_network_allocations a
       where a.id = v_existing_allocation
         and a.allocation_status in ('reserved', 'confirmed')
     )
  then
    return jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'allocation_id', v_existing_allocation
    );
  end if;


  select *
  into v_unit
  from public.turobus_network_inventory_units
  where id = v_selection.network_unit_id
    and is_active = true;

  if not found then
    raise exception 'Network unit not found';
  end if;


  select *
  into v_resource
  from public.turobus_network_resources
  where id = v_selection.network_resource_id
    and is_active = true;

  if not found then
    raise exception 'Network resource not found';
  end if;


  -- =========================================================
  -- HOTEL
  -- =========================================================

  if v_selection.resource_type = 'hotel' then

    v_nights :=
      v_booking.check_out -
      v_booking.check_in;

    if v_nights < 1 then
      raise exception 'Invalid hotel dates';
    end if;


    select count(*)
    into v_inventory_days
    from public.hotel_inventory i
    where i.hotel_id = v_unit.parent_source_ref_id
      and i.room_type_id = v_unit.source_ref_id
      and i.inventory_date >= v_booking.check_in
      and i.inventory_date < v_booking.check_out;


    if v_inventory_days <> v_nights then
      raise exception
        'Hotel inventory is not configured for every night';
    end if;


    perform 1
    from public.hotel_inventory i
    where i.hotel_id = v_unit.parent_source_ref_id
      and i.room_type_id = v_unit.source_ref_id
      and i.inventory_date >= v_booking.check_in
      and i.inventory_date < v_booking.check_out
    order by i.inventory_date
    for update;


    select min(
      i.total_inventory
      -
      i.reserved_inventory
      -
      i.blocked_inventory
    )
    into v_available
    from public.hotel_inventory i
    where i.hotel_id = v_unit.parent_source_ref_id
      and i.room_type_id = v_unit.source_ref_id
      and i.inventory_date >= v_booking.check_in
      and i.inventory_date < v_booking.check_out
      and i.stop_sale = false;


    if v_available is null
       or v_available < v_selection.quantity
    then
      raise exception 'Hotel inventory is not available';
    end if;


    update public.hotel_inventory
    set
      reserved_inventory =
        reserved_inventory + v_selection.quantity,

      updated_at = now()

    where hotel_id = v_unit.parent_source_ref_id
      and room_type_id = v_unit.source_ref_id
      and inventory_date >= v_booking.check_in
      and inventory_date < v_booking.check_out;


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


    insert into public.hotel_reservations (
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
      v_unit.parent_source_ref_id,
      v_unit.source_ref_id,
      v_reservation_no,
      'tatilliyoruz',
      'confirmed',
      v_booking.check_in,
      v_booking.check_out,
      greatest(v_booking.adults, 1),
      greatest(v_booking.children, 0),
      v_nights,
      v_booking.currency,
      0,
      0,
      0,
      'Turobus Network · Package Booking '
      || v_booking.booking_code
    )
    returning id
    into v_hotel_reservation_id;


    insert into public.turobus_network_allocations (
      buyer_company_id,
      owner_company_id,
      unit_id,
      package_booking_id,
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
      v_unit.id,
      v_booking.id,
      'hotel',
      v_selection.quantity,
      v_booking.check_in,
      v_booking.check_out,
      'confirmed',
      v_hotel_reservation_id,
      jsonb_build_object(
        'selection_id',
          v_selection.id,

        'reservation_no',
          v_reservation_no,

        'source',
          'package_network'
      )
    )
    returning id
    into v_allocation_id;


    v_remaining :=
      v_available -
      v_selection.quantity;


  -- =========================================================
  -- TOUR
  -- =========================================================

  elsif v_selection.resource_type = 'tour' then

    select *
    into v_departure
    from public.tour_departures
    where id = v_unit.source_ref_id
    for update;


    if not found then
      raise exception 'Tour departure not found';
    end if;


    if v_departure.status not in ('active', 'full') then
      raise exception 'Tour departure is not active';
    end if;


    if (
      v_departure.capacity
      -
      v_departure.reserved_count
    ) < v_selection.quantity
    then
      raise exception 'Tour capacity is not available';
    end if;


    update public.tour_departures
    set
      reserved_count =
        reserved_count + v_selection.quantity,

      status =
        case
          when reserved_count
               + v_selection.quantity
               >= capacity
          then 'full'
          else status
        end,

      updated_at =
        now()

    where id = v_departure.id;


    v_remaining :=
      v_departure.capacity
      -
      v_departure.reserved_count
      -
      v_selection.quantity;


    insert into public.turobus_network_allocations (
      buyer_company_id,
      owner_company_id,
      unit_id,
      package_booking_id,
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
      v_unit.id,
      v_booking.id,
      'tour',
      v_selection.quantity,
      v_departure.departure_date,
      v_departure.departure_date,
      'confirmed',
      jsonb_build_object(
        'selection_id',
          v_selection.id,

        'departure_id',
          v_departure.id,

        'source',
          'package_network'
      )
    )
    returning id
    into v_allocation_id;


  else

    raise exception
      'Unsupported Network resource type';

  end if;


  insert into public.package_booking_network_operations (
    company_id,
    booking_id,
    quote_network_selection_id,
    allocation_id,
    operation_status,
    confirmed_at
  )
  values (
    p_company_id,
    p_booking_id,
    p_selection_id,
    v_allocation_id,
    'confirmed',
    now()
  )

  on conflict (
    booking_id,
    quote_network_selection_id
  )
  do update set
    allocation_id =
      excluded.allocation_id,

    operation_status =
      'confirmed',

    confirmed_at =
      now(),

    released_at =
      null,

    updated_at =
      now();


  return jsonb_build_object(
    'ok', true,
    'allocation_id', v_allocation_id,
    'hotel_reservation_id', v_hotel_reservation_id,
    'remaining', greatest(coalesce(v_remaining, 0), 0)
  );

end;
$$;

grant execute
on function public.confirm_package_network_selection(uuid, uuid, uuid)
to authenticated;


-- ============================================================
-- STOGU GERI AC
-- ============================================================

create or replace function
public.release_package_network_selection(
  p_company_id uuid,
  p_booking_id uuid,
  p_selection_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.package_booking_network_operations%rowtype;
  v_result jsonb;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;


  select *
  into v_operation
  from public.package_booking_network_operations
  where company_id = p_company_id
    and booking_id = p_booking_id
    and quote_network_selection_id = p_selection_id
  for update;


  if not found then
    raise exception 'Network operation not found';
  end if;


  if v_operation.operation_status = 'released' then
    return jsonb_build_object(
      'ok', true,
      'already_released', true
    );
  end if;


  if v_operation.allocation_id is null then
    raise exception 'Allocation not found';
  end if;


  v_result :=
    public.release_turobus_network_allocation(
      p_company_id,
      v_operation.allocation_id,
      coalesce(
        p_reason,
        'Network operation released'
      )
    );


  update public.package_booking_network_operations
  set
    operation_status = 'released',
    released_at = now(),
    updated_at = now()

  where id = v_operation.id;


  return
    coalesce(v_result, '{}'::jsonb)
    ||
    jsonb_build_object(
      'operation_released',
      true
    );

end;
$$;

grant execute
on function public.release_package_network_selection(
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;

commit;
