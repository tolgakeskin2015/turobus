-- TUROBUS Phase 7E4
-- Güvenli public tur takip RPC'si.
-- Public kullanıcı doğrudan reservations/checkin/history
-- tablolarını sorgulamak zorunda kalmayacak.

create or replace function public.get_public_tour_tracking(
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.reservations%rowtype;
  v_checkin jsonb;
  v_history jsonb;
  v_location jsonb;
begin
  if nullif(trim(p_code), '') is null then
    return null;
  end if;

  select r.*
  into v_reservation
  from public.reservations r
  where
    r.reservation_code = trim(p_code)
    or (
      trim(p_code) ~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and r.id::text = trim(p_code)
    )
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'checked_in', c.checked_in,
    'checked_in_at', c.checked_in_at,
    'current_status', c.current_status,
    'status_note', c.status_note,
    'last_location_name', c.last_location_name,
    'last_updated_at', c.last_updated_at
  )
  into v_checkin
  from public.tour_checkins c
  where c.reservation_id = v_reservation.id
    and c.company_id = v_reservation.company_id
  limit 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', h.id,
        'status', h.status,
        'note', h.note,
        'location_name', h.location_name,
        'created_at', h.created_at
      )
      order by h.created_at desc
    ),
    '[]'::jsonb
  )
  into v_history
  from public.tour_status_history h
  where h.reservation_id = v_reservation.id
    and h.company_id = v_reservation.company_id;

  select jsonb_build_object(
    'reservation_id', l.reservation_id,
    'latitude', l.latitude,
    'longitude', l.longitude,
    'accuracy_meters', l.accuracy_meters,
    'speed_kmh', l.speed_kmh,
    'heading_degrees', l.heading_degrees,
    'location_name', l.location_name,
    'sharing_active', l.sharing_active,
    'captured_at', l.captured_at,
    'updated_at', l.updated_at
  )
  into v_location
  from public.tour_live_locations l
  where l.reservation_id = v_reservation.id
    and l.company_id = v_reservation.company_id
  limit 1;

  return jsonb_build_object(
    'reservation',
    jsonb_build_object(
      'id', v_reservation.id,
      'reservation_code', v_reservation.reservation_code,
      'tour_title', v_reservation.tour_title,
      'tour_date', v_reservation.tour_date,
      'guests', v_reservation.guests,
      'full_name', v_reservation.full_name,
      'status', v_reservation.status,
      'payment_status', v_reservation.payment_status
    ),
    'checkin', v_checkin,
    'history', coalesce(v_history, '[]'::jsonb),
    'live_location', v_location
  );
end;
$$;

revoke all on function
public.get_public_tour_tracking(text)
from public;

grant execute on function
public.get_public_tour_tracking(text)
to anon;

grant execute on function
public.get_public_tour_tracking(text)
to authenticated;

grant execute on function
public.get_public_tour_tracking(text)
to service_role;
