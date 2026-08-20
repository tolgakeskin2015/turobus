-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.14 — OPERATIONS / COMMAND CENTER
--
-- Read-only operational aggregation.
-- No customer/case/message/entity row is modified.
-- No new operational table is created.
-- ============================================================


create or replace function
public.customer_360_command_center_snapshot(
  p_company_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  with

  case_stats as (
    select
      cs.customer_id,

      count(*) filter (
        where cs.status in (
          'open',
          'in_progress'
        )
      )::integer
        as open_case_count,

      count(*) filter (
        where
          cs.case_type =
            'complaint'

          and cs.status in (
            'open',
            'in_progress'
          )
      )::integer
        as open_complaint_count,

      count(*) filter (
        where
          cs.status in (
            'open',
            'in_progress'
          )

          and cs.due_at is not null

          and cs.due_at <
            now()
      )::integer
        as overdue_case_count,

      count(*) filter (
        where
          cs.status in (
            'open',
            'in_progress'
          )

          and cs.due_at is not null

          and cs.due_at >=
            now()

          and cs.due_at <=
            now() +
            interval '24 hours'
      )::integer
        as due_soon_case_count,

      max(
        cs.updated_at
      )
        as last_case_at

    from
      public.customer_360_cases cs

    where
      cs.company_id =
        p_company_id

    group by
      cs.customer_id
  ),


  message_stats as (
    select
      m.customer_id,

      count(*)::integer
        as message_count,

      count(*) filter (
        where
          m.direction =
            'inbound'
      )::integer
        as inbound_message_count,

      count(*) filter (
        where
          m.direction =
            'outbound'
      )::integer
        as outbound_message_count,

      max(
        m.sent_at
      )
        as last_message_at

    from
      public.customer_360_messages m

    where
      m.company_id =
        p_company_id

    group by
      m.customer_id
  ),


  entity_stats as (
    select
      e.customer_id,

      count(*) filter (
        where e.entity_type in (
          'booking',
          'package_booking',
          'yacht_booking',
          'hotel_booking',
          'activity_booking',
          'tour_booking'
        )
      )::integer
        as booking_count,

      count(*) filter (
        where
          e.entity_type =
            'quote'
      )::integer
        as quote_count,

      count(*) filter (
        where
          e.entity_type =
            'trip'
      )::integer
        as trip_count,

      count(*) filter (
        where e.entity_type in (
          'payment',
          'refund',
          'voucher'
        )
      )::integer
        as finance_event_count,

      max(
        e.occurred_at
      ) filter (
        where e.entity_type in (
          'booking',
          'package_booking',
          'yacht_booking',
          'hotel_booking',
          'activity_booking',
          'tour_booking'
        )
      )
        as last_booking_at,

      max(
        e.occurred_at
      )
        as last_entity_at

    from
      public.customer_360_entity_links e

    where
      e.company_id =
        p_company_id

    group by
      e.customer_id
  ),


  rows as (
    select
      c.id
        as customer_id,

      coalesce(
        cs.open_case_count,
        0
      )
        as open_case_count,

      coalesce(
        cs.open_complaint_count,
        0
      )
        as open_complaint_count,

      coalesce(
        cs.overdue_case_count,
        0
      )
        as overdue_case_count,

      coalesce(
        cs.due_soon_case_count,
        0
      )
        as due_soon_case_count,

      coalesce(
        ms.message_count,
        0
      )
        as message_count,

      coalesce(
        ms.inbound_message_count,
        0
      )
        as inbound_message_count,

      coalesce(
        ms.outbound_message_count,
        0
      )
        as outbound_message_count,

      ms.last_message_at,

      coalesce(
        es.booking_count,
        0
      )
        as booking_count,

      coalesce(
        es.quote_count,
        0
      )
        as quote_count,

      coalesce(
        es.trip_count,
        0
      )
        as trip_count,

      coalesce(
        es.finance_event_count,
        0
      )
        as finance_event_count,

      es.last_booking_at,

      greatest(
        c.updated_at,

        coalesce(
          cs.last_case_at,
          c.updated_at
        ),

        coalesce(
          ms.last_message_at,
          c.updated_at
        ),

        coalesce(
          es.last_entity_at,
          c.updated_at
        )
      )
        as last_activity_at

    from
      public.customer_360_customers c

    left join
      case_stats cs
      on cs.customer_id =
        c.id

    left join
      message_stats ms
      on ms.customer_id =
        c.id

    left join
      entity_stats es
      on es.customer_id =
        c.id

    where
      c.company_id =
        p_company_id
  )


  select
    jsonb_build_object(

      'generated_at',
        now(),

      'customers',
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'customer_id',
                r.customer_id,

              'open_case_count',
                r.open_case_count,

              'open_complaint_count',
                r.open_complaint_count,

              'overdue_case_count',
                r.overdue_case_count,

              'due_soon_case_count',
                r.due_soon_case_count,

              'message_count',
                r.message_count,

              'inbound_message_count',
                r.inbound_message_count,

              'outbound_message_count',
                r.outbound_message_count,

              'last_message_at',
                r.last_message_at,

              'booking_count',
                r.booking_count,

              'quote_count',
                r.quote_count,

              'trip_count',
                r.trip_count,

              'finance_event_count',
                r.finance_event_count,

              'last_booking_at',
                r.last_booking_at,

              'last_activity_at',
                r.last_activity_at
            )

            order by
              r.last_activity_at desc
          ),
          '[]'::jsonb
        )

    )
  into
    v_result

  from
    rows r;


  return
    coalesce(
      v_result,
      jsonb_build_object(
        'generated_at',
          now(),

        'customers',
          '[]'::jsonb
      )
    );

end;
$$;


revoke all
on function
public.customer_360_command_center_snapshot(
  uuid
)
from public;


grant execute
on function
public.customer_360_command_center_snapshot(
  uuid
)
to authenticated;
