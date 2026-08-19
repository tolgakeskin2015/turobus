
-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.2 — SAFE MATCHING ENGINE
--
-- Existing operational tables are READ ONLY.
-- No source table is altered.
-- Matching results are written only to Customer 360 tables.
-- Ambiguous matches require manual review.
-- ============================================================


-- ============================================================
-- NORMALIZATION HELPERS
-- ============================================================

create or replace function
public.customer_360_normalize_phone(
  p_value text
)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    regexp_replace(
      coalesce(
        p_value,
        ''
      ),
      '\D',
      '',
      'g'
    ),
    ''
  );
$$;


create or replace function
public.customer_360_normalize_email(
  p_value text
)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(
    lower(
      trim(
        coalesce(
          p_value,
          ''
        )
      )
    ),
    ''
  );
$$;


-- ============================================================
-- SOURCE REGISTRY
-- ============================================================

create table if not exists
public.customer_360_source_registry (
  id uuid primary key
    default gen_random_uuid(),

  source_table text not null unique,

  entity_type text not null,

  company_column text not null
    default 'company_id',

  id_column text not null
    default 'id',

  name_column text,

  phone_column text,

  email_column text,

  title_column text,

  amount_column text,

  currency_column text,

  occurred_at_column text,

  enabled boolean not null
    default true,

  discovered_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


-- ============================================================
-- MATCH REVIEW QUEUE
-- ============================================================

create table if not exists
public.customer_360_match_queue (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  source_table text not null,

  entity_type text not null,

  source_id text not null,

  source_name text,

  source_phone text,

  source_email text,

  normalized_phone text,

  normalized_email text,

  suggested_customer_id uuid
    references public.customer_360_customers(id)
    on delete set null,

  match_reason text not null,

  confidence numeric(5,2) not null
    default 0,

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'matched',
        'ignored',
        'conflict'
      )
    ),

  metadata jsonb not null
    default '{}'::jsonb,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (
    company_id,
    source_table,
    source_id
  )
);


create index if not exists
  customer_360_match_queue_company_status_idx
on public.customer_360_match_queue (
  company_id,
  status,
  confidence desc,
  created_at desc
);


alter table
  public.customer_360_source_registry
enable row level security;


alter table
  public.customer_360_match_queue
enable row level security;


drop policy if exists
  customer_360_source_registry_select
on public.customer_360_source_registry;


create policy
  customer_360_source_registry_select
on public.customer_360_source_registry
for select
to authenticated
using (
  true
);


drop policy if exists
  customer_360_match_queue_select
on public.customer_360_match_queue;


create policy
  customer_360_match_queue_select
on public.customer_360_match_queue
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.customer_360_source_registry
to authenticated;


grant select
on public.customer_360_match_queue
to authenticated;


revoke insert, update, delete
on public.customer_360_source_registry
from authenticated;


revoke insert, update, delete
on public.customer_360_match_queue
from authenticated;


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  customer_360_match_queue_updated_at
on public.customer_360_match_queue;


create trigger
  customer_360_match_queue_updated_at
before update
on public.customer_360_match_queue
for each row
execute function
  public.customer_360_set_updated_at();


drop trigger if exists
  customer_360_source_registry_updated_at
on public.customer_360_source_registry;


create trigger
  customer_360_source_registry_updated_at
before update
on public.customer_360_source_registry
for each row
execute function
  public.customer_360_set_updated_at();


-- ============================================================
-- SAFE TABLE DISCOVERY
--
-- We only inspect tables whose names imply customer-facing
-- commercial transactions.
--
-- Source tables remain untouched.
-- ============================================================

create or replace function
public.customer_360_discover_sources()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;

  v_name_column text;
  v_phone_column text;
  v_email_column text;

  v_title_column text;
  v_amount_column text;
  v_currency_column text;
  v_occurred_column text;

  v_entity_type text;

  v_count integer :=
    0;
