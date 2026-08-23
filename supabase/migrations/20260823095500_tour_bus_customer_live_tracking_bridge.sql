-- ============================================================
-- TUROBUS BUS CUSTOMER LIVE TRACKING BRIDGE
--
-- Existing systems preserved:
-- reservations
-- tour_passengers
-- tour_bus_operations
-- tour_bus_seats
-- tour_bus_boarding_stops
-- tour_live_locations
-- get_public_tour_tracking
--
-- No second GPS/location system is created.
--
-- One reservation can remain the location-sharing anchor.
-- Other reservations assigned to the SAME bus operation
-- resolve the same live vehicle location.
-- ============================================================


-- ============================================================
-- INTERNAL RESERVATION -> BUS RESOLVER
-- ============================================================

create or replace function
public.resolve_tour_bus_operation_for_reservation(
  p_reservation_id uuid
)
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_reservation
    public.reservations%rowtype;

  v_bus_operation_id uuid;
begin

  if p_reservation_id is null then
    return null;
  end if;


  select *
  into v_reservation
  from public.reservations
  where id =
    p_reservation_id;


  if not found then
    return null;
  end if;


  -- ----------------------------------------------------------
  -- 1. Canonical passenger_id link
  -- ----------------------------------------------------------

  select
    s.bus_operation_id

  into
    v_bus_operation_id

  from
    public.tour_passengers p

  join
    public.tour_bus_seats s
      on s.passenger_id =
        p.id

  join
    public.tour_bus_operations b
      on b.id =
        s.bus_operation_id

  where
    p.reservation_id =
      v_reservation.id

    and
    p.company_id =
      v_reservation.company_id

    and
    s.company_id =
      v_reservation.company_id

    and
    b.company_id =
      v_reservation.company_id

  order by
    p.is_primary desc,
    p.passenger_no asc,
    s.seat_number asc

  limit 1;


  if v_bus_operation_id is not null then
    return v_bus_operation_id;
  end if;


  -- ----------------------------------------------------------
  -- 2. Legacy/manual seat assignment fallback
  -- Exact reservation holder phone or exact normalized name.
  -- Scoped to same company + tour + departure.
  -- ----------------------------------------------------------

  select
    s.bus_operation_id

  into
    v_bus_operation_id

  from
    public.tour_bus_seats s

  join
    public.tour_bus_operations b
      on b.id =
        s.bus_operation_id

  where
    b.company_id =
      v_reservation.company_id

    and
    b.tour_id =
      v_reservation.tour_id

    and
    (
      v_reservation.departure_id is null

      or

      b.departure_id =
        v_reservation.departure_id
    )

    and
    (
      (
        nullif(
          regexp_replace(
            coalesce(
              v_reservation.phone,
              ''
            ),
            '\D',
            '',
            'g'
          ),
          ''
        )
        is not null

        and

        regexp_replace(
          coalesce(
            s.passenger_phone,
            ''
          ),
          '\D',
          '',
          'g'
        )
        =
        regexp_replace(
          coalesce(
            v_reservation.phone,
            ''
          ),
          '\D',
          '',
          'g'
        )
      )

      or

      (
        nullif(
          btrim(
            coalesce(
              v_reservation.full_name,
              ''
            )
          ),
          ''
        )
        is not null

        and

        lower(
          btrim(
            coalesce(
              s.passenger_name,
              ''
            )
          )
        )
        =
        lower(
          btrim(
            coalesce(
              v_reservation.full_name,
              ''
            )
          )
        )
      )
    )

  order by
    s.seat_number asc

  limit 1;


  return
    v_bus_operation_id;

end;
$$;


revoke all
on function
public.resolve_tour_bus_operation_for_reservation(
  uuid
)
from public;


grant execute
on function
public.resolve_tour_bus_operation_for_reservation(
  uuid
)
to authenticated;


grant execute
on function
public.resolve_tour_bus_operation_for_reservation(
  uuid
)
to service_role;


-- ============================================================
-- PUBLIC TRACKING RPC — EXISTING FUNCTION EXTENDED
-- ============================================================

