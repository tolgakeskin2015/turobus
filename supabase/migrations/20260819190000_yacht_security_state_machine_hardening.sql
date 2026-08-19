
-- ============================================================
-- TUROBUS YACHT OS
-- SECURITY HARDENING — PHASE 2
--
-- - Maintenance booking collision independent of availability
-- - Maintenance terminal state machine
-- - Operation state machine
-- - No-show protection
-- - Operation planning authority
-- - Refund provider-reference idempotency
--
-- Applied migrations remain untouched.
-- ============================================================


-- ============================================================
-- 1. PROVIDER REFUND IDEMPOTENCY
--
-- A provider refund reference must never belong to two
-- different refund rows.
-- ============================================================

create or replace function
public.yacht_os_guard_refund_provider_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if nullif(
    trim(
      new.provider_reference
    ),
    ''
  ) is null then
    return new;
  end if;


  if exists (
    select 1
    from public.yacht_os_refunds r
    where
      r.provider_reference =
        new.provider_reference
      and r.id <>
        new.id
  ) then
    raise exception
      'Provider refund reference already used';
  end if;


  return new;

end;
$$;


revoke execute
on function
  public.yacht_os_guard_refund_provider_reference()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_refund_provider_reference_guard
on public.yacht_os_refunds;


create trigger
  yacht_os_refund_provider_reference_guard
before insert or update of provider_reference
on public.yacht_os_refunds
for each row
execute function
  public.yacht_os_guard_refund_provider_reference();


-- ============================================================
-- 2. MAINTENANCE SCHEDULE — PHASE 2 WRAPPER
--
-- Phase 1 wrapper already handles role authority.
-- Now independently inspect bookings instead of trusting only
-- availability rows.
-- ============================================================