begin

  if not exists (
    select 1
    from public.company_members cm
    where
      cm.user_id =
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
      'Customer source discovery authority required';
  end if;


  for r in
    select
      t.table_name

    from information_schema.tables t

    where
      t.table_schema =
        'public'

      and t.table_type =
        'BASE TABLE'

      and (
        t.table_name ilike '%booking%'
        or t.table_name ilike '%reservation%'
        or t.table_name ilike '%rezerv%'
        or t.table_name ilike '%quote%'
        or t.table_name ilike '%teklif%'
        or t.table_name ilike '%lead%'
      )

      and t.table_name not like
        'customer_360_%'

      and exists (
        select 1
        from information_schema.columns c
        where
          c.table_schema =
            'public'
          and c.table_name =
            t.table_name
          and c.column_name =
            'id'
      )

      and exists (
        select 1
        from information_schema.columns c
        where
          c.table_schema =
            'public'
          and c.table_name =
            t.table_name
          and c.column_name =
            'company_id'
      )

  loop

    select c.column_name
    into v_name_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'customer_name',
        'guest_name',
        'full_name',
        'passenger_name',
        'contact_name',
        'lead_name'
      )
    order by
      case c.column_name
        when 'customer_name' then 1
        when 'guest_name' then 2
        when 'full_name' then 3
        when 'passenger_name' then 4
        when 'contact_name' then 5
        else 6
      end
    limit 1;


    select c.column_name
    into v_phone_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'customer_phone',
        'guest_phone',
        'phone',
        'passenger_phone',
        'contact_phone'
      )
    order by
      case c.column_name
        when 'customer_phone' then 1
        when 'guest_phone' then 2
        when 'phone' then 3
        when 'passenger_phone' then 4
        else 5
      end
    limit 1;


    select c.column_name
    into v_email_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'customer_email',
        'guest_email',
        'email',
        'passenger_email',
        'contact_email'
      )
    order by
      case c.column_name
        when 'customer_email' then 1
        when 'guest_email' then 2
        when 'email' then 3
        when 'passenger_email' then 4
        else 5
      end
    limit 1;


    if
      v_phone_column is null
      and v_email_column is null
    then
      continue;
    end if;


    select c.column_name
    into v_title_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'booking_code',
        'reservation_code',
        'quote_code',
        'code',
        'title',
        'name'
      )
    order by
      case c.column_name
        when 'booking_code' then 1
        when 'reservation_code' then 2
        when 'quote_code' then 3
        when 'code' then 4
        when 'title' then 5
        else 6
      end
    limit 1;


    select c.column_name
    into v_amount_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'total_amount',
        'sale_amount',
        'sales_amount',
        'amount',
        'total'
      )
    order by
      case c.column_name
        when 'total_amount' then 1
        when 'sale_amount' then 2
        when 'sales_amount' then 3
        when 'amount' then 4
        else 5
      end
    limit 1;


    select c.column_name
    into v_currency_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'currency',
        'currency_code'
      )
    limit 1;


    select c.column_name
    into v_occurred_column
    from information_schema.columns c
    where
      c.table_schema =
        'public'
      and c.table_name =
        r.table_name
      and c.column_name in (
        'created_at',
        'booking_date',
        'reservation_date',
        'start_date',
        'travel_date'
      )
    order by
      case c.column_name
        when 'created_at' then 1
        when 'booking_date' then 2
        when 'reservation_date' then 3
        when 'start_date' then 4
        else 5
      end
    limit 1;


    v_entity_type :=
      case
        when r.table_name ilike '%quote%'
          or r.table_name ilike '%teklif%'
        then 'quote'

        when r.table_name ilike '%yacht%'
        then 'yacht_booking'

        when r.table_name ilike '%package%'
        then 'package_booking'

        when r.table_name ilike '%hotel%'
        then 'hotel_booking'

        when r.table_name ilike '%activity%'
        then 'activity_booking'

        when r.table_name ilike '%tour%'
        then 'tour_booking'

        else 'booking'
      end;


    insert into
      public.customer_360_source_registry (
        source_table,
        entity_type,

        company_column,
        id_column,

        name_column,
        phone_column,
        email_column,

        title_column,
        amount_column,
        currency_column,
        occurred_at_column,

        enabled
      )
    values (
      r.table_name,
      v_entity_type,

      'company_id',
      'id',

      v_name_column,
      v_phone_column,
      v_email_column,

      v_title_column,
      v_amount_column,
      v_currency_column,
      v_occurred_column,

      true
    )
    on conflict (
      source_table
    )
    do update
    set
      entity_type =
        excluded.entity_type,

      name_column =
        excluded.name_column,

      phone_column =
        excluded.phone_column,

      email_column =
        excluded.email_column,

      title_column =
        excluded.title_column,

      amount_column =
        excluded.amount_column,

      currency_column =
        excluded.currency_column,

      occurred_at_column =
        excluded.occurred_at_column,

      updated_at =
        now();


    v_count :=
      v_count + 1;


    v_name_column :=
      null;

    v_phone_column :=
      null;

    v_email_column :=
      null;

    v_title_column :=
      null;

    v_amount_column :=
      null;

    v_currency_column :=
      null;

    v_occurred_column :=
      null;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'sources',
      v_count
  );

end;
$$;


revoke execute
on function
  public.customer_360_discover_sources()
from public;


grant execute
on function
  public.customer_360_discover_sources()
to authenticated;


-- ============================================================
-- BUILD MATCH QUEUE
-- ============================================================

