begin;

create extension if not exists pgcrypto;

-- =========================================================
-- PACKAGE OS
-- Holiday / Honeymoon Dynamic Packaging Core
-- =========================================================

create table if not exists public.package_catalog_hotels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,

  existing_hotel_id uuid,
  supplier_id uuid,

  name text not null,
  city text,
  district text,
  address text,

  star_rating numeric(2,1),

  description text,
  cover_image_url text,
  video_url text,

  check_in_time time,
  check_out_time time,

  currency text not null default 'TRY',

  is_active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_catalog_hotels_company
  on public.package_catalog_hotels(company_id);

create index if not exists idx_package_catalog_hotels_supplier
  on public.package_catalog_hotels(company_id, supplier_id);

create index if not exists idx_package_catalog_hotels_location
  on public.package_catalog_hotels(company_id, city, district);


create table if not exists public.package_hotel_rates (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  package_hotel_id uuid not null
    references public.package_catalog_hotels(id)
    on delete cascade,

  room_type_name text not null,

  board_type text not null
    check (
      board_type in (
        'room_only',
        'breakfast',
        'half_board',
        'full_board',
        'all_inclusive',
        'ultra_all_inclusive',
        'other'
      )
    ),

  valid_from date not null,
  valid_to date not null,

  occupancy_adults integer not null default 2
    check (occupancy_adults >= 1),

  occupancy_children integer not null default 0
    check (occupancy_children >= 0),

  nightly_cost numeric(14,2) not null default 0
    check (nightly_cost >= 0),

  nightly_sale_price numeric(14,2),

  currency text not null default 'TRY',

  allotment integer,
  minimum_stay integer not null default 1,

  stop_sale boolean not null default false,

  is_active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (valid_to >= valid_from)
);

create index if not exists idx_package_hotel_rates_lookup
  on public.package_hotel_rates(
    company_id,
    package_hotel_id,
    valid_from,
    valid_to
  );


create table if not exists public.package_activities (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  supplier_id uuid,

  name text not null,
  category text not null default 'activity',

  city text,
  district text,

  description text,

  cover_image_url text,
  video_url text,

  pricing_unit text not null default 'per_person'
    check (
      pricing_unit in (
        'per_person',
        'per_couple',
        'per_vehicle',
        'per_group',
        'fixed'
      )
    ),

  default_cost numeric(14,2) not null default 0
    check (default_cost >= 0),

  default_sale_price numeric(14,2),

  currency text not null default 'TRY',

  duration_minutes integer,

  requires_slot boolean not null default false,

  is_active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_activities_company
  on public.package_activities(company_id);

create index if not exists idx_package_activities_supplier
  on public.package_activities(company_id, supplier_id);


create table if not exists public.package_activity_slots (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  activity_id uuid not null
    references public.package_activities(id)
    on delete cascade,

  supplier_id uuid,

  slot_date date not null,
  start_time time,

  capacity integer not null default 0
    check (capacity >= 0),

  reserved_count integer not null default 0
    check (reserved_count >= 0),

  cost numeric(14,2),
  sale_price numeric(14,2),

  currency text not null default 'TRY',

  status text not null default 'open'
    check (
      status in (
        'open',
        'closed',
        'full',
        'cancelled'
      )
    ),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (reserved_count <= capacity)
);

create index if not exists idx_package_activity_slots_lookup
  on public.package_activity_slots(
    company_id,
    activity_id,
    slot_date,
    start_time
  );


create table if not exists public.package_templates (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  name text not null,

  package_type text not null default 'holiday'
    check (
      package_type in (
        'holiday',
        'honeymoon',
        'family',
        'adventure',
        'custom'
      )
    ),

  destination text,

  nights integer not null default 1
    check (nights >= 1),

  days integer not null default 2
    check (days >= 1),

  default_adults integer not null default 2,
  default_children integer not null default 0,

  pricing_mode text not null default 'markup_percent'
    check (
      pricing_mode in (
        'markup_percent',
        'fixed_profit',
        'target_price'
      )
    ),

  pricing_value numeric(14,2) not null default 0,

  is_active boolean not null default true,

  description text,

  cover_image_url text,
  video_url text,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_templates_company
  on public.package_templates(company_id, package_type);


create table if not exists public.package_template_items (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  template_id uuid not null
    references public.package_templates(id)
    on delete cascade,

  item_type text not null
    check (
      item_type in (
        'hotel',
        'activity',
        'transfer',
        'spa',
        'meal',
        'photo',
        'guide',
        'insurance',
        'gift',
        'other'
      )
    ),

  reference_id uuid,

  name text not null,

  quantity numeric(10,2) not null default 1,

  is_optional boolean not null default false,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_package_template_items_template
  on public.package_template_items(template_id, sort_order);


create table if not exists public.package_quotes (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  quote_code text not null,

  customer_id uuid,

  customer_name text not null,
  customer_phone text,
  customer_email text,

  sales_user_id uuid,

  package_type text not null default 'holiday'
    check (
      package_type in (
        'holiday',
        'honeymoon',
        'family',
        'adventure',
        'custom'
      )
    ),

  destination text,

  check_in date not null,
  check_out date not null,

  adults integer not null default 2
    check (adults >= 1),

  children integer not null default 0
    check (children >= 0),

  nights integer not null
    check (nights >= 1),

  currency text not null default 'TRY',

  total_cost numeric(14,2) not null default 0,

  gross_profit numeric(14,2) not null default 0,

  sale_price numeric(14,2) not null default 0,

  margin_percent numeric(8,4) not null default 0,

  pricing_mode text not null default 'target_price'
    check (
      pricing_mode in (
        'markup_percent',
        'fixed_profit',
        'target_price'
      )
    ),

  pricing_value numeric(14,2) not null default 0,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'sent',
        'viewed',
        'accepted',
        'rejected',
        'expired',
        'converted',
        'cancelled'
      )
    ),

  valid_until timestamptz,

  public_token uuid not null default gen_random_uuid(),

  notes text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, quote_code),
  unique(public_token),

  check (check_out > check_in)
);

