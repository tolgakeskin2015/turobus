-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-003 — Passenger Group + Room Hardening
--
-- Additive / hardening migration.
-- No fake data.
-- No backfill guesses.
-- No destructive row DML.
--
-- Goals:
-- - company / tour / departure scope integrity
-- - group contact passenger integrity
-- - passenger travel_group integrity
-- - room scope integrity
-- - room assignment concurrency protection
-- - room capacity reduction protection
-- - RLS
-- - updated_at
-- - historical preservation via RESTRICT
-- ============================================================

-- ------------------------------------------------------------
-- 0. PRE-FLIGHT DATA INTEGRITY
-- Abort safely if existing live data is already inconsistent.
-- No rows are changed here.
-- ------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.tour_passenger_groups g
    join public.tour_departures d
      on d.id = g.departure_id
    where d.tour_id is distinct from g.tour_id
       or d.company_id is distinct from g.company_id
  ) then
    raise exception
      'TUR-003 hardening blocked: inconsistent passenger group departure scope exists.';
  end if;

  if exists (
    select 1
    from public.tour_passenger_groups g
    join public.tour_passengers p
      on p.id = g.contact_passenger_id
    where g.contact_passenger_id is not null
      and (
        p.company_id is distinct from g.company_id
        or p.tour_id is distinct from g.tour_id
        or p.departure_id is distinct from g.departure_id
      )
  ) then
    raise exception
      'TUR-003 hardening blocked: inconsistent group contact passenger exists.';
  end if;

  if exists (
    select 1
    from public.tour_passengers p
    join public.tour_passenger_groups g
      on g.id = p.travel_group_id
    where p.travel_group_id is not null
      and (
        p.company_id is distinct from g.company_id
        or p.tour_id is distinct from g.tour_id
        or p.departure_id is distinct from g.departure_id
      )
  ) then
    raise exception
      'TUR-003 hardening blocked: inconsistent passenger travel group exists.';
  end if;

  if exists (
    select 1
    from public.tour_departure_rooms r
    join public.tour_departures d
      on d.id = r.departure_id
    where d.tour_id is distinct from r.tour_id
       or d.company_id is distinct from r.company_id
  ) then
    raise exception
      'TUR-003 hardening blocked: inconsistent room departure scope exists.';
  end if;

  if exists (
    select 1
    from public.tour_passengers p
    join public.tour_departure_rooms r
      on r.id = p.tour_room_id
    where p.tour_room_id is not null
      and (
        p.company_id is distinct from r.company_id
        or p.tour_id is distinct from r.tour_id
        or p.departure_id is distinct from r.departure_id
      )
  ) then
    raise exception
      'TUR-003 hardening blocked: inconsistent passenger room assignment exists.';
  end if;

  if exists (
    select 1
    from public.tour_departure_rooms r
    where (
      select count(*)
      from public.tour_passengers p
      where p.tour_room_id = r.id
    ) > r.capacity
  ) then
    raise exception
      'TUR-003 hardening blocked: an existing room is already over capacity.';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 1. HISTORY PROTECTION
-- Replace CASCADE with RESTRICT for operational history.
-- ------------------------------------------------------------

alter table public.tour_passenger_groups
  drop constraint if exists tour_passenger_groups_tour_id_fkey;

alter table public.tour_passenger_groups
  add constraint tour_passenger_groups_tour_id_fkey
  foreign key (tour_id)
  references public.tours(id)
  on delete restrict;

alter table public.tour_passenger_groups
  drop constraint if exists tour_passenger_groups_departure_id_fkey;

alter table public.tour_passenger_groups
  add constraint tour_passenger_groups_departure_id_fkey
  foreign key (departure_id)
  references public.tour_departures(id)
  on delete restrict;

alter table public.tour_departure_rooms
  drop constraint if exists tour_departure_rooms_tour_id_fkey;

