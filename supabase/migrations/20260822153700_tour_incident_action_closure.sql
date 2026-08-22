-- ============================================================
-- TUROBÜS TOUR OS
-- PHASE 16 FINAL
--
-- Incident detail
-- Responsibility
-- Supplier connection
-- Operation task bridge
-- Compensation / loss control
-- Change-case bridge
-- Resolution / closure guard
-- Control Tower readiness
-- ============================================================


-- ------------------------------------------------------------
-- INCIDENT ACTION / CLOSURE FIELDS
-- ------------------------------------------------------------

alter table
  public.tour_operation_incidents
add column if not exists
  linked_change_case_id uuid
  references public.tour_change_cases(id)
  on delete set null;


alter table
  public.tour_operation_incidents
add column if not exists
  supplier_recovery_status text
  not null
  default 'not_required';


alter table
  public.tour_operation_incidents
add column if not exists
  compensation_status text
  not null
  default 'not_required';


alter table
  public.tour_operation_incidents
add column if not exists
  closure_note text;


alter table
  public.tour_operation_incidents
drop constraint if exists
  tour_operation_incidents_supplier_recovery_status_check;


alter table
  public.tour_operation_incidents
add constraint
  tour_operation_incidents_supplier_recovery_status_check
check (
  supplier_recovery_status in (
    'not_required',
    'pending',
    'claimed',
    'recovered',
    'waived'
  )
);


alter table
  public.tour_operation_incidents
drop constraint if exists
  tour_operation_incidents_compensation_status_check;


alter table
  public.tour_operation_incidents
add constraint
  tour_operation_incidents_compensation_status_check
check (
  compensation_status in (
    'not_required',
    'pending',
    'linked',
    'completed',
    'waived'
  )
);


create index if not exists
  tour_operation_incidents_change_case_idx

on public.tour_operation_incidents (
  company_id,
  linked_change_case_id
);


create index if not exists
  tour_operation_incidents_responsible_idx

on public.tour_operation_incidents (
  company_id,
  responsible_user_id,
  status
);


-- ------------------------------------------------------------
-- EXPAND EVENT TYPES
-- ------------------------------------------------------------

alter table
  public.tour_operation_incident_events
drop constraint if exists
  tour_operation_incident_events_event_type_check;


alter table
  public.tour_operation_incident_events
add constraint
  tour_operation_incident_events_event_type_check

check (
  event_type in (
    'created',
    'assigned',
    'status_changed',
    'severity_changed',
    'note',
    'supplier_action',
    'customer_action',
    'finance_action',
    'management_action',
    'loss_updated',
    'resolution_added',
    'task_created',
    'change_case_linked',
    'resolved',
    'closed',
    'cancelled'
  )
);


-- ------------------------------------------------------------
-- CHANGE CASE SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_incident_change_case_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    new.linked_change_case_id
    is not null
  then

    if not exists (
      select
        1
      from
        public.tour_change_cases c
      where
        c.id =
          new.linked_change_case_id
        and
        c.company_id =
          new.company_id
        and
        c.tour_id =
          new.tour_id
        and
        (
          new.departure_id is null
          or
          c.departure_id is null
          or
          c.departure_id =
            new.departure_id
        )
        and
        (
          new.reservation_id is null
          or
          c.reservation_id is null
          or
          c.reservation_id =
            new.reservation_id
        )
    )
    then
      raise exception
        'Incident change case scope mismatch';
    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_operation_incidents_change_case_scope

on public.tour_operation_incidents;


create trigger
  tour_operation_incidents_change_case_scope

before insert or update of
  linked_change_case_id

on public.tour_operation_incidents

for each row

execute function
  public.validate_tour_incident_change_case_scope();


