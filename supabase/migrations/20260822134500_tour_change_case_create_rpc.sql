-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1B — ATOMIC CHANGE CASE CREATION
--
-- Creates the case and the first immutable audit event
-- in the same database transaction.
--
-- Does NOT mutate:
-- reservations / payments / passengers / transport.
-- ============================================================


create or replace function
  public.create_tour_change_case(
    p_company_id uuid,
    p_tour_id uuid,
    p_departure_id uuid default null,
    p_reservation_id uuid default null,
    p_case_type text default 'other',
    p_priority text default 'normal',
    p_requested_refund_amount numeric default 0,
    p_supplier_cancellation_cost numeric default 0,
    p_customer_penalty_amount numeric default 0,
    p_reason text default null,
    p_customer_note text default null,
    p_internal_note text default null,
    p_requested_changes jsonb default '{}'::jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_case_number text;
  v_actor_id uuid;
begin

  v_actor_id :=
    auth.uid();


  if
    v_actor_id is null
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


  if not exists (
    select
      1
    from
      public.tours t
    where
      t.id = p_tour_id
      and
      t.company_id = p_company_id
  )
  then
    raise exception
      'Tour does not belong to company';
  end if;


  if
    p_departure_id is not null
    and
    not exists (
      select
        1
      from
        public.tour_departures d
      where
        d.id = p_departure_id
        and
        d.company_id = p_company_id
        and
        d.tour_id = p_tour_id
    )
  then
    raise exception
      'Departure does not belong to company/tour';
  end if;


  if
    p_reservation_id is not null
    and
    not exists (
      select
        1
      from
        public.reservations r
      where
        r.id = p_reservation_id
        and
        r.company_id = p_company_id
        and
        (
          r.tour_id is null
          or
          r.tour_id = p_tour_id
        )
        and
        (
          p_departure_id is null
          or
          r.departure_id is null
          or
          r.departure_id = p_departure_id
        )
    )
  then
    raise exception
      'Reservation does not belong to company/tour/departure';
  end if;


  if
    p_case_type not in (
      'full_cancellation',
      'partial_cancellation',
      'full_refund',
      'partial_refund',
      'passenger_change',
      'departure_change',
      'flight_change',
      'bus_change',
      'transport_change',
      'other'
    )
  then
    raise exception
      'Invalid case type';
  end if;


  if
    p_priority not in (
      'low',
      'normal',
      'high',
      'critical'
    )
  then
    raise exception
      'Invalid priority';
  end if;


  if
    coalesce(
      p_requested_refund_amount,
      0
    ) < 0
    or
    coalesce(
      p_supplier_cancellation_cost,
      0
    ) < 0
    or
    coalesce(
      p_customer_penalty_amount,
      0
    ) < 0
  then
    raise exception
      'Financial amounts cannot be negative';
  end if;


  v_case_number :=
    'CHG-' ||
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
    public.tour_change_cases
  (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    case_number,
    case_type,
    status,
    priority,
    currency,
    requested_refund_amount,
    supplier_cancellation_cost,
    customer_penalty_amount,
    reason,
    customer_note,
    internal_note,
    requested_changes,
    requested_by,
    requested_at
  )
  values
  (
    p_company_id,
    p_tour_id,
    p_departure_id,
    p_reservation_id,
    v_case_number,
    p_case_type,
    'draft',
    p_priority,
    'TRY',
    coalesce(
      p_requested_refund_amount,
      0
    ),
    coalesce(
      p_supplier_cancellation_cost,
      0
    ),
    coalesce(
      p_customer_penalty_amount,
      0
    ),
    nullif(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_customer_note,
          ''
        )
      ),
      ''
    ),
    nullif(
      btrim(
        coalesce(
          p_internal_note,
          ''
        )
      ),
      ''
    ),
    coalesce(
      p_requested_changes,
      '{}'::jsonb
    ),
    v_actor_id,
    now()
  )
  returning
    id
  into
    v_case_id;


  insert into
    public.tour_change_case_events
  (
    company_id,
    case_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    p_company_id,
    v_case_id,
    'case_created',
    v_actor_id,
    'Değişiklik / iptal vakası oluşturuldu.',
    jsonb_build_object(
      'case_number',
      v_case_number,
      'case_type',
      p_case_type,
      'priority',
      p_priority,
      'departure_id',
      p_departure_id,
      'reservation_id',
      p_reservation_id
    )
  );


  return
    v_case_id;

end;
$$;


revoke all
on function
  public.create_tour_change_case(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    jsonb
  )
from public;


grant execute
on function
  public.create_tour_change_case(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    jsonb
  )
to authenticated;


comment on function
  public.create_tour_change_case(
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    numeric,
    text,
    text,
    text,
    jsonb
  )
is
  'Atomically creates a Tour OS change/cancellation case and its immutable case_created audit event.';

