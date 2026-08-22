-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1C — CANCELLATION EXECUTION ENGINE
--
-- Implements:
-- - review submission
-- - approve / reject
-- - partial passenger selection
-- - full reservation cancellation
-- - partial passenger cancellation
-- - seat release
-- - departure reserved_count recalculation
-- - immutable audit chain
--
-- Does NOT:
-- - refund money
-- - mutate payment records
-- - mutate sales payment status
-- - perform provider refund
-- ============================================================


-- ------------------------------------------------------------
-- PASSENGER CANCELLATION STATE
-- ------------------------------------------------------------

alter table
  public.tour_passengers
add column if not exists
  cancellation_status text
  not null
  default 'active';


alter table
  public.tour_passengers
drop constraint if exists
  tour_passengers_cancellation_status_check;


alter table
  public.tour_passengers
add constraint
  tour_passengers_cancellation_status_check
check (
  cancellation_status in (
    'active',
    'cancelled'
  )
);


alter table
  public.tour_passengers
add column if not exists
  cancelled_at timestamptz;


alter table
  public.tour_passengers
add column if not exists
  cancelled_by uuid;


alter table
  public.tour_passengers
add column if not exists
  cancellation_case_id uuid;


alter table
  public.tour_passengers
drop constraint if exists
  tour_passengers_cancellation_case_id_fkey;


alter table
  public.tour_passengers
add constraint
  tour_passengers_cancellation_case_id_fkey

foreign key (
  cancellation_case_id
)

references
  public.tour_change_cases(id)

on delete set null;


create index if not exists
  tour_passengers_active_reservation_idx

on public.tour_passengers (
  company_id,
  reservation_id,
  cancellation_status
);


-- ------------------------------------------------------------
-- SUBMIT CASE FOR REVIEW
-- ------------------------------------------------------------

create or replace function
  public.submit_tour_change_case(
    p_case_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
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
    v_case
  from
    public.tour_change_cases
  where
    id = p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_active_company_member(
      v_case.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    v_case.status <>
      'draft'
  then
    raise exception
      'Only draft cases can be submitted';
  end if;


  if
    v_case.case_type =
      'partial_cancellation'
    and
    not exists (
      select
        1
      from
        public.tour_change_case_items i
      where
        i.case_id = v_case.id
        and
        i.company_id = v_case.company_id
        and
        i.item_type = 'passenger'
        and
        i.action_type = 'cancel'
    )
  then
    raise exception
      'Partial cancellation requires at least one passenger';
  end if;


  update
    public.tour_change_cases
  set
    status =
      'pending_review'
  where
    id =
      v_case.id;


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
    v_case.company_id,
    v_case.id,
    'submitted_for_review',
    v_actor,
    'Vaka onaya gönderildi.',
    jsonb_build_object(
      'previous_status',
      'draft',
      'new_status',
      'pending_review'
    )
  );

end;
$$;


-- ------------------------------------------------------------
-- APPROVE / REJECT
-- ------------------------------------------------------------

create or replace function
  public.decide_tour_change_case(
    p_case_id uuid,
    p_decision text,
    p_note text default null
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  if
    p_decision not in (
      'approve',
      'reject'
    )
  then
    raise exception
      'Invalid decision';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id = p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_active_company_member(
      v_case.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    v_case.status <>
      'pending_review'
  then
    raise exception
      'Only pending review cases can be decided';
  end if;


  if
    p_decision =
      'approve'
  then

    update
      public.tour_change_cases
    set
      status =
        'approved',
      reviewed_by =
        v_actor,
      reviewed_at =
        now(),
      approved_by =
        v_actor,
      approved_at =
        now()
    where
      id =
        v_case.id;


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
      v_case.company_id,
      v_case.id,
      'approved',
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
        'previous_status',
        'pending_review',
        'new_status',
        'approved'
      )
    );

  else

    update
      public.tour_change_cases
    set
      status =
        'rejected',
      reviewed_by =
        v_actor,
      reviewed_at =
        now()
    where
      id =
        v_case.id;


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
      v_case.company_id,
      v_case.id,
      'rejected',
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
        'previous_status',
        'pending_review',
        'new_status',
        'rejected'
      )
    );

  end if;

