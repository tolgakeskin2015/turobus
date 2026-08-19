
-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.4 — LIVE CUSTOMER IDENTITY SYNC
--
-- 210000 / 213000 / 220000 untouched.
--
-- Existing source tables receive only an AFTER INSERT trigger.
-- Source rows are NEVER updated/deleted.
-- Customer sync failures NEVER block source INSERT.
-- Per-company enable/disable switch is enforced.
-- ============================================================


-- ============================================================
-- LIVE SYNC SETTINGS
-- ============================================================

create table if not exists
public.customer_360_live_sync_settings (
  company_id uuid primary key
    references public.companies(id)
    on delete cascade,

  enabled boolean not null
    default false,

  enabled_by uuid
    references auth.users(id)
    on delete set null,

  enabled_at timestamptz,

  updated_at timestamptz not null
    default now()
);


alter table
  public.customer_360_live_sync_settings
enable row level security;


drop policy if exists
  customer_360_live_sync_settings_select
on public.customer_360_live_sync_settings;


create policy
  customer_360_live_sync_settings_select
on public.customer_360_live_sync_settings
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.customer_360_live_sync_settings
to authenticated;


revoke insert, update, delete
on public.customer_360_live_sync_settings
from authenticated;


drop trigger if exists
  customer_360_live_sync_settings_updated_at
on public.customer_360_live_sync_settings;


create trigger
  customer_360_live_sync_settings_updated_at
before update
on public.customer_360_live_sync_settings
for each row
execute function
  public.customer_360_set_updated_at();


-- ============================================================
-- LIVE SYNC EVENT LOG
-- ============================================================

