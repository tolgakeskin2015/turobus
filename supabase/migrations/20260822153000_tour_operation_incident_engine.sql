-- ============================================================
-- TUROBÜS TOUR OS
-- 16.1A — OPERATION INCIDENT ENGINE
--
-- Missing service / operational failure / customer impact
-- central case engine.
--
-- This phase records and manages incidents.
-- It does NOT automatically mutate reservations, payments,
-- suppliers, transport, or refund records.
-- ============================================================


-- ------------------------------------------------------------
-- INCIDENT MASTER
-- ------------------------------------------------------------

create table if not exists
  public.tour_operation_incidents
(
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  supplier_commitment_id uuid
    references public.tour_supplier_commitments(id)
    on delete set null,

  operation_task_id uuid
    references public.tour_operation_tasks(id)
    on delete set null,

  incident_number text
    not null,

  incident_type text
    not null
    check (
      incident_type in (
        'missing_service',
        'supplier_failure',
        'transport_problem',
        'accommodation_problem',
        'guide_staff_problem',
        'document_problem',
        'customer_complaint',
        'overbooking',
        'delay',
        'safety',
        'payment_problem',
        'service_quality',
        'other'
      )
    ),

  severity text
    not null
    default 'medium'
    check (
      severity in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  status text
    not null
    default 'open'
    check (
      status in (
        'open',
        'investigating',
        'action_required',
        'waiting_supplier',
        'waiting_customer',
        'resolved',
        'closed',
        'cancelled'
      )
    ),

  source text
    not null
    default 'operation'
    check (
      source in (
        'operation',
        'customer',
        'supplier',
        'staff',
        'system',
        'control_tower',
        'other'
      )
    ),

  title text
    not null,

  description text,

  customer_impact text,

  operational_impact text,

  resolution text,

  root_cause text,

  responsible_user_id uuid,

  assigned_at timestamptz,

  sla_due_at timestamptz,

  first_response_at timestamptz,

  resolved_at timestamptz,

  closed_at timestamptz,

  currency text
    not null
    default 'TRY',

  estimated_loss_amount numeric(14,2)
    not null
    default 0
    check (
      estimated_loss_amount >= 0
    ),

  actual_loss_amount numeric(14,2)
    not null
    default 0
    check (
      actual_loss_amount >= 0
    ),

  customer_compensation_amount numeric(14,2)
    not null
    default 0
    check (
      customer_compensation_amount >= 0
    ),

  supplier_recoverable_amount numeric(14,2)
    not null
    default 0
    check (
      supplier_recoverable_amount >= 0
    ),

  requires_customer_action boolean
    not null
    default false,

  requires_supplier_action boolean
    not null
    default false,

  requires_finance_action boolean
    not null
    default false,

  requires_management_approval boolean
    not null
    default false,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    incident_number
  )
);


-- ------------------------------------------------------------
-- IMMUTABLE INCIDENT EVENTS
-- ------------------------------------------------------------

create table if not exists
  public.tour_operation_incident_events
(
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  incident_id uuid
    not null
    references public.tour_operation_incidents(id)
    on delete cascade,

  event_type text
    not null
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
        'resolved',
        'closed',
        'cancelled'
      )
    ),

  actor_id uuid,

  note text,

  payload jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists
  tour_operation_incidents_company_status_idx

on public.tour_operation_incidents (
  company_id,
  status,
  severity,
  created_at desc
);


create index if not exists
  tour_operation_incidents_tour_idx

on public.tour_operation_incidents (
  company_id,
  tour_id,
  created_at desc
);


create index if not exists
  tour_operation_incidents_departure_idx

on public.tour_operation_incidents (
  company_id,
  departure_id,
  created_at desc
);


create index if not exists
  tour_operation_incidents_reservation_idx

on public.tour_operation_incidents (
  company_id,
  reservation_id,
  created_at desc
);


create index if not exists
  tour_operation_incidents_sla_idx

on public.tour_operation_incidents (
  company_id,
  sla_due_at
)

where
  status not in (
    'resolved',
    'closed',
    'cancelled'
  );


create index if not exists
  tour_operation_incident_events_incident_idx

on public.tour_operation_incident_events (
  company_id,
  incident_id,
  created_at
);


