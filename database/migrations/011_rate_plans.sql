create table if not exists public.hotel_rate_plans (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid
    references public.hotel_room_types(id)
    on delete cascade,

  name text not null,
  rate_code text,

  meal_plan text default 'RO',

  currency text default 'TRY',

  is_refundable boolean default true,
  is_active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(company_id, hotel_id, name)
);

create index if not exists hotel_rate_plans_company_idx
on public.hotel_rate_plans(company_id);

alter table public.hotel_rate_plans
enable row level security;

create policy "Members manage hotel rate plans"
on public.hotel_rate_plans
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