end;
$$;


-- ------------------------------------------------------------
-- PARTIAL CANCELLATION PASSENGER SELECTION
-- ------------------------------------------------------------

create or replace function
  public.set_tour_partial_cancellation_passengers(
    p_case_id uuid,
    p_passenger_ids uuid[]
  )
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
  v_selected_count integer;
  v_valid_count integer;
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
    v_case
  from
    public.tour_change_cases
  where
    id = p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_active_company_member(
      v_case.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    v_case.case_type <>
      'partial_cancellation'
  then
    raise exception
      'Case is not a partial cancellation';
  end if;


  if
    v_case.status <>
      'draft'
  then
    raise exception
      'Passenger selection can only change while draft';
  end if;


  if
    v_case.reservation_id is null
  then
    raise exception
      'Partial cancellation requires reservation';
  end if;


  select
    count(*)
  into
    v_selected_count
  from (
    select distinct
      passenger_id
    from
      unnest(
        coalesce(
          p_passenger_ids,
          array[]::uuid[]
        )
      ) as passenger_id
  ) selected;


  select
    count(*)
  into
    v_valid_count
  from
    public.tour_passengers p
  where
    p.id in (
      select distinct
        passenger_id
      from
        unnest(
          coalesce(
            p_passenger_ids,
            array[]::uuid[]
          )
        ) as passenger_id
    )
    and
    p.company_id =
      v_case.company_id
    and
    p.tour_id =
      v_case.tour_id
    and
    p.reservation_id =
      v_case.reservation_id
    and
    (
      v_case.departure_id is null
      or
      p.departure_id =
        v_case.departure_id
    )
    and
    p.cancellation_status =
      'active';


  if
    v_selected_count <>
      v_valid_count
  then
    raise exception
      'One or more selected passengers are invalid';
  end if;


  delete from
    public.tour_change_case_items
  where
    case_id =
      v_case.id
    and
    company_id =
      v_case.company_id
    and
    item_type =
      'passenger'
    and
    action_type =
      'cancel';


  insert into
    public.tour_change_case_items
  (
    company_id,
    case_id,
    item_type,
    source_id,
    action_type,
    status,
    before_snapshot,
    requested_snapshot,
    created_by
  )

  select
    v_case.company_id,
    v_case.id,
    'passenger',
    p.id,
    'cancel',
    'pending',
    jsonb_build_object(
      'passenger_id',
      p.id,
      'full_name',
      p.full_name,
      'passenger_no',
      p.passenger_no,
      'reservation_id',
      p.reservation_id,
      'departure_id',
      p.departure_id
    ),
    jsonb_build_object(
      'cancellation_status',
      'cancelled'
    ),
    v_actor

  from
    public.tour_passengers p

  where
    p.id in (
      select distinct
        passenger_id
      from
        unnest(
          coalesce(
            p_passenger_ids,
            array[]::uuid[]
          )
        ) as passenger_id
    )
    and
    p.company_id =
      v_case.company_id
    and
    p.reservation_id =
      v_case.reservation_id
    and
    p.cancellation_status =
      'active';


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
    v_case.company_id,
    v_case.id,
    'case_updated',
    v_actor,
    'Kısmi iptal yolcu seçimi güncellendi.',
    jsonb_build_object(
      'selected_passenger_count',
      v_valid_count
    )
  );


  return
    v_valid_count;

end;
$$;


-- ------------------------------------------------------------
-- CANCELLATION EXECUTION
-- ------------------------------------------------------------