-- ------------------------------------------------------------
-- SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_operation_incident_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select
      1
    from
      public.tours t
    where
      t.id =
        new.tour_id
      and
      t.company_id =
        new.company_id
  )
  then
    raise exception
      'Incident tour does not belong to company';
  end if;


  if
    new.departure_id is not null
    and
    not exists (
      select
        1
      from
        public.tour_departures d
      where
        d.id =
          new.departure_id
        and
        d.company_id =
          new.company_id
        and
        d.tour_id =
          new.tour_id
    )
  then
    raise exception
      'Incident departure does not belong to company/tour';
  end if;


  if
    new.reservation_id is not null
    and
    not exists (
      select
        1
      from
        public.reservations r
      where
        r.id =
          new.reservation_id
        and
        r.company_id =
          new.company_id
        and
        (
          r.tour_id is null
          or
          r.tour_id =
            new.tour_id
        )
        and
        (
          new.departure_id is null
          or
          r.departure_id is null
          or
          r.departure_id =
            new.departure_id
        )
    )
  then
    raise exception
      'Incident reservation scope mismatch';
  end if;


  if
    new.supplier_commitment_id
      is not null
    and
    not exists (
      select
        1
      from
        public.tour_supplier_commitments s
      where
        s.id =
          new.supplier_commitment_id
        and
        s.company_id =
          new.company_id
        and
        s.tour_id =
          new.tour_id
        and
        (
          new.departure_id is null
          or
          s.departure_id is null
          or
          s.departure_id =
            new.departure_id
        )
    )
  then
    raise exception
      'Incident supplier commitment scope mismatch';
  end if;


  if
    new.operation_task_id
      is not null
    and
    not exists (
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
        t.tour_id =
          new.tour_id
        and
        (
          new.departure_id is null
          or
          t.departure_id is null
          or
          t.departure_id =
            new.departure_id
        )
    )
  then
    raise exception
      'Incident task scope mismatch';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_operation_incidents_validate_scope

on public.tour_operation_incidents;


create trigger
  tour_operation_incidents_validate_scope

before insert or update of
  company_id,
  tour_id,
  departure_id,
  reservation_id,
  supplier_commitment_id,
  operation_task_id

on public.tour_operation_incidents

for each row

execute function
  public.validate_tour_operation_incident_scope();


-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function
  public.touch_tour_operation_incident_updated_at()
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
  tour_operation_incidents_touch_updated_at

on public.tour_operation_incidents;


create trigger
  tour_operation_incidents_touch_updated_at

before update

on public.tour_operation_incidents

for each row

execute function
  public.touch_tour_operation_incident_updated_at();


-- ------------------------------------------------------------
-- EVENT SCOPE
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_operation_incident_event_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select
      1
    from
      public.tour_operation_incidents i
    where
      i.id =
        new.incident_id
      and
      i.company_id =
        new.company_id
  )
  then
    raise exception
      'Incident event company scope mismatch';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_operation_incident_events_validate_scope

on public.tour_operation_incident_events;


create trigger
  tour_operation_incident_events_validate_scope

before insert or update of
  company_id,
  incident_id

on public.tour_operation_incident_events

for each row

execute function
  public.validate_tour_operation_incident_event_scope();


-- ------------------------------------------------------------
-- EVENT IMMUTABILITY
-- ------------------------------------------------------------

create or replace function
  public.prevent_tour_operation_incident_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  raise exception
    'Tour operation incident events are immutable';

end;
$$;


drop trigger if exists
  tour_operation_incident_events_no_update

on public.tour_operation_incident_events;


create trigger
  tour_operation_incident_events_no_update

before update

on public.tour_operation_incident_events

for each row

execute function
  public.prevent_tour_operation_incident_event_mutation();


drop trigger if exists
  tour_operation_incident_events_no_delete

on public.tour_operation_incident_events;


create trigger
  tour_operation_incident_events_no_delete

before delete

on public.tour_operation_incident_events

for each row

execute function
  public.prevent_tour_operation_incident_event_mutation();


-- ------------------------------------------------------------
-- CREATE INCIDENT RPC
-- ------------------------------------------------------------

