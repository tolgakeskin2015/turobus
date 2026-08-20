-- ============================================================
-- CUSTOMER 360 PHASE 1.15
-- DUPLICATE CUSTOMER MERGE CENTER
-- ============================================================


-- ============================================================
-- MERGE AUDIT HISTORY
-- ============================================================

create table if not exists
public.customer_360_merge_history (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  target_customer_id uuid
    references public.customer_360_customers(id)
    on delete set null,

  source_customer_id uuid not null,

  source_customer_code text,
  source_customer_name text,

  target_customer_code text,
  target_customer_name text,

  merge_summary jsonb not null
    default '{}'::jsonb,

  source_snapshot jsonb not null
    default '{}'::jsonb,

  performed_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_merge_history_company_idx
on public.customer_360_merge_history (
  company_id,
  created_at desc
);


create index if not exists
  customer_360_merge_history_target_idx
on public.customer_360_merge_history (
  target_customer_id,
  created_at desc
);


alter table
  public.customer_360_merge_history
enable row level security;


drop policy if exists
  customer_360_merge_history_company_select
on public.customer_360_merge_history;


create policy
  customer_360_merge_history_company_select
on public.customer_360_merge_history
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.customer_360_merge_history
to authenticated;


revoke insert, update, delete
on public.customer_360_merge_history
from authenticated;


-- ============================================================
-- MERGE PREVIEW
-- ============================================================

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
  v_target
    public.customer_360_customers%rowtype;

  v_source
    public.customer_360_customers%rowtype;

  v_result jsonb;
begin
  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Aktif firma üyeliği bulunamadı.';
  end if;


  if p_target_customer_id =
     p_source_customer_id then
    raise exception
      'Kaynak ve hedef müşteri aynı olamaz.';
  end if;


  select *
  into v_target
  from public.customer_360_customers
  where
    id = p_target_customer_id
    and company_id = p_company_id;


  if not found then
    raise exception
      'Hedef müşteri bulunamadı.';
  end if;


  select *
  into v_source
  from public.customer_360_customers
  where
    id = p_source_customer_id
    and company_id = p_company_id;


  if not found then
    raise exception
      'Kaynak müşteri bulunamadı.';
  end if;


  select jsonb_build_object(
    'target_customer',
      jsonb_build_object(
        'id', v_target.id,
        'customer_code', v_target.customer_code,
        'full_name', v_target.full_name,
        'phone', v_target.phone,
        'email', v_target.email,
        'segment', v_target.segment,
        'status', v_target.status
      ),

    'source_customer',
      jsonb_build_object(
        'id', v_source.id,
        'customer_code', v_source.customer_code,
        'full_name', v_source.full_name,
        'phone', v_source.phone,
        'email', v_source.email,
        'segment', v_source.segment,
        'status', v_source.status
      ),

    'travelers',
      (
        select count(*)
        from public.customer_360_travelers
        where customer_id =
          p_source_customer_id
      ),

    'notes',
      (
        select count(*)
        from public.customer_360_notes
        where customer_id =
          p_source_customer_id
      ),

    'preferences',
      (
        select count(*)
        from public.customer_360_preferences
        where customer_id =
          p_source_customer_id
      ),

    'cases',
      (
        select count(*)
        from public.customer_360_cases
        where customer_id =
          p_source_customer_id
      ),

    'messages',
      (
        select count(*)
        from public.customer_360_messages
        where customer_id =
          p_source_customer_id
      ),

    'entity_links',
      (
        select count(*)
        from public.customer_360_entity_links
        where customer_id =
          p_source_customer_id
      ),

    'group_memberships',
      (
        select count(*)
        from public.customer_360_group_members
        where customer_id =
          p_source_customer_id
      ),

    'relationships',
      (
        select count(*)
        from public.customer_360_relationships
        where
          customer_id =
            p_source_customer_id
          or related_customer_id =
            p_source_customer_id
      ),

    'phone_conflict',
      (
        v_target.phone is not null
        and v_source.phone is not null
        and regexp_replace(
          v_target.phone,
          '\D',
          '',
          'g'
        ) <>
        regexp_replace(
          v_source.phone,
          '\D',
          '',
          'g'
        )
      ),

    'email_conflict',
      (
        v_target.email is not null
        and v_source.email is not null
        and lower(trim(v_target.email)) <>
            lower(trim(v_source.email))
      ),

    'identity_conflict',
      (
        v_target.identity_number is not null
        and v_source.identity_number is not null
        and trim(v_target.identity_number) <>
            trim(v_source.identity_number)
      )
  )
  into v_result;


  return v_result;
end;
$$;


revoke execute
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


-- ============================================================
-- MERGE EXECUTION
-- ============================================================

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
  v_target
    public.customer_360_customers%rowtype;

  v_source
    public.customer_360_customers%rowtype;

  v_travelers integer := 0;
  v_notes integer := 0;
  v_preferences integer := 0;
  v_cases integer := 0;
  v_messages integer := 0;
  v_entity_links integer := 0;
  v_groups integer := 0;
  v_relationships integer := 0;

  v_summary jsonb;
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


  select *
  into v_target
  from public.customer_360_customers
  where
    id = p_target_customer_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Hedef müşteri bulunamadı.';
  end if;


  select *
  into v_source
  from public.customer_360_customers
  where
    id = p_source_customer_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Kaynak müşteri bulunamadı.';
  end if;


  select count(*)
  into v_travelers
  from public.customer_360_travelers
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_notes
  from public.customer_360_notes
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_preferences
  from public.customer_360_preferences
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_cases
  from public.customer_360_cases
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_messages
  from public.customer_360_messages
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_entity_links
  from public.customer_360_entity_links
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_groups
  from public.customer_360_group_members
  where customer_id =
    p_source_customer_id;


  select count(*)
  into v_relationships
  from public.customer_360_relationships
  where
    customer_id =
      p_source_customer_id
    or related_customer_id =
      p_source_customer_id;


  -- Simple child rows
  update public.customer_360_travelers
  set customer_id =
    p_target_customer_id
  where customer_id =
    p_source_customer_id;


  update public.customer_360_notes
  set customer_id =
    p_target_customer_id
  where customer_id =
    p_source_customer_id;


  update public.customer_360_cases
  set customer_id =
    p_target_customer_id
  where customer_id =
    p_source_customer_id;


  update public.customer_360_messages
  set customer_id =
    p_target_customer_id
  where customer_id =
    p_source_customer_id;


  -- Preferences: target wins on duplicate key
  insert into
    public.customer_360_preferences (
      company_id,
      customer_id,
      category,
      preference_key,
      preference_value,
      created_by,
      created_at,
      updated_at
    )
  select
    company_id,
    p_target_customer_id,
    category,
    preference_key,
    preference_value,
    created_by,
    created_at,
    updated_at
  from public.customer_360_preferences
  where customer_id =
    p_source_customer_id
  on conflict (
    customer_id,
    category,
    preference_key
  )
  do nothing;


  delete from
    public.customer_360_preferences
  where customer_id =
    p_source_customer_id;


  -- Group memberships: dedupe automatically
  insert into
    public.customer_360_group_members (
      company_id,
      group_id,
      customer_id,
      member_role,
      created_at
    )
  select
    company_id,
    group_id,
    p_target_customer_id,
    member_role,
    created_at
  from public.customer_360_group_members
  where customer_id =
    p_source_customer_id
  on conflict (
    group_id,
    customer_id
  )
  do nothing;


  delete from
    public.customer_360_group_members
  where customer_id =
    p_source_customer_id;


  -- Entity links: preserve real operational references
  insert into
    public.customer_360_entity_links (
      company_id,
      customer_id,
      entity_type,
      entity_id,
      entity_key,
      title,
      amount,
      currency,
      occurred_at,
      metadata,
      created_at
    )
  select
    company_id,
    p_target_customer_id,
    entity_type,
    entity_id,
    entity_key,
    title,
    amount,
    currency,
    occurred_at,
    metadata,
    created_at
  from public.customer_360_entity_links
  where customer_id =
    p_source_customer_id
  on conflict
  do nothing;


  delete from
    public.customer_360_entity_links
  where customer_id =
    p_source_customer_id;


  -- Relationships: transform source ID into target ID,
  -- prevent self-relationship and duplicate rows.
  insert into
    public.customer_360_relationships (
      company_id,
      customer_id,
      related_customer_id,
      relation_type,
      note,
      created_by,
      created_at
    )
  select
    r.company_id,

    case
      when r.customer_id =
        p_source_customer_id
      then p_target_customer_id
      else r.customer_id
    end,

    case
      when r.related_customer_id =
        p_source_customer_id
      then p_target_customer_id
      else r.related_customer_id
    end,

    r.relation_type,
    r.note,
    r.created_by,
    r.created_at

  from public.customer_360_relationships r

  where
    (
      r.customer_id =
        p_source_customer_id
      or r.related_customer_id =
        p_source_customer_id
    )

    and
    (
      case
        when r.customer_id =
          p_source_customer_id
        then p_target_customer_id
        else r.customer_id
      end
    )
    <>
    (
      case
        when r.related_customer_id =
          p_source_customer_id
        then p_target_customer_id
        else r.related_customer_id
      end
    )

  on conflict
  do nothing;


  delete from
    public.customer_360_relationships
  where
    customer_id =
      p_source_customer_id
    or related_customer_id =
      p_source_customer_id;


  -- Source profile can now be safely removed.
  delete from public.customer_360_customers
  where id =
    p_source_customer_id;


  -- Enrich target only where target data is missing.
  update public.customer_360_customers
  set
    phone =
      coalesce(
        phone,
        v_source.phone
      ),

    email =
      coalesce(
        email,
        v_source.email
      ),

    birth_date =
      coalesce(
        birth_date,
        v_source.birth_date
      ),

    gender =
      coalesce(
        gender,
        v_source.gender
      ),

    nationality =
      coalesce(
        nationality,
        v_source.nationality
      ),

    identity_type =
      coalesce(
        identity_type,
        v_source.identity_type
      ),

    identity_number =
      coalesce(
        identity_number,
        v_source.identity_number
      ),

    address =
      coalesce(
        address,
        v_source.address
      ),

    city =
      coalesce(
        city,
        v_source.city
      ),

    country =
      coalesce(
        country,
        v_source.country
      ),

    preferred_language =
      coalesce(
        preferred_language,
        v_source.preferred_language
      ),

    marketing_consent =
      marketing_consent
      or v_source.marketing_consent,

    kvkk_consent =
      kvkk_consent
      or v_source.kvkk_consent,

    notes_summary =
      coalesce(
        notes_summary,
        v_source.notes_summary
      ),

    updated_by =
      auth.uid(),

    updated_at =
      now()

  where id =
    p_target_customer_id;


  v_summary =
    jsonb_build_object(
      'travelers', v_travelers,
      'notes', v_notes,
      'preferences', v_preferences,
      'cases', v_cases,
      'messages', v_messages,
      'entity_links', v_entity_links,
      'group_memberships', v_groups,
      'relationships', v_relationships
    );


  insert into
    public.customer_360_merge_history (
      company_id,
      target_customer_id,
      source_customer_id,
      source_customer_code,
      source_customer_name,
      target_customer_code,
      target_customer_name,
      merge_summary,
      source_snapshot,
      performed_by
    )
  values (
    p_company_id,
    p_target_customer_id,
    p_source_customer_id,
    v_source.customer_code,
    v_source.full_name,
    v_target.customer_code,
    v_target.full_name,
    v_summary,
    to_jsonb(v_source),
    auth.uid()
  );


  return jsonb_build_object(
    'success', true,
    'target_customer_id',
      p_target_customer_id,
    'removed_customer_id',
      p_source_customer_id,
    'summary',
      v_summary
  );
end;
$$;


revoke execute
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
