-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.11 — PREFERENCES & SEGMENTATION CENTER
--
-- Existing preference rows are preserved.
-- Existing customer rows are preserved.
-- No synthetic preference or segment data is generated.
-- ============================================================


create index if not exists
customer_360_preferences_company_customer_idx
on public.customer_360_preferences (
  company_id,
  customer_id,
  category,
  updated_at desc
);


create index if not exists
customer_360_preferences_company_category_idx
on public.customer_360_preferences (
  company_id,
  category,
  preference_key
);


-- ============================================================
-- SNAPSHOT
-- ============================================================

create or replace function
public.customer_360_preference_snapshot(
  p_customer_id uuid
)
returns jsonb
language plpgsql
stable
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
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.is_active_company_member(
    c.company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  return jsonb_build_object(

    'customer',
      jsonb_build_object(
        'id',
          c.id,

        'customer_code',
          c.customer_code,

        'full_name',
          c.full_name,

        'segment',
          c.segment,

        'preferred_language',
          c.preferred_language,

        'marketing_consent',
          c.marketing_consent,

        'kvkk_consent',
          c.kvkk_consent
      ),

    'preferences',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                p.id,

              'category',
                p.category,

              'preference_key',
                p.preference_key,

              'preference_value',
                p.preference_value,

              'created_by',
                p.created_by,

              'created_at',
                p.created_at,

              'updated_at',
                p.updated_at
            )
            order by
              p.category,
              p.preference_key
          )

          from public.customer_360_preferences p

          where
            p.company_id =
              c.company_id

            and p.customer_id =
              c.id
        ),
        '[]'::jsonb
      )
  );

end;
$$;


revoke all
on function
public.customer_360_preference_snapshot(
  uuid
)
from public;


grant execute
on function
public.customer_360_preference_snapshot(
  uuid
)
to authenticated;


-- ============================================================
-- UPSERT PREFERENCE
-- ============================================================

create or replace function
public.customer_360_upsert_preference(
  p_customer_id uuid,
  p_category text,
  p_preference_key text,
  p_preference_value jsonb
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
      coalesce(
        p_category,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Preference category required';
  end if;


  if nullif(
    trim(
      coalesce(
        p_preference_key,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Preference key required';
  end if;


  if length(
    trim(
      p_category
    )
  ) > 80
  then
    raise exception
      'Preference category too long';
  end if;


  if length(
    trim(
      p_preference_key
    )
  ) > 120
  then
    raise exception
      'Preference key too long';
  end if;


  insert into
    public.customer_360_preferences (
      company_id,
      customer_id,

      category,
      preference_key,
      preference_value,

      created_by
    )
  values (
    c.company_id,
    c.id,

    lower(
      trim(
        p_category
      )
    ),

    lower(
      trim(
        p_preference_key
      )
    ),

    coalesce(
      p_preference_value,
      '{}'::jsonb
    ),

    auth.uid()
  )

  on conflict (
    customer_id,
    category,
    preference_key
  )

  do update set
    preference_value =
      excluded.preference_value,

    updated_at =
      now()

  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'preference_id',
      v_id
  );

end;
$$;


revoke all
on function
public.customer_360_upsert_preference(
  uuid,
  text,
  text,
  jsonb
)
from public;


grant execute
on function
public.customer_360_upsert_preference(
  uuid,
  text,
  text,
  jsonb
)
to authenticated;


-- ============================================================
-- DELETE PREFERENCE
-- ============================================================

create or replace function
public.customer_360_delete_preference(
  p_preference_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.customer_360_preferences%rowtype;
begin

  select *
  into p
  from public.customer_360_preferences
  where id =
    p_preference_id;


  if p.id is null then
    raise exception
      'Preference not found';
  end if;


  if not public.customer_360_has_write_authority(
    p.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  delete from
    public.customer_360_preferences

  where id =
    p.id;


  return jsonb_build_object(
    'ok',
      true,

    'preference_id',
      p.id
  );

end;
$$;


revoke all
on function
public.customer_360_delete_preference(
  uuid
)
from public;


grant execute
on function
public.customer_360_delete_preference(
  uuid
)
to authenticated;


-- ============================================================
-- SET SEGMENT
--
-- Segment changes are explicit staff decisions.
-- No AI / synthetic classification occurs in this RPC.
-- ============================================================

create or replace function
public.customer_360_set_segment(
  p_customer_id uuid,
  p_segment text
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


  if p_segment not in (
    'standard',
    'repeat',
    'vip',
    'corporate',
    'risk'
  ) then
    raise exception
      'Invalid customer segment';
  end if;


  update
    public.customer_360_customers

  set
    segment =
      p_segment,

    updated_by =
      auth.uid(),

    updated_at =
      now()

  where id =
    c.id;


  return jsonb_build_object(
    'ok',
      true,

    'customer_id',
      c.id,

    'segment',
      p_segment
  );

end;
$$;


revoke all
on function
public.customer_360_set_segment(
  uuid,
  text
)
from public;


grant execute
on function
public.customer_360_set_segment(
  uuid,
  text
)
to authenticated;
