begin;

create extension if not exists pgcrypto;

-- =========================================================
-- TUROBUS ACTIVITY OS PRO
-- Multi-tenant Activity PMS / ERP / Sales / Finance
-- =========================================================


-- =========================================================
-- ROLE HELPERS
-- =========================================================

create or replace function public.activity_os_can_manage(
  p_company_id uuid
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
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager'
      )
  );
$$;


create or replace function public.activity_os_can_sell(
  p_company_id uuid
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
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'sales'
      )
  );
$$;


create or replace function public.activity_os_can_view_finance(
  p_company_id uuid
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
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  );
$$;


-- =========================================================
-- SETTINGS
-- =========================================================

create table if not exists public.activity_os_settings (
  company_id uuid primary key
    references public.companies(id)
    on delete cascade,

  currency text not null default 'TRY',

  marketplace_enabled boolean not null default true,

  marketplace_commission_percent numeric(7,4)
    not null default 10,

  default_confirmation_status text
    not null default 'confirmed',

  guest_portal_enabled boolean not null default true,

  allow_partner_sales boolean not null default true,

  booking_prefix text not null default 'ACT',

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.activity_os_settings
enable row level security;


drop policy if exists activity_os_settings_select
on public.activity_os_settings;

create policy activity_os_settings_select
on public.activity_os_settings
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists activity_os_settings_manage
on public.activity_os_settings;

create policy activity_os_settings_manage
on public.activity_os_settings
for all
to authenticated
using (
  public.activity_os_can_manage(company_id)
)
with check (
  public.activity_os_can_manage(company_id)
);


-- =========================================================
-- CUSTOMER / GUEST CRM
-- =========================================================

create table if not exists public.activity_os_customers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  full_name text not null,
  phone text,
  email text,

  nationality text,
  identity_no text,

  hotel_name text,

  notes text,

  total_bookings integer not null default 0,
  total_spend numeric(14,2) not null default 0,

  last_booking_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists idx_activity_os_customers_company
on public.activity_os_customers(
  company_id,
  created_at desc
);


alter table public.activity_os_customers
enable row level security;


drop policy if exists activity_os_customers_access
on public.activity_os_customers;

create policy activity_os_customers_access
on public.activity_os_customers
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- =========================================================
-- SELLERS / HOTELS / AGENCIES / EXTERNAL SALES
-- =========================================================

create table if not exists public.activity_os_sellers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  seller_type text not null default 'salesperson'
    check (
      seller_type in (
        'salesperson',
        'hotel',
        'agency',
        'guide',
        'reception',
        'affiliate',
        'other'
      )
    ),

  name text not null,

  contact_name text,
  phone text,
  email text,

  commission_type text not null default 'percent'
    check (
      commission_type in (
        'percent',
        'fixed',
        'none'
      )
    ),

  commission_value numeric(14,2) not null default 0,

  credit_limit numeric(14,2) not null default 0,

  can_sell_all_products boolean not null default true,

  is_active boolean not null default true,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists idx_activity_os_sellers_company
on public.activity_os_sellers(
  company_id,
  is_active
);


alter table public.activity_os_sellers
enable row level security;


drop policy if exists activity_os_sellers_access
on public.activity_os_sellers;

create policy activity_os_sellers_access
on public.activity_os_sellers
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists activity_os_sellers_manage
on public.activity_os_sellers;

create policy activity_os_sellers_manage
on public.activity_os_sellers
for all
to authenticated
using (
  public.activity_os_can_manage(company_id)
)
with check (
  public.activity_os_can_manage(company_id)
);


create table if not exists public.activity_os_seller_users (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  seller_id uuid not null
    references public.activity_os_sellers(id)
    on delete cascade,

  user_id uuid not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique(company_id, seller_id, user_id)
);


alter table public.activity_os_seller_users
enable row level security;


drop policy if exists activity_os_seller_users_access
on public.activity_os_seller_users;

create policy activity_os_seller_users_access
on public.activity_os_seller_users
for select
to authenticated
using (
  public.is_company_member(company_id)
  or user_id = auth.uid()
);


drop policy if exists activity_os_seller_users_manage
on public.activity_os_seller_users;

create policy activity_os_seller_users_manage
on public.activity_os_seller_users
for all
to authenticated
using (
  public.activity_os_can_manage(company_id)
)
with check (
  public.activity_os_can_manage(company_id)
);


create table if not exists public.activity_os_seller_products (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  seller_id uuid not null
    references public.activity_os_sellers(id)
    on delete cascade,

  activity_id uuid not null
    references public.package_activities(id)
    on delete cascade,

  sale_price numeric(14,2),

  commission_type text
    check (
      commission_type is null
      or commission_type in (
        'percent',
        'fixed',
        'none'
      )
    ),

  commission_value numeric(14,2),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  unique(seller_id, activity_id)
);


alter table public.activity_os_seller_products
enable row level security;


drop policy if exists activity_os_seller_products_access
on public.activity_os_seller_products;

create policy activity_os_seller_products_access
on public.activity_os_seller_products
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists activity_os_seller_products_manage
on public.activity_os_seller_products;

create policy activity_os_seller_products_manage
on public.activity_os_seller_products
for all
to authenticated
using (
  public.activity_os_can_manage(company_id)
)
with check (
  public.activity_os_can_manage(company_id)
);


-- =========================================================
-- ACTIVITY BOOKINGS
-- =========================================================

create table if not exists public.activity_os_bookings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_code text not null,

  customer_id uuid
    references public.activity_os_customers(id)
    on delete set null,

  activity_id uuid not null
    references public.package_activities(id)
    on delete restrict,

  slot_id uuid
    references public.package_activity_slots(id)
    on delete set null,

  seller_id uuid
    references public.activity_os_sellers(id)
    on delete set null,

  source_channel text not null default 'direct'
    check (
      source_channel in (
        'direct',
        'phone',
        'whatsapp',
        'instagram',
        'website',
        'hotel',
        'agency',
        'external_seller',
        'turobus_marketplace',
        'manual',
        'other'
      )
    ),

  customer_name text not null,
  customer_phone text,
  customer_email text,

  service_date date not null,
  start_time time,

  quantity integer not null default 1
    check (quantity > 0),

  sale_total numeric(14,2) not null default 0,

  paid_total numeric(14,2) not null default 0,

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
        'ready',
        'picked_up',
        'checked_in',
        'in_progress',
        'completed',
        'cancelled',
        'no_show'
      )
    ),

  hotel_name text,
  room_no text,

  pickup_required boolean not null default false,
  pickup_location text,
  pickup_time time,

  special_notes text,

  guest_token uuid not null default gen_random_uuid(),

  guest_portal_enabled boolean not null default true,

  created_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, booking_code),
  unique(guest_token)
);