create or replace function
  public.create_tour_operation_incident(
    p_company_id uuid,
    p_tour_id uuid,
    p_departure_id uuid default null,
    p_reservation_id uuid default null,
    p_incident_type text default 'other',
    p_severity text default 'medium',
    p_source text default 'operation',
    p_title text default null,
    p_description text default null,
    p_customer_impact text default null,
    p_operational_impact text default null,
    p_sla_due_at timestamptz default null,
    p_estimated_loss_amount numeric default 0,
    p_requires_customer_action boolean default false,
    p_requires_supplier_action boolean default false,
    p_requires_finance_action boolean default false,
    p_requires_management_approval boolean default false
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_actor uuid;

  v_incident_id uuid;

  v_incident_number text;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_active_company_member(
      p_company_id
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
    )
    is null
  then
    raise exception
      'Incident title is required';
  end if;


  if
    coalesce(
      p_estimated_loss_amount,
      0
    ) < 0
  then
    raise exception
      'Estimated loss cannot be negative';
  end if;


  v_incident_number :=
    'INC-' ||
    to_char(
      clock_timestamp(),
      'YYYYMMDD-HH24MISS'
    ) ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        6
      )
    );


  insert into
    public.tour_operation_incidents
  (
    company_id,
    tour_id,
    departure_id,
    reservation_id,

    incident_number,
    incident_type,
    severity,
    status,
    source,

    title,
    description,

    customer_impact,
    operational_impact,

    sla_due_at,

    estimated_loss_amount,

    requires_customer_action,
    requires_supplier_action,
    requires_finance_action,
    requires_management_approval,

    created_by,
    updated_by
  )

  values
  (
    p_company_id,
    p_tour_id,
    p_departure_id,
    p_reservation_id,

    v_incident_number,
    p_incident_type,
    p_severity,
    'open',
    p_source,

    btrim(
      p_title
    ),

    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),

    nullif(
      btrim(
        coalesce(
          p_customer_impact,
          ''
        )
      ),
      ''
    ),

    nullif(
      btrim(
        coalesce(
          p_operational_impact,
          ''
        )
      ),
      ''
    ),

    p_sla_due_at,

    coalesce(
      p_estimated_loss_amount,
      0
    ),

    p_requires_customer_action,
    p_requires_supplier_action,
    p_requires_finance_action,
    p_requires_management_approval,

    v_actor,
    v_actor
  )

  returning
    id

  into
    v_incident_id;


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
    p_company_id,
    v_incident_id,
    'created',
    v_actor,
    'Operasyon hata vakası oluşturuldu.',
    jsonb_build_object(
      'incident_number',
      v_incident_number,

      'incident_type',
      p_incident_type,

      'severity',
      p_severity,

      'departure_id',
      p_departure_id,

      'reservation_id',
      p_reservation_id
    )
  );


  return
    v_incident_id;

end;
$$;


-- ------------------------------------------------------------
-- UPDATE INCIDENT RPC
-- ------------------------------------------------------------

