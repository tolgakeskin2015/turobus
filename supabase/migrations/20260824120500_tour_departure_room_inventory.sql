-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-003C — Real Departure Room Inventory
--
-- Rules:
-- - Room inventory belongs to one real tour departure.
-- - Passenger can reference at most one real room.
-- - Room capacity cannot be exceeded.
-- - Passenger and room must belong to same company/tour/departure.
-- - Existing legacy room fields remain intact.
-- - No backfill, no fake data.
-- ============================================================

create table if not exists public.tour_departure_rooms (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  tour_id uuid not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid not null
    references public.tour_departures(id)
    on delete cascade,

  hotel_name text not null,
  room_no text not null,
  room_type text,

  capacity integer not null default 2
    check (capacity > 0),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tour_departure_rooms_hotel_name_not_blank
    check (btrim(hotel_name) <> ''),

  constraint tour_departure_rooms_room_no_not_blank
    check (btrim(room_no) <> '')
);

create index if not exists
  tour_departure_rooms_company_departure_idx
on public.tour_departure_rooms (
  company_id,
  departure_id
);

create index if not exists
  tour_departure_rooms_tour_departure_idx
on public.tour_departure_rooms (
  tour_id,
  departure_id
);

create unique index if not exists
  tour_departure_rooms_departure_hotel_room_uidx
on public.tour_departure_rooms (
  departure_id,
  lower(btrim(hotel_name)),
  lower(btrim(room_no))
);

alter table public.tour_passengers
  add column if not exists tour_room_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tour_passengers_tour_room_id_fkey'
  ) then
    alter table public.tour_passengers
      add constraint
        tour_passengers_tour_room_id_fkey
      foreign key (tour_room_id)
      references public.tour_departure_rooms(id)
      on delete set null;
  end if;
end
$$;

create index if not exists
  tour_passengers_tour_room_idx
on public.tour_passengers (
  tour_room_id
);

-- ------------------------------------------------------------
-- Scope + capacity protection
-- ------------------------------------------------------------

create or replace function public.validate_tour_passenger_room_assignment()
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
  where id = new.tour_room_id;

  if not found then
    raise exception
      'Selected tour room does not exist.';
  end if;

  if v_room.company_id <> new.company_id then
    raise exception
      'Passenger and room company must match.';
  end if;

  if v_room.tour_id <> new.tour_id then
    raise exception
      'Passenger and room tour must match.';
  end if;

  if v_room.departure_id <> new.departure_id then
    raise exception
      'Passenger and room departure must match.';
  end if;

  select count(*)
  into v_occupied
  from public.tour_passengers p
  where p.tour_room_id = new.tour_room_id
    and p.id <> new.id;

  if v_occupied >= v_room.capacity then
    raise exception
      'Room capacity exceeded. Capacity: %',
      v_room.capacity;
  end if;

  return new;
end;
$$;

drop trigger if exists
  trg_validate_tour_passenger_room_assignment
on public.tour_passengers;

create trigger
  trg_validate_tour_passenger_room_assignment
before insert or update of
  tour_room_id,
  company_id,
  tour_id,
  departure_id
on public.tour_passengers
for each row
execute function
  public.validate_tour_passenger_room_assignment();

comment on table public.tour_departure_rooms is
  'Real room inventory for one Tour OS departure.';

comment on column public.tour_passengers.tour_room_id is
  'Optional canonical Tour OS room assignment. Legacy room fields remain available for compatibility.';