create index if not exists idx_activity_os_bookings_company_date
on public.activity_os_bookings(
  company_id,
  service_date,
  status
);


create index if not exists idx_activity_os_bookings_slot
on public.activity_os_bookings(
  slot_id,
  status
);


create index if not exists idx_activity_os_bookings_seller
on public.activity_os_bookings(
  seller_id,
  service_date
);


alter table public.activity_os_bookings
enable row level security;


drop policy if exists activity_os_bookings_access
on public.activity_os_bookings;

create policy activity_os_bookings_access
on public.activity_os_bookings
for select
to authenticated
using (
  public.is_company_member(company_id)
  or exists (
    select 1
    from public.activity_os_seller_users su
    where su.company_id = activity_os_bookings.company_id
      and su.seller_id = activity_os_bookings.seller_id
      and su.user_id = auth.uid()
      and su.is_active = true
  )
);


drop policy if exists activity_os_bookings_insert
on public.activity_os_bookings;

create policy activity_os_bookings_insert
on public.activity_os_bookings
for insert
to authenticated
with check (
  public.activity_os_can_sell(company_id)
  or exists (
    select 1
    from public.activity_os_seller_users su
    where su.company_id = activity_os_bookings.company_id
      and su.seller_id = activity_os_bookings.seller_id
      and su.user_id = auth.uid()
      and su.is_active = true
  )
);


drop policy if exists activity_os_bookings_update
on public.activity_os_bookings;

create policy activity_os_bookings_update
on public.activity_os_bookings
for update
to authenticated
using (
  public.activity_os_can_sell(company_id)
)
with check (
  public.activity_os_can_sell(company_id)
);


-- =========================================================
-- PRIVATE BOOKING FINANCE
-- Sales users must not see cost/profit/source contract data.
-- =========================================================

