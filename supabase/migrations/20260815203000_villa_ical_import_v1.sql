begin;

create table if not exists public.villa_channel_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  connection_id uuid not null references public.villa_channel_connections(id) on delete cascade,
  external_uid text not null,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  starts_on date not null,
  ends_on date not null,
  summary text,
  status text not null default 'active',
  last_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(connection_id, external_uid),
  constraint villa_channel_event_status_check check (status in ('active','cancelled','removed')),
  constraint villa_channel_event_dates_check check (ends_on > starts_on)
);

alter table public.villa_channel_events enable row level security;

drop policy if exists villa_channel_events_company_access on public.villa_channel_events;
create policy villa_channel_events_company_access
on public.villa_channel_events
for all
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create index if not exists villa_channel_events_villa_dates_idx
on public.villa_channel_events(villa_id, starts_on, ends_on);

create index if not exists villa_channel_events_connection_status_idx
on public.villa_channel_events(connection_id, status);

commit;
