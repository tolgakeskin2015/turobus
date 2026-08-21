-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 14 — CONTROLLED OPERATION STATE ENGINE
--
-- Existing tours.operation_status is preserved.
--
-- Detailed lifecycle:
--
-- draft
-- sales
-- confirmed
-- preparing
-- ready
-- on_the_way
-- in_progress
-- returning
-- completed
-- cancelled
--
-- Existing legacy operation_status remains a broad mirror:
--
-- on_the_way / in_progress -> active
-- ============================================================


alter table
public.tours
add column if not exists
operation_stage text
not null
default 'draft'
check (
  operation_stage in (
    'draft',
    'sales',
    'confirmed',
    'preparing',
    'ready',
    'on_the_way',
    'in_progress',
    'returning',
    'completed',
    'cancelled'
  )
);


update public.tours
set operation_stage =
  case operation_status

    when 'draft'
      then 'draft'

    when 'sales'
      then 'sales'

    when 'confirmed'
      then 'confirmed'

    when 'preparing'
      then 'preparing'

    when 'ready'
      then 'ready'

    when 'active'
      then 'in_progress'

    when 'returning'
      then 'returning'

    when 'completed'
      then 'completed'

    when 'cancelled'
      then 'cancelled'

    else 'draft'

  end
where
  operation_stage = 'draft'
  and
  operation_status <> 'draft';


create index if not exists
tours_company_operation_stage_idx
on public.tours (
  company_id,
  operation_stage
);