-- ------------------------------------------------------------
-- RESOLUTION / CLOSURE HARD GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_incident_closure()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    new.status in (
      'resolved',
      'closed'
    )
    and
    nullif(
      btrim(
        coalesce(
          new.resolution,
          ''
        )
      ),
      ''
    ) is null
  then

    raise exception
      'Resolution is required before resolving or closing incident';

  end if;


  if
    new.status =
      'closed'
  then

    if
      new.customer_compensation_amount >
        0
      and
      new.compensation_status not in (
        'completed',
        'waived'
      )
    then

      raise exception
        'Customer compensation must be completed or waived before closure';

    end if;


    if
      new.supplier_recoverable_amount >
        0
      and
      new.supplier_recovery_status not in (
        'recovered',
        'waived'
      )
    then

      raise exception
        'Supplier recovery must be recovered or waived before closure';

    end if;


    if
      new.customer_compensation_amount >
        0
      and
      new.compensation_status =
        'completed'
      and
      new.linked_change_case_id
        is null
    then

      raise exception
        'Completed customer compensation requires linked change/refund case';

    end if;


    if
      new.supplier_recoverable_amount >
        0
      and
      new.supplier_recovery_status =
        'recovered'
      and
      new.supplier_commitment_id
        is null
    then

      raise exception
        'Recovered supplier amount requires supplier commitment link';

    end if;


    if
      new.operation_task_id
      is not null
      and
      exists (
        select
          1
        from
          public.tour_operation_tasks t
        where
          t.id =
            new.operation_task_id
          and
          t.company_id =
            new.company_id
          and
          t.status not in (
            'completed',
            'cancelled'
          )
      )
    then

      raise exception
        'Linked operation task must be completed or cancelled before closure';

    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_operation_incidents_closure_guard

on public.tour_operation_incidents;


create trigger
  tour_operation_incidents_closure_guard

before update of
  status,
  resolution,
  customer_compensation_amount,
  supplier_recoverable_amount,
  compensation_status,
  supplier_recovery_status,
  linked_change_case_id,
  supplier_commitment_id,
  operation_task_id

on public.tour_operation_incidents

for each row

execute function
  public.validate_tour_incident_closure();


-- ------------------------------------------------------------
-- ASSIGN INCIDENT TO CURRENT USER
-- ------------------------------------------------------------

create or replace function
  public.assign_tour_incident_to_me(
    p_incident_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  update
    public.tour_operation_incidents
  set
    responsible_user_id =
      v_actor,

    assigned_at =
      now(),

    first_response_at =
      coalesce(
        first_response_at,
        now()
      ),

    status =
      case
        when status =
          'open'
        then
          'investigating'
        else
          status
      end,

    updated_by =
      v_actor
  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    'assigned',
    v_actor,
    'Operasyon vakası kullanıcı tarafından üstlenildi.',
    jsonb_build_object(
      'responsible_user_id',
      v_actor
    )
  );

end;
$$;


revoke all
on function
  public.assign_tour_incident_to_me(uuid)
from public;


grant execute
on function
  public.assign_tour_incident_to_me(uuid)
to authenticated;


-- ------------------------------------------------------------
-- LINK SUPPLIER COMMITMENT
-- ------------------------------------------------------------

create or replace function
  public.link_tour_incident_supplier(
    p_incident_id uuid,
    p_supplier_commitment_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

  v_supplier
    public.tour_supplier_commitments%rowtype;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select
    *
  into
    v_supplier
  from
    public.tour_supplier_commitments
  where
    id =
      p_supplier_commitment_id
    and
    company_id =
      v_incident.company_id
    and
    tour_id =
      v_incident.tour_id;


  if not found then
    raise exception
      'Supplier commitment not found';
  end if;


  if
    v_incident.departure_id
      is not null
    and
    v_supplier.departure_id
      is not null
    and
    v_incident.departure_id <>
      v_supplier.departure_id
  then
    raise exception
      'Supplier commitment departure mismatch';
  end if;


  update
    public.tour_operation_incidents
  set
    supplier_commitment_id =
      v_supplier.id,

    requires_supplier_action =
      true,

    supplier_recovery_status =
      case
        when supplier_recoverable_amount >
          0
        then
          'pending'
        else
          supplier_recovery_status
      end,

    updated_by =
      v_actor
  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    'supplier_action',
    v_actor,
    'Tedarikçi taahhüdü vakaya bağlandı.',
    jsonb_build_object(
      'supplier_commitment_id',
      v_supplier.id,

      'supplier_id',
      v_supplier.supplier_id,

      'service_title',
      v_supplier.service_title
    )
  );

end;
$$;