create table if not exists public.activity_os_booking_finance (
  booking_id uuid primary key
    references public.activity_os_bookings(id)
    on delete cascade,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  gross_sale numeric(14,2) not null default 0,

  internal_cost numeric(14,2) not null default 0,

  seller_commission numeric(14,2) not null default 0,

  turobus_commission numeric(14,2) not null default 0,

  net_profit numeric(14,2) generated always as (
    gross_sale
    - internal_cost
    - seller_commission
    - turobus_commission
  ) stored,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.activity_os_booking_finance
enable row level security;


drop policy if exists activity_os_booking_finance_access
on public.activity_os_booking_finance;

create policy activity_os_booking_finance_access
on public.activity_os_booking_finance
for all
to authenticated
using (
  public.activity_os_can_view_finance(company_id)
)
with check (
  public.activity_os_can_view_finance(company_id)
);


-- =========================================================
-- PAYMENTS
-- =========================================================

create table if not exists public.activity_os_payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid
    references public.activity_os_bookings(id)
    on delete cascade,

  payment_type text not null default 'collection'
    check (
      payment_type in (
        'collection',
        'refund'
      )
    ),

  payment_method text not null default 'cash'
    check (
      payment_method in (
        'cash',
        'card',
        'bank_transfer',
        'online',
        'partner_account',
        'other'
      )
    ),

  amount numeric(14,2) not null
    check (amount >= 0),

  currency text not null default 'TRY',

  reference_no text,
  note text,

  payment_date timestamptz not null default now(),

  created_by uuid,

  created_at timestamptz not null default now()
);


create index if not exists idx_activity_os_payments_company_date
on public.activity_os_payments(
  company_id,
  payment_date desc
);


alter table public.activity_os_payments
enable row level security;


drop policy if exists activity_os_payments_access
on public.activity_os_payments;

create policy activity_os_payments_access
on public.activity_os_payments
for all
to authenticated
using (
  public.activity_os_can_view_finance(company_id)
)
with check (
  public.activity_os_can_view_finance(company_id)
);


-- =========================================================
-- EXPENSES
-- =========================================================

create table if not exists public.activity_os_expenses (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  activity_id uuid
    references public.package_activities(id)
    on delete set null,

  expense_date date not null default current_date,

  category text not null,

  description text not null,

  amount numeric(14,2) not null
    check (amount >= 0),

  currency text not null default 'TRY',

  payment_method text,

  supplier_name text,

  receipt_no text,

  note text,

  created_by uuid,

  created_at timestamptz not null default now()
);


create index if not exists idx_activity_os_expenses_company_date
on public.activity_os_expenses(
  company_id,
  expense_date desc
);


alter table public.activity_os_expenses
enable row level security;


drop policy if exists activity_os_expenses_access
on public.activity_os_expenses;

create policy activity_os_expenses_access
on public.activity_os_expenses
for all
to authenticated
using (
  public.activity_os_can_view_finance(company_id)
)
with check (
  public.activity_os_can_view_finance(company_id)
);


-- =========================================================
-- OPERATION TASKS
-- =========================================================

