
-- ============================================================
-- TUROBUS YACHT OS
-- AI COPILOT V2 CONTROLLED ACTIONS
-- ============================================================

create table if not exists
public.yacht_os_copilot_action_audit (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  action_type text not null,

  entity_type text,

  entity_id uuid,

  request_data jsonb,

  result_data jsonb,

  created_at timestamptz not null
    default now()
);


create index if not exists
  yacht_copilot_audit_company_idx
on public.yacht_os_copilot_action_audit (
  company_id,
  created_at desc
);


alter table
  public.yacht_os_copilot_action_audit
enable row level security;


drop policy if exists
  yacht_copilot_audit_company_select
on public.yacht_os_copilot_action_audit;


create policy
  yacht_copilot_audit_company_select
on public.yacht_os_copilot_action_audit
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.yacht_os_copilot_action_audit
to authenticated;


revoke insert, update, delete
on public.yacht_os_copilot_action_audit
from authenticated;


-- ============================================================
-- ROLE HELPER
-- ============================================================

create or replace function
public.yacht_os_copilot_member_role(
  p_company_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cm.role
  from public.company_members cm
  where
    cm.company_id =
      p_company_id

    and cm.user_id =
      auth.uid()

    and cm.is_active =
      true

  limit 1;
$$;


revoke execute
on function
  public.yacht_os_copilot_member_role(uuid)
from public;


grant execute
on function
  public.yacht_os_copilot_member_role(uuid)
to authenticated;


-- ============================================================
-- CREATE TASK
-- ============================================================

create or replace function
public.yacht_os_copilot_create_task(
  p_company_id uuid,
  p_title text,
  p_description text default null,
  p_due_at timestamptz default null,
  p_priority text default 'medium',
  p_booking_id uuid default null,
  p_yacht_id uuid default null,
  p_lead_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_task_id uuid;
begin

  v_role :=
    public.yacht_os_copilot_member_role(
      p_company_id
    );


  if
    v_role is null
    or v_role not in (
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales',
      'accounting'
    )
  then
    raise exception
      'Copilot task authority required';
  end if;


  if nullif(
    trim(
      p_title
    ),
    ''
  ) is null then
    raise exception
      'Task title is required';
  end if;


  if p_priority not in (
    'low',
    'medium',
    'high',
    'critical'
  ) then
    raise exception
      'Invalid task priority';
  end if;


  if
    p_booking_id is not null
    and not exists (
      select 1
      from public.yacht_os_bookings b
      where
        b.id = p_booking_id
        and b.company_id =
          p_company_id
    )
  then
    raise exception
      'Booking not in company';
  end if;


  if
    p_yacht_id is not null
    and not exists (
      select 1
      from public.yacht_os_yachts y
      where
        y.id = p_yacht_id
        and y.company_id =
          p_company_id
    )
  then
    raise exception
      'Yacht not in company';
  end if;


  if
    p_lead_id is not null
    and not exists (
      select 1
      from public.yacht_os_leads l
      where
        l.id = p_lead_id
        and l.company_id =
          p_company_id
    )
  then
    raise exception
      'Lead not in company';
  end if;


  insert into public.yacht_os_tasks (
    company_id,

    yacht_id,
    booking_id,
    lead_id,

    title,
    description,

    due_at,

    assigned_to_name,

    priority,
    status,

    created_by
  )
  values (
    p_company_id,

    p_yacht_id,
    p_booking_id,
    p_lead_id,

    trim(
      p_title
    ),

    nullif(
      trim(
        p_description
      ),
      ''
    ),

    p_due_at,

    'AI Copilot',

    p_priority,
    'open',

    auth.uid()
  )
  returning id
  into v_task_id;


  insert into
    public.yacht_os_copilot_action_audit (
      company_id,
      user_id,

      action_type,

      entity_type,
      entity_id,

      request_data,
      result_data
    )
  values (
    p_company_id,
    auth.uid(),

    'create_task',

    'task',
    v_task_id,

    jsonb_build_object(
      'title',
        p_title,

      'priority',
        p_priority,

      'due_at',
        p_due_at,

      'booking_id',
        p_booking_id,

      'yacht_id',
        p_yacht_id,

      'lead_id',
        p_lead_id
    ),

    jsonb_build_object(
      'task_id',
        v_task_id
    )
  );


  return jsonb_build_object(
    'ok',
      true,

    'task_id',
      v_task_id
  );

end;
$$;


revoke execute
on function
public.yacht_os_copilot_create_task(
  uuid,
  text,
  text,
  timestamptz,
  text,
  uuid,
  uuid,
  uuid
)
from public;


grant execute
on function
public.yacht_os_copilot_create_task(
  uuid,
  text,
  text,
  timestamptz,
  text,
  uuid,
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- LEAD FOLLOW-UP
-- ============================================================

create or replace function
public.yacht_os_copilot_schedule_lead_followup(
  p_lead_id uuid,
  p_due_at timestamptz,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;

  v_role text;
  v_task_id uuid;
begin

  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  v_role :=
    public.yacht_os_copilot_member_role(
      l.company_id
    );


  if
    v_role is null
    or v_role not in (
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    )
  then
    raise exception
      'Lead follow-up authority required';
  end if;


  if
    l.stage in (
      'won',
      'lost'
    )
  then
    raise exception
      'Closed lead cannot receive follow-up';
  end if;


  if
    v_role = 'sales'
    and l.assigned_to is not null
    and l.assigned_to <>
      auth.uid()
  then
    raise exception
      'Lead belongs to another salesperson';
  end if;


  if
    p_due_at is null
    or p_due_at <
      now() - interval '5 minutes'
  then
    raise exception
      'Invalid follow-up time';
  end if;


  update public.yacht_os_leads
  set
    next_follow_up_at =
      p_due_at

  where id =
    l.id;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,

    activity_type,

    title,
    note,

    metadata,

    created_by
  )
  values (
    l.company_id,
    l.id,

    'follow_up',

    'Copilot takip planı',

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    jsonb_build_object(
      'next_follow_up_at',
        p_due_at
    ),

    auth.uid()
  );


  insert into public.yacht_os_tasks (
    company_id,

    yacht_id,
    lead_id,

    title,
    description,

    due_at,

    assigned_to_name,

    priority,
    status,

    created_by
  )
  values (
    l.company_id,

    l.preferred_yacht_id,
    l.id,

    'Müşteri takibi: ' ||
      l.customer_name,

    coalesce(
      nullif(
        trim(
          p_note
        ),
        ''
      ),
      'AI Copilot kontrollü takip'
    ),

    p_due_at,

    'AI Copilot',

    case
      when l.score >= 90
      then 'critical'

      when l.score >= 75
      then 'high'

      else 'medium'
    end,

    'open',

    auth.uid()
  )
  returning id
  into v_task_id;


  insert into
    public.yacht_os_copilot_action_audit (
      company_id,
      user_id,

      action_type,

      entity_type,
      entity_id,

      request_data,
      result_data
    )
  values (
    l.company_id,
    auth.uid(),

    'schedule_lead_followup',

    'lead',
    l.id,

    jsonb_build_object(
      'due_at',
        p_due_at,

      'note',
        p_note
    ),

    jsonb_build_object(
      'task_id',
        v_task_id
    )
  );


  return jsonb_build_object(
    'ok',
      true,

    'lead_id',
      l.id,

    'task_id',
      v_task_id
  );

end;
$$;


revoke execute
on function
public.yacht_os_copilot_schedule_lead_followup(
  uuid,
  timestamptz,
  text
)
from public;


grant execute
on function
public.yacht_os_copilot_schedule_lead_followup(
  uuid,
  timestamptz,
  text
)
to authenticated;


-- ============================================================
-- CRM ALERT
-- ============================================================

create or replace function
public.yacht_os_copilot_resolve_crm_alert(
  p_event_id uuid,
  p_status text default 'resolved'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.yacht_os_crm_automation_events%rowtype;

  v_role text;
  v_result jsonb;
begin

  select *
  into e
  from public.yacht_os_crm_automation_events
  where id =
    p_event_id
  for update;


  if e.id is null then
    raise exception
      'CRM alert not found';
  end if;


  v_role :=
    public.yacht_os_copilot_member_role(
      e.company_id
    );


  if
    v_role is null
    or v_role not in (
      'super_admin',
      'company_owner',
      'operation_manager',
      'sales'
    )
  then
    raise exception
      'CRM authority required';
  end if;


  if p_status not in (
    'resolved',
    'dismissed'
  ) then
    raise exception
      'Invalid CRM status';
  end if;


  if e.status <> 'open' then
    return jsonb_build_object(
      'ok',
        true,

      'already_closed',
        true,

      'status',
        e.status
    );
  end if;


  v_result :=
    public.yacht_os_resolve_crm_automation_event(
      e.id,
      p_status
    );


  insert into
    public.yacht_os_copilot_action_audit (
      company_id,
      user_id,

      action_type,

      entity_type,
      entity_id,

      request_data,
      result_data
    )
  values (
    e.company_id,
    auth.uid(),

    'resolve_crm_alert',

    'crm_automation_event',
    e.id,

    jsonb_build_object(
      'status',
        p_status
    ),

    v_result
  );


  return v_result;

end;
$$;


revoke execute
on function
public.yacht_os_copilot_resolve_crm_alert(
  uuid,
  text
)
from public;


grant execute
on function
public.yacht_os_copilot_resolve_crm_alert(
  uuid,
  text
)
to authenticated;


-- ============================================================
-- FINAL ACL
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
        'yacht_os_copilot_%'
  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;