create or replace function
public.customer_360_build_match_queue(
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

  v_processed integer :=
    0;
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

          matched.customer_id,

          matched.match_reason,
          matched.confidence,

          case
            when matched.customer_count =
              1
            then 'pending'

            when matched.customer_count >
              1
            then 'conflict'

            else 'pending'
          end,

          jsonb_build_object(
            'discovered_from',
              %L
          )

        from
          public.%I src

        cross join lateral (
          select
            candidate.customer_id,

            candidate.match_reason,

            candidate.confidence,

            candidate.customer_count

          from (
            select
              c.id as
                customer_id,

              case
                when
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and public.customer_360_normalize_phone(
                    c.phone
                  ) =
                    public.customer_360_normalize_phone(
                      %s
                    )

                  and public.customer_360_normalize_email(
                    %s
                  ) is not null

                  and public.customer_360_normalize_email(
                    c.email
                  ) =
                    public.customer_360_normalize_email(
                      %s
                    )
                then
                  'phone_and_email'

                when
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and public.customer_360_normalize_phone(
                    c.phone
                  ) =
                    public.customer_360_normalize_phone(
                      %s
                    )
                then
                  'phone'

                when
                  public.customer_360_normalize_email(
                    %s
                  ) is not null

                  and public.customer_360_normalize_email(
                    c.email
                  ) =
                    public.customer_360_normalize_email(
                      %s
                    )
                then
                  'email'

                else
                  'none'
              end as
                match_reason,

              case
                when
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and public.customer_360_normalize_phone(
                    c.phone
                  ) =
                    public.customer_360_normalize_phone(
                      %s
                    )

                  and public.customer_360_normalize_email(
                    %s
                  ) is not null

                  and public.customer_360_normalize_email(
                    c.email
                  ) =
                    public.customer_360_normalize_email(
                      %s
                    )
                then
                  100::numeric

                when
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and public.customer_360_normalize_phone(
                    c.phone
                  ) =
                    public.customer_360_normalize_phone(
                      %s
                    )
                then
                  95::numeric

                when
                  public.customer_360_normalize_email(
                    %s
                  ) is not null

                  and public.customer_360_normalize_email(
                    c.email
                  ) =
                    public.customer_360_normalize_email(
                      %s
                    )
                then
                  90::numeric

                else
                  0::numeric
              end as
                confidence,

              count(*) over () as
                customer_count

            from
              public.customer_360_customers c

            where
              c.company_id =
                src.company_id

              and (
                (
                  public.customer_360_normalize_phone(
                    %s
                  ) is not null

                  and public.customer_360_normalize_phone(
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

                  and public.customer_360_normalize_email(
                    c.email
                  ) =
                    public.customer_360_normalize_email(
                      %s
                    )
                )
              )
          ) candidate

          order by
            candidate.confidence desc,
            candidate.customer_id

          limit 1
        ) matched

        where
          src.company_id =
            $1

          and (
            public.customer_360_normalize_phone(
              %s
            ) is not null

            or public.customer_360_normalize_email(
              %s
            ) is not null
          )

        on conflict (
          company_id,
          source_table,
          source_id
        )
        do update
        set
          source_name =
            excluded.source_name,

          source_phone =
            excluded.source_phone,

          source_email =
            excluded.source_email,

          normalized_phone =
            excluded.normalized_phone,

          normalized_email =
            excluded.normalized_email,

          suggested_customer_id =
            excluded.suggested_customer_id,

          match_reason =
            excluded.match_reason,

          confidence =
            excluded.confidence,

          status =
            case
              when
                public.customer_360_match_queue.status =
                  'matched'
              then
                public.customer_360_match_queue.status

              else
                excluded.status
            end,

          metadata =
            excluded.metadata,

          updated_at =
            now()

        $fmt$,

        r.source_table,
        r.entity_type,

        case
          when r.name_column is null
          then 'null::text'
          else format(
            'src.%I::text',
            r.name_column
          )
        end,

        case
          when r.phone_column is null
          then 'null::text'
          else format(
            'src.%I::text',
            r.phone_column
          )
        end,

        case
          when r.email_column is null
          then 'null::text'
          else format(
            'src.%I::text',
            r.email_column
          )
        end,

        case
          when r.phone_column is null
          then 'null::text'
          else format(
            'src.%I::text',
            r.phone_column
          )
        end,

        case
          when r.email_column is null
          then 'null::text'
          else format(
            'src.%I::text',
            r.email_column
          )
        end,

        r.source_table,

        r.source_table,

        -- phone/email references repeated below
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,

        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,

        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,

        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,

        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,

        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,

        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,

        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,

        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,

        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end,

        case when r.phone_column is null then 'null::text' else format('src.%I::text', r.phone_column) end,
        case when r.email_column is null then 'null::text' else format('src.%I::text', r.email_column) end

      );


    execute v_sql
    using p_company_id;


    v_processed :=
      v_processed + 1;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'sources_processed',
      v_processed
  );

end;
$$;


revoke execute
on function
  public.customer_360_build_match_queue(uuid)
from public;