create table if not exists
public.customer_360_live_sync_events (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  source_table text not null,

  source_id text not null,

  entity_type text not null,

  customer_id uuid
    references public.customer_360_customers(id)
    on delete set null,

  event_status text not null
    check (
      event_status in (
        'matched',
        'created',
        'conflict',
        'skipped',
        'error'
      )
    ),

  event_reason text not null,

  source_name text,
  source_phone text,
  source_email text,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_live_sync_events_company_idx
on public.customer_360_live_sync_events (
  company_id,
  created_at desc
);


create index if not exists
  customer_360_live_sync_events_status_idx
on public.customer_360_live_sync_events (
  company_id,
  event_status,
  created_at desc
);


alter table
  public.customer_360_live_sync_events
enable row level security;


drop policy if exists
  customer_360_live_sync_events_select
on public.customer_360_live_sync_events;


create policy
  customer_360_live_sync_events_select
on public.customer_360_live_sync_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.customer_360_live_sync_events
to authenticated;


revoke insert, update, delete
on public.customer_360_live_sync_events
from authenticated;


-- ============================================================
-- SAFE EVENT LOGGER
-- ============================================================

create or replace function
public.customer_360_live_sync_log(
  p_company_id uuid,
  p_source_table text,
  p_source_id text,
  p_entity_type text,
  p_customer_id uuid,
  p_event_status text,
  p_event_reason text,
  p_source_name text,
  p_source_phone text,
  p_source_email text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  insert into
    public.customer_360_live_sync_events (
      company_id,

      source_table,
      source_id,
      entity_type,

      customer_id,

      event_status,
      event_reason,

      source_name,
      source_phone,
      source_email,

      metadata
    )
  values (
    p_company_id,

    p_source_table,
    p_source_id,
    p_entity_type,

    p_customer_id,

    p_event_status,
    p_event_reason,

    p_source_name,
    p_source_phone,
    p_source_email,

    coalesce(
      p_metadata,
      '{}'::jsonb
    )
  );

end;
$$;


revoke execute
on function
public.customer_360_live_sync_log(
  uuid,
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
)
from public;


-- ============================================================
-- GENERIC AFTER INSERT TRIGGER
--
-- IMPORTANT:
-- Any internal Customer 360 exception is swallowed.
-- The original reservation/quote insert is never blocked.
-- ============================================================

create or replace function
public.customer_360_live_sync_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.customer_360_source_registry%rowtype;

  v_data jsonb;

  v_company_text text;
  v_company_id uuid;

  v_source_id text;

  v_name text;
  v_phone text;
  v_email text;

  v_normal_phone text;
  v_normal_email text;
  v_normal_name text;

  v_customer_ids uuid[];
  v_customer_count integer :=
    0;

  v_customer_id uuid;
  v_existing_name text;

  v_title text;
  v_currency text;

  v_amount numeric;
  v_occurred timestamptz;

  v_identity_lock text;
begin

  begin

    v_data :=
      to_jsonb(
        new
      );


    select *
    into r

    from public.customer_360_source_registry sr

    where
      sr.source_table =
        tg_table_name

      and sr.enabled =
        true

    limit 1;


    if r.id is null then
      return new;
    end if;


    v_company_text :=
      nullif(
        trim(
          v_data ->>
            r.company_column
        ),
        ''
      );


    if v_company_text is null then
      return new;
    end if;


    begin
      v_company_id :=
        v_company_text::uuid;

    exception
      when others then
        return new;
    end;


    if not exists (
      select 1

      from public.customer_360_live_sync_settings s

      where
        s.company_id =
          v_company_id

        and s.enabled =
          true
    ) then
      return new;
    end if;


    v_source_id :=
      nullif(
        trim(
          v_data ->>
            r.id_column
        ),
        ''
      );


    if v_source_id is null then
      return new;
    end if;


    v_name :=
      case
        when r.name_column is null
        then null

        else nullif(
          trim(
            v_data ->>
              r.name_column
          ),
          ''
        )
      end;


    v_phone :=
      case
        when r.phone_column is null
        then null

        else nullif(
          trim(
            v_data ->>
              r.phone_column
          ),
          ''
        )
      end;


    v_email :=
      case
        when r.email_column is null
        then null

        else nullif(
          lower(
            trim(
              v_data ->>
                r.email_column
            )
          ),
          ''
        )
      end;


    v_normal_phone :=
      public.customer_360_normalize_phone(
        v_phone
      );


    v_normal_email :=
      public.customer_360_normalize_email(
        v_email
      );


    v_normal_name :=
      public.customer_360_normalize_name(
        v_name
      );


    if
      v_normal_phone is null
      and v_normal_email is null
    then

      perform
        public.customer_360_live_sync_log(
          v_company_id,
          tg_table_name,
          v_source_id,
          r.entity_type,
          null,
          'skipped',
          'no_phone_or_email',
          v_name,
          v_phone,
          v_email,
          jsonb_build_object(
            'trigger',
              'after_insert'
          )
        );


      return new;
    end if;


    -- ========================================================
    -- Per identity/company serialization.
    -- Prevents concurrent duplicate customer creation.
    -- ========================================================

    v_identity_lock :=
      v_company_id::text ||
      ':' ||
      coalesce(
        v_normal_phone,
        ''
      ) ||
      ':' ||
      coalesce(
        v_normal_email,
        ''
      );


    perform pg_advisory_xact_lock(
      hashtextextended(
        'customer360:live:' ||
          v_identity_lock,
        0
      )
    );


    -- ========================================================
    -- Search all customers matching either contact identifier.
    -- Phone matching customer A + email matching customer B
    -- becomes a conflict.
    -- ========================================================

    select
      array_agg(
        distinct c.id
      ),

      count(
        distinct c.id
      )

    into
      v_customer_ids,
      v_customer_count

    from public.customer_360_customers c

    where
      c.company_id =
        v_company_id

      and (
        (
          v_normal_phone
            is not null

          and public.customer_360_normalize_phone(
            c.phone
          ) =
            v_normal_phone
        )

        or

        (
          v_normal_email
            is not null

          and public.customer_360_normalize_email(
            c.email
          ) =
            v_normal_email
        )
      );


    -- ========================================================
    -- CONTACT SPLIT CONFLICT
    -- ========================================================

    if v_customer_count >
      1
    then

      perform
        public.customer_360_live_sync_log(
          v_company_id,
          tg_table_name,
          v_source_id,
          r.entity_type,
          null,
          'conflict',
          'phone_email_match_different_customers',
          v_name,
          v_phone,
          v_email,
          jsonb_build_object(
            'candidate_customer_ids',
              to_jsonb(
                v_customer_ids
              )
          )
        );


      return new;
    end if;


    -- ========================================================
    -- EXISTING CUSTOMER
    -- ========================================================

    if v_customer_count =
      1
    then

      v_customer_id :=
        v_customer_ids[1];


      select
        c.full_name

      into
        v_existing_name

      from public.customer_360_customers c

      where c.id =
        v_customer_id;


      -- Shared phone/e-mail with another explicit person name:
      -- never auto-merge.
      if
        v_normal_name is not null

        and public.customer_360_normalize_name(
          v_existing_name
        ) is not null

        and public.customer_360_normalize_name(
          v_existing_name
        ) <>
          v_normal_name
      then

        perform
          public.customer_360_live_sync_log(
            v_company_id,
            tg_table_name,
            v_source_id,
            r.entity_type,
            v_customer_id,
            'conflict',
            'same_contact_different_name',
            v_name,
            v_phone,
            v_email,
            jsonb_build_object(
              'existing_customer_name',
                v_existing_name
            )
          );


        return new;
      end if;

    else

      -- ======================================================
      -- NO CUSTOMER: CREATE ONLY WITH A NAME
      -- ======================================================

      if v_normal_name is null then

        perform
          public.customer_360_live_sync_log(
            v_company_id,
            tg_table_name,
            v_source_id,
            r.entity_type,
            null,
            'skipped',
            'missing_customer_name',
            v_name,
            v_phone,
            v_email,
            '{}'::jsonb
          );


        return new;
      end if;


      insert into
        public.customer_360_customers (
          company_id,

          full_name,

          phone,
          email,

          source,

          created_by,
          updated_by
        )
      values (
        v_company_id,

        trim(
          v_name
        ),

        v_phone,
        v_email,

        'live_sync:' ||
          tg_table_name,

        auth.uid(),
        auth.uid()
      )
      returning id
      into v_customer_id;


      perform
        public.customer_360_live_sync_log(
          v_company_id,
          tg_table_name,
          v_source_id,
          r.entity_type,
          v_customer_id,
          'created',
          'new_customer_created',
          v_name,
          v_phone,
          v_email,
          '{}'::jsonb
        );

    end if;


    -- ========================================================
    -- OPTIONAL COMMERCIAL FIELDS
    -- Read via registry/jsonb, no source-table UPDATE.
    -- ========================================================

    v_title :=
      case
        when r.title_column is null
        then null

        else nullif(
          trim(
            v_data ->>
              r.title_column
          ),
          ''
        )
      end;


    v_currency :=
      case
        when r.currency_column is null
        then null

        else nullif(
          upper(
            trim(
              v_data ->>
                r.currency_column
            )
          ),
          ''
        )
      end;


    v_amount :=
      null;


    if r.amount_column is not null then
      begin

        v_amount :=
          nullif(
            trim(
              v_data ->>
                r.amount_column
            ),
            ''
          )::numeric;

      exception
        when others then
          v_amount :=
            null;
      end;
    end if;


    v_occurred :=
      null;


    if r.occurred_at_column is not null then
      begin

        v_occurred :=
          nullif(
            trim(
              v_data ->>
                r.occurred_at_column
            ),
            ''
          )::timestamptz;

      exception
        when others then
          v_occurred :=
            null;
      end;
    end if;


    -- ========================================================
    -- LINK SOURCE RECORD TO CUSTOMER 360 TIMELINE
    -- ========================================================

    if not exists (
      select 1

      from public.customer_360_entity_links l

      where
        l.company_id =
          v_company_id

        and l.customer_id =
          v_customer_id

        and l.entity_type =
          r.entity_type

        and l.entity_key =
          tg_table_name ||
          ':' ||
          v_source_id
    ) then

      insert into
        public.customer_360_entity_links (
          company_id,
          customer_id,

          entity_type,

          entity_key,

          title,

          amount,
          currency,

          occurred_at,

          metadata
        )
      values (
        v_company_id,
        v_customer_id,

        r.entity_type,

        tg_table_name ||
          ':' ||
          v_source_id,

        coalesce(
          v_title,
          v_name,
          tg_table_name
        ),

        v_amount,

        coalesce(
          v_currency,
          'TRY'
        ),

        coalesce(
          v_occurred,
          now()
        ),

        jsonb_build_object(
          'source_table',
            tg_table_name,

          'source_id',
            v_source_id,

          'sync_mode',
            'live_trigger'
        )
      );

    end if;


    perform
      public.customer_360_live_sync_log(
        v_company_id,
        tg_table_name,
        v_source_id,
        r.entity_type,
        v_customer_id,
        'matched',
        'timeline_linked',
        v_name,
        v_phone,
        v_email,
        jsonb_build_object(
          'entity_key',
            tg_table_name ||
            ':' ||
            v_source_id
        )
      );


  exception
    when others then

      -- ======================================================
      -- NEVER BREAK ORIGINAL RESERVATION / QUOTE INSERT
      -- ======================================================

      begin

        if v_company_id is not null then

          perform
            public.customer_360_live_sync_log(
              v_company_id,
              tg_table_name,
              coalesce(
                v_source_id,
                'unknown'
              ),
              coalesce(
                r.entity_type,
                'other'
              ),
              v_customer_id,
              'error',
              sqlstate ||
                ':' ||
                sqlerrm,
              v_name,
              v_phone,
              v_email,
              jsonb_build_object(
                'non_blocking',
                  true
              )
            );

        end if;

      exception
        when others then
          null;
      end;


      return new;

  end;


  return new;

end;
$$;


revoke execute
on function
  public.customer_360_live_sync_trigger()
from public;


-- ============================================================
-- INSTALL TRIGGERS ON REGISTERED SOURCE TABLES
-- Schema-level install, per-company switch controls execution.
-- ============================================================

create or replace function
public.customer_360_install_live_sync(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;

  v_count integer :=
    0;
begin

  if not exists (
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
        'operation_manager'
      )
  ) then

    raise exception
      'Live sync authority required';

  end if;


  -- Refresh registry before trigger installation.
  perform
    public.customer_360_discover_sources();


  for r in
    select sr.*

    from public.customer_360_source_registry sr

    where
      sr.enabled =
        true

      and exists (
        select 1

        from information_schema.tables t

        where
          t.table_schema =
            'public'

          and t.table_name =
            sr.source_table

          and t.table_type =
            'BASE TABLE'
      )

  loop

    execute format(
      'drop trigger if exists customer_360_live_sync_after_insert on public.%I',
      r.source_table
    );


    execute format(
      'create trigger customer_360_live_sync_after_insert
       after insert
       on public.%I
       for each row
       execute function public.customer_360_live_sync_trigger()',
      r.source_table
    );


    v_count :=
      v_count +
      1;

  end loop;


  insert into
    public.customer_360_live_sync_settings (
      company_id,

      enabled,

      enabled_by,
      enabled_at
    )
  values (
    p_company_id,

    true,

    auth.uid(),
    now()
  )
  on conflict (
    company_id
  )
  do update
  set
    enabled =
      true,

    enabled_by =
      auth.uid(),

    enabled_at =
      now(),

    updated_at =
      now();


  return jsonb_build_object(
    'ok',
      true,

    'enabled',
      true,

    'triggers_installed',
      v_count
  );

end;
$$;


revoke execute
on function
  public.customer_360_install_live_sync(uuid)
from public;


grant execute
on function
  public.customer_360_install_live_sync(uuid)
to authenticated;


-- ============================================================
-- DISABLE FOR ONE COMPANY
-- Triggers remain installed but become no-op for that company.
-- ============================================================

create or replace function
public.customer_360_disable_live_sync(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not exists (
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
        'operation_manager'
      )
  ) then

    raise exception
      'Live sync authority required';

  end if;


  insert into
    public.customer_360_live_sync_settings (
      company_id,
      enabled
    )
  values (
    p_company_id,
    false
  )
  on conflict (
    company_id
  )
  do update
  set
    enabled =
      false,

    updated_at =
      now();


  return jsonb_build_object(
    'ok',
      true,

    'enabled',
      false
  );

end;
$$;


revoke execute
on function
  public.customer_360_disable_live_sync(uuid)
from public;


grant execute
on function
  public.customer_360_disable_live_sync(uuid)
to authenticated;


-- ============================================================
-- LIVE SYNC HEALTH
-- ============================================================

create or replace function
public.customer_360_live_sync_health(
  p_company_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enabled boolean :=
    false;

  v_sources integer :=
    0;

  v_triggers integer :=
    0;

  v_matched integer :=
    0;

  v_created integer :=
    0;

  v_conflict integer :=
    0;

  v_error integer :=
    0;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  select coalesce(
    s.enabled,
    false
  )
  into v_enabled

  from public.customer_360_live_sync_settings s

  where s.company_id =
    p_company_id;


  select count(*)
  into v_sources

  from public.customer_360_source_registry sr

  where sr.enabled =
    true;


  select count(*)
  into v_triggers

  from pg_trigger t

  join pg_class c
    on c.oid =
      t.tgrelid

  join pg_namespace n
    on n.oid =
      c.relnamespace

  where
    n.nspname =
      'public'

    and t.tgname =
      'customer_360_live_sync_after_insert'

    and not t.tgisinternal;


  select
    count(*) filter (
      where e.event_status =
        'matched'
    ),

    count(*) filter (
      where e.event_status =
        'created'
    ),

    count(*) filter (
      where e.event_status =
        'conflict'
    ),

    count(*) filter (
      where e.event_status =
        'error'
    )

  into
    v_matched,
    v_created,
    v_conflict,
    v_error

  from public.customer_360_live_sync_events e

  where
    e.company_id =
      p_company_id

    and e.created_at >=
      now() -
      interval '24 hours';


  return jsonb_build_object(
    'ok',
      true,

    'enabled',
      v_enabled,

    'registered_sources',
      v_sources,

    'installed_triggers',
      v_triggers,

    'matched_24h',
      coalesce(
        v_matched,
        0
      ),

    'created_24h',
      coalesce(
        v_created,
        0
      ),

    'conflict_24h',
      coalesce(
        v_conflict,
        0
      ),

    'error_24h',
      coalesce(
        v_error,
        0
      )
  );

end;
$$;


revoke execute
on function
  public.customer_360_live_sync_health(uuid)
from public;


grant execute
on function
  public.customer_360_live_sync_health(uuid)
to authenticated;


-- ============================================================
-- FINAL SECURITY DEFINER HARDENING
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


-- Restore exact authenticated grants for public entry points.
grant execute
on function
  public.customer_360_install_live_sync(uuid)
to authenticated;


grant execute
on function
  public.customer_360_disable_live_sync(uuid)
to authenticated;


grant execute
on function
  public.customer_360_live_sync_health(uuid)
to authenticated;
