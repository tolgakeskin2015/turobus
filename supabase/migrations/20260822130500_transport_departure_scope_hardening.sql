-- ============================================================
-- TUROBÜS TOUR OS
-- 15.0A — TRANSPORT DEPARTURE SCOPE
--
-- Non-destructive runtime hardening.
--
-- Purpose:
-- - bind flight operations to a specific tour departure
-- - bind bus operations to a specific tour departure
-- - preserve existing rows
-- - safely backfill only tours having exactly one departure
-- - prevent cross-tour / cross-company departure assignment
--
-- Existing applied migrations are not modified.
-- ============================================================


-- ------------------------------------------------------------
-- FLIGHT DEPARTURE LINK
-- ------------------------------------------------------------

alter table
  public.tour_flights
add column if not exists
  departure_id uuid;


alter table
  public.tour_flights
drop constraint if exists
  tour_flights_departure_id_fkey;


alter table
  public.tour_flights
add constraint
  tour_flights_departure_id_fkey
foreign key (
  departure_id
)
references public.tour_departures(id)
on delete set null;


-- ------------------------------------------------------------
-- BUS DEPARTURE LINK
-- ------------------------------------------------------------

alter table
  public.tour_bus_operations
add column if not exists
  departure_id uuid;


alter table
  public.tour_bus_operations
drop constraint if exists
  tour_bus_operations_departure_id_fkey;


alter table
  public.tour_bus_operations
add constraint
  tour_bus_operations_departure_id_fkey
foreign key (
  departure_id
)
references public.tour_departures(id)
on delete set null;


-- ------------------------------------------------------------
-- SAFE LEGACY BACKFILL
--
-- Only tours with exactly one departure are auto-linked.
-- Multiple-departure tours intentionally remain NULL.
-- ------------------------------------------------------------

with single_departures as (

  select
    company_id,
    tour_id,
    (array_agg(id order by id))[1] as departure_id

  from
    public.tour_departures

  group by
    company_id,
    tour_id

  having
    count(*) = 1
)

update
  public.tour_flights as flight

set
  departure_id =
    single_departures.departure_id

from
  single_departures

where
  flight.departure_id is null

  and
  single_departures.company_id =
    flight.company_id

  and
  single_departures.tour_id =
    flight.tour_id;


with single_departures as (

  select
    company_id,
    tour_id,
    (array_agg(id order by id))[1] as departure_id

  from
    public.tour_departures

  group by
    company_id,
    tour_id

  having
    count(*) = 1
)

update
  public.tour_bus_operations as bus

set
  departure_id =
    single_departures.departure_id

from
  single_departures

where
  bus.departure_id is null

  and
  single_departures.company_id =
    bus.company_id

  and
  single_departures.tour_id =
    bus.tour_id;


-- ------------------------------------------------------------
-- VALIDATION FUNCTION
--
-- departure_id must belong to the same:
-- company_id + tour_id
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_transport_departure_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    new.departure_id is null
  then
    return new;
  end if;


  if not exists (

    select
      1

    from
      public.tour_departures as departure

    where
      departure.id =
        new.departure_id

      and
      departure.company_id =
        new.company_id

      and
      departure.tour_id =
        new.tour_id
  )
  then

    raise exception
      'Transport departure does not belong to the same company and tour';

  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_flights_validate_departure_scope
on public.tour_flights;


create trigger
  tour_flights_validate_departure_scope

before insert or update of
  departure_id,
  company_id,
  tour_id

on
  public.tour_flights

for each row

execute function
  public.validate_tour_transport_departure_scope();


drop trigger if exists
  tour_bus_operations_validate_departure_scope
on public.tour_bus_operations;


create trigger
  tour_bus_operations_validate_departure_scope

before insert or update of
  departure_id,
  company_id,
  tour_id

on
  public.tour_bus_operations

for each row

execute function
  public.validate_tour_transport_departure_scope();


-- ------------------------------------------------------------
-- OLD UNIQUE CONSTRAINTS
--
-- Old uniqueness was only tour-level.
-- This prevents different departures from having:
-- Gidiş segment 1 / Otobüs 1 separately.
-- ------------------------------------------------------------

alter table
  public.tour_flights
drop constraint if exists
  tour_flights_tour_id_direction_segment_no_key;


alter table
  public.tour_bus_operations
drop constraint if exists
  tour_bus_operations_tour_id_bus_no_key;


-- ------------------------------------------------------------
-- DEPARTURE-SCOPED UNIQUE INDEXES
-- ------------------------------------------------------------

create unique index if not exists
  tour_flights_departure_segment_unique_idx

on public.tour_flights (
  company_id,
  tour_id,
  departure_id,
  direction,
  segment_no
)

where
  departure_id is not null;


create unique index if not exists
  tour_flights_legacy_segment_unique_idx

on public.tour_flights (
  company_id,
  tour_id,
  direction,
  segment_no
)

where
  departure_id is null;


create unique index if not exists
  tour_bus_operations_departure_bus_unique_idx

on public.tour_bus_operations (
  company_id,
  tour_id,
  departure_id,
  bus_no
)

where
  departure_id is not null;


create unique index if not exists
  tour_bus_operations_legacy_bus_unique_idx

on public.tour_bus_operations (
  company_id,
  tour_id,
  bus_no
)

where
  departure_id is null;


-- ------------------------------------------------------------
-- QUERY INDEXES
-- ------------------------------------------------------------

create index if not exists
  tour_flights_company_tour_departure_idx

on public.tour_flights (
  company_id,
  tour_id,
  departure_id
);


create index if not exists
  tour_bus_operations_company_tour_departure_idx

on public.tour_bus_operations (
  company_id,
  tour_id,
  departure_id
);


-- ------------------------------------------------------------
-- DOCUMENTATION
-- ------------------------------------------------------------

comment on column
  public.tour_flights.departure_id
is
  'Specific tour departure served by this flight operation. NULL is retained only for legacy/unassigned records.';


comment on column
  public.tour_bus_operations.departure_id
is
  'Specific tour departure served by this bus operation. NULL is retained only for legacy/unassigned records.';
