
-- ============================================================
-- YACHT OS PARTNER CONTROL CENTER
-- ============================================================

create table if not exists public.yacht_os_settlements (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  supplier_id uuid not null
    references public.yacht_os_suppliers(id)
    on delete restrict,

  settlement_code text not null,

  period_start date not null,
  period_end date not null,

  gross_sales numeric(14,2) not null default 0
    check (gross_sales >= 0),

  supplier_payable numeric(14,2) not null default 0
    check (supplier_payable >= 0),

  platform_commission numeric(14,2) not null default 0
    check (platform_commission >= 0),

  adjustments numeric(14,2) not null default 0,

  paid_amount numeric(14,2) not null default 0
    check (paid_amount >= 0),

  currency text not null default 'TRY',

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'waiting_approval',
        'approved',
        'partially_paid',
        'paid',
        'cancelled'
      )
    ),

  due_date date,
  approved_at timestamptz,
  paid_at timestamptz,

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint yacht_os_settlement_dates
    check (
      period_end >= period_start
    ),

  unique (
    company_id,
    settlement_code
  )
);


create index if not exists
  yacht_os_settlements_company_supplier_idx
on public.yacht_os_settlements (
  company_id,
  supplier_id,
  status
);


create table if not exists public.yacht_os_settlement_bookings (
  settlement_id uuid not null
    references public.yacht_os_settlements(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete restrict,

  supplier_payable numeric(14,2) not null default 0,
  platform_commission numeric(14,2) not null default 0,

  created_at timestamptz not null default now(),

  primary key (
    settlement_id,
    booking_id
  )
);


create table if not exists public.yacht_os_supplier_payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  supplier_id uuid not null
    references public.yacht_os_suppliers(id)
    on delete restrict,

  settlement_id uuid
    references public.yacht_os_settlements(id)
    on delete set null,

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null default 'TRY',

  payment_method text not null default 'bank_transfer',

  reference_no text,
  note text,

  paid_at timestamptz not null default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index if not exists
  yacht_os_supplier_payments_company_idx
on public.yacht_os_supplier_payments (
  company_id,
  supplier_id,
  paid_at desc
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_settlements_updated_at
on public.yacht_os_settlements;

create trigger
  yacht_os_settlements_updated_at
before update
on public.yacht_os_settlements
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_settlements
enable row level security;

alter table public.yacht_os_settlement_bookings
enable row level security;

alter table public.yacht_os_supplier_payments
enable row level security;


create policy yacht_os_settlements_company_access
on public.yacht_os_settlements
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


create policy yacht_os_settlement_bookings_company_access
on public.yacht_os_settlement_bookings
for all
to authenticated
using (
  exists (
    select 1
    from public.yacht_os_settlements s
    where
      s.id = settlement_id
      and public.is_active_company_member(
        s.company_id
      )
  )
)
with check (
  exists (
    select 1
    from public.yacht_os_settlements s
    where
      s.id = settlement_id
      and public.is_active_company_member(
        s.company_id
      )
  )
);


create policy yacht_os_supplier_payments_company_access
on public.yacht_os_supplier_payments
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


grant select, insert, update, delete
on
  public.yacht_os_settlements,
  public.yacht_os_settlement_bookings,
  public.yacht_os_supplier_payments
to authenticated;