create table if not exists
public.tour_operation_state_history (

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

  from_stage text,

  to_stage text
    not null,

  transition_type text
    not null
    default 'manual'
    check (
      transition_type in (
        'manual',
        'system',
        'rollback',
        'cancel'
      )
    ),

  readiness_snapshot jsonb
    not null
    default '{}'::jsonb,

  transition_note text,

  changed_by uuid,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_operation_state_history_tour_idx
on public.tour_operation_state_history (
  company_id,
  tour_id,
  created_at desc
);


alter table
public.tour_operation_state_history
enable row level security;


drop policy if exists
tour_operation_state_history_select_company
on public.tour_operation_state_history;


create policy
tour_operation_state_history_select_company
on public.tour_operation_state_history
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


revoke all
on public.tour_operation_state_history
from anon;


grant select
on public.tour_operation_state_history
to authenticated;


-- ============================================================
-- READINESS ENGINE
--
-- Only real existing data is inspected.
-- No fake KPI or assumed provider state.
-- ============================================================

create or replace function
public.get_tour_operation_readiness(
  p_company_id uuid,
  p_tour_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_transport_mode text;

  v_critical_tasks integer := 0;
  v_open_tasks integer := 0;

  v_required_documents integer := 0;
  v_missing_documents integer := 0;
  v_expired_documents integer := 0;

  v_supplier_pending integer := 0;
  v_supplier_issues integer := 0;

  v_flight_count integer := 0;
  v_flight_pnr_missing integer := 0;
  v_ticketing_risk integer := 0;

  v_bus_count integer := 0;
  v_bus_vehicle_missing integer := 0;
  v_bus_driver_missing integer := 0;
  v_bus_guide_missing integer := 0;

  v_passenger_count integer := 0;
  v_identity_missing integer := 0;

  v_blockers integer := 0;
  v_warnings integer := 0;

begin

  if not public.is_active_company_member(
    p_company_id
  ) then

    raise exception
      'COMPANY_ACCESS_DENIED';

  end if;


  select
    transport_mode
  into
    v_transport_mode
  from public.tours
  where
    id = p_tour_id
    and
    company_id = p_company_id;


  if not found then
    raise exception
      'TOUR_NOT_FOUND';
  end if;


  select
    count(*) filter (
      where
        priority = 'critical'
        and
        status not in (
          'completed',
          'cancelled'
        )
    ),
    count(*) filter (
      where
        status not in (
          'completed',
          'cancelled'
        )
    )
  into
    v_critical_tasks,
    v_open_tasks
  from public.tour_operation_tasks
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id;


  select
    count(*) filter (
      where
        is_required = true
    ),
    count(*) filter (
      where
        is_required = true
        and
        document_status not in (
          'ready',
          'sent',
          'cancelled'
        )
    ),
    count(*) filter (
      where
        expires_at is not null
        and
        expires_at < now()
        and
        document_status <> 'cancelled'
    )
  into
    v_required_documents,
    v_missing_documents,
    v_expired_documents
  from public.tour_documents
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id;


  select
    count(*) filter (
      where
        confirmation_status in (
          'pending',
          'requested'
        )
    ),
    count(*) filter (
      where
        operational_status = 'issue'
    )
  into
    v_supplier_pending,
    v_supplier_issues
  from public.tour_supplier_commitments
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id
    and
    confirmation_status <> 'cancelled';


  select
    count(*),
    count(*) filter (
      where
        (
          nullif(
            trim(pnr),
            ''
          ) is null
          and
          nullif(
            trim(group_booking_code),
            ''
          ) is null
        )
    ),
    count(*) filter (
      where
        ticketing_deadline is not null
        and
        ticketing_deadline < now()
        and
        status not in (
          'ticketed',
          'departed',
          'arrived',
          'cancelled'
        )
    )
  into
    v_flight_count,
    v_flight_pnr_missing,
    v_ticketing_risk
  from public.tour_flights
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id
    and
    status <> 'cancelled';


  select
    count(*),
    count(*) filter (
      where
        vehicle_id is null
    ),
    count(*) filter (
      where
        nullif(
          trim(driver_1_name),
          ''
        ) is null
    ),
    count(*) filter (
      where
        nullif(
          trim(guide_name),
          ''
        ) is null
    )
  into
    v_bus_count,
    v_bus_vehicle_missing,
    v_bus_driver_missing,
    v_bus_guide_missing
  from public.tour_bus_operations
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id
    and
    status <> 'cancelled';


  select
    count(*),
    count(*) filter (
      where
        nullif(
          trim(identity_number),
          ''
        ) is null
    )
  into
    v_passenger_count,
    v_identity_missing
  from public.tour_passengers
  where
    company_id = p_company_id
    and
    tour_id = p_tour_id;


  v_blockers :=
      v_critical_tasks
    + v_missing_documents
    + v_expired_documents
    + v_supplier_pending
    + v_supplier_issues
    + v_ticketing_risk;


  if
    v_transport_mode = 'air'
  then

    if
      v_flight_count = 0
    then
      v_blockers :=
        v_blockers + 1;
    end if;


    v_blockers :=
      v_blockers +
      v_flight_pnr_missing;

  end if;


  if
    v_transport_mode = 'bus'
  then

    if
      v_bus_count = 0
    then
      v_blockers :=
        v_blockers + 1;
    end if;


    v_blockers :=
      v_blockers +
      v_bus_vehicle_missing +
      v_bus_driver_missing;

  end if;


  -- Guide and passenger identity gaps are warnings.
  -- Some operations may legitimately not require a guide,
  -- and real passenger definition can be incomplete until data entry.

  v_warnings :=
      v_open_tasks
    + v_bus_guide_missing
    + v_identity_missing;


  return jsonb_build_object(

    'transport_mode',
      v_transport_mode,

    'blockers',
      v_blockers,

    'warnings',
      v_warnings,

    'critical_tasks',
      v_critical_tasks,

    'open_tasks',
      v_open_tasks,

    'required_documents',
      v_required_documents,

    'missing_documents',
      v_missing_documents,

    'expired_documents',
      v_expired_documents,

    'supplier_pending',
      v_supplier_pending,

    'supplier_issues',
      v_supplier_issues,

    'flight_count',
      v_flight_count,

    'flight_pnr_missing',
      v_flight_pnr_missing,

    'ticketing_risk',
      v_ticketing_risk,

    'bus_count',
      v_bus_count,

    'bus_vehicle_missing',
      v_bus_vehicle_missing,

    'bus_driver_missing',
      v_bus_driver_missing,

    'bus_guide_missing',
      v_bus_guide_missing,

    'passenger_count',
      v_passenger_count,

    'identity_missing',
      v_identity_missing,

    'ready_for_departure',
      (
        v_blockers = 0
      )

  );

end;
$$;


revoke all
on function
public.get_tour_operation_readiness(
  uuid,
  uuid
)
from public;


grant execute
on function
public.get_tour_operation_readiness(
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- CONTROLLED TRANSITION ENGINE
-- ============================================================

create or replace function
public.transition_tour_operation_stage(
  p_company_id uuid,
  p_tour_id uuid,
  p_target_stage text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_current_stage text;
  v_legacy_status text;
  v_readiness jsonb;
  v_allowed boolean := false;

begin

  if not public.is_active_company_member(
    p_company_id
  ) then

    raise exception
      'COMPANY_ACCESS_DENIED';

  end if;


  select
    operation_stage
  into
    v_current_stage
  from public.tours
  where
    id = p_tour_id
    and
    company_id = p_company_id
  for update;


  if not found then
    raise exception
      'TOUR_NOT_FOUND';
  end if;


  if
    p_target_stage not in (
      'draft',
      'sales',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'in_progress',
      'returning',
      'completed',
      'cancelled'
    )
  then

    raise exception
      'INVALID_TARGET_STAGE';

  end if;


  if
    p_target_stage =
      v_current_stage
  then

    return jsonb_build_object(
      'ok',
      true,
      'stage',
      v_current_stage,
      'unchanged',
      true
    );

  end if;


  v_allowed :=
    case v_current_stage

      when 'draft'
        then p_target_stage in (
          'sales',
          'cancelled'
        )

      when 'sales'
        then p_target_stage in (
          'confirmed',
          'cancelled'
        )

      when 'confirmed'
        then p_target_stage in (
          'preparing',
          'cancelled'
        )

      when 'preparing'
        then p_target_stage in (
          'ready',
          'cancelled'
        )

      when 'ready'
        then p_target_stage in (
          'on_the_way',
          'cancelled'
        )

      when 'on_the_way'
        then p_target_stage in (
          'in_progress',
          'cancelled'
        )

      when 'in_progress'
        then p_target_stage in (
          'returning',
          'cancelled'
        )

      when 'returning'
        then p_target_stage in (
          'completed',
          'cancelled'
        )

      else false

    end;


  if not v_allowed then

    raise exception
      'INVALID_STAGE_TRANSITION:%->%',
      v_current_stage,
      p_target_stage;

  end if;


  v_readiness :=
    public.get_tour_operation_readiness(
      p_company_id,
      p_tour_id
    );


  if
    p_target_stage = 'ready'
    and
    coalesce(
      (
        v_readiness ->
        'blockers'
      )::text::integer,
      0
    ) > 0
  then

    raise exception
      'READINESS_BLOCKED:%',
      v_readiness::text;

  end if;


  if
    p_target_stage = 'completed'
    and
    coalesce(
      (
        v_readiness ->
        'critical_tasks'
      )::text::integer,
      0
    ) > 0
  then

    raise exception
      'CRITICAL_TASKS_OPEN';

  end if;


  v_legacy_status :=
    case p_target_stage

      when 'draft'
        then 'draft'

      when 'sales'
        then 'sales'

      when 'confirmed'
        then 'confirmed'

      when 'preparing'
        then 'preparing'

      when 'ready'
        then 'ready'

      when 'on_the_way'
        then 'active'

      when 'in_progress'
        then 'active'

      when 'returning'
        then 'returning'

      when 'completed'
        then 'completed'

      when 'cancelled'
        then 'cancelled'

    end;


  update public.tours
  set
    operation_stage =
      p_target_stage,

    operation_status =
      v_legacy_status

  where
    id = p_tour_id
    and
    company_id = p_company_id;


  insert into
  public.tour_operation_state_history (

    company_id,
    tour_id,
    from_stage,
    to_stage,
    transition_type,
    readiness_snapshot,
    transition_note,
    changed_by

  )
  values (

    p_company_id,
    p_tour_id,
    v_current_stage,
    p_target_stage,

    case
      when
        p_target_stage =
          'cancelled'
      then
        'cancel'
      else
        'manual'
    end,

    v_readiness,

    nullif(
      trim(p_note),
      ''
    ),

    auth.uid()

  );


  return jsonb_build_object(

    'ok',
      true,

    'from_stage',
      v_current_stage,

    'to_stage',
      p_target_stage,

    'legacy_status',
      v_legacy_status,

    'readiness',
      v_readiness

  );

end;
$$;


revoke all
on function
public.transition_tour_operation_stage(
  uuid,
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.transition_tour_operation_stage(
  uuid,
  uuid,
  text,
  text
)
to authenticated;


comment on column
public.tours.operation_stage
is
'Detailed Tour OS lifecycle. tours.operation_status remains backward-compatible broad status.';


comment on table
public.tour_operation_state_history
is
'Auditable Tour OS operation stage transition history.';


comment on function
public.transition_tour_operation_stage(
  uuid,
  uuid,
  text,
  text
)
is
'Controlled Tour OS state transition with real readiness gates.';
