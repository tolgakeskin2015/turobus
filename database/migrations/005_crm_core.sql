-- =========================================================
-- TurOS CRM Core
-- Migration: 005_crm_core.sql
-- =========================================================

create table if not exists public.crm_customers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_code text,

  full_name text not null,
  first_name text,
  last_name text,

  phone text,
  whatsapp_phone text,
  email text,

  country_code text,
  city text,
  preferred_language text not null default 'tr',

  birth_date date,
  anniversary_date date,

  instagram_username text,

  customer_type text not null default 'individual'
    check (
      customer_type in (
        'individual',
        'corporate',
        'agency',
        'partner'
      )
    ),

  lifecycle_stage text not null default 'lead'
    check (
      lifecycle_stage in (
        'lead',
        'prospect',
        'offer_sent',
        'payment_pending',
        'customer',
        'completed',
        'lost',
        'inactive'
      )
    ),

  source text,
  source_detail text,

  vip_level text not null default 'standard'
    check (
      vip_level in (
        'standard',
        'silver',
        'gold',
        'platinum',
        'vip'
      )
    ),

  total_reservations integer not null default 0,
  total_spent numeric(14,2) not null default 0,
  total_profit numeric(14,2) not null default 0,

  last_reservation_at timestamptz,
  last_contact_at timestamptz,

  marketing_consent boolean not null default false,
  whatsapp_consent boolean not null default false,
  email_consent boolean not null default false,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, customer_code)
);


create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,
  color text,
  description text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, name)
);


create table if not exists public.crm_customer_tags (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.crm_customers(id)
    on delete cascade,

  tag_id uuid not null
    references public.crm_tags(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique(customer_id, tag_id)
);


create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.crm_customers(id)
    on delete cascade,

  note_type text not null default 'general'
    check (
      note_type in (
        'general',
        'call',
        'whatsapp',
        'email',
        'complaint',
        'preference',
        'important'
      )
    ),

  content text not null,
  is_pinned boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid
    references public.crm_customers(id)
    on delete cascade,

  assigned_to uuid
    references public.staff_profiles(id)
    on delete set null,

  title text not null,
  description text,

  task_type text not null default 'follow_up'
    check (
      task_type in (
        'follow_up',
        'call',
        'whatsapp',
        'email',
        'meeting',
        'payment',
        'offer',
        'other'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'urgent'
      )
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  due_at timestamptz,
  completed_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid
    references public.crm_customers(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  title text not null,

  stage text not null default 'new_lead'
    check (
      stage in (
        'new_lead',
        'contacted',
        'offer_preparing',
        'offer_sent',
        'negotiation',
        'payment_pending',
        'won',
        'lost'
      )
    ),

  expected_revenue numeric(14,2) not null default 0,
  expected_cost numeric(14,2) not null default 0,
  expected_profit numeric(14,2) not null default 0,

  probability integer not null default 10
    check (
      probability >= 0
      and probability <= 100
    ),

  expected_close_date date,
  lost_reason text,

  owner_staff_id uuid
    references public.staff_profiles(id)
    on delete set null,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.crm_timeline (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.crm_customers(id)
    on delete cascade,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'customer_created',
        'reservation_created',
        'reservation_completed',
        'call',
        'whatsapp',
        'email',
        'note',
        'task',
        'offer',
        'payment',
        'complaint',
        'status_changed',
        'other'
      )
    ),

  title text not null,
  description text,

  metadata jsonb not null default '{}'::jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create table if not exists public.crm_files (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.crm_customers(id)
    on delete cascade,

  file_name text not null,
  file_path text not null,
  mime_type text,
  file_size bigint,

  document_type text not null default 'other'
    check (
      document_type in (
        'identity',
        'passport',
        'contract',
        'payment_receipt',
        'voucher',
        'photo',
        'other'
      )
    ),

  uploaded_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


-- REZERVASYON ↔ CRM MÜŞTERİ BAĞLANTISI

alter table public.reservations
add column if not exists customer_id uuid
references public.crm_customers(id)
on delete set null;


-- INDEXLER

create index if not exists crm_customers_company_idx
on public.crm_customers(company_id);

create index if not exists crm_customers_phone_idx
on public.crm_customers(company_id, phone);

create index if not exists crm_customers_email_idx
on public.crm_customers(company_id, email);

create index if not exists crm_customers_stage_idx
on public.crm_customers(company_id, lifecycle_stage);

create index if not exists crm_customer_tags_customer_idx
on public.crm_customer_tags(customer_id);

create index if not exists crm_notes_customer_idx
on public.crm_notes(customer_id, created_at desc);

create index if not exists crm_tasks_company_status_idx
on public.crm_tasks(company_id, status, due_at);

create index if not exists crm_tasks_customer_idx
on public.crm_tasks(customer_id);

create index if not exists crm_deals_company_stage_idx
on public.crm_deals(company_id, stage);

create index if not exists crm_deals_customer_idx
on public.crm_deals(customer_id);

create index if not exists crm_timeline_customer_idx
on public.crm_timeline(customer_id, created_at desc);

create index if not exists crm_files_customer_idx
on public.crm_files(customer_id);

create index if not exists reservations_customer_idx
on public.reservations(customer_id);


-- SATIR GÜVENLİĞİ

alter table public.crm_customers enable row level security;
alter table public.crm_tags enable row level security;
alter table public.crm_customer_tags enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_timeline enable row level security;
alter table public.crm_files enable row level security;


grant select, insert, update, delete
on public.crm_customers,
   public.crm_tags,
   public.crm_customer_tags,
   public.crm_notes,
   public.crm_tasks,
   public.crm_deals,
   public.crm_timeline,
   public.crm_files
to authenticated;


-- GENEL ŞİRKET ÜYESİ OKUMA POLİTİKALARI

create policy "Members view CRM customers"
on public.crm_customers
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM customers"
on public.crm_customers
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
);


create policy "Members view CRM tags"
on public.crm_tags
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM tags"
on public.crm_tags
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    ]::public.app_role[]
  )
);


create policy "Members manage CRM customer tags"
on public.crm_customer_tags
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM notes"
on public.crm_notes
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM notes"
on public.crm_notes
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM tasks"
on public.crm_tasks
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM tasks"
on public.crm_tasks
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM deals"
on public.crm_deals
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Authorized users manage CRM deals"
on public.crm_deals
for all
to authenticated
using (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales',
      'accounting'
    ]::public.app_role[]
  )
)
with check (
  public.has_company_role(
    company_id,
    array[
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales',
      'accounting'
    ]::public.app_role[]
  )
);


create policy "Members view CRM timeline"
on public.crm_timeline
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members add CRM timeline"
on public.crm_timeline
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);


create policy "Members view CRM files"
on public.crm_files
for select
to authenticated
using (
  public.is_company_member(company_id)
);

create policy "Members manage CRM files"
on public.crm_files
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
