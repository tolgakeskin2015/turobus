create table if not exists public.ticket_provider_offer_cache (
  id uuid primary key default gen_random_uuid(),

  provider_id text not null,
  provider_offer_id text not null,
  mode text not null,

  search_fingerprint text not null,
  search_payload jsonb not null,

  raw_offer jsonb not null,

  expires_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  ticket_provider_offer_cache_provider_idx
on public.ticket_provider_offer_cache (
  provider_id,
  created_at desc
);

create index if not exists
  ticket_provider_offer_cache_expiry_idx
on public.ticket_provider_offer_cache (
  expires_at
);

create index if not exists
  ticket_provider_offer_cache_fingerprint_idx
on public.ticket_provider_offer_cache (
  search_fingerprint
);

alter table
  public.ticket_provider_offer_cache
enable row level security;

revoke all
on table
  public.ticket_provider_offer_cache
from anon, authenticated;
