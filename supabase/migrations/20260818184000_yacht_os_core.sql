
-- ============================================================
-- TUROBUS YACHT OS
-- Company scoped operational core
-- ============================================================

create table if not exists public.yacht_os_yachts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,
  yacht_type text not null default 'motor_yacht',

  city text not null,
  marina text,
  departure_point text,

  length_m numeric(8,2),
  cabins integer not null default 0
    check (cabins >= 0),

  bathrooms integer not null default 0
    check (bathrooms >= 0),

  max_guests integer not null default 1
    check (max_guests > 0),

  crew_count integer not null default 0
    check (crew_count >= 0),

  captain_name text,
  captain_phone text,

  captain_included boolean not null default true,
  fuel_included boolean not null default false,
  meals_included boolean not null default false,

  base_daily_price numeric(14,2) not null default 0
    check (base_daily_price >= 0),

  currency text not null default 'TRY',

  minimum_days integer not null default 1
    check (minimum_days > 0),

  status text not null default 'available'
    check (
      status in (
        'available',
        'trip',
        'maintenance',
        'passive'
      )
    ),

  cover_url text,

  verified boolean not null default false,
  featured boolean not null default false,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  yacht_os_yachts_company_idx
on public.yacht_os_yachts (
  company_id,
  status
);


create table if not exists public.yacht_os_bookings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete restrict,

  booking_code text not null,

  guest_name text not null,
  guest_phone text,
  guest_email text,

  guest_count integer not null default 1
    check (guest_count > 0),

  start_date date not null,
  end_date date not null,

  departure_time time,
  return_time time,

  source text not null default 'Turobus',

  total_amount numeric(14,2) not null default 0
    check (total_amount >= 0),

  paid_amount numeric(14,2) not null default 0
    check (paid_amount >= 0),

  commission_amount numeric(14,2) not null default 0
    check (commission_amount >= 0),

  supplier_cost numeric(14,2) not null default 0
    check (supplier_cost >= 0),

  currency text not null default 'TRY',

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'completed',
        'cancelled'
      )
    ),

  payment_status text not null default 'pending'
    check (
      payment_status in (
        'pending',
        'partial',
        'paid',
        'refunded'
      )
    ),

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint yacht_os_booking_dates_check
    check (end_date >= start_date),

  constraint yacht_os_booking_company_code_unique
    unique (
      company_id,
      booking_code
    )
);


create index if not exists
  yacht_os_bookings_company_idx
on public.yacht_os_bookings (
  company_id,
  start_date,
  status
);

create index if not exists
  yacht_os_bookings_yacht_idx
on public.yacht_os_bookings (
  yacht_id,
  start_date,
  end_date
);


create table if not exists public.yacht_os_availability (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  day date not null,

  status text not null default 'available'
    check (
      status in (
        'available',
        'booked',
        'option',
        'maintenance',
        'blocked'
      )
    ),

  booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  price numeric(14,2)
    check (
      price is null
      or price >= 0
    ),

  note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    yacht_id,
    day
  )
);


create index if not exists
  yacht_os_availability_company_day_idx
on public.yacht_os_availability (
  company_id,
  day
);


