
-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.3
--
-- AUTO PROFILE CREATION + DUPLICATE CONTROL
--
-- Existing operational tables remain READ ONLY.
-- No booking/payment/source schema is changed.
-- ============================================================


-- ============================================================
-- NAME NORMALIZATION
-- Used ONLY for duplicate-risk comparison.
-- Original customer name is preserved.
-- ============================================================

create or replace function
public.customer_360_normalize_name(
  p_value text
)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      lower(
        trim(
          coalesce(
            p_value,
            ''
          )
        )
      ),
      '[^a-z0-9çğıöşü]+',
      '',
      'g'
    ),
    ''
  );
$$;


-- ============================================================
-- COLLECT UNMATCHED SOURCE RECORDS
--
-- Phase 1.2 already collects records with existing candidates.
-- This fills the missing side:
-- source records with phone/email but NO existing customer.
--
-- Source tables are SELECT ONLY.
-- ============================================================

create or replace function
public.customer_360_collect_unmatched_sources(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;

  v_sql text;

  v_inserted integer :=
    0;

  v_rows integer :=
    0;

  v_name_expr text;
  v_phone_expr text;
  v_email_expr text;
begin

  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Customer matching authority required';
  end if;


  for r in
    select *
    from public.customer_360_source_registry
    where enabled =
      true
  loop

    if
      r.phone_column is null
      and r.email_column is null
    then
      continue;
    end if;


    v_name_expr :=
      case
        when r.name_column is null
        then 'null::text'

        else format(
          'src.%I::text',
          r.name_column
        )
      end;


    v_phone_expr :=
      case
        when r.phone_column is null
        then 'null::text'

        else format(
          'src.%I::text',
          r.phone_column
        )
      end;


    v_email_expr :=
      case
        when r.email_column is null
        then 'null::text'

        else format(
          'src.%I::text',
          r.email_column
        )
      end;


    v_sql :=
      format(
        $fmt$

        insert into
          public.customer_360_match_queue (
            company_id,

            source_table,
            entity_type,
            source_id,

            source_name,
            source_phone,
            source_email,

            normalized_phone,
            normalized_email,

            suggested_customer_id,

            match_reason,
            confidence,

            status,

            metadata
          )

        select
          src.company_id,

          %L,
          %L,
          src.id::text,

          %s,
          %s,
          %s,

          public.customer_360_normalize_phone(
            %s
          ),

          public.customer_360_normalize_email(
            %s
          ),

          null::uuid,

          'no_customer',
          0::numeric,

          'pending',

          jsonb_build_object(
            'discovered_from',
              %L,

            'profile_status',
              'unmatched'
          )

        from public.%I src

        where
          src.company_id =
            $1

          and (
            public.customer_360_normalize_phone(
              %s
            ) is not null

            or

            public.customer_360_normalize_email(
              %s
            ) is not null
          )

          and not exists (
            select 1
            from public.customer_360_match_queue q

            where
              q.company_id =
                src.company_id

              and q.source_table =
                %L

              and q.source_id =
                src.id::text
          )

          and not exists (
            select 1
            from public.customer_360_customers c

            where
              c.company_id =
                src.company_id

              and (
                (
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and

                  public.customer_360_normalize_phone(
                    c.phone
                  ) =
                  public.customer_360_normalize_phone(
                    %s
                  )
                )

                or

                (
                  public.customer_360_normalize_email(
                    %s
                  ) is not null

                  and

                  public.customer_360_normalize_email(
                    c.email
                  ) =
                  public.customer_360_normalize_email(
                    %s
                  )
                )
              )
          )

        on conflict (
          company_id,
          source_table,
          source_id
        )
        do nothing

        $fmt$,

        r.source_table,
        r.entity_type,

        v_name_expr,
        v_phone_expr,
        v_email_expr,

        v_phone_expr,
        v_email_expr,

        r.source_table,

        r.source_table,

        v_phone_expr,
        v_email_expr,

        r.source_table,

        v_phone_expr,
        v_phone_expr,

        v_email_expr,
        v_email_expr
      );


    execute v_sql
    using p_company_id;


    get diagnostics
      v_rows =
        row_count;


    v_inserted :=
      v_inserted +
      v_rows;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'unmatched_added',
      v_inserted
  );

end;
$$;


revoke execute
on function
  public.customer_360_collect_unmatched_sources(uuid)
from public;


grant execute
on function
  public.customer_360_collect_unmatched_sources(uuid)
to authenticated;


-- ============================================================
-- ANALYZE AUTO PROFILE CANDIDATES
--
-- Safe:
--   - no existing Customer 360
--   - has name
--   - has phone or email
--   - same contact cluster does not contain multiple names
--
-- Ambiguous:
--   - same phone/email seen under multiple normalized names
--
-- ============================================================

