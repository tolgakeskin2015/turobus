-- ============================================================
-- TUR-017A3 — CONTROL TOWER FINANCE NULL HARDENING
-- ============================================================
--
-- Applied migration 20260822181000 remains immutable.
--
-- Purpose:
-- - Keep real finance snapshot values when available.
-- - When no matching finance snapshot exists, preserve:
--     finance_status = 'unknown'
--     operational_net_result = 0
--     outstanding_receivable = 0
--     outstanding_payable = 0
--
-- This migration:
-- - does NOT create fake finance data
-- - does NOT move money
-- - does NOT refund
-- - does NOT change reservations
-- - does NOT change operation stage
-- - only hardens Control Tower snapshot generation
-- ============================================================

create or replace function
public.generate_tour_control_tower_snapshot(
  p_tour_id uuid,
  p_departure_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;

  v_operation_status text;

  v_open_tasks integer := 0;

  v_overdue_tasks integer := 0;

  v_open_incidents integer := 0;

  v_critical_incidents integer := 0;

  v_price_alerts integer := 0;

  v_group_requests integer := 0;

  v_ai_risk_score integer := 0;

  v_ai_risk_level text := 'low';

  v_finance_status text := 'unknown';

  v_net numeric(14,2) := 0;

  v_receivable numeric(14,2) := 0;

  v_payable numeric(14,2) := 0;

  v_score integer := 100;

  v_findings jsonb :=
    '[]'::jsonb;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select
    t.company_id,
    t.operation_status

  into
    v_company_id,
    v_operation_status

  from
    public.tours t

  where
    t.id =
      p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    p_departure_id is not null
    and
    not exists (
      select 1
      from
        public.tour_departures d
      where
        d.id =
          p_departure_id
        and
        d.company_id =
          v_company_id
        and
        d.tour_id =
          p_tour_id
    )
  then
    raise exception
      'Departure scope mismatch';
  end if;


  select
    count(*)::integer,

    count(*) filter (
      where
        task.due_at is not null
        and
        task.due_at <
          now()
        and
        task.status not in (
          'done',
          'completed',
          'cancelled'
        )
    )::integer

  into
    v_open_tasks,
    v_overdue_tasks

  from
    public.tour_operation_tasks task

  where
    task.company_id =
      v_company_id

    and
    task.tour_id =
      p_tour_id

    and
    (
      p_departure_id is null
      or
      task.departure_id =
        p_departure_id
    )

    and
    task.status not in (
      'done',
      'completed',
      'cancelled'
    );


  select
    count(*)::integer,

    count(*) filter (
      where
        incident.severity =
          'critical'
    )::integer

  into
    v_open_incidents,
    v_critical_incidents

  from
    public.tour_operation_incidents incident

  where
    incident.company_id =
      v_company_id

    and
    incident.tour_id =
      p_tour_id

    and
    (
      p_departure_id is null
      or
      incident.departure_id =
        p_departure_id
    )

    and
    incident.status not in (
      'resolved',
      'closed',
      'cancelled'
    );


  select
    count(*)::integer

  into
    v_price_alerts

  from
    public.tour_product_price_alert_events event

  join
    public.tour_product_catalog product
      on
        product.id =
          event.product_id
        and
        product.company_id =
          event.company_id

  where
    event.company_id =
      v_company_id

    and
    product.tour_id =
      p_tour_id

    and
    event.acknowledged_at
      is null;


  select
    count(*)::integer

  into
    v_group_requests

  from
    public.tour_group_requests grp

  where
    grp.company_id =
      v_company_id

    and
    grp.tour_id =
      p_tour_id

    and
    grp.status =
      'new';


  select
    coalesce(
      ai.risk_score,
      0
    ),

    coalesce(
      ai.risk_level,
      'low'
    )

  into
    v_ai_risk_score,
    v_ai_risk_level

  from
    public.tour_ai_operation_snapshots ai

  where
    ai.company_id =
      v_company_id

    and
    ai.tour_id =
      p_tour_id

    and
    (
      (
        p_departure_id is null
        and
        ai.departure_id is null
      )
      or
      ai.departure_id =
        p_departure_id
    )

  order by
    ai.generated_at desc

  limit 1;


  select
    coalesce(
      fin.finance_status,
      'unknown'
    ),

    coalesce(
      fin.operational_net_result,
      0
    ),

    coalesce(
      fin.outstanding_receivable,
      0
    ),

    coalesce(
      fin.outstanding_payable,
      0
    )

  into
    v_finance_status,
    v_net,
    v_receivable,
    v_payable

  from
    public.tour_finance_intelligence_snapshots fin

  where
    fin.company_id =
      v_company_id

    and
    fin.tour_id =
      p_tour_id

    and
    (
      (
        p_departure_id is null
        and
        fin.departure_id is null
      )
      or
      fin.departure_id =
        p_departure_id
    )

  order by
    fin.generated_at desc

  limit 1;

  /*
   * TUR-017A3 hardening:
   *
   * SELECT ... INTO with zero matching finance
   * snapshot rows can null the target variables.
   *
   * Preserve truthful fallback values without
   * fabricating finance data.
   */
  v_finance_status :=
    coalesce(
      v_finance_status,
      'unknown'
    );

  v_net :=
    coalesce(
      v_net,
      0
    );

  v_receivable :=
    coalesce(
      v_receivable,
      0
    );

  v_payable :=
    coalesce(
      v_payable,
      0
    );



  v_score :=
    100;


  v_score :=
    v_score
    -
    least(
      v_overdue_tasks *
      5,
      25
    );


  v_score :=
    v_score
    -
    least(
      v_critical_incidents *
      15,
      45
    );


  v_score :=
    v_score
    -
    least(
      v_open_incidents *
      3,
      15
    );


  if
    v_finance_status =
      'critical'
  then
    v_score :=
      v_score - 20;

  elsif
    v_finance_status =
      'loss'
  then
    v_score :=
      v_score - 15;

  elsif
    v_finance_status =
      'watch'
  then
    v_score :=
      v_score - 7;

  end if;


  if
    v_ai_risk_score >=
      80
  then
    v_score :=
      v_score - 15;

  elsif
    v_ai_risk_score >=
      60
  then
    v_score :=
      v_score - 8;

  end if;


  v_score :=
    greatest(
      0,
      least(
        100,
        v_score
      )
    );


  if
    v_overdue_tasks >
      0
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'overdue_tasks',
          'count',
          v_overdue_tasks,
          'message',
          'Gecikmiş operasyon görevleri mevcut.'
        )
      );

  end if;


  if
    v_critical_incidents >
      0
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'critical_incidents',
          'count',
          v_critical_incidents,
          'message',
          'Kritik operasyon vakaları mevcut.'
        )
      );

  end if;


  if
    v_price_alerts >
      0
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'price_alerts',
          'count',
          v_price_alerts,
          'message',
          'Görülmemiş fiyat alarmları mevcut.'
        )
      );

  end if;


  if
    v_receivable >
      0
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'receivable',
          'amount',
          v_receivable,
          'message',
          'Açık tahsilat mevcut.'
        )
      );

  end if;


  if
    v_payable >
      0
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'payable',
          'amount',
          v_payable,
          'message',
          'Açık ödeme yükümlülüğü mevcut.'
        )
      );

  end if;


  select
    snapshot.id

  into
    v_id

  from
    public.tour_control_tower_snapshots snapshot

  where
    snapshot.company_id =
      v_company_id

    and
    snapshot.tour_id =
      p_tour_id

    and
    snapshot.departure_id
      is not distinct from
      p_departure_id

  order by
    snapshot.generated_at desc

  limit 1;


  if
    v_id is null
  then

    insert into
    public.tour_control_tower_snapshots (
      company_id,
      tour_id,
      departure_id,

      operation_status,

      health_score,

      open_task_count,
      overdue_task_count,

      open_incident_count,
      critical_incident_count,

      unacknowledged_price_alert_count,

      new_group_request_count,

      ai_risk_score,
      ai_risk_level,

      finance_status,

      operational_net_result,

      outstanding_receivable,
      outstanding_payable,

      findings,

      generated_by
    )
    values (
      v_company_id,
      p_tour_id,
      p_departure_id,

      v_operation_status,

      v_score,

      v_open_tasks,
      v_overdue_tasks,

      v_open_incidents,
      v_critical_incidents,

      v_price_alerts,

      v_group_requests,

      v_ai_risk_score,
      v_ai_risk_level,

      v_finance_status,

      v_net,

      v_receivable,
      v_payable,

      v_findings,

      v_actor
    )
    returning
      id
    into
      v_id;

  else

    update
      public.tour_control_tower_snapshots

    set
      operation_status =
        v_operation_status,

      health_score =
        v_score,

      open_task_count =
        v_open_tasks,

      overdue_task_count =
        v_overdue_tasks,

      open_incident_count =
        v_open_incidents,

      critical_incident_count =
        v_critical_incidents,

      unacknowledged_price_alert_count =
        v_price_alerts,

      new_group_request_count =
        v_group_requests,

      ai_risk_score =
        v_ai_risk_score,

      ai_risk_level =
        v_ai_risk_level,

      finance_status =
        v_finance_status,

      operational_net_result =
        v_net,

      outstanding_receivable =
        v_receivable,

      outstanding_payable =
        v_payable,

      findings =
        v_findings,

      generated_at =
        now(),

      generated_by =
        v_actor

    where
      id =
        v_id;

  end if;


  perform
    public.record_tour_audit_event(
      v_company_id,
      p_tour_id,
      p_departure_id,
      null,
      'snapshot_generated',
      'control_tower_snapshot',
      v_id,
      'Advanced Control Tower snapshot generated.',
      null,
      jsonb_build_object(
        'health_score',
        v_score,
        'finance_status',
        v_finance_status,
        'ai_risk_score',
        v_ai_risk_score
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;

comment on function
public.generate_tour_control_tower_snapshot(
  uuid,
  uuid
)
is
  'TUR-017 Control Tower snapshot generator. Missing finance snapshot data safely resolves to unknown/zero values without fabricating finance state.';
