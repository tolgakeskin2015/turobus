-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.10 — REQUEST & COMPLAINT MANAGEMENT CENTER
--
-- Existing customer_360_cases data is preserved.
-- No existing case row is deleted.
-- ============================================================


alter table
public.customer_360_cases

add column if not exists
assigned_to uuid
references auth.users(id)
on delete set null;


alter table
public.customer_360_cases

add column if not exists
due_at timestamptz;


alter table
public.customer_360_cases

add column if not exists
resolution_note text;


alter table
public.customer_360_cases

add column if not exists
closed_at timestamptz;


create index if not exists
customer_360_cases_company_status_due_idx
on public.customer_360_cases (
  company_id,
  status,
  due_at,
  created_at desc
);


create index if not exists
customer_360_cases_company_priority_idx
on public.customer_360_cases (
  company_id,
  priority,
  created_at desc
);


-- ============================================================
-- CASE SNAPSHOT
-- ============================================================

create or replace function
public.customer_360_case_snapshot(
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
          c.full_name
      ),

    'cases',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                cs.id,

              'case_type',
                cs.case_type,

              'title',
                cs.title,

              'detail',
                cs.detail,

              'priority',
                cs.priority,

              'status',
                cs.status,

              'assigned_to',
                cs.assigned_to,

              'due_at',
                cs.due_at,

              'resolution_note',
                cs.resolution_note,

              'resolved_by',
                cs.resolved_by,

              'resolved_at',
                cs.resolved_at,

              'closed_at',
                cs.closed_at,

              'created_by',
                cs.created_by,

              'created_at',
                cs.created_at,

              'updated_at',
                cs.updated_at,

              'sla_state',
                case

                  when cs.status in (
                    'resolved',
                    'closed'
                  )
                  then 'completed'

                  when cs.due_at is null
                  then 'no_deadline'

                  when cs.due_at < now()
                  then 'overdue'

                  when cs.due_at <=
                    now() +
                    interval '24 hours'
                  then 'due_soon'

                  else 'on_track'

                end
            )
            order by
              case
                when cs.status in (
                  'open',
                  'in_progress'
                )
                then 0
                else 1
              end,

              case cs.priority
                when 'critical'
                  then 0
                when 'high'
                  then 1
                when 'medium'
                  then 2
                else 3
              end,

              cs.due_at asc nulls last,

              cs.created_at desc
          )

          from public.customer_360_cases cs

          where
            cs.company_id =
              c.company_id

            and cs.customer_id =
              c.id
        ),
        '[]'::jsonb
      )
  );

end;
$$;


revoke all
on function
public.customer_360_case_snapshot(
  uuid
)
from public;


grant execute
on function
public.customer_360_case_snapshot(
  uuid
)
to authenticated;


-- ============================================================
-- CREATE CASE
-- ============================================================

create or replace function
public.customer_360_add_case(
  p_customer_id uuid,
  p_case_type text,
  p_title text,
  p_detail text default null,
  p_priority text default 'medium',
  p_due_at timestamptz default null,
  p_take_ownership boolean default true
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


  if p_case_type not in (
    'request',
    'complaint'
  ) then
    raise exception
      'Invalid case type';
  end if;


  if p_priority not in (
    'low',
    'medium',
    'high',
    'critical'
  ) then
    raise exception
      'Invalid priority';
  end if;


  if nullif(
    trim(
      coalesce(
        p_title,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Case title required';
  end if;


  insert into
    public.customer_360_cases (
      company_id,
      customer_id,

      case_type,

      title,
      detail,

      priority,
      status,

      assigned_to,
      due_at,

      created_by
    )
  values (
    c.company_id,
    c.id,

    p_case_type,

    trim(
      p_title
    ),

    nullif(
      trim(
        p_detail
      ),
      ''
    ),

    p_priority,
    'open',

    case
      when p_take_ownership
      then auth.uid()
      else null
    end,

    p_due_at,

    auth.uid()
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'case_id',
      v_id
  );

end;
$$;


revoke all
on function
public.customer_360_add_case(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
)
from public;


grant execute
on function
public.customer_360_add_case(
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
)
to authenticated;


-- ============================================================
-- UPDATE CASE
-- ============================================================

create or replace function
public.customer_360_update_case(
  p_case_id uuid,
  p_status text default null,
  p_priority text default null,
  p_due_at timestamptz default null,
  p_resolution_note text default null,
  p_take_ownership boolean default false,
  p_clear_assignment boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cs public.customer_360_cases%rowtype;

  v_status text;
begin

  select *
  into cs
  from public.customer_360_cases
  where id =
    p_case_id;


  if cs.id is null then
    raise exception
      'Case not found';
  end if;


  if not public.customer_360_has_write_authority(
    cs.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if
    p_status is not null

    and p_status not in (
      'open',
      'in_progress',
      'resolved',
      'closed'
    )
  then
    raise exception
      'Invalid case status';
  end if;


  if
    p_priority is not null

    and p_priority not in (
      'low',
      'medium',
      'high',
      'critical'
    )
  then
    raise exception
      'Invalid priority';
  end if;


  v_status =
    coalesce(
      p_status,
      cs.status
    );


  update
    public.customer_360_cases

  set
    status =
      v_status,

    priority =
      coalesce(
        p_priority,
        priority
      ),

    due_at =
      coalesce(
        p_due_at,
        due_at
      ),

    assigned_to =
      case

        when p_clear_assignment
        then null

        when p_take_ownership
        then auth.uid()

        else assigned_to

      end,

    resolution_note =
      case

        when p_resolution_note is not null
        then nullif(
          trim(
            p_resolution_note
          ),
          ''
        )

        else resolution_note

      end,

    resolved_at =
      case

        when v_status in (
          'resolved',
          'closed'
        )
        then coalesce(
          resolved_at,
          now()
        )

        else null

      end,

    resolved_by =
      case

        when v_status in (
          'resolved',
          'closed'
        )
        then coalesce(
          resolved_by,
          auth.uid()
        )

        else null

      end,

    closed_at =
      case

        when v_status =
          'closed'
        then coalesce(
          closed_at,
          now()
        )

        else null

      end,

    updated_at =
      now()

  where id =
    cs.id;


  return jsonb_build_object(
    'ok',
      true,

    'case_id',
      cs.id,

    'status',
      v_status
  );

end;
$$;


revoke all
on function
public.customer_360_update_case(
  uuid,
  text,
  text,
  timestamptz,
  text,
  boolean,
  boolean
)
from public;


grant execute
on function
public.customer_360_update_case(
  uuid,
  text,
  text,
  timestamptz,
  text,
  boolean,
  boolean
)
to authenticated;
