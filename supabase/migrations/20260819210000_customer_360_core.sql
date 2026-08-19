
-- ============================================================
-- TUROBUS CUSTOMER 360 — CORE
--
-- NON-DESTRUCTIVE ARCHITECTURE
-- Existing booking / payment / voucher / OS tables are untouched.
-- Customer 360 is introduced as an independent identity layer.
-- Existing records will be connected later through entity links.
-- ============================================================


-- ============================================================
-- CUSTOMER WRITE AUTHORITY
-- ============================================================

create or replace function
public.customer_360_has_write_authority(
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
    where
      cm.company_id =
        p_company_id
      and cm.user_id =
        auth.uid()
      and cm.is_active =
        true
      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'sales'
      )
  );
$$;


revoke execute
on function
  public.customer_360_has_write_authority(uuid)
from public;


grant execute
on function
  public.customer_360_has_write_authority(uuid)
to authenticated;


-- ============================================================
-- CUSTOMERS
-- ============================================================

create table if not exists
public.customer_360_customers (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_code text not null
    default (
      'MUS-' ||
      upper(
        substr(
          replace(
            gen_random_uuid()::text,
            '-',
            ''
          ),
          1,
          8
        )
      )
    ),

  full_name text not null,

  phone text,
  email text,

  birth_date date,

  gender text
    check (
      gender is null
      or gender in (
        'male',
        'female',
        'other',
        'unspecified'
      )
    ),

  nationality text,

  identity_type text
    check (
      identity_type is null
      or identity_type in (
        'tc',
        'passport',
        'other'
      )
    ),

  identity_number text,

  address text,
  city text,
  country text,

  preferred_language text
    default 'tr',

  segment text not null
    default 'standard'
    check (
      segment in (
        'standard',
        'repeat',
        'vip',
        'corporate',
        'risk'
      )
    ),

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'inactive',
        'blocked'
      )
    ),

  source text,

  marketing_consent boolean not null
    default false,

  kvkk_consent boolean not null
    default false,

  notes_summary text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create unique index if not exists
  customer_360_code_company_unique
on public.customer_360_customers (
  company_id,
  customer_code
);


create unique index if not exists
  customer_360_phone_company_unique
on public.customer_360_customers (
  company_id,
  regexp_replace(
    coalesce(
      phone,
      ''
    ),
    '\D',
    '',
    'g'
  )
)
where
  phone is not null
  and regexp_replace(
    phone,
    '\D',
    '',
    'g'
  ) <> '';


create unique index if not exists
  customer_360_email_company_unique
on public.customer_360_customers (
  company_id,
  lower(
    trim(
      email
    )
  )
)
where
  email is not null
  and trim(
    email
  ) <> '';


create index if not exists
  customer_360_company_name_idx
on public.customer_360_customers (
  company_id,
  full_name
);


create index if not exists
  customer_360_company_created_idx
on public.customer_360_customers (
  company_id,
  created_at desc
);


-- ============================================================
-- TRAVELERS
-- Main customer may travel with spouse, child, guest etc.
-- ============================================================