revoke all
on function
  public.link_tour_incident_supplier(
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.link_tour_incident_supplier(
    uuid,
    uuid
  )
to authenticated;


-- ------------------------------------------------------------
-- CREATE OPERATION TASK FROM INCIDENT
-- ------------------------------------------------------------

create or replace function
  public.create_tour_incident_task(
    p_incident_id uuid,
    p_title text,
    p_due_at timestamptz default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

  v_task_id uuid;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    nullif(
      btrim(
        coalesce(
          p_title,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Task title is required';
  end if;


  insert into
    public.tour_operation_tasks
  (
    company_id,
    tour_id,
    departure_id,

    title,

    description,

    task_type,

    priority,

    status,

    due_at,

    created_by,
    updated_by
  )
  values
  (
    v_incident.company_id,
    v_incident.tour_id,
    v_incident.departure_id,

    btrim(
      p_title
    ),

    'Operasyon hata vakası: ' ||
    v_incident.incident_number ||
    ' · ' ||
    v_incident.title,

    'other',

    case
      when
        v_incident.severity =
          'critical'
      then
        'critical'

      when
        v_incident.severity =
          'high'
      then
        'high'

      else
        'normal'
    end,

    'pending',

    coalesce(
      p_due_at,
      v_incident.sla_due_at
    ),

    v_actor,
    v_actor
  )
  returning
    id
  into
    v_task_id;


  update
    public.tour_operation_incidents
  set
    operation_task_id =
      v_task_id,

    status =
      case
        when status =
          'open'
        then
          'action_required'
        else
          status
      end,

    updated_by =
      v_actor
  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    'task_created',
    v_actor,
    'Operasyon aksiyon görevi oluşturuldu.',
    jsonb_build_object(
      'operation_task_id',
      v_task_id,

      'title',
      p_title,

      'due_at',
      coalesce(
        p_due_at,
        v_incident.sla_due_at
      )
    )
  );


  return
    v_task_id;

end;
$$;


revoke all
on function
  public.create_tour_incident_task(
    uuid,
    text,
    timestamptz
  )
from public;


grant execute
on function
  public.create_tour_incident_task(
    uuid,
    text,
    timestamptz
  )
to authenticated;


-- ------------------------------------------------------------
-- LINK CHANGE / REFUND CASE
-- ------------------------------------------------------------

create or replace function
  public.link_tour_incident_change_case(
    p_incident_id uuid,
    p_change_case_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

  v_case
    public.tour_change_cases%rowtype;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id =
      p_change_case_id
    and
    company_id =
      v_incident.company_id
    and
    tour_id =
      v_incident.tour_id;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if
    v_incident.departure_id
      is not null
    and
    v_case.departure_id
      is not null
    and
    v_incident.departure_id <>
      v_case.departure_id
  then
    raise exception
      'Change case departure mismatch';
  end if;


  if
    v_incident.reservation_id
      is not null
    and
    v_case.reservation_id
      is not null
    and
    v_incident.reservation_id <>
      v_case.reservation_id
  then
    raise exception
      'Change case reservation mismatch';
  end if;


  update
    public.tour_operation_incidents
  set
    linked_change_case_id =
      v_case.id,

    requires_finance_action =
      true,

    compensation_status =
      case
        when customer_compensation_amount >
          0
        then
          'linked'
        else
          compensation_status
      end,

    updated_by =
      v_actor
  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    'change_case_linked',
    v_actor,
    'İptal / değişiklik / iade vakası operasyona bağlandı.',
    jsonb_build_object(
      'change_case_id',
      v_case.id,

      'case_number',
      v_case.case_number,

      'case_type',
      v_case.case_type,

      'status',
      v_case.status
    )
  );

end;
$$;


revoke all
on function
  public.link_tour_incident_change_case(
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.link_tour_incident_change_case(
    uuid,
    uuid
  )
to authenticated;


-- ------------------------------------------------------------
-- FINANCE / RECOVERY STATUS
-- ------------------------------------------------------------

create or replace function
  public.update_tour_incident_finance_resolution(
    p_incident_id uuid,
    p_actual_loss_amount numeric,
    p_customer_compensation_amount numeric,
    p_supplier_recoverable_amount numeric,
    p_compensation_status text,
    p_supplier_recovery_status text,
    p_note text default null
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    coalesce(
      p_actual_loss_amount,
      0
    ) < 0
    or
    coalesce(
      p_customer_compensation_amount,
      0
    ) < 0
    or
    coalesce(
      p_supplier_recoverable_amount,
      0
    ) < 0
  then
    raise exception
      'Finance values cannot be negative';
  end if;


  if
    p_compensation_status not in (
      'not_required',
      'pending',
      'linked',
      'completed',
      'waived'
    )
  then
    raise exception
      'Invalid compensation status';
  end if;


  if
    p_supplier_recovery_status not in (
      'not_required',
      'pending',
      'claimed',
      'recovered',
      'waived'
    )
  then
    raise exception
      'Invalid supplier recovery status';
  end if;


  update
    public.tour_operation_incidents

  set
    actual_loss_amount =
      coalesce(
        p_actual_loss_amount,
        0
      ),

    customer_compensation_amount =
      coalesce(
        p_customer_compensation_amount,
        0
      ),

    supplier_recoverable_amount =
      coalesce(
        p_supplier_recoverable_amount,
        0
      ),

    compensation_status =
      p_compensation_status,

    supplier_recovery_status =
      p_supplier_recovery_status,

    requires_finance_action =
      (
        coalesce(
          p_customer_compensation_amount,
          0
        ) >
          0
        or
        coalesce(
          p_actual_loss_amount,
          0
        ) >
          0
      ),

    requires_supplier_action =
      (
        requires_supplier_action
        or
        coalesce(
          p_supplier_recoverable_amount,
          0
        ) >
          0
      ),

    updated_by =
      v_actor

  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    'finance_action',
    v_actor,
    nullif(
      btrim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    jsonb_build_object(
      'actual_loss_amount',
      p_actual_loss_amount,

      'customer_compensation_amount',
      p_customer_compensation_amount,

      'supplier_recoverable_amount',
      p_supplier_recoverable_amount,

      'compensation_status',
      p_compensation_status,

      'supplier_recovery_status',
      p_supplier_recovery_status
    )
  );

end;
$$;


revoke all
on function
  public.update_tour_incident_finance_resolution(
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text
  )
from public;


grant execute
on function
  public.update_tour_incident_finance_resolution(
    uuid,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text
  )
to authenticated;


-- ------------------------------------------------------------
-- FINAL INCIDENT RESOLUTION
-- ------------------------------------------------------------

create or replace function
  public.finalize_tour_operation_incident(
    p_incident_id uuid,
    p_resolution text,
    p_root_cause text default null,
    p_close boolean default false,
    p_closure_note text default null
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident
    public.tour_operation_incidents%rowtype;

  v_new_status text;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_incident
  from
    public.tour_operation_incidents
  where
    id =
      p_incident_id
  for update;


  if not found then
    raise exception
      'Incident not found';
  end if;


  if not
    public.is_active_company_member(
      v_incident.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    nullif(
      btrim(
        coalesce(
          p_resolution,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Resolution is required';
  end if;


  v_new_status :=
    case
      when p_close
      then 'closed'
      else 'resolved'
    end;


  update
    public.tour_operation_incidents
  set
    resolution =
      btrim(
        p_resolution
      ),

    root_cause =
      nullif(
        btrim(
          coalesce(
            p_root_cause,
            ''
          )
        ),
        ''
      ),

    closure_note =
      nullif(
        btrim(
          coalesce(
            p_closure_note,
            ''
          )
        ),
        ''
      ),

    status =
      v_new_status,

    resolved_at =
      coalesce(
        resolved_at,
        now()
      ),

    closed_at =
      case
        when p_close
        then
          coalesce(
            closed_at,
            now()
          )
        else
          closed_at
      end,

    updated_by =
      v_actor

  where
    id =
      v_incident.id;


  insert into
    public.tour_operation_incident_events
  (
    company_id,
    incident_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_incident.company_id,
    v_incident.id,
    case
      when p_close
      then 'closed'
      else 'resolved'
    end,
    v_actor,
    p_closure_note,
    jsonb_build_object(
      'resolution',
      p_resolution,

      'root_cause',
      p_root_cause,

      'status',
      v_new_status
    )
  );

end;
$$;


revoke all
on function
  public.finalize_tour_operation_incident(
    uuid,
    text,
    text,
    boolean,
    text
  )
from public;


grant execute
on function
  public.finalize_tour_operation_incident(
    uuid,
    text,
    text,
    boolean,
    text
  )
to authenticated;


comment on function
  public.finalize_tour_operation_incident(
    uuid,
    text,
    text,
    boolean,
    text
  )
is
  'Resolves or closes a Tour OS operational incident using closure hard guards.';