create or replace function
  public.update_tour_operation_incident(
    p_incident_id uuid,
    p_status text default null,
    p_severity text default null,
    p_responsible_user_id uuid default null,
    p_resolution text default null,
    p_root_cause text default null,
    p_actual_loss_amount numeric default null,
    p_customer_compensation_amount numeric default null,
    p_supplier_recoverable_amount numeric default null,
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

  v_old_status text;

  v_old_severity text;

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
    p_status is not null
    and
    p_status not in (
      'open',
      'investigating',
      'action_required',
      'waiting_supplier',
      'waiting_customer',
      'resolved',
      'closed',
      'cancelled'
    )
  then
    raise exception
      'Invalid incident status';
  end if;


  if
    p_severity is not null
    and
    p_severity not in (
      'low',
      'medium',
      'high',
      'critical'
    )
  then
    raise exception
      'Invalid incident severity';
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
      'Incident finance values cannot be negative';
  end if;


  v_old_status :=
    v_incident.status;


  v_old_severity :=
    v_incident.severity;


  update
    public.tour_operation_incidents

  set
    status =
      coalesce(
        p_status,
        status
      ),

    severity =
      coalesce(
        p_severity,
        severity
      ),

    responsible_user_id =
      coalesce(
        p_responsible_user_id,
        responsible_user_id
      ),

    assigned_at =
      case

        when
          p_responsible_user_id
            is not null
          and
          assigned_at
            is null

        then
          now()

        else
          assigned_at

      end,

    first_response_at =
      case

        when
          first_response_at
            is null

        then
          now()

        else
          first_response_at

      end,

    resolution =
      coalesce(
        nullif(
          btrim(
            coalesce(
              p_resolution,
              ''
            )
          ),
          ''
        ),
        resolution
      ),

    root_cause =
      coalesce(
        nullif(
          btrim(
            coalesce(
              p_root_cause,
              ''
            )
          ),
          ''
        ),
        root_cause
      ),

    actual_loss_amount =
      coalesce(
        p_actual_loss_amount,
        actual_loss_amount
      ),

    customer_compensation_amount =
      coalesce(
        p_customer_compensation_amount,
        customer_compensation_amount
      ),

    supplier_recoverable_amount =
      coalesce(
        p_supplier_recoverable_amount,
        supplier_recoverable_amount
      ),

    resolved_at =
      case

        when
          p_status =
            'resolved'
          and
          resolved_at
            is null

        then
          now()

        else
          resolved_at

      end,

    closed_at =
      case

        when
          p_status =
            'closed'
          and
          closed_at
            is null

        then
          now()

        else
          closed_at

      end,

    updated_by =
      v_actor

  where
    id =
      v_incident.id;


  if
    p_status is not null
    and
    p_status <>
      v_old_status
  then

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
        when
          p_status =
            'resolved'
        then
          'resolved'

        when
          p_status =
            'closed'
        then
          'closed'

        when
          p_status =
            'cancelled'
        then
          'cancelled'

        else
          'status_changed'
      end,

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
        'old_status',
        v_old_status,

        'new_status',
        p_status
      )
    );

  end if;


  if
    p_severity is not null
    and
    p_severity <>
      v_old_severity
  then

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
      'severity_changed',
      v_actor,
      p_note,
      jsonb_build_object(
        'old_severity',
        v_old_severity,

        'new_severity',
        p_severity
      )
    );

  end if;


  if
    p_responsible_user_id
      is not null
  then

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
      p_note,
      jsonb_build_object(
        'responsible_user_id',
        p_responsible_user_id
      )
    );

  end if;


  if
    p_actual_loss_amount
      is not null
    or
    p_customer_compensation_amount
      is not null
    or
    p_supplier_recoverable_amount
      is not null
  then

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
      'loss_updated',
      v_actor,
      p_note,
      jsonb_build_object(
        'actual_loss_amount',
        p_actual_loss_amount,

        'customer_compensation_amount',
        p_customer_compensation_amount,

        'supplier_recoverable_amount',
        p_supplier_recoverable_amount
      )
    );

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
    )
    is not null
  then

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
      'resolution_added',
      v_actor,
      p_resolution,
      '{}'::jsonb
    );

  end if;

end;
$$;


-- ------------------------------------------------------------
-- RPC SECURITY
-- ------------------------------------------------------------

revoke all
on function
  public.create_tour_operation_incident(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    timestamptz,
    numeric,
    boolean,
    boolean,
    boolean,
    boolean
  )
from public;


grant execute
on function
  public.create_tour_operation_incident(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    text,
    text,
    timestamptz,
    numeric,
    boolean,
    boolean,
    boolean,
    boolean
  )
to authenticated;


revoke all
on function
  public.update_tour_operation_incident(
    uuid,
    text,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text
  )
from public;


grant execute
on function
  public.update_tour_operation_incident(
    uuid,
    text,
    text,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text
  )
to authenticated;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table
  public.tour_operation_incidents
enable row level security;


alter table
  public.tour_operation_incident_events
enable row level security;


drop policy if exists
  tour_operation_incidents_company_member
on public.tour_operation_incidents;


create policy
  tour_operation_incidents_company_member

on public.tour_operation_incidents

for select

to authenticated

using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_incident_events_company_member
on public.tour_operation_incident_events;


create policy
  tour_operation_incident_events_company_member

on public.tour_operation_incident_events

for select

to authenticated

using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
  public.tour_operation_incidents
is
  'Tour OS missing service and operational failure incident cases.';


comment on table
  public.tour_operation_incident_events
is
  'Immutable audit timeline for Tour OS incident cases.';