create or replace function
public.customer_360_analyze_auto_profiles(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unmatched integer :=
    0;

  v_safe integer :=
    0;

  v_ambiguous integer :=
    0;

  v_missing_name integer :=
    0;
begin

  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Customer profile authority required';
  end if;


  select count(*)
  into v_unmatched

  from public.customer_360_match_queue q

  where
    q.company_id =
      p_company_id

    and q.status =
      'pending'

    and q.suggested_customer_id
      is null;


  select count(*)
  into v_missing_name

  from public.customer_360_match_queue q

  where
    q.company_id =
      p_company_id

    and q.status =
      'pending'

    and q.suggested_customer_id
      is null

    and public.customer_360_normalize_name(
      q.source_name
    ) is null;


  with candidates as (
    select
      q.id,

      (
        select count(
          distinct
          public.customer_360_normalize_name(
            q2.source_name
          )
        )

        from public.customer_360_match_queue q2

        where
          q2.company_id =
            q.company_id

          and q2.status =
            'pending'

          and q2.suggested_customer_id
            is null

          and public.customer_360_normalize_name(
            q2.source_name
          ) is not null

          and (
            (
              q.normalized_phone
                is not null

              and q2.normalized_phone =
                q.normalized_phone
            )

            or

            (
              q.normalized_email
                is not null

              and q2.normalized_email =
                q.normalized_email
            )
          )
      ) as name_count

    from public.customer_360_match_queue q

    where
      q.company_id =
        p_company_id

      and q.status =
        'pending'

      and q.suggested_customer_id
        is null

      and public.customer_360_normalize_name(
        q.source_name
      ) is not null

      and (
        q.normalized_phone
          is not null

        or q.normalized_email
          is not null
      )
  )

  select
    count(*) filter (
      where name_count =
        1
    ),

    count(*) filter (
      where name_count >
        1
    )

  into
    v_safe,
    v_ambiguous

  from candidates;


  return jsonb_build_object(
    'ok',
      true,

    'unmatched',
      v_unmatched,

    'safe_candidate_rows',
      v_safe,

    'ambiguous_rows',
      v_ambiguous,

    'missing_name_rows',
      v_missing_name
  );

end;
$$;


revoke execute
on function
  public.customer_360_analyze_auto_profiles(uuid)
from public;


grant execute
on function
  public.customer_360_analyze_auto_profiles(uuid)
to authenticated;


-- ============================================================
-- CREATE SAFE CUSTOMER PROFILES
--
-- Advisory lock prevents concurrent duplicate creation.
-- Unique phone/email indexes remain final protection.
-- ============================================================

create or replace function
public.customer_360_create_safe_profiles(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;

  v_customer_id uuid;

  v_created integer :=
    0;

  v_linked_rows integer :=
    0;

  v_rows integer :=
    0;

  v_existing uuid;

  v_name_count integer;

  v_cluster_key text;
begin

  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Customer profile authority required';
  end if;


  perform pg_advisory_xact_lock(
    hashtextextended(
      'customer360:auto-profile:' ||
      p_company_id::text,
      0
    )
  );


  for q in

    select *
    from public.customer_360_match_queue mq

    where
      mq.company_id =
        p_company_id

      and mq.status =
        'pending'

      and mq.suggested_customer_id
        is null

      and public.customer_360_normalize_name(
        mq.source_name
      ) is not null

      and (
        mq.normalized_phone
          is not null

        or mq.normalized_email
          is not null
      )

    order by
      case
        when
          mq.normalized_phone is not null
          and mq.normalized_email is not null
        then 0

        when mq.normalized_phone is not null
        then 1

        else 2
      end,

      mq.created_at,

      mq.id

  loop

    -- ========================================================
    -- Re-check if another row in this transaction already
    -- created the customer.
    -- ========================================================

    select c.id
    into v_existing

    from public.customer_360_customers c

    where
      c.company_id =
        p_company_id

      and (
        (
          q.normalized_phone
            is not null

          and public.customer_360_normalize_phone(
            c.phone
          ) =
            q.normalized_phone
        )

        or

        (
          q.normalized_email
            is not null

          and public.customer_360_normalize_email(
            c.email
          ) =
            q.normalized_email
        )
      )

    order by c.created_at
    limit 1;


    if v_existing is not null then

      update
        public.customer_360_match_queue mq

      set
        suggested_customer_id =
          v_existing,

        match_reason =
          'existing_after_auto_profile',

        confidence =
          100,

        metadata =
          coalesce(
            mq.metadata,
            '{}'::jsonb
          )
          ||
          jsonb_build_object(
            'profile_status',
              'existing'
          )

      where
        mq.company_id =
          p_company_id

        and mq.status =
          'pending'

        and mq.suggested_customer_id
          is null

        and (
          (
            q.normalized_phone
              is not null

            and mq.normalized_phone =
              q.normalized_phone
          )

          or

          (
            q.normalized_email
              is not null

            and mq.normalized_email =
              q.normalized_email
          )
        );


      get diagnostics
        v_rows =
          row_count;

      v_linked_rows :=
        v_linked_rows +
        v_rows;


      v_existing :=
        null;

      continue;
    end if;


    -- ========================================================
    -- Duplicate-risk check.
    -- Shared phone/e-mail with multiple different names means:
    -- DO NOT CREATE AUTOMATICALLY.
    -- ========================================================

    select count(
      distinct
      public.customer_360_normalize_name(
        mq.source_name
      )
    )
    into v_name_count

    from public.customer_360_match_queue mq

    where
      mq.company_id =
        p_company_id

      and mq.status =
        'pending'

      and mq.suggested_customer_id
        is null

      and public.customer_360_normalize_name(
        mq.source_name
      ) is not null

      and (
        (
          q.normalized_phone
            is not null

          and mq.normalized_phone =
            q.normalized_phone
        )

        or

        (
          q.normalized_email
            is not null

          and mq.normalized_email =
            q.normalized_email
        )
      );


    if v_name_count <>
      1
    then

      update
        public.customer_360_match_queue mq

      set
        status =
          'conflict',

        match_reason =
          'shared_contact_multiple_names',

        confidence =
          0,

        metadata =
          coalesce(
            mq.metadata,
            '{}'::jsonb
          )
          ||
          jsonb_build_object(
            'profile_status',
              'manual_review',

            'duplicate_risk',
              true
          )

      where
        mq.company_id =
          p_company_id

        and mq.status =
          'pending'

        and mq.suggested_customer_id
          is null

        and (
          (
            q.normalized_phone
              is not null

            and mq.normalized_phone =
              q.normalized_phone
          )

          or

          (
            q.normalized_email
              is not null

            and mq.normalized_email =
              q.normalized_email
          )
        );


      continue;
    end if;


    -- ========================================================
    -- Create exactly one central customer.
    -- ========================================================

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
      p_company_id,

      trim(
        q.source_name
      ),

      nullif(
        trim(
          q.source_phone
        ),
        ''
      ),

      nullif(
        lower(
          trim(
            q.source_email
          )
        ),
        ''
      ),

      'legacy_auto_import',

      auth.uid(),
      auth.uid()
    )
    returning id
    into v_customer_id;


    v_created :=
      v_created +
      1;


    -- ========================================================
    -- Connect all records in the same identity cluster.
    -- ========================================================

    update
      public.customer_360_match_queue mq

    set
      suggested_customer_id =
        v_customer_id,

      match_reason =
        'auto_profile_created',

      confidence =
        100,

      metadata =
        coalesce(
          mq.metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'profile_status',
            'created',

          'auto_created_customer_id',
            v_customer_id
        )

    where
      mq.company_id =
        p_company_id

      and mq.status =
        'pending'

      and mq.suggested_customer_id
        is null

      and (
        (
          q.normalized_phone
            is not null

          and mq.normalized_phone =
            q.normalized_phone
        )

        or

        (
          q.normalized_email
            is not null

          and mq.normalized_email =
            q.normalized_email
        )
      );


  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'customers_created',
      v_created
  );