alter function
public.yacht_os_schedule_maintenance(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
rename to
yacht_os_schedule_maintenance_phase1_20260819;


revoke execute
on function
public.yacht_os_schedule_maintenance_phase1_20260819(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_schedule_maintenance(
  p_yacht_id uuid,
  p_maintenance_type text,
  p_title text,
  p_description text,
  p_planned_start date,
  p_planned_end date,
  p_priority text default 'medium',
  p_service_provider text default null,
  p_estimated_cost numeric default 0,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_booking_conflicts integer;
  v_maintenance_conflicts integer;
begin

  if
    p_planned_start is null
    or p_planned_end is null
    or p_planned_end <
       p_planned_start
  then
    raise exception
      'Invalid maintenance dates';
  end if;


  select company_id
  into v_company_id
  from public.yacht_os_yachts
  where id =
    p_yacht_id
  for update;


  if v_company_id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    v_company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  -- ----------------------------------------------------------
  -- IMPORTANT:
  -- This does NOT rely on yacht_os_availability.
  -- Pending/confirmed bookings independently block maintenance.
  -- ----------------------------------------------------------

  select count(*)
  into v_booking_conflicts
  from public.yacht_os_bookings b
  where
    b.company_id =
      v_company_id

    and b.yacht_id =
      p_yacht_id

    and b.status in (
      'pending',
      'confirmed'
    )

    and b.start_date <=
      p_planned_end

    and b.end_date >=
      p_planned_start;


  if v_booking_conflicts > 0 then
    raise exception
      'Maintenance conflicts with % active booking(s)',
      v_booking_conflicts;
  end if;


  -- Independent maintenance overlap guard.
  select count(*)
  into v_maintenance_conflicts
  from public.yacht_os_maintenance_jobs m
  where
    m.company_id =
      v_company_id

    and m.yacht_id =
      p_yacht_id

    and m.status in (
      'planned',
      'in_progress'
    )

    and m.planned_start <=
      p_planned_end

    and m.planned_end >=
      p_planned_start;


  if v_maintenance_conflicts > 0 then
    raise exception
      'Maintenance overlaps % active maintenance job(s)',
      v_maintenance_conflicts;
  end if;


  return
    public.yacht_os_schedule_maintenance_phase1_20260819(
      p_yacht_id,
      p_maintenance_type,
      p_title,
      p_description,
      p_planned_start,
      p_planned_end,
      p_priority,
      p_service_provider,
      p_estimated_cost,
      p_currency,
      p_note
    );

end;
$$;


revoke execute
on function
public.yacht_os_schedule_maintenance(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_schedule_maintenance(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
to authenticated;


-- ============================================================
-- 3. MAINTENANCE STATUS — STRICT STATE MACHINE
--
-- planned
--    -> in_progress
--    -> cancelled
--
-- in_progress
--    -> completed
--    -> cancelled
--
-- completed/cancelled are terminal.
-- Same-state calls remain idempotent.
-- ============================================================

alter function
public.yacht_os_update_maintenance_status(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
rename to
yacht_os_update_maintenance_status_phase1_20260819;


revoke execute
on function
public.yacht_os_update_maintenance_status_phase1_20260819(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_update_maintenance_status(
  p_maintenance_id uuid,
  p_status text,
  p_actual_cost numeric default null,
  p_engine_hours numeric default null,
  p_next_service_engine_hours numeric default null,
  p_next_maintenance_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.yacht_os_maintenance_jobs%rowtype;
begin

  select *
  into m
  from public.yacht_os_maintenance_jobs
  where id =
    p_maintenance_id
  for update;


  if m.id is null then
    raise exception
      'Maintenance not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    m.company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  if p_status not in (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Invalid maintenance status';
  end if;


  -- Idempotent same-state update is allowed.
  if m.status = p_status then

    return
      public.yacht_os_update_maintenance_status_phase1_20260819(
        p_maintenance_id,
        p_status,
        p_actual_cost,
        p_engine_hours,
        p_next_service_engine_hours,
        p_next_maintenance_date,
        p_note
      );

  end if;


  if m.status = 'planned'
     and p_status not in (
       'in_progress',
       'cancelled'
     )
  then
    raise exception
      'Invalid maintenance transition: planned -> %',
      p_status;
  end if;


  if m.status = 'in_progress'
     and p_status not in (
       'completed',
       'cancelled'
     )
  then
    raise exception
      'Invalid maintenance transition: in_progress -> %',
      p_status;
  end if;


  if m.status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'Terminal maintenance cannot change status';
  end if;


  return
    public.yacht_os_update_maintenance_status_phase1_20260819(
      p_maintenance_id,
      p_status,
      p_actual_cost,
      p_engine_hours,
      p_next_service_engine_hours,
      p_next_maintenance_date,
      p_note
    );

end;
$$;


revoke execute
on function
public.yacht_os_update_maintenance_status(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_update_maintenance_status(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
to authenticated;


-- ============================================================
-- 4. OPERATION ACTION — STRICT STATE MACHINE
-- ============================================================

alter function
public.yacht_os_operation_action(
  uuid,
  text,
  text
)
rename to
yacht_os_operation_action_internal_20260819;


revoke execute
on function
public.yacht_os_operation_action_internal_20260819(
  uuid,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_operation_action(
  p_booking_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id =
    p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    b.company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  if b.status = 'cancelled' then
    raise exception
      'Cancelled booking cannot receive operation action';
  end if;


  if p_action not in (
    'guest_arrived',
    'check_in',
    'boarded',
    'depart',
    'cruising',
    'returning',
    'complete',
    'no_show'
  ) then
    raise exception
      'Invalid operation action';
  end if;


  -- ----------------------------------------------------------
  -- NO SHOW
  -- Cannot be applied after check-in/boarding/departure.
  -- Requires operational reason for auditability.
  -- ----------------------------------------------------------

  if p_action = 'no_show' then

    if nullif(
      trim(
        p_note
      ),
      ''
    ) is null then
      raise exception
        'No-show reason is required';
    end if;


    if b.check_in_status not in (
      'pending',
      'arrived'
    ) then
      raise exception
        'No-show cannot be set after check-in';
    end if;


    if b.operation_status in (
      'departed',
      'cruising',
      'returning',
      'completed'
    ) then
      raise exception
        'No-show cannot be set after departure';
    end if;


    return
      public.yacht_os_operation_action_internal_20260819(
        p_booking_id,
        p_action,
        p_note
      );

  end if;


  -- Once no-show, normal trip flow is closed.
  if b.check_in_status = 'no_show' then
    raise exception
      'No-show booking cannot continue operation flow';
  end if;


  -- ----------------------------------------------------------
  -- ARRIVAL
  -- ----------------------------------------------------------

  if p_action = 'guest_arrived' then

    if b.check_in_status <> 'pending' then
      raise exception
        'Guest arrival requires pending check-in';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- CHECK-IN
  -- ----------------------------------------------------------

  if p_action = 'check_in' then

    if b.check_in_status <> 'arrived' then
      raise exception
        'Check-in requires guest arrival';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- BOARDING
  -- ----------------------------------------------------------

  if p_action = 'boarded' then

    if b.check_in_status <> 'checked_in' then
      raise exception
        'Boarding requires completed check-in';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- DEPARTURE
  -- The existing departure gate still performs manifest,
  -- captain, checklist, service, incident and payment checks.
  -- ----------------------------------------------------------

  if p_action = 'depart' then

    if b.check_in_status not in (
      'checked_in',
      'boarded'
    ) then
      raise exception
        'Departure requires completed check-in';
    end if;


    if b.operation_status not in (
      'guest_arrived',
      'ready'
    ) then
      raise exception
        'Departure requires ready operation state';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- CRUISING
  -- ----------------------------------------------------------

  if p_action = 'cruising' then

    if b.operation_status <> 'departed' then
      raise exception
        'Cruising requires departed state';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- RETURNING
  -- ----------------------------------------------------------

  if p_action = 'returning' then

    if b.operation_status not in (
      'departed',
      'cruising'
    ) then
      raise exception
        'Returning requires active trip';
    end if;

  end if;


  -- ----------------------------------------------------------
  -- COMPLETE
  -- ----------------------------------------------------------

  if p_action = 'complete' then

    if b.operation_status <> 'returning' then
      raise exception
        'Completion requires returning state';
    end if;

  end if;


  return
    public.yacht_os_operation_action_internal_20260819(
      p_booking_id,
      p_action,
      p_note
    );

end;
$$;


revoke execute
on function
public.yacht_os_operation_action(
  uuid,
  text,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_operation_action(
  uuid,
  text,
  text
)
to authenticated;


-- ============================================================
-- 5. OPERATION PLAN AUTHORITY
-- ============================================================

alter function
public.yacht_os_update_operation_plan(
  uuid,
  text,
  timestamptz,
  text
)
rename to
yacht_os_update_operation_plan_internal_20260819;


revoke execute
on function
public.yacht_os_update_operation_plan_internal_20260819(
  uuid,
  text,
  timestamptz,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_update_operation_plan(
  p_booking_id uuid,
  p_meeting_point text default null,
  p_meeting_time timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id =
    p_booking_id;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    b.company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  if b.status = 'cancelled' then
    raise exception
      'Cancelled booking operation plan cannot be changed';
  end if;


  if b.operation_status in (
    'departed',
    'cruising',
    'returning',
    'completed'
  ) then
    raise exception
      'Operation plan cannot be changed after departure';
  end if;


  return
    public.yacht_os_update_operation_plan_internal_20260819(
      p_booking_id,
      p_meeting_point,
      p_meeting_time,
      p_note
    );

end;
$$;


revoke execute
on function
public.yacht_os_update_operation_plan(
  uuid,
  text,
  timestamptz,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_update_operation_plan(
  uuid,
  text,
  timestamptz,
  text
)
to authenticated;


-- ============================================================
-- 6. DIRECT BOOKING OPERATION STATE GUARD
--
-- Protects operation_status / check_in_status even if a future
-- code path attempts direct table UPDATE instead of the RPC.
-- This is intentionally narrow to avoid breaking other booking
-- updates.
-- ============================================================

create or replace function
public.yacht_os_guard_operation_terminal_states()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    old.operation_status = 'completed'
    and new.operation_status
      is distinct from old.operation_status
  then
    raise exception
      'Completed operation is terminal';
  end if;


  if
    old.check_in_status = 'no_show'
    and new.check_in_status
      is distinct from old.check_in_status
  then
    raise exception
      'No-show check-in state is terminal';
  end if;


  if
    old.actual_departure_at is not null
    and new.actual_departure_at is null
  then
    raise exception
      'Actual departure timestamp cannot be cleared';
  end if;


  if
    old.actual_return_at is not null
    and new.actual_return_at is null
  then
    raise exception
      'Actual return timestamp cannot be cleared';
  end if;


  return new;

end;
$$;


revoke execute
on function
  public.yacht_os_guard_operation_terminal_states()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_operation_terminal_guard
on public.yacht_os_bookings;


create trigger
  yacht_os_operation_terminal_guard
before update of
  operation_status,
  check_in_status,
  actual_departure_at,
  actual_return_at
on public.yacht_os_bookings
for each row
execute function
  public.yacht_os_guard_operation_terminal_states();


-- ============================================================
-- 7. FINAL ACL
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
        'yacht_os_%'
  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;