create index if not exists idx_package_quotes_company_status
  on public.package_quotes(company_id, status);

create index if not exists idx_package_quotes_sales
  on public.package_quotes(company_id, sales_user_id);

create index if not exists idx_package_quotes_customer
  on public.package_quotes(company_id, customer_id);


create table if not exists public.package_quote_items (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  quote_id uuid not null
    references public.package_quotes(id)
    on delete cascade,

  item_type text not null,

  reference_id uuid,
  supplier_id uuid,

  name text not null,

  service_date date,

  quantity numeric(10,2) not null default 1,

  unit_cost numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,

  unit_sale_price numeric(14,2) not null default 0,
  total_sale_price numeric(14,2) not null default 0,

  currency text not null default 'TRY',

  cost_snapshot jsonb not null default '{}'::jsonb,

  description text,

  sort_order integer not null default 0,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_package_quote_items_quote
  on public.package_quote_items(quote_id, sort_order);

create index if not exists idx_package_quote_items_supplier
  on public.package_quote_items(company_id, supplier_id);


create table if not exists public.package_bookings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_code text not null,

  quote_id uuid
    references public.package_quotes(id)
    on delete set null,

  customer_id uuid,

  customer_name text not null,
  customer_phone text,
  customer_email text,

  sales_user_id uuid,

  package_type text not null,

  destination text,

  check_in date not null,
  check_out date not null,

  adults integer not null default 2,
  children integer not null default 0,
  nights integer not null,

  currency text not null default 'TRY',

  total_cost numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,

  gross_profit numeric(14,2) not null default 0,

  payment_fee numeric(14,2) not null default 0,
  salesperson_commission numeric(14,2) not null default 0,
  other_expenses numeric(14,2) not null default 0,

  net_profit numeric(14,2) not null default 0,

  margin_percent numeric(8,4) not null default 0,

  paid_amount numeric(14,2) not null default 0,
  balance_amount numeric(14,2) not null default 0,

  payment_status text not null default 'unpaid'
    check (
      payment_status in (
        'unpaid',
        'partial',
        'paid',
        'refunded'
      )
    ),

  status text not null default 'confirmed'
    check (
      status in (
        'pending',
        'confirmed',
        'in_service',
        'completed',
        'cancelled'
      )
    ),

  public_token uuid not null default gen_random_uuid(),

  notes text,

  metadata jsonb not null default '{}'::jsonb,

  booked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, booking_code),
  unique(public_token),

  check (check_out > check_in)
);

create index if not exists idx_package_bookings_company_dates
  on public.package_bookings(
    company_id,
    check_in,
    check_out
  );

create index if not exists idx_package_bookings_sales
  on public.package_bookings(
    company_id,
    sales_user_id
  );

create index if not exists idx_package_bookings_customer
  on public.package_bookings(
    company_id,
    customer_id
  );