end;
$$;


revoke execute
on function
  public.customer_360_create_safe_profiles(uuid)
from public;


grant execute
on function
  public.customer_360_create_safe_profiles(uuid)
to authenticated;


-- ============================================================
-- DUPLICATE HEALTH SUMMARY
-- ============================================================

create or replace function
public.customer_360_duplicate_health(
  p_company_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$

  with phone_dupes as (
    select
      public.customer_360_normalize_phone(
        phone
      ) as identity_value

    from public.customer_360_customers

    where
      company_id =
        p_company_id

      and public.customer_360_normalize_phone(
        phone
      ) is not null

    group by
      public.customer_360_normalize_phone(
        phone
      )

    having count(*) >
      1
  ),

  email_dupes as (
    select
      public.customer_360_normalize_email(
        email
      ) as identity_value

    from public.customer_360_customers

    where
      company_id =
        p_company_id

      and public.customer_360_normalize_email(
        email
      ) is not null

    group by
      public.customer_360_normalize_email(
        email
      )

    having count(*) >
      1
  )

  select jsonb_build_object(
    'ok',
      true,

    'duplicate_phone_groups',
      (
        select count(*)
        from phone_dupes
      ),

    'duplicate_email_groups',
      (
        select count(*)
        from email_dupes
      ),

    'conflict_queue',
      (
        select count(*)
        from public.customer_360_match_queue q

        where
          q.company_id =
            p_company_id

          and q.status =
            'conflict'
      )
  );

$$;


revoke execute
on function
  public.customer_360_duplicate_health(uuid)
from public;


grant execute
on function
  public.customer_360_duplicate_health(uuid)
to authenticated;


-- ============================================================
-- FINAL SECURITY HARDENING
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
