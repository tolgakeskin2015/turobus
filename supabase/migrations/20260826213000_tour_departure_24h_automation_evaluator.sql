-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-015A — Departure-scoped 24h communication evaluator
--
-- SAFETY:
-- - additive only
-- - no business-data backfill
-- - no fake provider delivery
-- - no financial/state mutation
-- - uses existing provider-safe outbox
-- - uses existing outbox idempotency
-- - departure_3h intentionally NOT evaluated because
--   tour_departures has no canonical departure clock time yet
-- ============================================================


create or replace function
public.evaluate_tour_departure_24h_automation(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid,
  p_reference_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_reference_date date;
  v_departure_date date;

  v_rule
    public.tour_automation_rules%rowtype;

  v_reservation record;

  v_recipient_address text;
  v_idempotency_key text;
  v_outbox_id uuid;

  v_rules integer := 0;
  v_reservations integer := 0;
  v_queued integer := 0;
  v_skipped_contact integer := 0;
  v_skipped_recipient_type integer := 0;
begin

  v_actor := auth.uid();

  if v_actor is null then
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


  select
    d.departure_date
  into
    v_departure_date
  from public.tour_departures d
  join public.tours t
    on t.id = d.tour_id
  where
    d.id = p_departure_id
    and
    d.tour_id = p_tour_id
    and
    d.company_id = p_company_id
    and
    t.company_id = p_company_id;


  if not found then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
  end if;


  v_reference_date :=
    coalesce(
      p_reference_date,
      current_date
    );


  -- 24h event is date-based because tour_departures currently has
  -- canonical departure_date but no canonical departure clock time.
  --
  -- We intentionally do NOT infer a time from flights, buses,
  -- duration, noon, midnight, or any other secondary source.

  if
    v_departure_date <>
    (
      v_reference_date
      +
      1
    )
  then
    return jsonb_build_object(
      'ok',
      true,

      'eligible',
      false,

      'reason',
      'NOT_24H_WINDOW',

      'reference_date',
      v_reference_date,

      'departure_date',
      v_departure_date,

      'tour_id',
      p_tour_id,

      'departure_id',
      p_departure_id,

      'queued',
      0
    );
  end if;


  for v_rule in

    select
      r.*
    from public.tour_automation_rules r
    where
      r.company_id =
        p_company_id
      and
      r.active = true
      and
      r.event_key =
        'departure_24h'
    order by
      r.created_at,
      r.id

  loop

    v_rules :=
      v_rules + 1;


    -- TUR-015A customer delivery only.
    -- Staff / supplier / manager need an explicit canonical
    -- recipient directory and are not guessed here.

    if
      v_rule.recipient_type <>
      'customer'
    then

      v_skipped_recipient_type :=
        v_skipped_recipient_type
        +
        1;

      continue;

    end if;


    for v_reservation in

      select
        reservation.id,
        reservation.full_name,
        reservation.phone,
        reservation.email
      from public.reservations reservation
      where
        reservation.company_id =
          p_company_id
        and
        reservation.departure_id =
          p_departure_id
        and
        reservation.status
          is distinct from
          'cancelled'
      order by
        reservation.created_at,
        reservation.id

    loop

      v_reservations :=
        v_reservations + 1;


      v_recipient_address :=
        case

          when
            v_rule.channel in (
              'whatsapp',
              'sms'
            )
          then
            nullif(
              btrim(
                coalesce(
                  v_reservation.phone,
                  ''
                )
              ),
              ''
            )

          when
            v_rule.channel =
            'email'
          then
            nullif(
              btrim(
                coalesce(
                  v_reservation.email,
                  ''
                )
              ),
              ''
            )

          when
            v_rule.channel =
            'system'
          then
            null

          else
            null

        end;


      if
        v_rule.channel in (
          'whatsapp',
          'sms',
          'email'
        )
        and
        v_recipient_address
          is null
      then

        v_skipped_contact :=
          v_skipped_contact
          +
          1;

        continue;

      end if;


      v_idempotency_key :=
        concat_ws(
          ':',
          'tour',
          p_tour_id::text,
          'departure',
          p_departure_id::text,
          'event',
          'departure_24h',
          'rule',
          v_rule.id::text,
          'reservation',
          v_reservation.id::text
        );


      v_outbox_id :=
        public.queue_tour_automation_message(
          p_rule_id =>
            v_rule.id,

          p_tour_id =>
            p_tour_id,

          p_departure_id =>
            p_departure_id,

          p_reservation_id =>
            v_reservation.id,

          p_incident_id =>
            null,

          p_claim_id =>
            null,

          p_recipient_name =>
            nullif(
              btrim(
                coalesce(
                  v_reservation.full_name,
                  ''
                )
              ),
              ''
            ),

          p_recipient_address =>
            v_recipient_address,

          p_idempotency_key =>
            v_idempotency_key
        );


      if
        v_outbox_id
          is not null
      then
        v_queued :=
          v_queued + 1;
      end if;

    end loop;

  end loop;


  return jsonb_build_object(
    'ok',
    true,

    'eligible',
    true,

    'event_key',
    'departure_24h',

    'reference_date',
    v_reference_date,

    'departure_date',
    v_departure_date,

    'tour_id',
    p_tour_id,

    'departure_id',
    p_departure_id,

    'rules_evaluated',
    v_rules,

    'reservation_rule_evaluations',
    v_reservations,

    'queued_or_deduplicated',
    v_queued,

    'skipped_missing_contact',
    v_skipped_contact,

    'skipped_non_customer_rule',
    v_skipped_recipient_type,

    'provider_delivery_claimed',
    false
  );

end;
$$;


revoke all
on function
public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
from public;


grant execute
on function
public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
to authenticated;


comment on function
public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
is
'Departure-scoped date-based 24h communication automation evaluator. Uses real reservations and the provider-safe idempotent Tour OS outbox. Does not implement departure_3h until a canonical tour departure clock time exists.';
