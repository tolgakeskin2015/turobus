-- ============================================================
-- TUROBÜS CUSTOMER 360 PHASE 1.16
-- KVKK / CONSENT AUDIT + PROTECTED IDENTITY ACCESS
-- ============================================================


-- ============================================================
-- SENSITIVE IDENTITY AUTHORITY
-- ============================================================

create or replace function
public.customer_360_has_sensitive_identity_authority(
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
        'operation_manager'
      )
  );
$$;


revoke all
on function
  public.customer_360_has_sensitive_identity_authority(uuid)
from public;


grant execute
on function
  public.customer_360_has_sensitive_identity_authority(uuid)
to authenticated;


-- ============================================================
-- IDENTITY MASK HELPER
-- ============================================================

create or replace function
public.customer_360_mask_identity(
  p_value text
)
returns text
language sql
immutable
set search_path = public
as $$
  select
    case
      when nullif(
        trim(p_value),
        ''
      ) is null
      then null

      else
        '••••••••' ||
        right(
          trim(p_value),
          least(
            4,
            length(
              trim(p_value)
            )
          )
        )
    end;
$$;


revoke all
on function
  public.customer_360_mask_identity(text)
from public;


-- ============================================================
-- CUSTOMER IDENTITY VAULT
-- No authenticated direct access.
-- Raw ID numbers live only here.
-- ============================================================

