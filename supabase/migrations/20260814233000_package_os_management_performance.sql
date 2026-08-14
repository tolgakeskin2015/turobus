begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- FINALIZATION PACK
-- MANAGEMENT PERFORMANCE
-- =========================================================


create or replace function
public.get_package_management_performance(
  p_company_id uuid,
  p_days integer default 30
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_days integer;

  v_total_ack bigint := 0;

  v_l2 bigint := 0;

  v_l3 bigint := 0;

  v_avg numeric := 0;

  v_fastest integer := 0;

  v_slowest integer := 0;

  v_total_escalated bigint := 0;

  v_ack_rate numeric := 0;

  v_people jsonb := '[]'::jsonb;

begin

  if not exists (
    select 1

    from public.company_members cm

    where
      cm.company_id =
        p_company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true

      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager'
      )
  )
  then

    raise exception
      'Bu performans ekranı için yetkiniz bulunmuyor.';

  end if;


  v_days :=
    greatest(
      1,
      least(
        coalesce(
          p_days,
          30
        ),
        365
      )
    );


  select

    count(*)::bigint,

    count(*) filter (
      where escalation_level = 2
    )::bigint,

    count(*) filter (
      where escalation_level = 3
    )::bigint,

    coalesce(
      round(
        avg(
          response_seconds
        ),
        2
      ),
      0
    ),

    coalesce(
      min(
        response_seconds
      ),
      0
    ),

    coalesce(
      max(
        response_seconds
      ),
      0
    )

  into
    v_total_ack,
    v_l2,
    v_l3,
    v_avg,
    v_fastest,
    v_slowest

  from public.package_alert_acknowledgements

  where
    company_id =
      p_company_id

    and acknowledged_at >=
      now() -
      make_interval(
        days =>
          v_days
      );


  select
    count(*)::bigint

  into
    v_total_escalated

  from public.package_operation_alerts

  where
    company_id =
      p_company_id

    and escalation_level >
      1

    and coalesce(
      escalated_at,
      created_at
    ) >=
      now() -
      make_interval(
        days =>
          v_days
      );


  if v_total_escalated >
    0
  then

    v_ack_rate :=
      round(
        (
          v_total_ack::numeric
          /
          v_total_escalated::numeric
        )
        *
        100,
        2
      );

  end if;


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id',
            performance.user_id,

          'full_name',
            performance.full_name,

          'role',
            performance.role,

          'acknowledged_count',
            performance.acknowledged_count,

          'level_2_count',
            performance.level_2_count,

          'level_3_count',
            performance.level_3_count,

          'average_response_seconds',
            performance.average_response_seconds,

          'fastest_response_seconds',
            performance.fastest_response_seconds,

          'slowest_response_seconds',
            performance.slowest_response_seconds
        )

        order by
          performance.average_response_seconds asc nulls last
      ),

      '[]'::jsonb
    )

  into
    v_people

  from public.get_package_manager_acknowledgement_summary(
    p_company_id,
    v_days
  ) performance;


  return jsonb_build_object(

    'days',
      v_days,

    'total_acknowledged',
      v_total_ack,

    'level_2_count',
      v_l2,

    'level_3_count',
      v_l3,

    'average_response_seconds',
      v_avg,

    'fastest_response_seconds',
      v_fastest,

    'slowest_response_seconds',
      v_slowest,

    'total_escalated',
      v_total_escalated,

    'acknowledgement_rate',
      v_ack_rate,

    'people',
      v_people

  );

end;
$$;


revoke all
on function
public.get_package_management_performance(
  uuid,
  integer
)
from public;


grant execute
on function
public.get_package_management_performance(
  uuid,
  integer
)
to authenticated;


commit;