alter table public.tour_departure_rooms
  add constraint tour_departure_rooms_tour_id_fkey
  foreign key (tour_id)
  references public.tours(id)
  on delete restrict;

alter table public.tour_departure_rooms
  drop constraint if exists tour_departure_rooms_departure_id_fkey;

alter table public.tour_departure_rooms
  add constraint tour_departure_rooms_departure_id_fkey
  foreign key (departure_id)
  references public.tour_departures(id)
  on delete restrict;

-- ------------------------------------------------------------
-- 2. UPDATED_AT
-- ------------------------------------------------------------

create or replace function
  public.set_tour_passenger_group_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  trg_tour_passenger_group_updated_at
on public.tour_passenger_groups;

create trigger
  trg_tour_passenger_group_updated_at
before update
on public.tour_passenger_groups
for each row
execute function
  public.set_tour_passenger_group_updated_at();


create or replace function
  public.set_tour_departure_room_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists
  trg_tour_departure_room_updated_at
on public.tour_departure_rooms;

create trigger
  trg_tour_departure_room_updated_at
before update
on public.tour_departure_rooms
for each row
execute function
  public.set_tour_departure_room_updated_at();

-- ------------------------------------------------------------
-- 3. GROUP OWNERSHIP / SCOPE INTEGRITY
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_passenger_group_scope()
returns trigger
language plpgsql
as $$
declare
  v_departure public.tour_departures%rowtype;
  v_contact public.tour_passengers%rowtype;
begin
  select *
  into v_departure
  from public.tour_departures
  where id = new.departure_id;

  if not found then
    raise exception
      'Selected departure does not exist.';
  end if;

  if v_departure.company_id is distinct from new.company_id then
    raise exception
      'Passenger group and departure company must match.';
  end if;

  if v_departure.tour_id is distinct from new.tour_id then
    raise exception
      'Passenger group and departure tour must match.';
  end if;

  if new.contact_passenger_id is not null then
    select *
    into v_contact
    from public.tour_passengers
    where id = new.contact_passenger_id;

    if not found then
      raise exception
        'Selected contact passenger does not exist.';
    end if;

    if v_contact.company_id is distinct from new.company_id
       or v_contact.tour_id is distinct from new.tour_id
       or v_contact.departure_id is distinct from new.departure_id then
      raise exception
        'Contact passenger must belong to the same company, tour and departure.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_validate_tour_passenger_group_scope
on public.tour_passenger_groups;

create trigger
  trg_validate_tour_passenger_group_scope
before insert or update of
  company_id,
  tour_id,
  departure_id,
  contact_passenger_id
on public.tour_passenger_groups
for each row
execute function
  public.validate_tour_passenger_group_scope();

-- ------------------------------------------------------------
-- 4. PASSENGER -> TRAVEL GROUP INTEGRITY
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_passenger_travel_group_scope()
returns trigger
language plpgsql
as $$
declare
  v_group public.tour_passenger_groups%rowtype;
begin
  if new.travel_group_id is null then
    return new;
  end if;

  select *
  into v_group
  from public.tour_passenger_groups
  where id = new.travel_group_id;

  if not found then
    raise exception
      'Selected travel group does not exist.';
  end if;

  if v_group.company_id is distinct from new.company_id
     or v_group.tour_id is distinct from new.tour_id
     or v_group.departure_id is distinct from new.departure_id then
    raise exception
      'Passenger and travel group must belong to the same company, tour and departure.';
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_validate_tour_passenger_travel_group_scope
on public.tour_passengers;

create trigger
  trg_validate_tour_passenger_travel_group_scope
before insert or update of
  travel_group_id,
  company_id,
  tour_id,
  departure_id
on public.tour_passengers
for each row
execute function
  public.validate_tour_passenger_travel_group_scope();

-- ------------------------------------------------------------
-- 5. ROOM OWNERSHIP / SCOPE + CAPACITY REDUCTION GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_departure_room_scope_capacity()
returns trigger
language plpgsql
as $$
declare
  v_departure public.tour_departures%rowtype;
  v_occupied integer;
