begin;

create table if not exists public.ticket_provider_events (
  id uuid primary key default gen_random_uuid(),

  provider_id text not null,

  mode text null,

  operation text not null,

  status text not null
    check (
      status in (
        'success',
        'error',
        'timeout',
        'fallback'
      )
    ),

  latency_ms integer null,

  error_message text null,

  failover_from text null,

  failover_to text null,

  created_at timestamptz not null default now()
);

create index if not exists
  idx_ticket_provider_events_provider_created
on public.ticket_provider_events (
  provider_id,
  created_at desc
);

create index if not exists
  idx_ticket_provider_events_status_created
on public.ticket_provider_events (
  status,
  created_at desc
);

create index if not exists
  idx_ticket_provider_events_operation_created
on public.ticket_provider_events (
  operation,
  created_at desc
);

alter table public.ticket_provider_events
  enable row level security;

revoke all
on public.ticket_provider_events
from anon, authenticated;

commit;