create table if not exists public.activity_os_operation_tasks (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid
    references public.activity_os_bookings(id)
    on delete cascade,

  slot_id uuid
    references public.package_activity_slots(id)
    on delete set null,

  assigned_staff_id uuid
    references public.activity_network_staff(id)
    on delete set null,

  task_type text not null default 'operation',

  title text not null,

  due_at timestamptz,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


alter table public.activity_os_operation_tasks
enable row level security;


drop policy if exists activity_os_operation_tasks_access
on public.activity_os_operation_tasks;

create policy activity_os_operation_tasks_access
on public.activity_os_operation_tasks
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- =========================================================
-- BOOKING CREATE
-- Shared capacity + commission rule
-- =========================================================

create or replace function public.activity_os_create_booking(
  p_company_id uuid,
  p_activity_id uuid,
  p_slot_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_quantity integer,
  p_source_channel text,
  p_seller_id uuid,
  p_sale_total numeric,
  p_paid_total numeric,
  p_payment_method text,
  p_hotel_name text,
  p_room_no text,
  p_pickup_required boolean,
  p_pickup_location text,
  p_special_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_activity record;
  v_customer_id uuid;
  v_booking_id uuid;
  v_booking_code text;
  v_guest_token uuid;
  v_settings record;

  v_internal_cost numeric(14,2) := 0;
  v_seller_commission numeric(14,2) := 0;
  v_turobus_commission numeric(14,2) := 0;

  v_seller record;
  v_payment_status text;
begin

  if not public.activity_os_can_sell(p_company_id) then
    if not exists (
      select 1
      from public.activity_os_seller_users su
      where su.company_id = p_company_id
        and su.seller_id = p_seller_id
        and su.user_id = auth.uid()
        and su.is_active = true
    ) then
      raise exception 'Sales permission required';
    end if;
  end if;


  if greatest(coalesce(p_quantity,0),0) <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;


  select *
  into v_activity
  from public.package_activities
  where id = p_activity_id
    and company_id = p_company_id
    and is_active = true;

  if not found then
    raise exception 'Activity not found';
  end if;


  if p_slot_id is not null then

    perform pg_advisory_xact_lock(
      hashtext(
        'activity-slot-' ||
        p_slot_id::text
      )
    );


    select *
    into v_slot
    from public.package_activity_slots
    where id = p_slot_id
      and company_id = p_company_id
      and activity_id = p_activity_id
    for update;


    if not found then
      raise exception 'Activity slot not found';
    end if;


    if v_slot.status <> 'open' then
      raise exception 'Activity slot is not open';
    end if;


    if (
      v_slot.capacity -
      v_slot.reserved_count
    ) < p_quantity then
      raise exception 'Not enough activity capacity';
    end if;


    update public.package_activity_slots
    set
      reserved_count =
        reserved_count +
        p_quantity,

      status =
        case
          when reserved_count + p_quantity >= capacity
            then 'full'
          else status
        end,

      updated_at = now()
    where id = p_slot_id;

  end if;


  insert into public.activity_os_settings(
    company_id
  )
  values (
    p_company_id
  )
  on conflict(company_id)
  do nothing;


  select *
  into v_settings
  from public.activity_os_settings
  where company_id = p_company_id;


  select id
  into v_customer_id
  from public.activity_os_customers
  where company_id = p_company_id
    and (
      (
        p_customer_phone is not null
        and phone = p_customer_phone
      )
      or (
        p_customer_email is not null
        and email = p_customer_email
      )
    )
  order by created_at
  limit 1;


  if v_customer_id is null then

    insert into public.activity_os_customers(
      company_id,
      full_name,
      phone,
      email,
      hotel_name
    )
    values (
      p_company_id,
      trim(p_customer_name),
      nullif(trim(coalesce(p_customer_phone,'')),''),
      nullif(trim(coalesce(p_customer_email,'')),''),
      nullif(trim(coalesce(p_hotel_name,'')),'')
    )
    returning id
    into v_customer_id;

  end if;


  v_booking_code :=
    coalesce(
      nullif(
        v_settings.booking_prefix,
        ''
      ),
      'ACT'
    )
    ||
    '-' ||
    to_char(current_date,'YYMMDD')
    ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        6
      )
    );


  v_payment_status :=
    case
      when coalesce(p_paid_total,0) <= 0
        then 'unpaid'

      when coalesce(p_paid_total,0) >= coalesce(p_sale_total,0)
        then 'paid'

      else 'partial'
    end;


  insert into public.activity_os_bookings(
    company_id,
    booking_code,
    customer_id,
    activity_id,
    slot_id,
    seller_id,
    source_channel,
    customer_name,
    customer_phone,
    customer_email,
    service_date,
    start_time,
    quantity,
    sale_total,
    paid_total,
    payment_status,
    status,
    hotel_name,
    room_no,
    pickup_required,
    pickup_location,
    special_notes,
    created_by
  )
  values (
    p_company_id,
    v_booking_code,
    v_customer_id,
    p_activity_id,
    p_slot_id,
    p_seller_id,
    coalesce(p_source_channel,'direct'),
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone,'')),''),
    nullif(trim(coalesce(p_customer_email,'')),''),
    coalesce(v_slot.slot_date,current_date),
    v_slot.start_time,
    greatest(p_quantity,1),
    greatest(coalesce(p_sale_total,0),0),
    greatest(coalesce(p_paid_total,0),0),
    v_payment_status,
    coalesce(v_settings.default_confirmation_status,'confirmed'),
    nullif(trim(coalesce(p_hotel_name,'')),''),
    nullif(trim(coalesce(p_room_no,'')),''),
    coalesce(p_pickup_required,false),
    nullif(trim(coalesce(p_pickup_location,'')),''),
    nullif(trim(coalesce(p_special_notes,'')),''),
    auth.uid()
  )
  returning id, guest_token
  into v_booking_id, v_guest_token;


  v_internal_cost :=
    coalesce(
      v_slot.cost,
      v_activity.default_cost,
      0
    )
    *
    greatest(p_quantity,1);


  if p_seller_id is not null then

    select *
    into v_seller
    from public.activity_os_sellers
    where id = p_seller_id
      and company_id = p_company_id;


    if found then

      if v_seller.commission_type = 'percent' then
        v_seller_commission :=
          greatest(coalesce(p_sale_total,0),0)
          *
          coalesce(v_seller.commission_value,0)
          /
          100;

      elsif v_seller.commission_type = 'fixed' then
        v_seller_commission :=
          coalesce(v_seller.commission_value,0)
          *
          greatest(p_quantity,1);
      end if;

    end if;

  end if;


  -- CRITICAL BUSINESS RULE:
  -- Turobus earns commission ONLY from turobus_marketplace sales.
  if p_source_channel = 'turobus_marketplace' then

    v_turobus_commission :=
      greatest(coalesce(p_sale_total,0),0)
      *
      coalesce(
        v_settings.marketplace_commission_percent,
        10
      )
      /
      100;

  else

    v_turobus_commission := 0;

  end if;


  insert into public.activity_os_booking_finance(
    booking_id,
    company_id,
    gross_sale,
    internal_cost,
    seller_commission,
    turobus_commission
  )
  values (
    v_booking_id,
    p_company_id,
    greatest(coalesce(p_sale_total,0),0),
    greatest(v_internal_cost,0),
    greatest(v_seller_commission,0),
    greatest(v_turobus_commission,0)
  );


  if coalesce(p_paid_total,0) > 0 then

    insert into public.activity_os_payments(
      company_id,
      booking_id,
      payment_type,
      payment_method,
      amount,
      created_by
    )
    values (
      p_company_id,
      v_booking_id,
      'collection',
      coalesce(p_payment_method,'cash'),
      p_paid_total,
      auth.uid()
    );

  end if;


  update public.activity_os_customers
  set
    total_bookings =
      total_bookings + 1,

    total_spend =
      total_spend +
      greatest(coalesce(p_sale_total,0),0),

    last_booking_at = now(),

    updated_at = now()
  where id = v_customer_id;


  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking_id,
    'booking_code', v_booking_code,
    'guest_token', v_guest_token,
    'guest_url',
      '/activity-misafir/' ||
      v_guest_token::text
  );

