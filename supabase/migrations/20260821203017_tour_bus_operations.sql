-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 3 — BUS TOUR OPERATIONS
--
-- Non destructive.
-- Existing tours, vehicles, reservations and manifest preserved.
-- ============================================================


create table if not exists
public.tour_bus_operations (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  bus_no integer
    not null
    default 1
    check (
      bus_no > 0
    ),

  driver_1_name text,

  driver_1_phone text,

  driver_2_name text,

  driver_2_phone text,

  guide_name text,

  guide_phone text,

  operations_phone text,

  seat_capacity integer
    check (
      seat_capacity is null
      or seat_capacity > 0
    ),

  departure_at timestamptz,

  return_at timestamptz,

  status text
    not null
    default 'planning'
    check (
      status in (
        'planning',
        'assigned',
        'boarding',
        'departed',
        'on_route',
        'returning',
        'completed',
        'cancelled'
      )
    ),

  notes text,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    tour_id,
    bus_no
  )
);


create index if not exists
  tour_bus_operations_company_tour_idx
on public.tour_bus_operations (
  company_id,
  tour_id
);


create index if not exists
  tour_bus_operations_vehicle_idx
on public.tour_bus_operations (
  company_id,
  vehicle_id
);


create table if not exists
public.tour_bus_boarding_stops (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  bus_operation_id uuid
    not null
    references public.tour_bus_operations(id)
    on delete cascade,

  sequence_no integer
    not null
    check (
      sequence_no > 0
    ),

  stop_name text
    not null,

  address text,

  planned_at timestamptz,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    bus_operation_id,
    sequence_no
  )
);


create index if not exists
  tour_bus_stops_operation_idx
on public.tour_bus_boarding_stops (
  company_id,
  bus_operation_id,
  sequence_no
);


create table if not exists
public.tour_bus_seats (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  bus_operation_id uuid
    not null
    references public.tour_bus_operations(id)
    on delete cascade,

  seat_number integer
    not null
    check (
      seat_number > 0
    ),

  seat_type text
    not null
    default 'passenger'
    check (
      seat_type in (
        'passenger',
        'guide',
        'staff',
        'blocked'
      )
    ),

  seat_status text
    not null
    default 'empty'
    check (
      seat_status in (
        'empty',
        'reserved',
        'confirmed',
        'blocked'
      )
    ),

  passenger_name text,

  passenger_phone text,

  boarding_stop_id uuid
    references public.tour_bus_boarding_stops(id)
    on delete set null,

  checkin_status text
    not null
    default 'waiting'
    check (
      checkin_status in (
        'waiting',
        'boarded',
        'no_show'
      )
    ),

  boarded_at timestamptz,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    bus_operation_id,
    seat_number
  )
);


create index if not exists
  tour_bus_seats_operation_idx
on public.tour_bus_seats (
  company_id,
  bus_operation_id,
  seat_number
);


create index if not exists
  tour_bus_seats_checkin_idx
on public.tour_bus_seats (
  company_id,
  tour_id,
  checkin_status
);


alter table
  public.tour_bus_operations
enable row level security;


alter table
  public.tour_bus_boarding_stops
enable row level security;


alter table
  public.tour_bus_seats
enable row level security;


drop policy if exists
  tour_bus_operations_select_company
on public.tour_bus_operations;

create policy
  tour_bus_operations_select_company
on public.tour_bus_operations
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_operations_insert_company
on public.tour_bus_operations;

create policy
  tour_bus_operations_insert_company
on public.tour_bus_operations
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_operations_update_company
on public.tour_bus_operations;

create policy
  tour_bus_operations_update_company
on public.tour_bus_operations
for update
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_operations_delete_company
on public.tour_bus_operations;

create policy
  tour_bus_operations_delete_company
on public.tour_bus_operations
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_stops_select_company
on public.tour_bus_boarding_stops;

create policy
  tour_bus_stops_select_company
on public.tour_bus_boarding_stops
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_stops_insert_company
on public.tour_bus_boarding_stops;

create policy
  tour_bus_stops_insert_company
on public.tour_bus_boarding_stops
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_stops_update_company
on public.tour_bus_boarding_stops;

create policy
  tour_bus_stops_update_company
on public.tour_bus_boarding_stops
for update
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_stops_delete_company
on public.tour_bus_boarding_stops;

create policy
  tour_bus_stops_delete_company
on public.tour_bus_boarding_stops
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_seats_select_company
on public.tour_bus_seats;

create policy
  tour_bus_seats_select_company
on public.tour_bus_seats
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_seats_insert_company
on public.tour_bus_seats;

create policy
  tour_bus_seats_insert_company
on public.tour_bus_seats
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_seats_update_company
on public.tour_bus_seats;

create policy
  tour_bus_seats_update_company
on public.tour_bus_seats
for update
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_bus_seats_delete_company
on public.tour_bus_seats;

create policy
  tour_bus_seats_delete_company
on public.tour_bus_seats
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);