create table if not exists
public.customer_360_customer_identity_vault (
  customer_id uuid primary key,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  identity_type text,

  identity_number text not null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


alter table
  public.customer_360_customer_identity_vault
enable row level security;


revoke all privileges
on table
  public.customer_360_customer_identity_vault
from anon, authenticated;


create table if not exists
public.customer_360_traveler_identity_vault (
  traveler_id uuid primary key,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  identity_type text,

  identity_number text not null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


alter table
  public.customer_360_traveler_identity_vault
enable row level security;


revoke all privileges
on table
  public.customer_360_traveler_identity_vault
from anon, authenticated;


-- ============================================================
-- BACKFILL EXISTING CUSTOMER IDENTITIES
-- ============================================================

insert into
  public.customer_360_customer_identity_vault (
    customer_id,
    company_id,
    identity_type,
    identity_number,
    updated_by,
    created_at,
    updated_at
  )
select
  c.id,
  c.company_id,
  c.identity_type,
  trim(c.identity_number),
  c.updated_by,
  c.created_at,
  now()
from public.customer_360_customers c
where
  nullif(
    trim(c.identity_number),
    ''
  ) is not null
  and left(
    trim(c.identity_number),
    4
  ) <> '••••'
on conflict (
  customer_id
)
do update set
  company_id =
    excluded.company_id,

  identity_type =
    excluded.identity_type,

  identity_number =
    excluded.identity_number,

  updated_by =
    excluded.updated_by,

  updated_at =
    now();


insert into
  public.customer_360_traveler_identity_vault (
    traveler_id,
    company_id,
    identity_type,
    identity_number,
    updated_by,
    created_at,
    updated_at
  )
select
  t.id,
  t.company_id,
  t.identity_type,
  trim(t.identity_number),
  t.created_by,
  t.created_at,
  now()
from public.customer_360_travelers t
where
  nullif(
    trim(t.identity_number),
    ''
  ) is not null
  and left(
    trim(t.identity_number),
    4
  ) <> '••••'
on conflict (
  traveler_id
)
do update set
  company_id =
    excluded.company_id,

  identity_type =
    excluded.identity_type,

  identity_number =
    excluded.identity_number,

  updated_by =
    excluded.updated_by,

  updated_at =
    now();


-- ============================================================
-- REDACT RAW VALUES FROM NORMAL TABLES
-- ============================================================

update public.customer_360_customers
set identity_number =
  public.customer_360_mask_identity(
    identity_number
  )
where
  nullif(
    trim(identity_number),
    ''
  ) is not null
  and left(
    trim(identity_number),
    4
  ) <> '••••';


update public.customer_360_travelers
set identity_number =
  public.customer_360_mask_identity(
    identity_number
  )
where
  nullif(
    trim(identity_number),
    ''
  ) is not null
  and left(
    trim(identity_number),
    4
  ) <> '••••';


-- ============================================================
-- FUTURE CUSTOMER IDENTITY CAPTURE
-- Raw value never remains in normal customer row.
-- ============================================================

create or replace function
public.customer_360_capture_customer_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from
      public.customer_360_customer_identity_vault
    where customer_id =
      old.id;

    return old;
  end if;


  if tg_op = 'INSERT' then
    if
      nullif(
        trim(new.identity_number),
        ''
      ) is not null
      and left(
        trim(new.identity_number),
        4
      ) <> '••••'
    then

      insert into
        public.customer_360_customer_identity_vault (
          customer_id,
          company_id,
          identity_type,
          identity_number,
          updated_by
        )
      values (
        new.id,
        new.company_id,
        new.identity_type,
        trim(new.identity_number),
        auth.uid()
      )
      on conflict (
        customer_id
      )
      do update set
        company_id =
          excluded.company_id,

        identity_type =
          excluded.identity_type,

        identity_number =
          excluded.identity_number,

        updated_by =
          excluded.updated_by,

        updated_at =
          now();


      new.identity_number =
        public.customer_360_mask_identity(
          new.identity_number
        );
    end if;


    return new;
  end if;


  if
    new.identity_number is distinct from
    old.identity_number
  then

    if
      nullif(
        trim(new.identity_number),
        ''
      ) is null
    then
      delete from
        public.customer_360_customer_identity_vault
      where customer_id =
        new.id;

      new.identity_number =
        null;

    elsif left(
      trim(new.identity_number),
      4
    ) <> '••••'
    then

      insert into
        public.customer_360_customer_identity_vault (
          customer_id,
          company_id,
          identity_type,
          identity_number,
          updated_by
        )
      values (
        new.id,
        new.company_id,
        new.identity_type,
        trim(new.identity_number),
        auth.uid()
      )
      on conflict (
        customer_id
      )
      do update set
        company_id =
          excluded.company_id,

        identity_type =
          excluded.identity_type,

        identity_number =
          excluded.identity_number,

        updated_by =
          excluded.updated_by,

        updated_at =
          now();


      new.identity_number =
        public.customer_360_mask_identity(
          new.identity_number
        );
    end if;
  end if;


  if
    new.identity_type is distinct from
    old.identity_type
  then
    update
      public.customer_360_customer_identity_vault
    set
      identity_type =
        new.identity_type,

      updated_by =
        auth.uid(),

      updated_at =
        now()
    where customer_id =
      new.id;
  end if;


  return new;
end;
$$;


revoke all
on function
  public.customer_360_capture_customer_identity()
from public;


drop trigger if exists
  customer_360_customer_identity_before_write
on public.customer_360_customers;


create trigger
  customer_360_customer_identity_before_write
before insert or update
on public.customer_360_customers
for each row
execute function
  public.customer_360_capture_customer_identity();


drop trigger if exists
  customer_360_customer_identity_after_delete
on public.customer_360_customers;


create trigger
  customer_360_customer_identity_after_delete
after delete
on public.customer_360_customers
for each row
execute function
  public.customer_360_capture_customer_identity();


-- ============================================================
-- FUTURE TRAVELER IDENTITY CAPTURE
-- ============================================================

create or replace function
public.customer_360_capture_traveler_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from
      public.customer_360_traveler_identity_vault
    where traveler_id =
      old.id;

    return old;
  end if;


  if tg_op = 'INSERT' then
    if
      nullif(
        trim(new.identity_number),
        ''
      ) is not null
      and left(
        trim(new.identity_number),
        4
      ) <> '••••'
    then

      insert into
        public.customer_360_traveler_identity_vault (
          traveler_id,
          company_id,
          identity_type,
          identity_number,
          updated_by
        )
      values (
        new.id,
        new.company_id,
        new.identity_type,
        trim(new.identity_number),
        auth.uid()
      )
      on conflict (
        traveler_id
      )
      do update set
        company_id =
          excluded.company_id,

        identity_type =
          excluded.identity_type,

        identity_number =
          excluded.identity_number,

        updated_by =
          excluded.updated_by,

        updated_at =
          now();


      new.identity_number =
        public.customer_360_mask_identity(
          new.identity_number
        );
    end if;


    return new;
  end if;


  if
    new.identity_number is distinct from
    old.identity_number
  then

    if
      nullif(
        trim(new.identity_number),
        ''
      ) is null
    then
      delete from
        public.customer_360_traveler_identity_vault
      where traveler_id =
        new.id;

      new.identity_number =
        null;

    elsif left(
      trim(new.identity_number),
      4
    ) <> '••••'
    then

      insert into
        public.customer_360_traveler_identity_vault (
          traveler_id,
          company_id,
          identity_type,
          identity_number,
          updated_by
        )
      values (
        new.id,
        new.company_id,
        new.identity_type,
        trim(new.identity_number),
        auth.uid()
      )
      on conflict (
        traveler_id
      )
      do update set
        company_id =
          excluded.company_id,

        identity_type =
          excluded.identity_type,

        identity_number =
          excluded.identity_number,

        updated_by =
          excluded.updated_by,

        updated_at =
          now();


      new.identity_number =
        public.customer_360_mask_identity(
          new.identity_number
        );
    end if;
  end if;


  if
    new.identity_type is distinct from
    old.identity_type
  then
    update
      public.customer_360_traveler_identity_vault
    set
      identity_type =
        new.identity_type,

      updated_by =
        auth.uid(),

      updated_at =
        now()
    where traveler_id =
      new.id;
  end if;


  return new;
end;
$$;


revoke all
on function
  public.customer_360_capture_traveler_identity()
from public;


drop trigger if exists
  customer_360_traveler_identity_before_write
on public.customer_360_travelers;


create trigger
  customer_360_traveler_identity_before_write
before insert or update
on public.customer_360_travelers
for each row
execute function
  public.customer_360_capture_traveler_identity();


drop trigger if exists
  customer_360_traveler_identity_after_delete
on public.customer_360_travelers;


create trigger
  customer_360_traveler_identity_after_delete
after delete
on public.customer_360_travelers
for each row
execute function
  public.customer_360_capture_traveler_identity();


-- ============================================================
-- CONSENT HISTORY
-- ============================================================

create table if not exists
public.customer_360_consent_history (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null,

  consent_type text not null
    check (
      consent_type in (
        'kvkk',
        'marketing'
      )
    ),

  granted boolean not null,

  event_type text not null
    default 'change'
    check (
      event_type in (
        'snapshot',
        'change'
      )
    ),

  source_channel text not null
    default 'other'
    check (
      source_channel in (
        'written',
        'web',
        'phone',
        'whatsapp',
        'email',
        'manual',
        'legacy_snapshot',
        'other'
      )
    ),

  statement_version text,

  note text,

  recorded_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_consent_history_customer_idx
on public.customer_360_consent_history (
  customer_id,
  created_at desc
);


alter table
  public.customer_360_consent_history
enable row level security;


drop policy if exists
  customer_360_consent_history_company_select
on public.customer_360_consent_history;


create policy
  customer_360_consent_history_company_select
on public.customer_360_consent_history
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.customer_360_consent_history
to authenticated;


revoke insert, update, delete
on public.customer_360_consent_history
from authenticated;


-- Preserve current state without pretending we know
-- the original legal consent timestamp.
insert into
  public.customer_360_consent_history (
    company_id,
    customer_id,
    consent_type,
    granted,
    event_type,
    source_channel,
    statement_version,
    note,
    recorded_by,
    created_at
  )
select
  c.company_id,
  c.id,
  x.consent_type,
  x.granted,
  'snapshot',
  'legacy_snapshot',
  null,
  'Phase 1.16 öncesindeki mevcut izin durumunun sistem anlık görüntüsü.',
  c.updated_by,
  now()
from public.customer_360_customers c
cross join lateral (
  values
    (
      'kvkk'::text,
      c.kvkk_consent
    ),
    (
      'marketing'::text,
      c.marketing_consent
    )
) as x(
  consent_type,
  granted
);


-- ============================================================
-- IDENTITY ACCESS LOG
-- ============================================================

create table if not exists
public.customer_360_identity_access_log (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid,

  subject_type text not null
    check (
      subject_type in (
        'customer',
        'traveler'
      )
    ),

  subject_id uuid not null,

  action text not null
    default 'reveal'
    check (
      action in (
        'reveal'
      )
    ),

  reason text not null,

  performed_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_identity_access_company_idx
on public.customer_360_identity_access_log (
  company_id,
  created_at desc
);


create index if not exists
  customer_360_identity_access_customer_idx
on public.customer_360_identity_access_log (
  customer_id,
  created_at desc
);


alter table
  public.customer_360_identity_access_log
enable row level security;


drop policy if exists
  customer_360_identity_access_authorized_select
on public.customer_360_identity_access_log;


create policy
  customer_360_identity_access_authorized_select
on public.customer_360_identity_access_log
for select
to authenticated
using (
  public.customer_360_has_sensitive_identity_authority(
    company_id
  )
);


grant select
on public.customer_360_identity_access_log
to authenticated;


revoke insert, update, delete
on public.customer_360_identity_access_log
from authenticated;


-- ============================================================
-- CONSENT UPDATE RPC
-- ============================================================

create or replace function
public.customer_360_set_consent(
  p_company_id uuid,
  p_customer_id uuid,
  p_consent_type text,
  p_granted boolean,
  p_source_channel text,
  p_statement_version text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'İzin kaydı değiştirme yetkiniz bulunmuyor.';
  end if;


  if p_consent_type not in (
    'kvkk',
    'marketing'
  ) then
    raise exception
      'Geçersiz izin türü.';
  end if;


  if p_source_channel not in (
    'written',
    'web',
    'phone',
    'whatsapp',
    'email',
    'manual',
    'other'
  ) then
    raise exception
      'Geçersiz izin kanalı.';
  end if;


  if not exists (
    select 1
    from public.customer_360_customers c
    where
      c.id =
        p_customer_id
      and c.company_id =
        p_company_id
  ) then
    raise exception
      'Müşteri bulunamadı.';
  end if;


  if p_consent_type =
     'kvkk'
  then
    update public.customer_360_customers
    set
      kvkk_consent =
        p_granted,

      updated_by =
        auth.uid(),

      updated_at =
        now()
    where
      id =
        p_customer_id
      and company_id =
        p_company_id;

  else
    update public.customer_360_customers
    set
      marketing_consent =
        p_granted,

      updated_by =
        auth.uid(),

      updated_at =
        now()
    where
      id =
        p_customer_id
      and company_id =
        p_company_id;
  end if;


  insert into
    public.customer_360_consent_history (
      company_id,
      customer_id,
      consent_type,
      granted,
      event_type,
      source_channel,
      statement_version,
      note,
      recorded_by
    )
  values (
    p_company_id,
    p_customer_id,
    p_consent_type,
    p_granted,
    'change',
    p_source_channel,
    nullif(
      trim(
        coalesce(
          p_statement_version,
          ''
        )
      ),
      ''
    ),
    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    auth.uid()
  );


  return jsonb_build_object(
    'success',
      true,

    'customer_id',
      p_customer_id,

    'consent_type',
      p_consent_type,

    'granted',
      p_granted
  );
end;
$$;


revoke all
on function
  public.customer_360_set_consent(
    uuid,
    uuid,
    text,
    boolean,
    text,
    text,
    text
  )
from public;


grant execute
on function
  public.customer_360_set_consent(
    uuid,
    uuid,
    text,
    boolean,
    text,
    text,
    text
  )
to authenticated;


-- ============================================================
-- REVEAL IDENTITY RPC
-- Every reveal requires reason and creates audit log.
-- ============================================================

create or replace function
public.customer_360_reveal_identity(
  p_company_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity_type text;
  v_identity_number text;
  v_customer_id uuid;
begin
  if not public.customer_360_has_sensitive_identity_authority(
    p_company_id
  ) then
    raise exception
      'Kimlik bilgisi görüntüleme yetkiniz bulunmuyor.';
  end if;


  if length(
    trim(
      coalesce(
        p_reason,
        ''
      )
    )
  ) < 5 then
    raise exception
      'Kimlik görüntüleme gerekçesi en az 5 karakter olmalıdır.';
  end if;


  if p_subject_type =
     'customer'
  then

    select
      v.identity_type,
      v.identity_number,
      v.customer_id
    into
      v_identity_type,
      v_identity_number,
      v_customer_id
    from
      public.customer_360_customer_identity_vault v
    where
      v.customer_id =
        p_subject_id
      and v.company_id =
        p_company_id;


  elsif p_subject_type =
        'traveler'
  then

    select
      v.identity_type,
      v.identity_number,
      t.customer_id
    into
      v_identity_type,
      v_identity_number,
      v_customer_id
    from
      public.customer_360_traveler_identity_vault v
    join
      public.customer_360_travelers t
      on t.id =
        v.traveler_id
    where
      v.traveler_id =
        p_subject_id
      and v.company_id =
        p_company_id
      and t.company_id =
        p_company_id;

  else
    raise exception
      'Geçersiz kimlik kayıt türü.';
  end if;


  if
    v_identity_number is null
  then
    raise exception
      'Korunan kimlik numarası bulunamadı.';
  end if;


  insert into
    public.customer_360_identity_access_log (
      company_id,
      customer_id,
      subject_type,
      subject_id,
      action,
      reason,
      performed_by
    )
  values (
    p_company_id,
    v_customer_id,
    p_subject_type,
    p_subject_id,
    'reveal',
    trim(p_reason),
    auth.uid()
  );


  return jsonb_build_object(
    'subject_type',
      p_subject_type,

    'subject_id',
      p_subject_id,

    'identity_type',
      v_identity_type,

    'identity_number',
      v_identity_number
  );
end;
$$;


revoke all
on function
  public.customer_360_reveal_identity(
    uuid,
    text,
    uuid,
    text
  )
from public;


grant execute
on function
  public.customer_360_reveal_identity(
    uuid,
    text,
    uuid,
    text
  )
to authenticated;


-- ============================================================
-- PER-CUSTOMER PRIVACY SNAPSHOT
-- ============================================================

create or replace function
public.customer_360_privacy_detail_snapshot(
  p_company_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_reveal boolean;
  v_result jsonb;
begin
  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Aktif firma üyeliği bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.customer_360_customers c
    where
      c.id =
        p_customer_id
      and c.company_id =
        p_company_id
  ) then
    raise exception
      'Müşteri bulunamadı.';
  end if;


  v_can_reveal =
    public.customer_360_has_sensitive_identity_authority(
      p_company_id
    );


  select jsonb_build_object(
    'can_reveal_identity',
      v_can_reveal,

    'consent_history',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', h.id,
              'consent_type', h.consent_type,
              'granted', h.granted,
              'event_type', h.event_type,
              'source_channel', h.source_channel,
              'statement_version', h.statement_version,
              'note', h.note,
              'recorded_by', h.recorded_by,
              'created_at', h.created_at
            )
            order by h.created_at desc
          )
          from public.customer_360_consent_history h
          where
            h.company_id =
              p_company_id
            and h.customer_id =
              p_customer_id
        ),
        '[]'::jsonb
      ),

    'identity_access_log',
      case
        when v_can_reveal
        then
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'id', a.id,
                  'subject_type', a.subject_type,
                  'subject_id', a.subject_id,
                  'reason', a.reason,
                  'performed_by', a.performed_by,
                  'created_at', a.created_at
                )
                order by a.created_at desc
              )
              from public.customer_360_identity_access_log a
              where
                a.company_id =
                  p_company_id
                and a.customer_id =
                  p_customer_id
              limit 50
            ),
            '[]'::jsonb
          )

        else
          '[]'::jsonb
      end
  )
  into v_result;


  return v_result;