end;
$$;


grant execute
on function public.activity_os_create_booking(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  boolean,
  text,
  text
)
to authenticated;


-- =========================================================
-- BOOKING STATUS / CAPACITY RELEASE
-- =========================================================

create or replace function public.activity_os_update_booking_status(
  p_company_id uuid,
  p_booking_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Sales permission required';
  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception 'Booking not found';
  end if;


  if p_status not in (
    'pending',
    'confirmed',
    'ready',
    'picked_up',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  ) then
    raise exception 'Invalid booking status';
  end if;


  if (
    p_status = 'cancelled'
    and v_booking.status <> 'cancelled'
    and v_booking.slot_id is not null
  ) then

    update public.package_activity_slots
    set
      reserved_count =
        greatest(
          reserved_count -
          v_booking.quantity,
          0
        ),

      status =
        case
          when status = 'full'
            then 'open'
          else status
        end,

      updated_at = now()
    where id = v_booking.slot_id;

  end if;


  update public.activity_os_bookings
  set
    status = p_status,
    updated_at = now()
  where id = p_booking_id;


  return jsonb_build_object(
    'ok',true,
    'status',p_status
  );

end;
$$;


grant execute
on function public.activity_os_update_booking_status(
  uuid,
  uuid,
  text
)
to authenticated;


-- =========================================================
-- ADD PAYMENT
-- =========================================================

create or replace function public.activity_os_add_payment(
  p_company_id uuid,
  p_booking_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_new_paid numeric(14,2);
  v_status text;
begin

  if not public.activity_os_can_view_finance(p_company_id) then
    raise exception 'Finance permission required';
  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception 'Booking not found';
  end if;


  insert into public.activity_os_payments(
    company_id,
    booking_id,
    payment_type,
    payment_method,
    amount,
    note,
    created_by
  )
  values (
    p_company_id,
    p_booking_id,
    'collection',
    coalesce(p_payment_method,'cash'),
    greatest(coalesce(p_amount,0),0),
    nullif(trim(coalesce(p_note,'')),''),
    auth.uid()
  );


  v_new_paid :=
    v_booking.paid_total +
    greatest(coalesce(p_amount,0),0);


  v_status :=
    case
      when v_new_paid <= 0
        then 'unpaid'

      when v_new_paid >= v_booking.sale_total
        then 'paid'

      else 'partial'
    end;


  update public.activity_os_bookings
  set
    paid_total = v_new_paid,
    payment_status = v_status,
    updated_at = now()
  where id = p_booking_id;


  return jsonb_build_object(
    'ok',true,
    'paid_total',v_new_paid,
    'payment_status',v_status
  );

end;
$$;


grant execute
on function public.activity_os_add_payment(
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;


-- =========================================================
-- MARKETPLACE TOGGLE
-- =========================================================

create or replace function public.activity_os_set_marketplace(
  p_company_id uuid,
  p_activity_id uuid,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.activity_os_can_manage(p_company_id) then
    raise exception 'Management permission required';
  end if;


  if not exists (
    select 1
    from public.package_activities a
    where a.id = p_activity_id
      and a.company_id = p_company_id
  ) then
    raise exception 'Activity not found';
  end if;


  perform public.sync_turobus_activity_network();


  update public.turobus_network_resources
  set
    marketplace_enabled = p_enabled,
    updated_at = now()
  where owner_company_id = p_company_id
    and source_system = 'activity_os'
    and source_id = p_activity_id;


  update public.turobus_network_inventory_units iu
  set
    marketplace_enabled = p_enabled,
    updated_at = now()
  where iu.owner_company_id = p_company_id
    and iu.source_system = 'activity_os'
    and iu.parent_source_ref_id = p_activity_id;


  return jsonb_build_object(
    'ok',true,
    'marketplace_enabled',p_enabled
  );

end;
$$;


grant execute
on function public.activity_os_set_marketplace(
  uuid,
  uuid,
  boolean
)
to authenticated;


-- =========================================================
-- MANAGEMENT SUMMARY
-- =========================================================

create or replace function public.get_activity_os_dashboard(
  p_company_id uuid,
  p_from date default current_date,
  p_to date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_finance boolean;
  v_result jsonb;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;


  v_can_finance :=
    public.activity_os_can_view_finance(p_company_id);


  select jsonb_build_object(
    'booking_count',
      count(*),

    'guest_count',
      coalesce(
        sum(
          case
            when b.status <> 'cancelled'
              then b.quantity
            else 0
          end
        ),
        0
      ),

    'confirmed_count',
      count(*) filter (
        where b.status in (
          'confirmed',
          'ready',
          'picked_up',
          'checked_in',
          'in_progress'
        )
      ),

    'completed_count',
      count(*) filter (
        where b.status = 'completed'
      ),

    'cancelled_count',
      count(*) filter (
        where b.status = 'cancelled'
      ),

    'sale_total',
      coalesce(
        sum(
          case
            when b.status <> 'cancelled'
              then b.sale_total
            else 0
          end
        ),
        0
      ),

    'paid_total',
      coalesce(
        sum(
          case
            when b.status <> 'cancelled'
              then b.paid_total
            else 0
          end
        ),
        0
      ),

    'receivable_total',
      coalesce(
        sum(
          case
            when b.status <> 'cancelled'
              then greatest(
                b.sale_total -
                b.paid_total,
                0
              )
            else 0
          end
        ),
        0
      ),

    'marketplace_bookings',
      count(*) filter (
        where b.source_channel =
          'turobus_marketplace'
      ),

    'finance_allowed',
      v_can_finance,

    'profit_total',
      case
        when v_can_finance
          then coalesce(
            (
              select sum(f.net_profit)
              from public.activity_os_booking_finance f
              join public.activity_os_bookings fb
                on fb.id = f.booking_id
              where f.company_id = p_company_id
                and fb.service_date between p_from and p_to
                and fb.status <> 'cancelled'
            ),
            0
          )
        else null
      end,

    'turobus_commission',
      case
        when v_can_finance
          then coalesce(
            (
              select sum(f.turobus_commission)
              from public.activity_os_booking_finance f
              join public.activity_os_bookings fb
                on fb.id = f.booking_id
              where f.company_id = p_company_id
                and fb.service_date between p_from and p_to
                and fb.status <> 'cancelled'
            ),
            0
          )
        else null
      end

  )
  into v_result
  from public.activity_os_bookings b
  where b.company_id = p_company_id
    and b.service_date between p_from and p_to;


  return coalesce(
    v_result,
    '{}'::jsonb
  );

end;
$$;


grant execute
on function public.get_activity_os_dashboard(
  uuid,
  date,
  date
)
to authenticated;


-- =========================================================
-- PUBLIC GUEST PORTAL
-- No internal costs / profit / provider source exposed.
-- =========================================================

create or replace function public.get_public_activity_guest_portal(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin

  select jsonb_build_object(
    'booking_code',
      b.booking_code,

    'customer_name',
      b.customer_name,

    'activity_name',
      a.name,

    'activity_category',
      a.category,

    'city',
      a.city,

    'district',
      a.district,

    'service_date',
      b.service_date,

    'start_time',
      b.start_time,

    'quantity',
      b.quantity,

    'status',
      b.status,

    'payment_status',
      b.payment_status,

    'sale_total',
      b.sale_total,

    'paid_total',
      b.paid_total,

    'remaining_total',
      greatest(
        b.sale_total -
        b.paid_total,
        0
      ),

    'currency',
      a.currency,

    'hotel_name',
      b.hotel_name,

    'room_no',
      b.room_no,

    'pickup_required',
      b.pickup_required,

    'pickup_location',
      b.pickup_location,

    'pickup_time',
      b.pickup_time,

    'special_notes',
      b.special_notes,

    'cover_image_url',
      a.cover_image_url,

    'company',
      jsonb_build_object(
        'name',
          c.name,

        'logo_url',
          c.logo_url,

        'phone',
          c.phone,

        'email',
          c.email
      )

  )
  into v_result

  from public.activity_os_bookings b

  join public.package_activities a
    on a.id = b.activity_id

  join public.companies c
    on c.id = b.company_id

  where b.guest_token = p_token
    and b.guest_portal_enabled = true;


  if v_result is null then
    raise exception 'Guest reservation not found';
  end if;


  return v_result;

end;
$$;


revoke all
on function public.get_public_activity_guest_portal(uuid)
from public;


grant execute
on function public.get_public_activity_guest_portal(uuid)
to anon, authenticated;


-- =========================================================
-- SELLER PERFORMANCE
-- =========================================================

create or replace function public.get_activity_os_seller_performance(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.activity_os_can_manage(p_company_id)
     and not public.activity_os_can_view_finance(p_company_id)
  then
    raise exception 'Management permission required';
  end if;


  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'seller_id',
            s.id,

          'seller_name',
            s.name,

          'seller_type',
            s.seller_type,

          'booking_count',
            coalesce(x.booking_count,0),

          'guest_count',
            coalesce(x.guest_count,0),

          'sales_total',
            coalesce(x.sales_total,0),

          'commission_total',
            coalesce(x.commission_total,0)
        )
        order by
          coalesce(x.sales_total,0)
          desc
      )

      from public.activity_os_sellers s

      left join lateral (
        select
          count(*) as booking_count,

          coalesce(
            sum(b.quantity),
            0
          ) as guest_count,

          coalesce(
            sum(b.sale_total),
            0
          ) as sales_total,

          coalesce(
            sum(f.seller_commission),
            0
          ) as commission_total

        from public.activity_os_bookings b

        left join public.activity_os_booking_finance f
          on f.booking_id = b.id

        where b.seller_id = s.id
          and b.company_id = p_company_id
          and b.service_date between p_from and p_to
          and b.status <> 'cancelled'

      ) x
      on true

      where s.company_id = p_company_id
    ),
    '[]'::jsonb
  );

end;
$$;


grant execute
on function public.get_activity_os_seller_performance(
  uuid,
  date,
  date
)
to authenticated;


-- =========================================================
-- BOOTSTRAP EXISTING COMPANIES ON FIRST USE
-- =========================================================

insert into public.activity_os_settings(
  company_id
)
select c.id
from public.companies c
on conflict(company_id)
do nothing;


commit;