create table if not exists
public.customer_360_travelers (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  full_name text not null,

  relationship_label text,

  phone text,
  email text,

  birth_date date,

  gender text,

  nationality text,

  identity_type text
    check (
      identity_type is null
      or identity_type in (
        'tc',
        'passport',
        'other'
      )
    ),

  identity_number text,

  is_primary boolean not null
    default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_travelers_customer_idx
on public.customer_360_travelers (
  customer_id,
  created_at
);


-- ============================================================
-- CUSTOMER RELATIONSHIPS / FAMILY
-- ============================================================

create table if not exists
public.customer_360_relationships (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  related_customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  relation_type text not null,

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  constraint
    customer_360_relationship_not_self
  check (
    customer_id <>
      related_customer_id
  )
);


create unique index if not exists
  customer_360_relationship_unique
on public.customer_360_relationships (
  customer_id,
  related_customer_id,
  relation_type
);


-- ============================================================
-- GROUPS
-- ============================================================

create table if not exists
public.customer_360_groups (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,

  group_type text not null
    default 'travel'
    check (
      group_type in (
        'travel',
        'family',
        'corporate',
        'event',
        'other'
      )
    ),

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create table if not exists
public.customer_360_group_members (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  group_id uuid not null
    references public.customer_360_groups(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  member_role text,

  created_at timestamptz not null
    default now(),

  unique (
    group_id,
    customer_id
  )
);


-- ============================================================
-- NOTES
-- ============================================================

create table if not exists
public.customer_360_notes (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  note text not null,

  note_type text not null
    default 'general'
    check (
      note_type in (
        'general',
        'sales',
        'operation',
        'finance',
        'service'
      )
    ),

  is_important boolean not null
    default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_notes_customer_idx
on public.customer_360_notes (
  customer_id,
  created_at desc
);


-- ============================================================
-- PREFERENCES
-- ============================================================

create table if not exists
public.customer_360_preferences (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  category text not null,

  preference_key text not null,

  preference_value jsonb not null
    default '{}'::jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    customer_id,
    category,
    preference_key
  )
);


-- ============================================================
-- REQUEST / COMPLAINT
-- ============================================================

create table if not exists
public.customer_360_cases (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  case_type text not null
    check (
      case_type in (
        'request',
        'complaint'
      )
    ),

  title text not null,

  detail text,

  priority text not null
    default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  status text not null
    default 'open'
    check (
      status in (
        'open',
        'in_progress',
        'resolved',
        'closed'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  resolved_by uuid
    references auth.users(id)
    on delete set null,

  resolved_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_cases_customer_idx
on public.customer_360_cases (
  customer_id,
  status,
  created_at desc
);


-- ============================================================
-- MESSAGE TIMELINE
-- ============================================================

create table if not exists
public.customer_360_messages (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  channel text not null
    check (
      channel in (
        'whatsapp',
        'sms',
        'email',
        'phone',
        'instagram',
        'system',
        'other'
      )
    ),

  direction text not null
    check (
      direction in (
        'inbound',
        'outbound'
      )
    ),

  subject text,

  body text,

  external_id text,

  sent_at timestamptz not null
    default now(),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_messages_customer_idx
on public.customer_360_messages (
  customer_id,
  sent_at desc
);


-- ============================================================
-- ENTITY LINKS
--
-- IMPORTANT:
-- Existing operational tables remain untouched.
-- Future phases connect bookings/payments/vouchers/etc here.
-- ============================================================

create table if not exists
public.customer_360_entity_links (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  entity_type text not null
    check (
      entity_type in (
        'quote',
        'booking',
        'trip',
        'payment',
        'refund',
        'voucher',
        'message',
        'yacht_booking',
        'package_booking',
        'hotel_booking',
        'activity_booking',
        'tour_booking',
        'other'
      )
    ),

  entity_id uuid,

  entity_key text,

  title text,

  amount numeric(14,2),

  currency text,

  occurred_at timestamptz,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  constraint
    customer_360_entity_identity_required
  check (
    entity_id is not null
    or nullif(
      trim(
        entity_key
      ),
      ''
    ) is not null
  )
);


create index if not exists
  customer_360_entity_customer_idx
on public.customer_360_entity_links (
  customer_id,
  entity_type,
  occurred_at desc
);


create unique index if not exists
  customer_360_entity_uuid_unique
on public.customer_360_entity_links (
  customer_id,
  entity_type,
  entity_id
)
where entity_id is not null;


-- ============================================================
-- UPDATED AT TRIGGER HELPER
-- ============================================================

create or replace function
public.customer_360_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at =
    now();

  return new;
end;
$$;


drop trigger if exists
  customer_360_customers_updated_at
on public.customer_360_customers;


create trigger
  customer_360_customers_updated_at
before update
on public.customer_360_customers
for each row
execute function
  public.customer_360_set_updated_at();


drop trigger if exists
  customer_360_travelers_updated_at
on public.customer_360_travelers;


create trigger
  customer_360_travelers_updated_at
before update
on public.customer_360_travelers
for each row
execute function
  public.customer_360_set_updated_at();


drop trigger if exists
  customer_360_preferences_updated_at
on public.customer_360_preferences;


create trigger
  customer_360_preferences_updated_at
before update
on public.customer_360_preferences
for each row
execute function
  public.customer_360_set_updated_at();


drop trigger if exists
  customer_360_cases_updated_at
on public.customer_360_cases;


create trigger
  customer_360_cases_updated_at
before update
on public.customer_360_cases
for each row
execute function
  public.customer_360_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table
  public.customer_360_customers
enable row level security;

alter table
  public.customer_360_travelers
enable row level security;

alter table
  public.customer_360_relationships
enable row level security;

alter table
  public.customer_360_groups
enable row level security;

alter table
  public.customer_360_group_members
enable row level security;

alter table
  public.customer_360_notes
enable row level security;

alter table
  public.customer_360_preferences
enable row level security;

alter table
  public.customer_360_cases
enable row level security;

alter table
  public.customer_360_messages
enable row level security;

alter table
  public.customer_360_entity_links
enable row level security;


do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customer_360_customers',
    'customer_360_travelers',
    'customer_360_relationships',
    'customer_360_groups',
    'customer_360_group_members',
    'customer_360_notes',
    'customer_360_preferences',
    'customer_360_cases',
    'customer_360_messages',
    'customer_360_entity_links'
  ]
  loop
    execute format(
      'drop policy if exists %I_company_select on public.%I',
      v_table,
      v_table
    );

    execute format(
      'create policy %I_company_select on public.%I for select to authenticated using (public.is_active_company_member(company_id))',
      v_table,
      v_table
    );

    execute format(
      'grant select on public.%I to authenticated',
      v_table
    );

    execute format(
      'revoke insert, update, delete on public.%I from authenticated',
      v_table
    );
  end loop;
end;
$$;


-- ============================================================
-- CREATE CUSTOMER RPC
-- ============================================================

create or replace function
public.customer_360_create_customer(
  p_company_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_birth_date date default null,
  p_identity_type text default null,
  p_identity_number text default null,
  p_city text default null,
  p_country text default null,
  p_source text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text;
begin

  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_full_name
    ),
    ''
  ) is null then
    raise exception
      'Customer name is required';
  end if;


  if
    p_identity_type is not null
    and p_identity_type not in (
      'tc',
      'passport',
      'other'
    )
  then
    raise exception
      'Invalid identity type';
  end if;


  insert into
    public.customer_360_customers (
      company_id,

      full_name,
      phone,
      email,

      birth_date,

      identity_type,
      identity_number,

      city,
      country,

      source,

      created_by,
      updated_by
    )
  values (
    p_company_id,

    trim(
      p_full_name
    ),

    nullif(
      trim(
        p_phone
      ),
      ''
    ),

    nullif(
      lower(
        trim(
          p_email
        )
      ),
      ''
    ),

    p_birth_date,

    p_identity_type,

    nullif(
      trim(
        p_identity_number
      ),
      ''
    ),

    nullif(
      trim(
        p_city
      ),
      ''
    ),

    nullif(
      trim(
        p_country
      ),
      ''
    ),

    nullif(
      trim(
        p_source
      ),
      ''
    ),

    auth.uid(),
    auth.uid()
  )
  returning
    id,
    customer_code
  into
    v_id,
    v_code;


  return jsonb_build_object(
    'ok',
      true,

    'customer_id',
      v_id,

    'customer_code',
      v_code
  );

end;
$$;


revoke execute
on function
public.customer_360_create_customer(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text
)
from public;


grant execute
on function
public.customer_360_create_customer(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text
)
to authenticated;


-- ============================================================
-- UPDATE CUSTOMER RPC
-- ============================================================

create or replace function
public.customer_360_update_customer(
  p_customer_id uuid,
  p_full_name text,
  p_phone text,
  p_email text,
  p_birth_date date,
  p_gender text,
  p_nationality text,
  p_identity_type text,
  p_identity_number text,
  p_address text,
  p_city text,
  p_country text,
  p_preferred_language text,
  p_segment text,
  p_status text,
  p_marketing_consent boolean,
  p_kvkk_consent boolean,
  p_notes_summary text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id
  for update;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_full_name
    ),
    ''
  ) is null then
    raise exception
      'Customer name required';
  end if;


  if p_segment not in (
    'standard',
    'repeat',
    'vip',
    'corporate',
    'risk'
  ) then
    raise exception
      'Invalid segment';
  end if;


  if p_status not in (
    'active',
    'inactive',
    'blocked'
  ) then
    raise exception
      'Invalid status';
  end if;


  update
    public.customer_360_customers
  set
    full_name =
      trim(
        p_full_name
      ),

    phone =
      nullif(
        trim(
          p_phone
        ),
        ''
      ),

    email =
      nullif(
        lower(
          trim(
            p_email
          )
        ),
        ''
      ),

    birth_date =
      p_birth_date,

    gender =
      p_gender,

    nationality =
      nullif(
        trim(
          p_nationality
        ),
        ''
      ),

    identity_type =
      p_identity_type,

    identity_number =
      nullif(
        trim(
          p_identity_number
        ),
        ''
      ),

    address =
      nullif(
        trim(
          p_address
        ),
        ''
      ),

    city =
      nullif(
        trim(
          p_city
        ),
        ''
      ),

    country =
      nullif(
        trim(
          p_country
        ),
        ''
      ),

    preferred_language =
      coalesce(
        nullif(
          trim(
            p_preferred_language
          ),
          ''
        ),
        'tr'
      ),

    segment =
      p_segment,

    status =
      p_status,

    marketing_consent =
      p_marketing_consent,

    kvkk_consent =
      p_kvkk_consent,

    notes_summary =
      nullif(
        trim(
          p_notes_summary
        ),
        ''
      ),

    updated_by =
      auth.uid()

  where id =
    c.id;


  return jsonb_build_object(
    'ok',
      true,

    'customer_id',
      c.id
  );

end;
$$;


revoke execute
on function
public.customer_360_update_customer(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text
)
from public;


grant execute
on function
public.customer_360_update_customer(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  text
)
to authenticated;


-- ============================================================
-- ADD NOTE RPC
-- ============================================================

create or replace function
public.customer_360_add_note(
  p_customer_id uuid,
  p_note text,
  p_note_type text default 'general',
  p_is_important boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;
  v_id uuid;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_note
    ),
    ''
  ) is null then
    raise exception
      'Note required';
  end if;


  if p_note_type not in (
    'general',
    'sales',
    'operation',
    'finance',
    'service'
  ) then
    raise exception
      'Invalid note type';
  end if;


  insert into
    public.customer_360_notes (
      company_id,
      customer_id,

      note,
      note_type,
      is_important,

      created_by
    )
  values (
    c.company_id,
    c.id,

    trim(
      p_note
    ),

    p_note_type,
    p_is_important,

    auth.uid()
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'note_id',
      v_id
  );

end;
$$;


revoke execute
on function
public.customer_360_add_note(
  uuid,
  text,
  text,
  boolean
)
from public;


grant execute
on function
public.customer_360_add_note(
  uuid,
  text,
  text,
  boolean
)
to authenticated;


-- ============================================================
-- FINAL SECURITY
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n
      on n.oid =
        p.pronamespace
    where
      n.nspname =
        'public'
      and p.prosecdef =
        true
      and p.proname like
        'customer_360_%'
  loop
    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );
  end loop;
end;
$$;