grant execute
on function
  public.customer_360_build_match_queue(uuid)
to authenticated;


-- ============================================================
-- APPLY ONE EXACT MATCH
-- ============================================================

create or replace function
public.customer_360_apply_match(
  p_match_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.customer_360_match_queue%rowtype;
  r public.customer_360_source_registry%rowtype;

  v_title text;
  v_amount numeric;
  v_currency text;
  v_occurred timestamptz;

  v_sql text;
begin

  select *
  into q
  from public.customer_360_match_queue
  where id =
    p_match_id
  for update;


  if q.id is null then
    raise exception
      'Match queue item not found';
  end if;


  if not public.customer_360_has_write_authority(
    q.company_id
  ) then
    raise exception
      'Customer matching authority required';
  end if;


  if q.suggested_customer_id is null then
    raise exception
      'No suggested customer';
  end if;


  if q.confidence < 90 then
    raise exception
      'Confidence is too low for direct apply';
  end if;


  if q.status =
    'conflict'
  then
    raise exception
      'Conflict requires manual review';
  end if;


  select *
  into r
  from public.customer_360_source_registry
  where source_table =
    q.source_table
    and enabled =
      true;


  if r.id is null then
    raise exception
      'Source registry not found';
  end if;


  v_sql :=
    format(
      'select %s, %s, %s, %s
       from public.%I
       where company_id = $1
         and id::text = $2
       limit 1',

      case
        when r.title_column is null
        then 'null::text'
        else format(
          '%I::text',
          r.title_column
        )
      end,

      case
        when r.amount_column is null
        then 'null::numeric'
        else format(
          '%I::numeric',
          r.amount_column
        )
      end,

      case
        when r.currency_column is null
        then 'null::text'
        else format(
          '%I::text',
          r.currency_column
        )
      end,

      case
        when r.occurred_at_column is null
        then 'null::timestamptz'
        else format(
          '%I::timestamptz',
          r.occurred_at_column
        )
      end,

      r.source_table
    );


  execute v_sql
  into
    v_title,
    v_amount,
    v_currency,
    v_occurred
  using
    q.company_id,
    q.source_id;


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
    q.company_id,
    q.suggested_customer_id,

    q.entity_type,

    q.source_table ||
      ':' ||
      q.source_id,

    coalesce(
      v_title,
      q.source_name,
      q.source_table
    ),

    v_amount,

    coalesce(
      v_currency,
      'TRY'
    ),

    v_occurred,

    jsonb_build_object(
      'source_table',
        q.source_table,

      'source_id',
        q.source_id,

      'match_reason',
        q.match_reason,

      'confidence',
        q.confidence
    )
  )
  on conflict do nothing;


  update
    public.customer_360_match_queue
  set
    status =
      'matched',

    reviewed_by =
      auth.uid(),

    reviewed_at =
      now()

  where id =
    q.id;


  return jsonb_build_object(
    'ok',
      true,

    'match_id',
      q.id,

    'customer_id',
      q.suggested_customer_id
  );

end;
$$;


revoke execute
on function
  public.customer_360_apply_match(uuid)
from public;


grant execute
on function
  public.customer_360_apply_match(uuid)
to authenticated;


-- ============================================================
-- AUTO APPLY ONLY UNIQUE HIGH-CONFIDENCE MATCHES
-- ============================================================

create or replace function
public.customer_360_apply_safe_matches(
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

  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Customer matching authority required';
  end if;


  for r in
    select q.id
    from public.customer_360_match_queue q
    where
      q.company_id =
        p_company_id

      and q.status =
        'pending'

      and q.suggested_customer_id
        is not null

      and q.confidence >=
        90

    order by
      q.confidence desc,
      q.created_at
  loop

    perform
      public.customer_360_apply_match(
        r.id
      );

    v_count :=
      v_count + 1;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'matched',
      v_count
  );

end;
$$;


revoke execute
on function
  public.customer_360_apply_safe_matches(uuid)
from public;


grant execute
on function
  public.customer_360_apply_safe_matches(uuid)
to authenticated;


-- ============================================================
-- IGNORE MATCH
-- ============================================================

create or replace function
public.customer_360_ignore_match(
  p_match_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.customer_360_match_queue%rowtype;
begin

  select *
  into q
  from public.customer_360_match_queue
  where id =
    p_match_id
  for update;


  if q.id is null then
    raise exception
      'Match not found';
  end if;


  if not public.customer_360_has_write_authority(
    q.company_id
  ) then
    raise exception
      'Customer matching authority required';
  end if;


  update
    public.customer_360_match_queue
  set
    status =
      'ignored',

    reviewed_by =
      auth.uid(),

    reviewed_at =
      now()

  where id =
    q.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


revoke execute
on function
  public.customer_360_ignore_match(uuid)
from public;


grant execute
on function
  public.customer_360_ignore_match(uuid)
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