create or replace function
public.get_public_tour_tracking(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_reservation
    public.reservations%rowtype;

  v_checkin jsonb;

  v_history jsonb;

  v_location jsonb;

  v_bus jsonb;

  v_bus_operation_id uuid;

begin

  if nullif(
    trim(
      p_code
    ),
    ''
  ) is null then
    return null;
  end if;


  select
    r.*

  into
    v_reservation

  from
    public.reservations r

  where
    r.reservation_code =
      trim(
        p_code
      )

    or
    (
      trim(
        p_code
      )
      ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

      and

      r.id::text =
        trim(
          p_code
        )
    )

  limit 1;


  if not found then
    return null;
  end if;


  -- ----------------------------------------------------------
  -- CHECK-IN
  -- ----------------------------------------------------------

  select
    jsonb_build_object(
      'checked_in',
        c.checked_in,

      'checked_in_at',
        c.checked_in_at,

      'current_status',
        c.current_status,

      'status_note',
        c.status_note,

      'last_location_name',
        c.last_location_name,

      'last_updated_at',
        c.last_updated_at
    )

  into
    v_checkin

  from
    public.tour_checkins c

  where
    c.reservation_id =
      v_reservation.id

    and
    c.company_id =
      v_reservation.company_id

  limit 1;


  -- ----------------------------------------------------------
  -- STATUS HISTORY
  -- ----------------------------------------------------------

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            h.id,

          'status',
            h.status,

          'note',
            h.note,

          'location_name',
            h.location_name,

          'created_at',
            h.created_at
        )

        order by
          h.created_at desc
      ),
      '[]'::jsonb
    )

  into
    v_history

  from
    public.tour_status_history h

  where
    h.reservation_id =
      v_reservation.id

    and
    h.company_id =
      v_reservation.company_id;


  -- ----------------------------------------------------------
  -- FIND CUSTOMER BUS
  -- ----------------------------------------------------------

  v_bus_operation_id :=
    public.resolve_tour_bus_operation_for_reservation(
      v_reservation.id
    );


  -- ----------------------------------------------------------
  -- BUS / GUIDE / VEHICLE / SEAT / BOARDING DETAILS
  -- ----------------------------------------------------------

  if v_bus_operation_id is not null then

    select
      jsonb_build_object(

        'bus_operation_id',
          b.id,

        'bus_no',
          b.bus_no,

        'status',
          b.status,

        'departure_at',
          b.departure_at,

        'return_at',
          b.return_at,

        'guide_name',
          b.guide_name,

        'guide_phone',
          b.guide_phone,

        'operations_phone',
          b.operations_phone,

        'vehicle_id',
          b.vehicle_id,

        'vehicle_plate',
          v.plate_number,

        'vehicle_name',
          coalesce(
            nullif(
              btrim(
                coalesce(
                  v.display_name,
                  ''
                )
              ),
              ''
            ),
            concat_ws(
              ' ',
              v.brand,
              v.model
            )
          ),

        'seats',
          coalesce(
            (
              select
                jsonb_agg(
                  jsonb_build_object(

                    'seat_number',
                      s.seat_number,

                    'seat_type',
                      s.seat_type,

                    'seat_status',
                      s.seat_status,

                    'checkin_status',
                      s.checkin_status,

                    'boarded_at',
                      s.boarded_at,

                    'boarding_stop_id',
                      s.boarding_stop_id,

                    'boarding_stop',
                      st.stop_name,

                    'boarding_address',
                      st.address,

                    'boarding_time',
                      st.planned_at

                  )

                  order by
                    s.seat_number asc
                )

              from
                public.tour_bus_seats s

              left join
                public.tour_passengers p
                  on p.id =
                    s.passenger_id

              left join
                public.tour_bus_boarding_stops st
                  on st.id =
                    s.boarding_stop_id

              where
                s.bus_operation_id =
                  b.id

                and
                (
                  p.reservation_id =
                    v_reservation.id

                  or

                  (
                    p.id is null

                    and

                    (
                      (
                        nullif(
                          regexp_replace(
                            coalesce(
                              v_reservation.phone,
                              ''
                            ),
                            '\D',
                            '',
                            'g'
                          ),
                          ''
                        )
                        is not null

                        and

                        regexp_replace(
                          coalesce(
                            s.passenger_phone,
                            ''
                          ),
                          '\D',
                          '',
                          'g'
                        )
                        =
                        regexp_replace(
                          coalesce(
                            v_reservation.phone,
                            ''
                          ),
                          '\D',
                          '',
                          'g'
                        )
                      )

                      or

                      (
                        nullif(
                          btrim(
                            coalesce(
                              v_reservation.full_name,
                              ''
                            )
                          ),
                          ''
                        )
                        is not null

                        and

                        lower(
                          btrim(
                            coalesce(
                              s.passenger_name,
                              ''
                            )
                          )
                        )
                        =
                        lower(
                          btrim(
                            coalesce(
                              v_reservation.full_name,
                              ''
                            )
                          )
                        )
                      )
                    )
                  )
                )
            ),
            '[]'::jsonb
          )

      )

    into
      v_bus

    from
      public.tour_bus_operations b

    left join
      public.vehicles v
        on v.id =
          b.vehicle_id

    where
      b.id =
        v_bus_operation_id

      and
      b.company_id =
        v_reservation.company_id

    limit 1;

  end if;


  -- ----------------------------------------------------------
  -- LIVE LOCATION
  --
  -- If the reservation belongs to a bus, take the freshest
  -- active location shared from ANY reservation assigned
  -- to the SAME bus.
  --
  -- This preserves tour_live_locations as the single source.
  -- ----------------------------------------------------------

  if v_bus_operation_id is not null then

    select
      jsonb_build_object(

        'reservation_id',
          l.reservation_id,

        'latitude',
          l.latitude,

        'longitude',
          l.longitude,

        'accuracy_meters',
          l.accuracy_meters,

        'speed_kmh',
          l.speed_kmh,

        'heading_degrees',
          l.heading_degrees,

        'location_name',
          l.location_name,

        'sharing_active',
          l.sharing_active,

        'shared_by',
          l.shared_by,

        'captured_at',
          l.captured_at,

        'updated_at',
          l.updated_at,

        'bus_operation_id',
          v_bus_operation_id

      )

    into
      v_location

    from
      public.tour_live_locations l

    join
      public.reservations location_reservation
        on location_reservation.id =
          l.reservation_id

    where
      location_reservation.company_id =
        v_reservation.company_id

      and
      public.resolve_tour_bus_operation_for_reservation(
        l.reservation_id
      )
      =
      v_bus_operation_id

    order by
      case
        when l.sharing_active
          then 0
        else 1
      end asc,

      l.updated_at desc

    limit 1;

  else

    -- Original behavior for reservations without bus assignment.

    select
      jsonb_build_object(

        'reservation_id',
          l.reservation_id,

        'latitude',
          l.latitude,

        'longitude',
          l.longitude,

        'accuracy_meters',
          l.accuracy_meters,

        'speed_kmh',
          l.speed_kmh,

        'heading_degrees',
          l.heading_degrees,

        'location_name',
          l.location_name,

        'sharing_active',
          l.sharing_active,

        'shared_by',
          l.shared_by,

        'captured_at',
          l.captured_at,

        'updated_at',
          l.updated_at

      )

    into
      v_location

    from
      public.tour_live_locations l

    where
      l.reservation_id =
        v_reservation.id

      and
      l.company_id =
        v_reservation.company_id

    limit 1;

  end if;


  return
    jsonb_build_object(

      'reservation',
        jsonb_build_object(

          'id',
            v_reservation.id,

          'reservation_code',
            v_reservation.reservation_code,

          'tour_title',
            v_reservation.tour_title,

          'tour_date',
            v_reservation.tour_date,

          'guests',
            v_reservation.guests,

          'full_name',
            v_reservation.full_name,

          'status',
            v_reservation.status,

          'payment_status',
            v_reservation.payment_status

        ),

      'checkin',
        v_checkin,

      'history',
        coalesce(
          v_history,
          '[]'::jsonb
        ),

      'live_location',
        v_location,

      'bus',
        v_bus

    );

end;
$$;


revoke all
on function
public.get_public_tour_tracking(
  text
)
from public;


grant execute
on function
public.get_public_tour_tracking(
  text
)
to anon;


grant execute
on function
public.get_public_tour_tracking(
  text
)
to authenticated;


grant execute
on function
public.get_public_tour_tracking(
  text
)
to service_role;


comment on function
public.get_public_tour_tracking(text)
is
  'Public reservation tracking. Uses existing reservation location or the shared live location of the same assigned tour bus. Also returns scoped bus, guide, vehicle, seat and boarding information.';


comment on function
public.resolve_tour_bus_operation_for_reservation(uuid)
is
  'Internal resolver connecting an existing reservation to the existing Tour OS bus operation and seat system.';

