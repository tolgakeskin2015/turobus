-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 4 — PASSENGER / ROOMING / MANIFEST
--
-- Existing reservations, departures, manifest and bus
-- operations are preserved.
--
-- IMPORTANT:
-- Reservation guests are NOT fabricated as passengers.
-- Only the real booking holder is auto-synced.
-- Additional passengers require real data entry.
-- ============================================================


create table if not exists
public.tour_passengers (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    not null
    references public.tour_departures(id)
    on delete cascade,

  reservation_id uuid
    references public.reservations(id)
    on delete cascade,

  passenger_no integer
    not null
    default 1
    check (
      passenger_no > 0
    ),

  is_primary boolean
    not null
    default false,

  full_name text
    not null,

  phone text,

  email text,

  birth_date date,

  nationality text,

  identity_type text
    check (
      identity_type is null
      or identity_type in (
        'tc',
        'passport',
        'other'
      )
    ),

  identity_number text,

  gender text,

  room_group text,

  room_no text,

  room_type text,

  hotel_name text,

  special_request text,

  notes text,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    reservation_id,
    passenger_no
  )
);


create index if not exists
  tour_passengers_company_departure_idx
on public.tour_passengers (
  company_id,
  departure_id
);


create index if not exists
  tour_passengers_company_tour_idx
on public.tour_passengers (
  company_id,
  tour_id
);


create index if not exists
  tour_passengers_reservation_idx
on public.tour_passengers (
  reservation_id
);


alter table
  public.tour_passengers
enable row level security;


drop policy if exists
  tour_passengers_select_company
on public.tour_passengers;

create policy
  tour_passengers_select_company
on public.tour_passengers
for select
to authenticated
using (
  public.is_company_member(
    company_id
  )
);


drop policy if exists
  tour_passengers_insert_company
on public.tour_passengers;

create policy
  tour_passengers_insert_company
on public.tour_passengers
for insert
to authenticated
with check (
  public.is_company_member(
    company_id
  )
);


drop policy if exists
  tour_passengers_update_company
on public.tour_passengers;

create policy
  tour_passengers_update_company
on public.tour_passengers
for update
to authenticated
using (
  public.is_company_member(
    company_id
  )
)
with check (
  public.is_company_member(
    company_id
  )
);


drop policy if exists
  tour_passengers_delete_company
on public.tour_passengers;

create policy
  tour_passengers_delete_company
on public.tour_passengers
for delete
to authenticated
using (
  public.is_company_member(
    company_id
  )
);


-- ------------------------------------------------------------
-- CONNECT PASSENGER TO EXISTING BUS SEAT SYSTEM
-- ------------------------------------------------------------

alter table
  public.tour_bus_seats
add column if not exists
  passenger_id uuid
  references public.tour_passengers(id)
  on delete set null;


create unique index if not exists
  tour_bus_seats_passenger_unique_idx
on public.tour_bus_seats (
  passenger_id
)
where passenger_id is not null;


-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function
public.touch_tour_passengers_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at = now();

  new.updated_by =
    coalesce(
      auth.uid(),
      new.updated_by
    );

  return new;

end;
$$;


drop trigger if exists
  trg_touch_tour_passengers
on public.tour_passengers;


create trigger
  trg_touch_tour_passengers
before update
on public.tour_passengers
for each row
execute function
public.touch_tour_passengers_updated_at();


revoke all on function
public.touch_tour_passengers_updated_at()
from public;


-- ------------------------------------------------------------
-- REAL RESERVATION -> PRIMARY PASSENGER SYNC
-- ------------------------------------------------------------

create or replace function
public.sync_tour_passengers_from_reservations(
  p_company_id uuid,
  p_departure_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare

  v_count integer := 0;

begin

  if not public.is_company_member(
    p_company_id
  ) then

    raise exception
      'Company membership required';

  end if;


  if not exists (
    select 1
    from public.tour_departures d
    where d.id =
      p_departure_id
  ) then

    raise exception
      'Tour departure not found';

  end if;


  insert into public.tour_passengers (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    passenger_no,
    is_primary,
    full_name,
    phone,
    email,
    created_by,
    updated_by,
    created_at,
    updated_at
  )

  select
    r.company_id,
    d.tour_id,
    r.departure_id,
    r.id,
    1,
    true,
    r.full_name,
    nullif(
      r.phone,
      ''
    ),
    nullif(
      r.email,
      ''
    ),
    auth.uid(),
    auth.uid(),
    now(),
    now()

  from public.reservations r

  join public.tour_departures d
    on d.id =
      r.departure_id

  where r.company_id =
      p_company_id

    and r.departure_id =
      p_departure_id

    and r.status <>
      'cancelled'

  on conflict (
    reservation_id,
    passenger_no
  )
  do update
  set
    full_name =
      excluded.full_name,

    phone =
      excluded.phone,

    email =
      excluded.email,

    departure_id =
      excluded.departure_id,

    tour_id =
      excluded.tour_id,

    is_primary =
      true,

    updated_by =
      auth.uid(),

    updated_at =
      now();


  get diagnostics
    v_count =
      row_count;


  perform
    public.sync_tour_departure_manifest(
      p_company_id,
      p_departure_id
    );


  return v_count;

end;
$$;


revoke all on function
public.sync_tour_passengers_from_reservations(
  uuid,
  uuid
)
from public;


grant execute on function
public.sync_tour_passengers_from_reservations(
  uuid,
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- DATA PROTECTION
-- ------------------------------------------------------------

revoke all
on public.tour_passengers
from anon;

grant
  select,
  insert,
  update,
  delete
on public.tour_passengers
to authenticated;