end;
$$;


revoke all
on function
  public.customer_360_privacy_detail_snapshot(
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.customer_360_privacy_detail_snapshot(
    uuid,
    uuid
  )
to authenticated;


-- ============================================================
-- COMPANY PRIVACY CENTER SNAPSHOT
-- ============================================================

create or replace function
public.customer_360_privacy_center_snapshot(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Aktif firma üyeliği bulunamadı.';
  end if;


  select jsonb_build_object(
    'generated_at',
      now(),

    'total_customers',
      count(*),

    'kvkk_granted',
      count(*) filter (
        where c.kvkk_consent =
          true
      ),

    'marketing_granted',
      count(*) filter (
        where c.marketing_consent =
          true
      ),

    'protected_identity_count',
      count(*) filter (
        where
          nullif(
            trim(c.identity_number),
            ''
          ) is not null
      ),

    'customers',
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'customer_code', c.customer_code,
            'full_name', c.full_name,
            'phone', c.phone,
            'email', c.email,
            'kvkk_consent', c.kvkk_consent,
            'marketing_consent', c.marketing_consent,
            'identity_type', c.identity_type,
            'identity_masked', c.identity_number,
            'status', c.status,
            'segment', c.segment
          )
          order by c.full_name
        ),
        '[]'::jsonb
      )
  )
  into v_result
  from public.customer_360_customers c
  where c.company_id =
    p_company_id;


  return v_result;