create table if not exists public.yacht_os_tasks (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid
    references public.yacht_os_yachts(id)
    on delete cascade,

  booking_id uuid
    references public.yacht_os_bookings(id)
    on delete cascade,

  title text not null,
  description text,

  due_at timestamptz,

  assigned_to_name text,

  priority text not null default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  status text not null default 'open'
    check (
      status in (
        'open',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  completed_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  yacht_os_tasks_company_idx
on public.yacht_os_tasks (
  company_id,
  status,
  due_at
);


create table if not exists public.yacht_os_suppliers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,

  category text not null default 'yacht_owner',

  contact_name text,
  phone text,
  email text,

  commission_rate numeric(7,2) not null default 0
    check (
      commission_rate >= 0
      and commission_rate <= 100
    ),

  current_balance numeric(14,2) not null default 0,

  rating numeric(4,2)
    check (
      rating is null
      or (
        rating >= 0
        and rating <= 5
      )
    ),

  status text not null default 'active'
    check (
      status in (
        'active',
        'pending',
        'passive'
      )
    ),

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  yacht_os_suppliers_company_idx
on public.yacht_os_suppliers (
  company_id,
  status
);


create table if not exists public.yacht_os_supplier_yachts (
  supplier_id uuid not null
    references public.yacht_os_suppliers(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key (
    supplier_id,
    yacht_id
  )
);


create table if not exists public.yacht_os_finance_entries (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  supplier_id uuid
    references public.yacht_os_suppliers(id)
    on delete set null,

  entry_type text not null
    check (
      entry_type in (
        'sale',
        'payment',
        'commission',
        'supplier_payable',
        'refund',
        'expense'
      )
    ),

  amount numeric(14,2) not null
    check (amount >= 0),

  currency text not null default 'TRY',

  due_date date,
  paid_at timestamptz,

  description text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index if not exists
  yacht_os_finance_company_idx
on public.yacht_os_finance_entries (
  company_id,
  entry_type,
  created_at desc
);


-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function
public.yacht_os_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
  yacht_os_yachts_updated_at
on public.yacht_os_yachts;

create trigger
  yacht_os_yachts_updated_at
before update
on public.yacht_os_yachts
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_bookings_updated_at
on public.yacht_os_bookings;

create trigger
  yacht_os_bookings_updated_at
before update
on public.yacht_os_bookings
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_availability_updated_at
on public.yacht_os_availability;

create trigger
  yacht_os_availability_updated_at
before update
on public.yacht_os_availability
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_tasks_updated_at
on public.yacht_os_tasks;

create trigger
  yacht_os_tasks_updated_at
before update
on public.yacht_os_tasks
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_suppliers_updated_at
on public.yacht_os_suppliers;

create trigger
  yacht_os_suppliers_updated_at
before update
on public.yacht_os_suppliers
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_yachts
enable row level security;

alter table public.yacht_os_bookings
enable row level security;

alter table public.yacht_os_availability
enable row level security;

alter table public.yacht_os_tasks
enable row level security;

alter table public.yacht_os_suppliers
enable row level security;

alter table public.yacht_os_supplier_yachts
enable row level security;

alter table public.yacht_os_finance_entries
enable row level security;


-- Shared company membership helper

create or replace function
public.is_active_company_member(
  target_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where
      cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;


grant execute
on function
  public.is_active_company_member(uuid)
to authenticated;


create policy yacht_os_yachts_company_access
on public.yacht_os_yachts
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


create policy yacht_os_bookings_company_access
on public.yacht_os_bookings
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


create policy yacht_os_availability_company_access
on public.yacht_os_availability
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


create policy yacht_os_tasks_company_access
on public.yacht_os_tasks
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


create policy yacht_os_suppliers_company_access
on public.yacht_os_suppliers
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


create policy yacht_os_supplier_yachts_company_access
on public.yacht_os_supplier_yachts
for all
to authenticated
using (
  exists (
    select 1
    from public.yacht_os_suppliers s
    where
      s.id = supplier_id
      and public.is_active_company_member(
        s.company_id
      )
  )
)
with check (
  exists (
    select 1
    from public.yacht_os_suppliers s
    where
      s.id = supplier_id
      and public.is_active_company_member(
        s.company_id
      )
  )
);


create policy yacht_os_finance_company_access
on public.yacht_os_finance_entries
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
  public.yacht_os_yachts,
  public.yacht_os_bookings,
  public.yacht_os_availability,
  public.yacht_os_tasks,
  public.yacht_os_suppliers,
  public.yacht_os_supplier_yachts,
  public.yacht_os_finance_entries
to authenticated;