create table if not exists public.package_booking_items (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete cascade,

  source_quote_item_id uuid,

  item_type text not null,

  reference_id uuid,
  supplier_id uuid,

  name text not null,

  service_date date,
  service_time time,

  quantity numeric(10,2) not null default 1,

  unit_cost numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,

  unit_sale_price numeric(14,2) not null default 0,
  total_sale_price numeric(14,2) not null default 0,

  currency text not null default 'TRY',

  supplier_status text not null default 'pending'
    check (
      supplier_status in (
        'pending',
        'requested',
        'confirmed',
        'completed',
        'cancelled'
      )
    ),

  customer_status text not null default 'pending'
    check (
      customer_status in (
        'pending',
        'scheduled',
        'checked_in',
        'used',
        'cancelled'
      )
    ),

  cost_snapshot jsonb not null default '{}'::jsonb,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_booking_items_booking
  on public.package_booking_items(booking_id);

create index if not exists idx_package_booking_items_supplier
  on public.package_booking_items(
    company_id,
    supplier_id,
    service_date
  );


create table if not exists public.package_customer_payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete restrict,

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null default 'TRY',

  payment_method text,

  provider text,
  provider_reference text,

  status text not null default 'completed'
    check (
      status in (
        'pending',
        'completed',
        'failed',
        'refunded'
      )
    ),

  received_by uuid,

  paid_at timestamptz not null default now(),

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_package_customer_payments_booking
  on public.package_customer_payments(
    company_id,
    booking_id,
    paid_at
  );


create table if not exists public.package_supplier_payables (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete restrict,

  booking_item_id uuid
    references public.package_booking_items(id)
    on delete set null,

  supplier_id uuid,

  amount numeric(14,2) not null default 0,

  currency text not null default 'TRY',

  due_date date,

  paid_amount numeric(14,2) not null default 0,

  status text not null default 'open'
    check (
      status in (
        'open',
        'partial',
        'paid',
        'cancelled'
      )
    ),

  notes text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_package_supplier_payables_supplier
  on public.package_supplier_payables(
    company_id,
    supplier_id,
    status,
    due_date
  );


create table if not exists public.package_vouchers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete cascade,

  booking_item_id uuid
    references public.package_booking_items(id)
    on delete cascade,

  voucher_code text not null,

  qr_token uuid not null default gen_random_uuid(),

  status text not null default 'active'
    check (
      status in (
        'active',
        'used',
        'cancelled',
        'expired'
      )
    ),

  used_at timestamptz,
  used_by uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  unique(company_id, voucher_code),
  unique(qr_token)
);

create index if not exists idx_package_vouchers_booking
  on public.package_vouchers(company_id, booking_id);


-- =========================================================
-- RLS
-- Company-member scoped
-- =========================================================

alter table public.package_catalog_hotels enable row level security;
alter table public.package_hotel_rates enable row level security;
alter table public.package_activities enable row level security;
alter table public.package_activity_slots enable row level security;
alter table public.package_templates enable row level security;
alter table public.package_template_items enable row level security;
alter table public.package_quotes enable row level security;
alter table public.package_quote_items enable row level security;
alter table public.package_bookings enable row level security;
alter table public.package_booking_items enable row level security;
alter table public.package_customer_payments enable row level security;
alter table public.package_supplier_payables enable row level security;
alter table public.package_vouchers enable row level security;

do $$
declare
  table_name text;
  tables text[] := array[
    'package_catalog_hotels',
    'package_hotel_rates',
    'package_activities',
    'package_activity_slots',
    'package_templates',
    'package_template_items',
    'package_quotes',
    'package_quote_items',
    'package_bookings',
    'package_booking_items',
    'package_customer_payments',
    'package_supplier_payables',
    'package_vouchers'
  ];
begin
  foreach table_name in array tables
  loop
    execute format(
      'drop policy if exists "Package company members" on public.%I',
      table_name
    );

    execute format(
      'create policy "Package company members"
       on public.%I
       for all
       to authenticated
       using (
         exists (
           select 1
           from public.company_members cm
           where cm.company_id = %I.company_id
             and cm.user_id = auth.uid()
             and coalesce(cm.is_active, true) = true
         )
       )
       with check (
         exists (
           select 1
           from public.company_members cm
           where cm.company_id = %I.company_id
             and cm.user_id = auth.uid()
             and coalesce(cm.is_active, true) = true
         )
       )',
      table_name,
      table_name,
      table_name
    );
  end loop;
end
$$;

commit;
