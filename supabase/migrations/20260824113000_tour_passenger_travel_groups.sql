-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-003A — Passenger Travel Group / Family Core
--
-- Purpose:
-- - Give real tour passengers an operational family/group relation.
-- - Keep existing room_group / room_no / room_type fields intact.
-- - Scope every group to one real tour departure.
-- - No backfill and no fake data.
-- ============================================================

create table if not exists public.tour_passenger_groups (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  tour_id uuid not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid not null
    references public.tour_departures(id)
    on delete cascade,

  group_code text,
  group_name text not null,

  group_type text not null default 'travel_group'
    check (
      group_type in (
        'family',
        'couple',
        'friends',
        'corporate',
        'travel_group',
        'other'
      )
    ),

  contact_passenger_id uuid
    references public.tour_passengers(id)
    on delete set null,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  tour_passenger_groups_company_departure_idx
on public.tour_passenger_groups (
  company_id,
  departure_id
);

create index if not exists
  tour_passenger_groups_tour_departure_idx
on public.tour_passenger_groups (
  tour_id,
  departure_id
);

create unique index if not exists
  tour_passenger_groups_departure_code_uidx
on public.tour_passenger_groups (
  departure_id,
  lower(group_code)
)
where group_code is not null;

alter table public.tour_passengers
  add column if not exists travel_group_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tour_passengers_travel_group_id_fkey'
  ) then
    alter table public.tour_passengers
      add constraint
        tour_passengers_travel_group_id_fkey
      foreign key (travel_group_id)
      references public.tour_passenger_groups(id)
      on delete set null;
  end if;
end
$$;

create index if not exists
  tour_passengers_travel_group_idx
on public.tour_passengers (
  travel_group_id
);

comment on table public.tour_passenger_groups is
  'Operational family/travel groups for real passengers within one tour departure.';

comment on column public.tour_passengers.travel_group_id is
  'Optional operational family/travel group relation. Existing rooming fields remain unchanged.';