end;
$$;


revoke all
on function
  public.customer_360_privacy_center_snapshot(uuid)
from public;


grant execute
on function
  public.customer_360_privacy_center_snapshot(uuid)
to authenticated;


-- ============================================================
-- PRESERVE PHASE 1.15 MERGE WITH NEW PRIVACY DATA
-- Rename immutable 1.15 functions and wrap them.
-- ============================================================

alter function
  public.customer_360_merge_preview(
    uuid,
    uuid,
    uuid
  )
rename to
  customer_360_merge_preview_core_115;


revoke all
on function
  public.customer_360_merge_preview_core_115(
    uuid,
    uuid,
    uuid
  )
from public, authenticated;


create or replace function
public.customer_360_merge_preview(
  p_company_id uuid,
  p_target_customer_id uuid,
  p_source_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_target_identity text;
  v_source_identity text;
  v_identity_conflict boolean;
begin
  v_result :=
    public.customer_360_merge_preview_core_115(
      p_company_id,
      p_target_customer_id,
      p_source_customer_id
    );


  select identity_number
  into v_target_identity
  from public.customer_360_customer_identity_vault
  where
    company_id =
      p_company_id
    and customer_id =
      p_target_customer_id;


  select identity_number
  into v_source_identity
  from public.customer_360_customer_identity_vault
  where
    company_id =
      p_company_id
    and customer_id =
      p_source_customer_id;


  v_identity_conflict :=
    (
      v_target_identity is not null
      and v_source_identity is not null
      and trim(v_target_identity) <>
          trim(v_source_identity)
    );


  return jsonb_set(
    v_result,
    '{identity_conflict}',
    to_jsonb(
      v_identity_conflict
    ),
    true
  );
end;
$$;


revoke all
on function
  public.customer_360_merge_preview(
    uuid,
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.customer_360_merge_preview(
    uuid,
    uuid,
    uuid
  )
to authenticated;


alter function
  public.customer_360_merge_customers(
    uuid,
    uuid,
    uuid
  )
rename to
  customer_360_merge_customers_core_115;


revoke all
on function
  public.customer_360_merge_customers_core_115(
    uuid,
    uuid,
    uuid
  )
from public, authenticated;


create or replace function
public.customer_360_merge_customers(
  p_company_id uuid,
  p_target_customer_id uuid,
  p_source_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Müşteri birleştirme yetkiniz bulunmuyor.';
  end if;


  if p_target_customer_id =
     p_source_customer_id then
    raise exception
      'Kaynak ve hedef müşteri aynı olamaz.';
  end if;


  -- Preserve consent history under target profile.
  update
    public.customer_360_consent_history
  set customer_id =
    p_target_customer_id
  where
    company_id =
      p_company_id
    and customer_id =
      p_source_customer_id;


  -- Preserve identity access history.
  update
    public.customer_360_identity_access_log
  set customer_id =
    p_target_customer_id
  where
    company_id =
      p_company_id
    and customer_id =
      p_source_customer_id;


  -- Target identity wins. If target has no protected identity,
  -- inherit source identity before core merge removes source.
  insert into
    public.customer_360_customer_identity_vault (
      customer_id,
      company_id,
      identity_type,
      identity_number,
      updated_by,
      created_at,
      updated_at
    )
  select
    p_target_customer_id,
    company_id,
    identity_type,
    identity_number,
    auth.uid(),
    created_at,
    now()
  from
    public.customer_360_customer_identity_vault
  where
    company_id =
      p_company_id
    and customer_id =
      p_source_customer_id
  on conflict (
    customer_id
  )
  do nothing;


  delete from
    public.customer_360_customer_identity_vault
  where
    company_id =
      p_company_id
    and customer_id =
      p_source_customer_id;


  v_result :=
    public.customer_360_merge_customers_core_115(
      p_company_id,
      p_target_customer_id,
      p_source_customer_id
    );


  return
    v_result ||
    jsonb_build_object(
      'privacy_history_preserved',
      true,

      'identity_vault_preserved',
      true
    );
end;
$$;


revoke all
on function
  public.customer_360_merge_customers(
    uuid,
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.customer_360_merge_customers(
    uuid,
    uuid,
    uuid
  )
to authenticated;
