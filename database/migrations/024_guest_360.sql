create table if not exists public.hotel_guest_notes (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  guest_id uuid not null
    references public.hotel_guests(id)
    on delete cascade,

  note_type text not null default 'general'
    check (
      note_type in (
        'general',
        'front_office',
        'housekeeping',
        'sales',
        'finance',
        'security',
        'complaint',
        'special_request'
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

  visibility text not null default 'all_staff'
    check (
      visibility in (
        'all_staff',
        'management',
        'front_office',
        'finance'
      )
    ),

  title text not null,

  content text not null,

  is_pinned boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create table if not exists public.hotel_guest_preferences (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  guest_id uuid not null
    references public.hotel_guests(id)
    on delete cascade,

  room_location text,

  floor_preference text,

  bed_preference text,

  view_preference text,

  smoking_preference text,

  pillow_preference text,

  temperature_preference text,

  meal_preference text,

  allergies text,

  accessibility_needs text,

  arrival_preference text,

  communication_channel text,

  special_occasion text,

  additional_preferences text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    company_id,
    guest_id
  )
);


create table if not exists public.hotel_guest_documents (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  guest_id uuid not null
    references public.hotel_guests(id)
    on delete cascade,

  document_type text not null
    check (
      document_type in (
        'tc_identity',
        'passport',
        'foreign_identity',
        'kvkk_form',
        'registration_card',
        'signature_form',
        'visa',
        'driving_license',
        'other'
      )
    ),

  document_name text not null,

  document_number text,

  issued_country text,

  issued_at date,

  expires_at date,

  file_url text,

  verification_status text not null default 'pending'
    check (
      verification_status in (
        'pending',
        'verified',
        'rejected',
        'expired'
      )
    ),

  verified_by uuid
    references auth.users(id)
    on delete set null,

  verified_at timestamptz,

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);


create table if not exists public.hotel_guest_activities (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  guest_id uuid not null
    references public.hotel_guests(id)
    on delete cascade,

  activity_type text not null,

  title text not null,

  description text,

  metadata jsonb not null default '{}'::jsonb,

  performed_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);


create index if not exists
hotel_guest_notes_guest_idx
on public.hotel_guest_notes (
  company_id,
  guest_id,
  created_at desc
);

create index if not exists
hotel_guest_documents_guest_idx
on public.hotel_guest_documents (
  company_id,
  guest_id,
  created_at desc
);

create index if not exists
hotel_guest_activities_guest_idx
on public.hotel_guest_activities (
  company_id,
  guest_id,
  created_at desc
);


alter table public.hotel_guest_notes
enable row level security;

alter table public.hotel_guest_preferences
enable row level security;

alter table public.hotel_guest_documents
enable row level security;

alter table public.hotel_guest_activities
enable row level security;


grant select, insert, update, delete
on
  public.hotel_guest_notes,
  public.hotel_guest_preferences,
  public.hotel_guest_documents,
  public.hotel_guest_activities
to authenticated;


drop policy if exists
"Members manage guest notes"
on public.hotel_guest_notes;

create policy
"Members manage guest notes"
on public.hotel_guest_notes
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage guest preferences"
on public.hotel_guest_preferences;

create policy
"Members manage guest preferences"
on public.hotel_guest_preferences
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage guest documents"
on public.hotel_guest_documents;

create policy
"Members manage guest documents"
on public.hotel_guest_documents
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members read guest activities"
on public.hotel_guest_activities;

create policy
"Members read guest activities"
on public.hotel_guest_activities
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists
"Members create guest activities"
on public.hotel_guest_activities;

create policy
"Members create guest activities"
on public.hotel_guest_activities
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);
