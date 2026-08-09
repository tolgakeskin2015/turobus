create table if not exists public.hotel_channel_reservation_inbox (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  connection_id uuid not null
    references public.hotel_channel_connections(id)
    on delete cascade,

  channel_code text not null,

  external_event_id text,
  external_reservation_id text not null,

  event_type text not null
    check (
      event_type in (
        'reservation_create',
        'reservation_update',
        'reservation_cancel'
      )
    ),

  external_room_id text,
  external_rate_plan_id text,

  room_type_id uuid
    references public.hotel_room_types(id)
    on delete set null,

  rate_plan_id uuid,

  check_in date,
  check_out date,

  guest_first_name text,
  guest_last_name text,
  guest_email text,
  guest_phone text,

  adults integer not null default 1,
  children integer not null default 0,

  total_amount numeric(14,2) not null default 0,
  currency text not null default 'TRY',

  reservation_status text,

  event_fingerprint text not null,

  processing_status text not null default 'received'
    check (
      processing_status in (
        'received',
        'mapping_required',
        'ready',
        'processing',
        'completed',
        'ignored',
        'failed'
      )
    ),

  local_reservation_id uuid,

  raw_payload jsonb not null default '{}'::jsonb,

  error_message text,

  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    connection_id,
    event_fingerprint
  )
);

create index if not exists
hotel_channel_reservation_inbox_company_idx
on public.hotel_channel_reservation_inbox (
  company_id,
  created_at desc
);

create index if not exists
hotel_channel_reservation_inbox_status_idx
on public.hotel_channel_reservation_inbox (
  processing_status,
  created_at
);

create index if not exists
hotel_channel_reservation_inbox_external_idx
on public.hotel_channel_reservation_inbox (
  connection_id,
  external_reservation_id
);

alter table
public.hotel_channel_reservation_inbox
enable row level security;

drop policy if exists
"Members read reservation inbox"
on public.hotel_channel_reservation_inbox;

create policy
"Members read reservation inbox"
on public.hotel_channel_reservation_inbox
for select
to authenticated
using (
  public.is_company_member(company_id)
);
