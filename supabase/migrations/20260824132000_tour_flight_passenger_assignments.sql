-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-006B — Passenger / Flight Assignment
--
-- Additive only.
-- No backfill.
-- No fake/test data.
-- Existing tour_flights remain canonical flight segments.
-- Existing tour_passengers remain canonical passengers.
-- Historical operational relations use RESTRICT.
-- ============================================================

create table if not exists public.tour_flight_passenger_assignments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  tour_id uuid not null
    references public.tours(id)
    on delete restrict,

  departure_id uuid not null
    references public.tour_departures(id)
    on delete restrict,

  flight_id uuid not null
    references public.tour_flights(id)
    on delete restrict,

  passenger_id uuid not null
    references public.tour_passengers(id)
    on delete restrict,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  passenger_pnr text,
  ticket_number text,
  e_ticket_number text,
  seat_number text,

  ticketing_status text not null default 'pending'
    check (
      ticketing_status in (
        'pending',
        'reserved',
        'ticketed',
        'cancelled'
      )
    ),

  checkin_status text not null default 'pending'
    check (
      checkin_status in (
        'pending',
        'checked_in',
        'not_checked_in'
      )
    ),

  boarding_status text not null default 'pending'
    check (
      boarding_status in (
        'pending',
        'boarded',
        'no_show'
      )
    ),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists
  tour_flight_passenger_assignment_unique_idx
on public.tour_flight_passenger_assignments (
  flight_id,
  passenger_id
);

create index if not exists
  tour_flight_passenger_assignment_departure_idx
on public.tour_flight_passenger_assignments (
  company_id,
  departure_id
);

create index if not exists
  tour_flight_passenger_assignment_passenger_idx
on public.tour_flight_passenger_assignments (
  passenger_id
);

create index if not exists
  tour_flight_passenger_assignment_flight_idx
on public.tour_flight_passenger_assignments (
  flight_id
);

-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function
  public.set_tour_flight_passenger_assignment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  trg_tour_flight_passenger_assignment_updated_at
on public.tour_flight_passenger_assignments;

create trigger
  trg_tour_flight_passenger_assignment_updated_at
before update
on public.tour_flight_passenger_assignments
for each row
execute function
  public.set_tour_flight_passenger_assignment_updated_at();

-- ------------------------------------------------------------
-- SCOPE INTEGRITY
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_flight_passenger_assignment()
returns trigger
language plpgsql
as $$
declare
  v_flight public.tour_flights%rowtype;
  v_passenger public.tour_passengers%rowtype;
  v_departure public.tour_departures%rowtype;
  v_reservation public.reservations%rowtype;
begin
  select *
  into v_flight
  from public.tour_flights
  where id = new.flight_id;

  if not found then
    raise exception
      'Selected flight does not exist.';
  end if;

  select *
  into v_passenger
  from public.tour_passengers
  where id = new.passenger_id;

  if not found then
    raise exception
      'Selected passenger does not exist.';
  end if;

  select *
  into v_departure
  from public.tour_departures
  where id = new.departure_id;

  if not found then
    raise exception
      'Selected departure does not exist.';
  end if;

  if v_flight.company_id <> new.company_id then
    raise exception
      'Flight and assignment company must match.';
  end if;

  if v_passenger.company_id <> new.company_id then
    raise exception
      'Passenger and assignment company must match.';
  end if;

  if v_departure.company_id <> new.company_id then
    raise exception
      'Departure and assignment company must match.';
  end if;

  if v_flight.tour_id <> new.tour_id then
    raise exception
      'Flight and assignment tour must match.';
  end if;

  if v_passenger.tour_id <> new.tour_id then
    raise exception
      'Passenger and assignment tour must match.';
  end if;

  if v_departure.tour_id <> new.tour_id then
    raise exception
      'Departure and assignment tour must match.';
  end if;

  if v_flight.departure_id is distinct from new.departure_id then
    raise exception
      'Flight and assignment departure must match.';
  end if;

  if v_passenger.departure_id <> new.departure_id then
    raise exception
      'Passenger and assignment departure must match.';
  end if;

  if new.reservation_id is not null then
    select *
    into v_reservation
    from public.reservations
    where id = new.reservation_id;

    if not found then
      raise exception
        'Selected reservation does not exist.';
    end if;

    if v_reservation.company_id <> new.company_id then
      raise exception
        'Reservation and assignment company must match.';
    end if;

    if v_reservation.tour_id <> new.tour_id then
      raise exception
        'Reservation and assignment tour must match.';
    end if;

    if v_reservation.departure_id is distinct from new.departure_id then
      raise exception
        'Reservation and assignment departure must match.';
    end if;

    if v_passenger.reservation_id is distinct from new.reservation_id then
      raise exception
        'Passenger reservation and assignment reservation must match.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_validate_tour_flight_passenger_assignment
on public.tour_flight_passenger_assignments;

create trigger
  trg_validate_tour_flight_passenger_assignment
before insert or update of
  company_id,
  tour_id,
  departure_id,
  flight_id,
  passenger_id,
  reservation_id
on public.tour_flight_passenger_assignments
for each row
execute function
  public.validate_tour_flight_passenger_assignment();

-- ------------------------------------------------------------
-- RLS
-- Same company membership model used by tour_flights.
-- ------------------------------------------------------------

alter table
  public.tour_flight_passenger_assignments
enable row level security;

drop policy if exists
  tour_flight_passenger_assignments_company_member
on public.tour_flight_passenger_assignments;

create policy
  tour_flight_passenger_assignments_company_member
on public.tour_flight_passenger_assignments
for all
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

comment on table
  public.tour_flight_passenger_assignments
is
  'Canonical Tour OS passenger-to-flight segment assignments with passenger-specific PNR, ticket, e-ticket, seat, ticketing, check-in and boarding status.';