begin
  select *
  into v_departure
  from public.tour_departures
  where id = new.departure_id;

  if not found then
    raise exception
      'Selected departure does not exist.';
  end if;

  if v_departure.company_id is distinct from new.company_id then
    raise exception
      'Room and departure company must match.';
  end if;

  if v_departure.tour_id is distinct from new.tour_id then
    raise exception
      'Room and departure tour must match.';
  end if;

  if tg_op = 'UPDATE'
     and new.capacity is distinct from old.capacity then

    select count(*)
    into v_occupied
    from public.tour_passengers
    where tour_room_id = old.id;

    if new.capacity < v_occupied then
      raise exception
        'Room capacity cannot be lower than current occupancy. Occupied: %, requested capacity: %',
        v_occupied,
        new.capacity;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_validate_tour_departure_room_scope_capacity
on public.tour_departure_rooms;

create trigger
  trg_validate_tour_departure_room_scope_capacity
before insert or update of
  company_id,
  tour_id,
  departure_id,
  capacity
on public.tour_departure_rooms
for each row
execute function
  public.validate_tour_departure_room_scope_capacity();

-- ------------------------------------------------------------
-- 6. PASSENGER -> ROOM CONCURRENCY SAFE ASSIGNMENT
--
-- Lock target room row before counting occupancy.
-- This closes the simultaneous-assignment race.
-- Existing earlier validator may remain; this trigger is the
-- serialization authority for future assignments.
-- ------------------------------------------------------------

create or replace function
  public.harden_tour_passenger_room_assignment()
returns trigger
language plpgsql
as $$
declare
  v_room public.tour_departure_rooms%rowtype;
  v_occupied integer;
begin
  if new.tour_room_id is null then
    return new;
  end if;

  select *
  into v_room
  from public.tour_departure_rooms
  where id = new.tour_room_id
  for update;

  if not found then
    raise exception
      'Selected room does not exist.';
  end if;

  if v_room.company_id is distinct from new.company_id then
    raise exception
      'Passenger and room company must match.';
  end if;

  if v_room.tour_id is distinct from new.tour_id then
    raise exception
      'Passenger and room tour must match.';
  end if;

  if v_room.departure_id is distinct from new.departure_id then
    raise exception
      'Passenger and room departure must match.';
  end if;

  select count(*)
  into v_occupied
  from public.tour_passengers p
  where p.tour_room_id = new.tour_room_id
    and p.id is distinct from new.id;

  if v_occupied >= v_room.capacity then
    raise exception
      'Room capacity exceeded. Capacity: %',
      v_room.capacity;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_harden_tour_passenger_room_assignment
on public.tour_passengers;

create trigger
  trg_harden_tour_passenger_room_assignment
before insert or update of
  tour_room_id,
  company_id,
  tour_id,
  departure_id
on public.tour_passengers
for each row
execute function
  public.harden_tour_passenger_room_assignment();

-- ------------------------------------------------------------
-- 7. RLS
-- Same active-company membership model used elsewhere in Tour OS.
-- ------------------------------------------------------------

alter table
  public.tour_passenger_groups
enable row level security;

drop policy if exists
  tour_passenger_groups_company_member
on public.tour_passenger_groups;

create policy
  tour_passenger_groups_company_member
on public.tour_passenger_groups
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


alter table
  public.tour_departure_rooms
enable row level security;

drop policy if exists
  tour_departure_rooms_company_member
on public.tour_departure_rooms;

create policy
  tour_departure_rooms_company_member
on public.tour_departure_rooms
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

comment on table public.tour_passenger_groups is
  'Tour OS departure-scoped passenger travel groups with hardened company/tour/departure integrity and RLS.';

comment on table public.tour_departure_rooms is
  'Tour OS departure-scoped room inventory with hardened scope, capacity concurrency protection and RLS.';
