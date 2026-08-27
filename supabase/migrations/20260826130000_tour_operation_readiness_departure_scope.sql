-- TUR-014A — Departure-scoped readiness engine
--
-- Additive only.
-- Existing tour-wide readiness function remains untouched for backward compatibility.
-- No business data mutation.
-- No backfill.
-- No existing migration edited.
--
create or replace function
public.get_tour_operation_readiness_by_departure(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid
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

  if not exists (
    select 1
    from public.tour_departures d
    where
      d.id = p_departure_id
      and d.company_id = p_company_id
      and d.tour_id = p_tour_id
  ) then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
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
    tour_id = p_tour_id
    and
    departure_id = p_departure_id;


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
    tour_id = p_tour_id
    and
    departure_id = p_departure_id;


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
    departure_id = p_departure_id
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
    departure_id = p_departure_id
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
    departure_id = p_departure_id
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
    tour_id = p_tour_id
    and
    departure_id = p_departure_id;


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
on function public.get_tour_operation_readiness_by_departure(
  uuid,
  uuid,
  uuid
)
from public;

grant execute
on function public.get_tour_operation_readiness_by_departure(
  uuid,
  uuid,
  uuid
)
to authenticated;

comment on function public.get_tour_operation_readiness_by_departure(
  uuid,
  uuid,
  uuid
)
is
  'TUR-014: calculates Tour OS readiness for one canonical tour departure only.';