create or replace function
  public.apply_tour_cancellation_case(
    p_case_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_reservation public.reservations%rowtype;
  v_actor uuid;

  v_passenger_ids uuid[];
  v_passenger_count integer := 0;
  v_capacity_release integer := 0;
  v_remaining_guests integer := 0;

  v_departure_id uuid;
  v_recalculated_reserved integer := 0;
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
    v_case
  from
    public.tour_change_cases
  where
    id = p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_active_company_member(
      v_case.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    v_case.status =
      'completed'
  then

    return
      coalesce(
        v_case.result_snapshot,
        '{}'::jsonb
      );

  end if;


  if
    v_case.status <>
      'approved'
  then
    raise exception
      'Only approved cases can be applied';
  end if;


  if
    v_case.case_type not in (
      'full_cancellation',
      'partial_cancellation'
    )
  then
    raise exception
      'Case is not a cancellation case';
  end if;


  if
    v_case.reservation_id is null
  then
    raise exception
      'Cancellation requires reservation';
  end if;


  select
    *
  into
    v_reservation
  from
    public.reservations
  where
    id =
      v_case.reservation_id
    and
    company_id =
      v_case.company_id
  for update;


  if not found then
    raise exception
      'Reservation not found';
  end if;


  v_departure_id :=
    coalesce(
      v_case.departure_id,
      v_reservation.departure_id
    );


  update
    public.tour_change_cases
  set
    status =
      'processing'
  where
    id =
      v_case.id;


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
    v_case.company_id,
    v_case.id,
    'processing_started',
    v_actor,
    'İptal uygulama işlemi başlatıldı.',
    jsonb_build_object(
      'reservation_id',
      v_reservation.id
    )
  );


  if
    v_case.case_type =
      'full_cancellation'
  then

    select
      coalesce(
        array_agg(
          p.id
        ),
        array[]::uuid[]
      )
    into
      v_passenger_ids
    from
      public.tour_passengers p
    where
      p.company_id =
        v_case.company_id
      and
      p.reservation_id =
        v_reservation.id
      and
      p.cancellation_status =
        'active';


    v_passenger_count :=
      cardinality(
        v_passenger_ids
      );


    v_capacity_release :=
      greatest(
        coalesce(
          v_reservation.guests,
          0
        ),
        0
      );


    update
      public.reservations
    set
      status =
        'cancelled'
    where
      id =
        v_reservation.id;


  else

    select
      coalesce(
        array_agg(
          distinct i.source_id
        ),
        array[]::uuid[]
      )
    into
      v_passenger_ids
    from
      public.tour_change_case_items i
    join
      public.tour_passengers p
      on
        p.id =
          i.source_id
    where
      i.case_id =
        v_case.id
      and
      i.company_id =
        v_case.company_id
      and
      i.item_type =
        'passenger'
      and
      i.action_type =
        'cancel'
      and
      p.company_id =
        v_case.company_id
      and
      p.reservation_id =
        v_reservation.id
      and
      p.cancellation_status =
        'active';


    v_passenger_count :=
      cardinality(
        v_passenger_ids
      );


    if
      v_passenger_count <=
        0
    then
      raise exception
        'No active passengers selected';
    end if;


    if
      v_passenger_count >=
        coalesce(
          v_reservation.guests,
          0
        )
    then
      raise exception
        'Partial cancellation cannot remove all reservation guests; use full cancellation';
    end if;


    v_capacity_release :=
      v_passenger_count;


    v_remaining_guests :=
      coalesce(
        v_reservation.guests,
        0
      ) -
      v_passenger_count;


    update
      public.reservations
    set
      guests =
        v_remaining_guests
    where
      id =
        v_reservation.id;

  end if;


  if
    cardinality(
      v_passenger_ids
    ) >
      0
  then

    update
      public.tour_passengers
    set
      cancellation_status =
        'cancelled',
      cancelled_at =
        now(),
      cancelled_by =
        v_actor,
      cancellation_case_id =
        v_case.id
    where
      id =
        any(
          v_passenger_ids
        )
      and
      company_id =
        v_case.company_id
      and
      cancellation_status =
        'active';


    update
      public.tour_bus_seats
    set
      passenger_id =
        null,
      passenger_name =
        null,
      passenger_phone =
        null,
      seat_status =
        'empty',
      checkin_status =
        'waiting',
      boarded_at =
        null
    where
      company_id =
        v_case.company_id
      and
      passenger_id =
        any(
          v_passenger_ids
        );

  end if;


  if
    v_departure_id is not null
  then

    select
      coalesce(
        sum(
          greatest(
            coalesce(
              r.guests,
              0
            ),
            0
          )
        ),
        0
      )::integer
    into
      v_recalculated_reserved
    from
      public.reservations r
    where
      r.company_id =
        v_case.company_id
      and
      r.departure_id =
        v_departure_id
      and
      r.status <>
        'cancelled';


    update
      public.tour_departures
    set
      reserved_count =
        v_recalculated_reserved
    where
      id =
        v_departure_id
      and
      company_id =
        v_case.company_id;

  end if;


  update
    public.tour_change_case_items
  set
    status =
      'completed',
    after_snapshot =
      jsonb_build_object(
        'cancellation_status',
        'cancelled',
        'applied_at',
        now()
      )
  where
    case_id =
      v_case.id
    and
    company_id =
      v_case.company_id
    and
    item_type =
      'passenger'
    and
    action_type =
      'cancel';


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
    v_case.company_id,
    v_case.id,
    case
      when
        v_case.case_type =
          'full_cancellation'
      then
        'reservation_cancelled'
      else
        'item_processed'
    end,
    v_actor,
    case
      when
        v_case.case_type =
          'full_cancellation'
      then
        'Rezervasyon tamamen iptal edildi.'
      else
        'Seçili yolcular kısmi olarak iptal edildi.'
    end,
    jsonb_build_object(
      'reservation_id',
      v_reservation.id,
      'cancelled_passenger_rows',
      v_passenger_count,
      'capacity_release',
      v_capacity_release,
      'departure_id',
      v_departure_id,
      'reserved_count_after',
      v_recalculated_reserved,
      'supplier_cancellation_cost',
      v_case.supplier_cancellation_cost,
      'customer_penalty_amount',
      v_case.customer_penalty_amount
    )
  );


  update
    public.tour_change_cases
  set
    status =
      'completed',
    completed_by =
      v_actor,
    completed_at =
      now(),
    result_snapshot =
      jsonb_build_object(
        'reservation_id',
        v_reservation.id,
        'case_type',
        v_case.case_type,
        'cancelled_passenger_rows',
        v_passenger_count,
        'capacity_release',
        v_capacity_release,
        'departure_id',
        v_departure_id,
        'reserved_count_after',
        v_recalculated_reserved,
        'supplier_cancellation_cost',
        v_case.supplier_cancellation_cost,
        'customer_penalty_amount',
        v_case.customer_penalty_amount,
        'refund_executed',
        false
      )
  where
    id =
      v_case.id;


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
    v_case.company_id,
    v_case.id,
    'completed',
    v_actor,
    'İptal operasyonu tamamlandı. Finansal iade ayrı işlem olarak bekliyor.',
    jsonb_build_object(
      'refund_executed',
      false,
      'next_stage',
      'refund_finance'
    )
  );


  return
    jsonb_build_object(
      'case_id',
      v_case.id,
      'reservation_id',
      v_reservation.id,
      'case_type',
      v_case.case_type,
      'cancelled_passenger_rows',
      v_passenger_count,
      'capacity_release',
      v_capacity_release,
      'reserved_count_after',
      v_recalculated_reserved,
      'refund_executed',
      false
    );

end;
$$;


-- ------------------------------------------------------------
-- EXECUTE GRANTS
-- ------------------------------------------------------------

revoke all
on function
  public.submit_tour_change_case(uuid)
from public;


grant execute
on function
  public.submit_tour_change_case(uuid)
to authenticated;


revoke all
on function
  public.decide_tour_change_case(
    uuid,
    text,
    text
  )
from public;


grant execute
on function
  public.decide_tour_change_case(
    uuid,
    text,
    text
  )
to authenticated;


revoke all
on function
  public.set_tour_partial_cancellation_passengers(
    uuid,
    uuid[]
  )
from public;


grant execute
on function
  public.set_tour_partial_cancellation_passengers(
    uuid,
    uuid[]
  )
to authenticated;


revoke all
on function
  public.apply_tour_cancellation_case(uuid)
from public;


grant execute
on function
  public.apply_tour_cancellation_case(uuid)
to authenticated;


comment on function
  public.apply_tour_cancellation_case(uuid)
is
  'Atomically applies approved full or partial cancellation without processing monetary refunds.';

