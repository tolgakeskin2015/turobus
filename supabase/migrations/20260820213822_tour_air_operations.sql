-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 2 — AIR TOUR OPERATIONS
--
-- Non-destructive.
-- Existing tours / reservations / manifest preserved.
-- Supports outbound, return and multi-segment flights.
-- ============================================================

create table if not exists
public.tour_flights (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  direction text
    not null
    check (
      direction in (
        'outbound',
        'return'
      )
    ),

  segment_no integer
    not null
    default 1
    check (
      segment_no > 0
    ),

  airline_name text,

  airline_code text,

  flight_number text,

  pnr text,

  group_booking_code text,

  departure_airport_code text,

  departure_airport_name text,

  arrival_airport_code text,

  arrival_airport_name text,

  departure_at timestamptz,

  arrival_at timestamptz,

  cabin_baggage text,

  checked_baggage text,

  ticketing_deadline timestamptz,

  seat_capacity integer
    check (
      seat_capacity is null
      or seat_capacity >= 0
    ),

  seats_reserved integer
    not null
    default 0
    check (
      seats_reserved >= 0
    ),

  seats_ticketed integer
    not null
    default 0
    check (
      seats_ticketed >= 0
    ),

  status text
    not null
    default 'scheduled'
    check (
      status in (
        'scheduled',
        'confirmed',
        'ticketing',
        'ticketed',
        'departed',
        'arrived',
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
    direction,
    segment_no
  )
);


create index if not exists
  tour_flights_company_tour_idx
on public.tour_flights (
  company_id,
  tour_id
);


create index if not exists
  tour_flights_company_deadline_idx
on public.tour_flights (
  company_id,
  ticketing_deadline
);


create index if not exists
  tour_flights_company_status_idx
on public.tour_flights (
  company_id,
  status
);


alter table
  public.tour_flights
enable row level security;


drop policy if exists
  tour_flights_select_company
on public.tour_flights;


create policy
  tour_flights_select_company
on public.tour_flights
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_flights_insert_company
on public.tour_flights;


create policy
  tour_flights_insert_company
on public.tour_flights
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_flights_update_company
on public.tour_flights;


create policy
  tour_flights_update_company
on public.tour_flights
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
  tour_flights_delete_company
on public.tour_flights;


create policy
  tour_flights_delete_company
on public.tour_flights
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);
