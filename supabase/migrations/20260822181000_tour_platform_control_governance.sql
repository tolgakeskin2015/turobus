-- ============================================================
-- TUROBUS PACKAGE E — PHASE 37–50
--
-- 37 Advanced Control Tower
-- 38 AI Control Tower
-- 39 Task Integration       (existing engine reused)
-- 40 Status Integration     (existing engine reused)
-- 41 Cancellation / Refund  (existing engine reused)
-- 42 Payment Distribution
-- 43 Audit
-- 44 Role / Capability Overlay
-- 45 Notifications
-- 46 Feature Flags
-- 47 Provider Registry
-- 48 API / Provider Health
-- 49 Reporting
-- 50 Travel Companion
--
-- Existing operational truth is preserved.
-- No fake settlement.
-- No fake AI execution.
-- No fake provider health.
-- No fake customer message delivery.
-- ============================================================


-- ============================================================
-- 37 — ADVANCED CONTROL TOWER SNAPSHOT
-- ============================================================

create table if not exists
public.tour_control_tower_snapshots (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  operation_status text,

  health_score integer
    not null
    default 100
    check (
      health_score >= 0
      and
      health_score <= 100
    ),

  open_task_count integer
    not null
    default 0,

  overdue_task_count integer
    not null
    default 0,

  open_incident_count integer
    not null
    default 0,

  critical_incident_count integer
    not null
    default 0,

  unacknowledged_price_alert_count integer
    not null
    default 0,

  new_group_request_count integer
    not null
    default 0,

  ai_risk_score integer
    not null
    default 0,

  ai_risk_level text
    not null
    default 'low',

  finance_status text
    not null
    default 'unknown',

  operational_net_result numeric(14,2)
    not null
    default 0,

  outstanding_receivable numeric(14,2)
    not null
    default 0,

  outstanding_payable numeric(14,2)
    not null
    default 0,

  findings jsonb
    not null
    default '[]'::jsonb,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid
);


create index if not exists
tour_control_tower_snapshots_lookup_idx
on public.tour_control_tower_snapshots (
  company_id,
  tour_id,
  departure_id,
  generated_at desc
);


-- ============================================================
-- 38 — AI CONTROL TOWER
-- ============================================================

create table if not exists
public.tour_ai_control_tower_snapshots (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  control_tower_snapshot_id uuid
    references public.tour_control_tower_snapshots(id)
    on delete set null,

  decision_risk_score integer
    not null
    default 0
    check (
      decision_risk_score >= 0
      and
      decision_risk_score <= 100
    ),

  decision_risk_level text
    not null
    default 'low'
    check (
      decision_risk_level in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  findings jsonb
    not null
    default '[]'::jsonb,

  recommended_actions jsonb
    not null
    default '[]'::jsonb,

  engine text
    not null
    default 'deterministic_control_tower_v1',

  external_ai_used boolean
    not null
    default false,

  human_approval_required boolean
    not null
    default true,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid
);


create index if not exists
tour_ai_control_tower_snapshots_lookup_idx
on public.tour_ai_control_tower_snapshots (
  company_id,
  tour_id,
  departure_id,
  generated_at desc
);


-- ============================================================
-- 42 — PAYMENT DISTRIBUTION
-- ============================================================

create table if not exists
public.tour_payment_distribution_plans (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    not null
    references public.reservations(id)
    on delete cascade,

  source_kind text
    not null
    default 'manual'
    check (
      source_kind in (
        'manual',
        'sale',
        'provider_payment'
      )
    ),

  source_reference text,

  received_amount numeric(14,2)
    not null
    check (
      received_amount >= 0
    ),

  allocated_amount numeric(14,2)
    not null
    default 0
    check (
      allocated_amount >= 0
    ),

  currency text
    not null
    default 'TRY',

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'confirmed',
        'reconciled',
        'cancelled'
      )
    ),

  reconciliation_reference text,

  confirmed_at timestamptz,

  confirmed_by uuid,

  reconciled_at timestamptz,

  reconciled_by uuid,

  notes text,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create table if not exists
public.tour_payment_distribution_items (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  distribution_plan_id uuid
    not null
    references public.tour_payment_distribution_plans(id)
    on delete cascade,

  allocation_kind text
    not null
    check (
      allocation_kind in (
        'base_tour',
        'transfer',
        'hotel',
        'activity',
        'tour',
        'car_rental',
        'refund_reserve',
        'other'
      )
    ),

  reservation_product_item_id uuid
    references public.tour_reservation_product_items(id)
    on delete set null,

  amount numeric(14,2)
    not null
    check (
      amount > 0
    ),

  description text,

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_payment_distribution_plan_idx
on public.tour_payment_distribution_plans (
  company_id,
  tour_id,
  reservation_id,
  status
);


-- ============================================================
-- 43 — AUDIT
-- ============================================================

create table if not exists
public.tour_audit_events (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    references public.tours(id)
    on delete set null,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  actor_user_id uuid,

  event_type text
    not null,

  entity_type text
    not null,

  entity_id uuid,

  summary text
    not null,

  before_data jsonb,

  after_data jsonb,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_audit_events_lookup_idx
on public.tour_audit_events (
  company_id,
  tour_id,
  created_at desc
);


-- ============================================================
-- 44 — ROLE / CAPABILITY OVERLAY
--
-- Existing company membership remains identity source.
-- This table adds Tour OS capabilities, not new membership truth.
-- ============================================================

create table if not exists
public.tour_role_capabilities (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  role_key text
    not null,

  capability text
    not null,

  allowed boolean
    not null
    default true,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    role_key,
    capability
  )
);


create table if not exists
public.tour_user_capability_overrides (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  user_id uuid
    not null,

  capability text
    not null,

  allowed boolean
    not null,

  reason text,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    user_id,
    capability
  )
);


-- ============================================================
-- 45 — NOTIFICATIONS
-- Internal notification truth only.
-- Does not imply WhatsApp/email delivery.
-- ============================================================

create table if not exists
public.tour_notifications (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  recipient_user_id uuid,

  notification_type text
    not null,

  severity text
    not null
    default 'info'
    check (
      severity in (
        'info',
        'success',
        'warning',
        'critical'
      )
    ),

  title text
    not null,

  body text
    not null,

  source_type text,

  source_reference text,

  status text
    not null
    default 'unread'
    check (
      status in (
        'unread',
        'read',
        'archived'
      )
    ),

  read_at timestamptz,

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_notifications_recipient_idx
on public.tour_notifications (
  company_id,
  recipient_user_id,
  status,
  created_at desc
);


create table if not exists
public.tour_notification_preferences (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  user_id uuid
    not null,

  notification_type text
    not null,

  in_app_enabled boolean
    not null
    default true,

  email_enabled boolean
    not null
    default false,

  whatsapp_enabled boolean
    not null
    default false,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    user_id,
    notification_type
  )
);


-- ============================================================
-- 46 — FEATURE FLAGS
-- ============================================================

create table if not exists
public.tour_feature_flags (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  flag_key text
    not null,

  enabled boolean
    not null
    default false,

  rollout_percent integer
    not null
    default 100
    check (
      rollout_percent >= 0
      and
      rollout_percent <= 100
    ),

  config jsonb
    not null
    default '{}'::jsonb,

  description text,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    flag_key
  )
);


-- ============================================================
-- 47 — PROVIDER REGISTRY
--
-- Secrets must NOT be stored here.
-- ============================================================

create table if not exists
public.tour_provider_registry (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  provider_key text
    not null,

  provider_type text
    not null
    check (
      provider_type in (
        'payment',
        'flight',
        'bus',
        'hotel',
        'transfer',
        'activity',
        'car_rental',
        'messaging',
        'ai',
        'other'
      )
    ),

  display_name text
    not null,

  configured boolean
    not null
    default false,

  active boolean
    not null
    default true,

  last_status text
    not null
    default 'unknown'
    check (
      last_status in (
        'unknown',
        'healthy',
        'degraded',
        'down',
        'misconfigured'
      )
    ),

  last_checked_at timestamptz,

  config_metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    provider_key
  )
);


-- ============================================================
-- 48 — PROVIDER / API HEALTH
-- ============================================================

create table if not exists
public.tour_provider_health_checks (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  provider_id uuid
    not null
    references public.tour_provider_registry(id)
    on delete cascade,

  status text
    not null
    check (
      status in (
        'healthy',
        'degraded',
        'down',
        'misconfigured'
      )
    ),

  latency_ms integer
    check (
      latency_ms is null
      or latency_ms >= 0
    ),

  source text
    not null
    default 'manual_check',

  message text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  checked_by uuid,

  checked_at timestamptz
    not null
    default now()
);


create index if not exists
tour_provider_health_checks_lookup_idx
on public.tour_provider_health_checks (
  company_id,
  provider_id,
  checked_at desc
);


-- ============================================================
-- 49 — REPORTING SNAPSHOTS
-- ============================================================

create table if not exists
public.tour_reporting_snapshots (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  report_type text
    not null
    default 'management',

  metrics jsonb
    not null
    default '{}'::jsonb,

  findings jsonb
    not null
    default '[]'::jsonb,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid
);


create index if not exists
tour_reporting_snapshots_lookup_idx
on public.tour_reporting_snapshots (
  company_id,
  tour_id,
  departure_id,
  generated_at desc
);


-- ============================================================
-- 50 — TRAVEL COMPANION SNAPSHOT
--
-- This is an operational companion layer.
-- It does not replace the existing public seyahat/token system.
-- ============================================================

create table if not exists
public.tour_travel_companion_snapshots (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    not null
    references public.reservations(id)
    on delete cascade,

  journey_status text
    not null
    default 'planned'
    check (
      journey_status in (
        'planned',
        'ready',
        'active',
        'completed'
      )
    ),

  readiness_score integer
    not null
    default 0
    check (
      readiness_score >= 0
      and
      readiness_score <= 100
    ),

  checklist jsonb
    not null
    default '[]'::jsonb,

  next_steps jsonb
    not null
    default '[]'::jsonb,

  product_summary jsonb
    not null
    default '[]'::jsonb,

  risk_summary jsonb
    not null
    default '[]'::jsonb,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid,

  unique (
    company_id,
    reservation_id
  )
);


-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function
public.touch_tour_platform_governance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
tour_payment_distribution_plans_touch
on public.tour_payment_distribution_plans;

create trigger
tour_payment_distribution_plans_touch
before update
on public.tour_payment_distribution_plans
for each row
execute function
public.touch_tour_platform_governance_updated_at();


drop trigger if exists
tour_role_capabilities_touch
on public.tour_role_capabilities;

create trigger
tour_role_capabilities_touch
before update
on public.tour_role_capabilities
for each row
execute function
public.touch_tour_platform_governance_updated_at();


drop trigger if exists
tour_user_capability_overrides_touch
on public.tour_user_capability_overrides;

create trigger
tour_user_capability_overrides_touch
before update
on public.tour_user_capability_overrides
for each row
execute function
public.touch_tour_platform_governance_updated_at();


drop trigger if exists
tour_notification_preferences_touch
on public.tour_notification_preferences;

create trigger
tour_notification_preferences_touch
before update
on public.tour_notification_preferences
for each row
execute function
public.touch_tour_platform_governance_updated_at();


drop trigger if exists
tour_feature_flags_touch
on public.tour_feature_flags;

create trigger
tour_feature_flags_touch
before update
on public.tour_feature_flags
for each row
execute function
public.touch_tour_platform_governance_updated_at();


drop trigger if exists
tour_provider_registry_touch
on public.tour_provider_registry;

create trigger
tour_provider_registry_touch
before update
on public.tour_provider_registry
for each row
execute function
public.touch_tour_platform_governance_updated_at();


-- ============================================================
-- 43 — IMMUTABLE AUDIT
-- ============================================================

create or replace function
public.prevent_tour_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Tour audit events are immutable';
end;
$$;


drop trigger if exists
tour_audit_events_no_update
on public.tour_audit_events;

create trigger
tour_audit_events_no_update
before update
on public.tour_audit_events
for each row
execute function
public.prevent_tour_audit_mutation();


drop trigger if exists
tour_audit_events_no_delete
on public.tour_audit_events;

create trigger
tour_audit_events_no_delete
before delete
on public.tour_audit_events
for each row
execute function
public.prevent_tour_audit_mutation();


-- ============================================================
-- 48 — HEALTH CHECK HISTORY IMMUTABLE
-- ============================================================

create or replace function
public.prevent_tour_provider_health_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Provider health history is immutable';
end;
$$;


drop trigger if exists
tour_provider_health_checks_no_update
on public.tour_provider_health_checks;

create trigger
tour_provider_health_checks_no_update
before update
on public.tour_provider_health_checks
for each row
execute function
public.prevent_tour_provider_health_mutation();


drop trigger if exists
tour_provider_health_checks_no_delete
on public.tour_provider_health_checks;

create trigger
tour_provider_health_checks_no_delete
before delete
on public.tour_provider_health_checks
for each row
execute function
public.prevent_tour_provider_health_mutation();


-- ============================================================
-- INTERNAL AUDIT WRITER
-- ============================================================

create or replace function
public.record_tour_audit_event(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid,
  p_reservation_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_summary text,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin

  insert into
  public.tour_audit_events (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    summary,
    before_data,
    after_data,
    metadata
  )
  values (
    p_company_id,
    p_tour_id,
    p_departure_id,
    p_reservation_id,
    auth.uid(),
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_summary,
    p_before_data,
    p_after_data,
    coalesce(
      p_metadata,
      '{}'::jsonb
    )
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


revoke all
on function
public.record_tour_audit_event(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  text,
  jsonb,
  jsonb,
  jsonb
)
from public;


-- ============================================================
-- 37 — GENERATE ADVANCED CONTROL TOWER SNAPSHOT
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


-- ============================================================
-- 38 — GENERATE AI CONTROL TOWER
--
-- Deterministic only.
-- external_ai_used stays false.
-- No automatic mutations.
-- ============================================================

create or replace function
public.generate_tour_ai_control_tower_snapshot(
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

  v_control_id uuid;

  v_control
    public.tour_control_tower_snapshots%rowtype;

  v_score integer := 0;

  v_level text := 'low';

  v_findings jsonb :=
    '[]'::jsonb;

  v_actions jsonb :=
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
    company_id
  into
    v_company_id
  from
    public.tours
  where
    id =
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


  v_control_id :=
    public.generate_tour_control_tower_snapshot(
      p_tour_id,
      p_departure_id
    );


  select *
  into v_control
  from
    public.tour_control_tower_snapshots
  where
    id =
      v_control_id;


  v_score :=
    greatest(
      v_control.ai_risk_score,

      100 -
      v_control.health_score
    );


  if
    v_control.critical_incident_count >
      0
  then

    v_score :=
      greatest(
        v_score,
        85
      );


    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'critical_incident',
          'count',
          v_control.critical_incident_count
        )
      );


    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'critical',
          'action',
          'Kritik vakaları ve sorumlu görevleri incele.',
          'requires_human_approval',
          true
        )
      );

  end if;


  if
    v_control.overdue_task_count >
      0
  then

    v_score :=
      greatest(
        v_score,
        60
      );


    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'high',
          'action',
          'Gecikmiş görevleri yeniden önceliklendir.',
          'requires_human_approval',
          true
        )
      );

  end if;


  if
    v_control.finance_status in (
      'loss',
      'critical'
    )
  then

    v_score :=
      greatest(
        v_score,
        75
      );


    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'high',
          'action',
          'Finans ve kârlılık ekranında zarar kaynaklarını incele.',
          'requires_human_approval',
          true
        )
      );

  end if;


  if
    v_control.outstanding_receivable >
      0
  then

    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'medium',
          'action',
          'Açık tahsilatları kontrol et.',
          'requires_human_approval',
          true
        )
      );

  end if;


  if
    v_control.unacknowledged_price_alert_count >
      0
  then

    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'medium',
          'action',
          'Fiyat alarmı tetiklenen ürünleri incele.',
          'requires_human_approval',
          true
        )
      );

  end if;


  v_level :=
    case
      when v_score >= 85
        then 'critical'
      when v_score >= 65
        then 'high'
      when v_score >= 35
        then 'medium'
      else
        'low'
    end;


  insert into
  public.tour_ai_control_tower_snapshots (
    company_id,
    tour_id,
    departure_id,

    control_tower_snapshot_id,

    decision_risk_score,
    decision_risk_level,

    findings,

    recommended_actions,

    engine,

    external_ai_used,

    human_approval_required,

    generated_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,

    v_control_id,

    v_score,
    v_level,

    v_findings,

    v_actions,

    'deterministic_control_tower_v1',

    false,

    true,

    v_actor
  )
  returning
    id
  into
    v_id;


  perform
    public.record_tour_audit_event(
      v_company_id,
      p_tour_id,
      p_departure_id,
      null,
      'snapshot_generated',
      'ai_control_tower_snapshot',
      v_id,
      'AI Control Tower decision-support snapshot generated.',
      null,
      jsonb_build_object(
        'decision_risk_score',
        v_score,
        'decision_risk_level',
        v_level,
        'external_ai_used',
        false
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


-- ============================================================
-- 42 — CREATE PAYMENT DISTRIBUTION PLAN
-- ============================================================

create or replace function
public.create_tour_payment_distribution_plan(
  p_reservation_id uuid,
  p_received_amount numeric,
  p_currency text default 'TRY',
  p_source_kind text default 'manual',
  p_source_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_reservation
    public.reservations%rowtype;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_reservation

  from
    public.reservations

  where
    id =
      p_reservation_id;


  if not found then
    raise exception
      'Reservation not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_reservation.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    p_received_amount <
      0
  then
    raise exception
      'Invalid received amount';
  end if;


  if
    p_source_kind not in (
      'manual',
      'sale',
      'provider_payment'
    )
  then
    raise exception
      'Invalid source kind';
  end if;


  insert into
  public.tour_payment_distribution_plans (
    company_id,
    tour_id,
    departure_id,
    reservation_id,

    source_kind,
    source_reference,

    received_amount,
    currency,

    notes,

    created_by
  )
  values (
    v_reservation.company_id,
    v_reservation.tour_id,
    v_reservation.departure_id,
    v_reservation.id,

    p_source_kind,

    nullif(
      btrim(
        coalesce(
          p_source_reference,
          ''
        )
      ),
      ''
    ),

    p_received_amount,

    coalesce(
      nullif(
        btrim(
          p_currency
        ),
        ''
      ),
      'TRY'
    ),

    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    v_actor
  )
  returning
    id
  into
    v_id;


  perform
    public.record_tour_audit_event(
      v_reservation.company_id,
      v_reservation.tour_id,
      v_reservation.departure_id,
      v_reservation.id,
      'created',
      'payment_distribution_plan',
      v_id,
      'Payment distribution plan created.',
      null,
      jsonb_build_object(
        'received_amount',
        p_received_amount,
        'currency',
        p_currency,
        'source_kind',
        p_source_kind
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


-- ============================================================
-- 42 — ADD PAYMENT ALLOCATION
-- ============================================================

create or replace function
public.add_tour_payment_distribution_item(
  p_distribution_plan_id uuid,
  p_allocation_kind text,
  p_amount numeric,
  p_reservation_product_item_id uuid default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_plan
    public.tour_payment_distribution_plans%rowtype;

  v_current numeric(14,2);

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_plan

  from
    public.tour_payment_distribution_plans

  where
    id =
      p_distribution_plan_id

  for update;


  if not found then
    raise exception
      'Distribution plan not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_plan.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_plan.status <>
      'draft'
  then
    raise exception
      'Only draft plans can be edited';
  end if;


  if
    p_allocation_kind not in (
      'base_tour',
      'transfer',
      'hotel',
      'activity',
      'tour',
      'car_rental',
      'refund_reserve',
      'other'
    )
  then
    raise exception
      'Invalid allocation kind';
  end if;


  if
    p_amount <=
      0
  then
    raise exception
      'Allocation amount must be positive';
  end if;


  if
    p_reservation_product_item_id is not null
    and
    not exists (
      select
        1
      from
        public.tour_reservation_product_items item
      where
        item.id =
          p_reservation_product_item_id
        and
        item.company_id =
          v_plan.company_id
        and
        item.reservation_id =
          v_plan.reservation_id
    )
  then
    raise exception
      'Reservation product scope mismatch';
  end if;


  select
    coalesce(
      sum(
        item.amount
      ),
      0
    )

  into
    v_current

  from
    public.tour_payment_distribution_items item

  where
    item.distribution_plan_id =
      v_plan.id;


  if
    v_current +
    p_amount >
      v_plan.received_amount
  then
    raise exception
      'Allocation exceeds received amount';
  end if;


  insert into
  public.tour_payment_distribution_items (
    company_id,
    distribution_plan_id,
    allocation_kind,
    reservation_product_item_id,
    amount,
    description,
    created_by
  )
  values (
    v_plan.company_id,
    v_plan.id,
    p_allocation_kind,
    p_reservation_product_item_id,
    p_amount,
    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),
    v_actor
  )
  returning
    id
  into
    v_id;


  update
  public.tour_payment_distribution_plans
  set
    allocated_amount =
      v_current +
      p_amount
  where
    id =
      v_plan.id;


  return
    v_id;

end;
$$;


-- ============================================================
-- 42 — CONFIRM PAYMENT DISTRIBUTION
-- ============================================================

create or replace function
public.confirm_tour_payment_distribution_plan(
  p_distribution_plan_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_plan
    public.tour_payment_distribution_plans%rowtype;

  v_sum numeric(14,2);
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_plan

  from
    public.tour_payment_distribution_plans

  where
    id =
      p_distribution_plan_id

  for update;


  if not found then
    raise exception
      'Distribution plan not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_plan.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_plan.status =
      'confirmed'
    or
    v_plan.status =
      'reconciled'
  then
    return;
  end if;


  if
    v_plan.status <>
      'draft'
  then
    raise exception
      'Distribution plan cannot be confirmed';
  end if;


  select
    coalesce(
      sum(
        item.amount
      ),
      0
    )

  into
    v_sum

  from
    public.tour_payment_distribution_items item

  where
    item.distribution_plan_id =
      v_plan.id;


  if
    v_sum >
      v_plan.received_amount
  then
    raise exception
      'Allocated amount exceeds received amount';
  end if;


  update
  public.tour_payment_distribution_plans
  set
    allocated_amount =
      v_sum,

    status =
      'confirmed',

    confirmed_at =
      now(),

    confirmed_by =
      v_actor

  where
    id =
      v_plan.id;


  perform
    public.record_tour_audit_event(
      v_plan.company_id,
      v_plan.tour_id,
      v_plan.departure_id,
      v_plan.reservation_id,
      'confirmed',
      'payment_distribution_plan',
      v_plan.id,
      'Payment distribution plan confirmed.',
      jsonb_build_object(
        'status',
        v_plan.status
      ),
      jsonb_build_object(
        'status',
        'confirmed',
        'allocated_amount',
        v_sum
      ),
      '{}'::jsonb
    );

end;
$$;


-- ============================================================
-- 42 — RECONCILE PAYMENT DISTRIBUTION
--
-- This is a finance reconciliation record only.
-- It does not call payment providers or move money.
-- ============================================================

create or replace function
public.reconcile_tour_payment_distribution_plan(
  p_distribution_plan_id uuid,
  p_reconciliation_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_plan
    public.tour_payment_distribution_plans%rowtype;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_plan

  from
    public.tour_payment_distribution_plans

  where
    id =
      p_distribution_plan_id

  for update;


  if not found then
    raise exception
      'Distribution plan not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_plan.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_plan.status =
      'reconciled'
  then
    return;
  end if;


  if
    v_plan.status <>
      'confirmed'
  then
    raise exception
      'Plan must be confirmed first';
  end if;


  if
    nullif(
      btrim(
        coalesce(
          p_reconciliation_reference,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Reconciliation reference required';
  end if;


  update
  public.tour_payment_distribution_plans
  set
    status =
      'reconciled',

    reconciliation_reference =
      btrim(
        p_reconciliation_reference
      ),

    reconciled_at =
      now(),

    reconciled_by =
      v_actor

  where
    id =
      v_plan.id;


  perform
    public.record_tour_audit_event(
      v_plan.company_id,
      v_plan.tour_id,
      v_plan.departure_id,
      v_plan.reservation_id,
      'reconciled',
      'payment_distribution_plan',
      v_plan.id,
      'Payment distribution plan reconciled.',
      jsonb_build_object(
        'status',
        v_plan.status
      ),
      jsonb_build_object(
        'status',
        'reconciled',
        'reconciliation_reference',
        p_reconciliation_reference
      ),
      jsonb_build_object(
        'provider_payment_executed',
        false
      )
    );

end;
$$;


-- ============================================================
-- 44 — SET ROLE CAPABILITY
-- ============================================================

create or replace function
public.set_tour_role_capability(
  p_company_id uuid,
  p_role_key text,
  p_capability text,
  p_allowed boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      p_company_id
    )
  then
    raise exception
      'Administrative authority required';
  end if;


  if
    nullif(
      btrim(
        coalesce(
          p_role_key,
          ''
        )
      ),
      ''
    ) is null
    or
    nullif(
      btrim(
        coalesce(
          p_capability,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Role and capability required';
  end if;


  insert into
  public.tour_role_capabilities (
    company_id,
    role_key,
    capability,
    allowed,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    lower(
      btrim(
        p_role_key
      )
    ),
    lower(
      btrim(
        p_capability
      )
    ),
    p_allowed,
    v_actor,
    v_actor
  )
  on conflict (
    company_id,
    role_key,
    capability
  )
  do update
  set
    allowed =
      excluded.allowed,

    updated_by =
      v_actor

  returning
    id
  into
    v_id;


  perform
    public.record_tour_audit_event(
      p_company_id,
      null,
      null,
      null,
      'capability_changed',
      'role_capability',
      v_id,
      'Tour OS role capability changed.',
      null,
      jsonb_build_object(
        'role_key',
        p_role_key,
        'capability',
        p_capability,
        'allowed',
        p_allowed
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


-- ============================================================
-- 45 — CREATE INTERNAL NOTIFICATION
-- ============================================================

create or replace function
public.create_tour_notification(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid,
  p_reservation_id uuid,
  p_recipient_user_id uuid,
  p_notification_type text,
  p_severity text,
  p_title text,
  p_body text,
  p_source_type text default null,
  p_source_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


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


  if
    p_severity not in (
      'info',
      'success',
      'warning',
      'critical'
    )
  then
    raise exception
      'Invalid severity';
  end if;


  insert into
  public.tour_notifications (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    recipient_user_id,

    notification_type,
    severity,

    title,
    body,

    source_type,
    source_reference,

    created_by
  )
  values (
    p_company_id,
    p_tour_id,
    p_departure_id,
    p_reservation_id,
    p_recipient_user_id,

    p_notification_type,
    p_severity,

    btrim(
      p_title
    ),

    btrim(
      p_body
    ),

    p_source_type,
    p_source_reference,

    v_actor
  )
  returning
    id
  into
    v_id;


  perform
    public.record_tour_audit_event(
      p_company_id,
      p_tour_id,
      p_departure_id,
      p_reservation_id,
      'created',
      'notification',
      v_id,
      'Internal Tour OS notification created.',
      null,
      jsonb_build_object(
        'notification_type',
        p_notification_type,
        'severity',
        p_severity,
        'recipient_user_id',
        p_recipient_user_id,
        'external_delivery_claimed',
        false
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


create or replace function
public.mark_tour_notification_read(
  p_notification_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_row
    public.tour_notifications%rowtype;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_row
  from
    public.tour_notifications
  where
    id =
      p_notification_id;


  if not found then
    raise exception
      'Notification not found';
  end if;


  if not
    public.is_active_company_member(
      v_row.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  update
  public.tour_notifications
  set
    status =
      'read',

    read_at =
      coalesce(
        read_at,
        now()
      )

  where
    id =
      v_row.id;

end;
$$;


-- ============================================================
-- 46 — SET FEATURE FLAG
-- ============================================================

create or replace function
public.set_tour_feature_flag(
  p_company_id uuid,
  p_flag_key text,
  p_enabled boolean,
  p_rollout_percent integer default 100,
  p_config jsonb default '{}'::jsonb,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      p_company_id
    )
  then
    raise exception
      'Administrative authority required';
  end if;


  if
    p_rollout_percent <
      0
    or
    p_rollout_percent >
      100
  then
    raise exception
      'Invalid rollout percent';
  end if;


  insert into
  public.tour_feature_flags (
    company_id,
    flag_key,
    enabled,
    rollout_percent,
    config,
    description,
    created_by,
    updated_by
  )
  values (
    p_company_id,

    lower(
      btrim(
        p_flag_key
      )
    ),

    p_enabled,

    p_rollout_percent,

    coalesce(
      p_config,
      '{}'::jsonb
    ),

    p_description,

    v_actor,
    v_actor
  )
  on conflict (
    company_id,
    flag_key
  )
  do update
  set
    enabled =
      excluded.enabled,

    rollout_percent =
      excluded.rollout_percent,

    config =
      excluded.config,

    description =
      excluded.description,

    updated_by =
      v_actor

  returning
    id
  into
    v_id;


  perform
    public.record_tour_audit_event(
      p_company_id,
      null,
      null,
      null,
      'feature_flag_changed',
      'feature_flag',
      v_id,
      'Tour OS feature flag changed.',
      null,
      jsonb_build_object(
        'flag_key',
        p_flag_key,
        'enabled',
        p_enabled,
        'rollout_percent',
        p_rollout_percent
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


-- ============================================================
-- 47 — REGISTER PROVIDER
-- ============================================================

create or replace function
public.register_tour_provider(
  p_company_id uuid,
  p_provider_key text,
  p_provider_type text,
  p_display_name text,
  p_configured boolean default false,
  p_active boolean default true,
  p_config_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      p_company_id
    )
  then
    raise exception
      'Administrative authority required';
  end if;


  if
    p_provider_type not in (
      'payment',
      'flight',
      'bus',
      'hotel',
      'transfer',
      'activity',
      'car_rental',
      'messaging',
      'ai',
      'other'
    )
  then
    raise exception
      'Invalid provider type';
  end if;


  insert into
  public.tour_provider_registry (
    company_id,
    provider_key,
    provider_type,
    display_name,
    configured,
    active,
    last_status,
    config_metadata,
    created_by,
    updated_by
  )
  values (
    p_company_id,

    lower(
      btrim(
        p_provider_key
      )
    ),

    p_provider_type,

    btrim(
      p_display_name
    ),

    p_configured,

    p_active,

    case
      when p_configured
        then 'unknown'
      else 'misconfigured'
    end,

    coalesce(
      p_config_metadata,
      '{}'::jsonb
    ),

    v_actor,
    v_actor
  )
  on conflict (
    company_id,
    provider_key
  )
  do update
  set
    provider_type =
      excluded.provider_type,

    display_name =
      excluded.display_name,

    configured =
      excluded.configured,

    active =
      excluded.active,

    last_status =
      case
        when
          excluded.configured =
            false
        then
          'misconfigured'
        else
          public.tour_provider_registry.last_status
      end,

    config_metadata =
      excluded.config_metadata,

    updated_by =
      v_actor

  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- 48 — RECORD REAL HEALTH RESULT
--
-- The caller must supply an actual observed result.
-- This function itself does not pretend to probe a provider.
-- ============================================================

create or replace function
public.record_tour_provider_health_check(
  p_provider_id uuid,
  p_status text,
  p_latency_ms integer default null,
  p_source text default 'manual_check',
  p_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_provider
    public.tour_provider_registry%rowtype;

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_provider

  from
    public.tour_provider_registry

  where
    id =
      p_provider_id;


  if not found then
    raise exception
      'Provider not found';
  end if;


  if not
    public.is_active_company_member(
      v_provider.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if
    p_status not in (
      'healthy',
      'degraded',
      'down',
      'misconfigured'
    )
  then
    raise exception
      'Invalid provider status';
  end if;


  if
    p_latency_ms is not null
    and
    p_latency_ms <
      0
  then
    raise exception
      'Invalid latency';
  end if;


  insert into
  public.tour_provider_health_checks (
    company_id,
    provider_id,
    status,
    latency_ms,
    source,
    message,
    metadata,
    checked_by
  )
  values (
    v_provider.company_id,
    v_provider.id,
    p_status,
    p_latency_ms,
    coalesce(
      nullif(
        btrim(
          p_source
        ),
        ''
      ),
      'manual_check'
    ),
    p_message,
    coalesce(
      p_metadata,
      '{}'::jsonb
    ),
    v_actor
  )
  returning
    id
  into
    v_id;


  update
  public.tour_provider_registry
  set
    last_status =
      p_status,

    last_checked_at =
      now()

  where
    id =
      v_provider.id;


  perform
    public.record_tour_audit_event(
      v_provider.company_id,
      null,
      null,
      null,
      'health_check_recorded',
      'provider',
      v_provider.id,
      'Observed provider health result recorded.',
      null,
      jsonb_build_object(
        'status',
        p_status,
        'latency_ms',
        p_latency_ms,
        'source',
        p_source
      ),
      '{}'::jsonb
    );


  return
    v_id;

end;
$$;


-- ============================================================
-- 49 — GENERATE MANAGEMENT REPORT
-- ============================================================

create or replace function
public.generate_tour_management_report(
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

  v_reservation_count integer := 0;

  v_passenger_count integer := 0;

  v_product_item_count integer := 0;

  v_product_revenue numeric(14,2) := 0;

  v_product_profit numeric(14,2) := 0;

  v_open_tasks integer := 0;

  v_open_incidents integer := 0;

  v_group_requests integer := 0;

  v_control_id uuid;

  v_control
    public.tour_control_tower_snapshots%rowtype;

  v_metrics jsonb;

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
    company_id
  into
    v_company_id

  from
    public.tours

  where
    id =
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


  select
    count(*)::integer,

    coalesce(
      sum(
        reservation.guests
      ),
      0
    )::integer

  into
    v_reservation_count,
    v_passenger_count

  from
    public.reservations reservation

  where
    reservation.company_id =
      v_company_id

    and
    reservation.tour_id =
      p_tour_id

    and
    (
      p_departure_id is null
      or
      reservation.departure_id =
        p_departure_id
    )

    and
    reservation.status <>
      'cancelled';


  select
    count(*)::integer,

    coalesce(
      sum(
        item.total_sale_price
      ),
      0
    ),

    coalesce(
      sum(
        item.gross_profit
      ),
      0
    )

  into
    v_product_item_count,
    v_product_revenue,
    v_product_profit

  from
    public.tour_reservation_product_items item

  where
    item.company_id =
      v_company_id

    and
    item.tour_id =
      p_tour_id

    and
    (
      p_departure_id is null
      or
      item.departure_id =
        p_departure_id
    )

    and
    item.status <>
      'cancelled';


  select
    count(*)::integer

  into
    v_open_tasks

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
    count(*)::integer

  into
    v_open_incidents

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
    grp.status not in (
      'won',
      'lost',
      'cancelled'
    );


  v_control_id :=
    public.generate_tour_control_tower_snapshot(
      p_tour_id,
      p_departure_id
    );


  select *
  into
    v_control

  from
    public.tour_control_tower_snapshots

  where
    id =
      v_control_id;


  v_metrics :=
    jsonb_build_object(
      'reservation_count',
      v_reservation_count,

      'passenger_count',
      v_passenger_count,

      'commercial_product_item_count',
      v_product_item_count,

      'commercial_product_revenue',
      v_product_revenue,

      'commercial_product_profit',
      v_product_profit,

      'open_task_count',
      v_open_tasks,

      'open_incident_count',
      v_open_incidents,

      'open_group_request_count',
      v_group_requests,

      'health_score',
      v_control.health_score,

      'finance_status',
      v_control.finance_status,

      'operational_net_result',
      v_control.operational_net_result,

      'outstanding_receivable',
      v_control.outstanding_receivable,

      'outstanding_payable',
      v_control.outstanding_payable
    );


  if
    v_control.health_score <
      60
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'health_score',
          'message',
          'Tur sağlık skoru yönetim incelemesi gerektiriyor.',
          'value',
          v_control.health_score
        )
      );

  end if;


  if
    v_control.finance_status in (
      'loss',
      'critical'
    )
  then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'finance',
          'message',
          'Finans sonucu yönetim incelemesi gerektiriyor.',
          'status',
          v_control.finance_status
        )
      );

  end if;


  insert into
  public.tour_reporting_snapshots (
    company_id,
    tour_id,
    departure_id,
    report_type,
    metrics,
    findings,
    generated_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,
    'management',
    v_metrics,
    v_findings,
    v_actor
  )
  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- 50 — GENERATE TRAVEL COMPANION SNAPSHOT
-- ============================================================

create or replace function
public.generate_tour_travel_companion_snapshot(
  p_reservation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_reservation
    public.reservations%rowtype;

  v_tour
    public.tours%rowtype;

  v_product_count integer := 0;

  v_active_product_count integer := 0;

  v_open_incidents integer := 0;

  v_unread_notifications integer := 0;

  v_products jsonb :=
    '[]'::jsonb;

  v_risks jsonb :=
    '[]'::jsonb;

  v_checklist jsonb :=
    '[]'::jsonb;

  v_next_steps jsonb :=
    '[]'::jsonb;

  v_score integer := 50;

  v_status text := 'planned';

  v_id uuid;
begin

  v_actor :=
    auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into
    v_reservation

  from
    public.reservations

  where
    id =
      p_reservation_id;


  if not found then
    raise exception
      'Reservation not found';
  end if;


  if not
    public.is_active_company_member(
      v_reservation.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into
    v_tour

  from
    public.tours

  where
    id =
      v_reservation.tour_id;


  select
    count(*)::integer,

    count(*) filter (
      where
        item.status in (
          'confirmed',
          'completed'
        )
    )::integer,

    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_type',
          item.product_type,
          'title',
          item.product_title,
          'service_date',
          item.service_date,
          'status',
          item.status,
          'quantity',
          item.quantity
        )
        order by
          item.service_date nulls last,
          item.created_at
      ),
      '[]'::jsonb
    )

  into
    v_product_count,
    v_active_product_count,
    v_products

  from
    public.tour_reservation_product_items item

  where
    item.company_id =
      v_reservation.company_id

    and
    item.reservation_id =
      v_reservation.id

    and
    item.status <>
      'cancelled';


  select
    count(*)::integer

  into
    v_open_incidents

  from
    public.tour_operation_incidents incident

  where
    incident.company_id =
      v_reservation.company_id

    and
    incident.reservation_id =
      v_reservation.id

    and
    incident.status not in (
      'resolved',
      'closed',
      'cancelled'
    );


  select
    count(*)::integer

  into
    v_unread_notifications

  from
    public.tour_notifications notification

  where
    notification.company_id =
      v_reservation.company_id

    and
    notification.reservation_id =
      v_reservation.id

    and
    notification.status =
      'unread';


  v_checklist :=
    jsonb_build_array(
      jsonb_build_object(
        'key',
        'reservation_active',
        'label',
        'Rezervasyon aktif',
        'completed',
        v_reservation.status <>
          'cancelled'
      ),

      jsonb_build_object(
        'key',
        'tour_operation_status',
        'label',
        'Tur operasyon durumu takip ediliyor',
        'completed',
        v_tour.operation_status is not null
      ),

      jsonb_build_object(
        'key',
        'commercial_services',
        'label',
        'Ek hizmetler kontrol edildi',
        'completed',
        v_product_count =
          v_active_product_count
      ),

      jsonb_build_object(
        'key',
        'incident_free',
        'label',
        'Açık müşteri etkili vaka yok',
        'completed',
        v_open_incidents =
          0
      )
    );


  v_score :=
    50;


  if
    v_reservation.status <>
      'cancelled'
  then
    v_score :=
      v_score +
      20;
  end if;


  if
    v_product_count =
      v_active_product_count
  then
    v_score :=
      v_score +
      15;
  end if;


  if
    v_open_incidents =
      0
  then
    v_score :=
      v_score +
      15;
  else

    v_risks :=
      v_risks ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'open_incident',
          'count',
          v_open_incidents
        )
      );

  end if;


  if
    v_unread_notifications >
      0
  then

    v_next_steps :=
      v_next_steps ||
      jsonb_build_array(
        jsonb_build_object(
          'action',
          'Okunmamış yolculuk bildirimlerini incele.',
          'count',
          v_unread_notifications
        )
      );

  end if;


  if
    v_product_count >
      v_active_product_count
  then

    v_next_steps :=
      v_next_steps ||
      jsonb_build_array(
        jsonb_build_object(
          'action',
          'Onaysız veya bekleyen ek hizmetleri kontrol et.',
          'count',
          v_product_count -
          v_active_product_count
        )
      );

  end if;


  v_score :=
    greatest(
      0,
      least(
        100,
        v_score
      )
    );


  v_status :=
    case
      when
        v_tour.operation_status in (
          'Tamamlandı',
          'completed',
          'complete'
        )
      then
        'completed'

      when
        v_tour.operation_status in (
          'Yolda',
          'Tur Devam Ediyor',
          'in_progress',
          'on_road'
        )
      then
        'active'

      when
        v_score >=
          85
      then
        'ready'

      else
        'planned'
    end;


  insert into
  public.tour_travel_companion_snapshots (
    company_id,
    tour_id,
    departure_id,
    reservation_id,

    journey_status,
    readiness_score,

    checklist,
    next_steps,

    product_summary,
    risk_summary,

    generated_by
  )
  values (
    v_reservation.company_id,
    v_reservation.tour_id,
    v_reservation.departure_id,
    v_reservation.id,

    v_status,
    v_score,

    v_checklist,
    v_next_steps,

    v_products,
    v_risks,

    v_actor
  )
  on conflict (
    company_id,
    reservation_id
  )
  do update
  set
    tour_id =
      excluded.tour_id,

    departure_id =
      excluded.departure_id,

    journey_status =
      excluded.journey_status,

    readiness_score =
      excluded.readiness_score,

    checklist =
      excluded.checklist,

    next_steps =
      excluded.next_steps,

    product_summary =
      excluded.product_summary,

    risk_summary =
      excluded.risk_summary,

    generated_at =
      now(),

    generated_by =
      v_actor

  returning
    id
  into
    v_id;


  return
    v_id;

end;
$$;


-- ============================================================
-- SECURITY — EXTERNAL RPCS
-- ============================================================

revoke all
on function
public.generate_tour_control_tower_snapshot(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_control_tower_snapshot(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.generate_tour_ai_control_tower_snapshot(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_ai_control_tower_snapshot(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.create_tour_payment_distribution_plan(
  uuid,
  numeric,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function
public.create_tour_payment_distribution_plan(
  uuid,
  numeric,
  text,
  text,
  text,
  text
)
to authenticated;


revoke all
on function
public.add_tour_payment_distribution_item(
  uuid,
  text,
  numeric,
  uuid,
  text
)
from public;

grant execute
on function
public.add_tour_payment_distribution_item(
  uuid,
  text,
  numeric,
  uuid,
  text
)
to authenticated;


revoke all
on function
public.confirm_tour_payment_distribution_plan(uuid)
from public;

grant execute
on function
public.confirm_tour_payment_distribution_plan(uuid)
to authenticated;


revoke all
on function
public.reconcile_tour_payment_distribution_plan(
  uuid,
  text
)
from public;

grant execute
on function
public.reconcile_tour_payment_distribution_plan(
  uuid,
  text
)
to authenticated;


revoke all
on function
public.set_tour_role_capability(
  uuid,
  text,
  text,
  boolean
)
from public;

grant execute
on function
public.set_tour_role_capability(
  uuid,
  text,
  text,
  boolean
)
to authenticated;


revoke all
on function
public.create_tour_notification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function
public.create_tour_notification(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;


revoke all
on function
public.mark_tour_notification_read(uuid)
from public;

grant execute
on function
public.mark_tour_notification_read(uuid)
to authenticated;


revoke all
on function
public.set_tour_feature_flag(
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  text
)
from public;

grant execute
on function
public.set_tour_feature_flag(
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  text
)
to authenticated;


revoke all
on function
public.register_tour_provider(
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  jsonb
)
from public;

grant execute
on function
public.register_tour_provider(
  uuid,
  text,
  text,
  text,
  boolean,
  boolean,
  jsonb
)
to authenticated;


revoke all
on function
public.record_tour_provider_health_check(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb
)
from public;

grant execute
on function
public.record_tour_provider_health_check(
  uuid,
  text,
  integer,
  text,
  text,
  jsonb
)
to authenticated;


revoke all
on function
public.generate_tour_management_report(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_management_report(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.generate_tour_travel_companion_snapshot(uuid)
from public;

grant execute
on function
public.generate_tour_travel_companion_snapshot(uuid)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_control_tower_snapshots
enable row level security;

alter table
public.tour_ai_control_tower_snapshots
enable row level security;

alter table
public.tour_payment_distribution_plans
enable row level security;

alter table
public.tour_payment_distribution_items
enable row level security;

alter table
public.tour_audit_events
enable row level security;

alter table
public.tour_role_capabilities
enable row level security;

alter table
public.tour_user_capability_overrides
enable row level security;

alter table
public.tour_notifications
enable row level security;

alter table
public.tour_notification_preferences
enable row level security;

alter table
public.tour_feature_flags
enable row level security;

alter table
public.tour_provider_registry
enable row level security;

alter table
public.tour_provider_health_checks
enable row level security;

alter table
public.tour_reporting_snapshots
enable row level security;

alter table
public.tour_travel_companion_snapshots
enable row level security;


create policy
tour_control_tower_snapshots_select
on public.tour_control_tower_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_ai_control_tower_snapshots_select
on public.tour_ai_control_tower_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_payment_distribution_plans_select
on public.tour_payment_distribution_plans
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_payment_distribution_items_select
on public.tour_payment_distribution_items
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_audit_events_select
on public.tour_audit_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_role_capabilities_select
on public.tour_role_capabilities
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_user_capability_overrides_select
on public.tour_user_capability_overrides
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_notifications_select
on public.tour_notifications
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_notification_preferences_select
on public.tour_notification_preferences
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_feature_flags_select
on public.tour_feature_flags
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_provider_registry_select
on public.tour_provider_registry
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_provider_health_checks_select
on public.tour_provider_health_checks
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_reporting_snapshots_select
on public.tour_reporting_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_travel_companion_snapshots_select
on public.tour_travel_companion_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
public.tour_payment_distribution_plans
is
  'Finance allocation and reconciliation registry. It never moves provider money by itself.';


comment on table
public.tour_ai_control_tower_snapshots
is
  'Rule-based management decision support. external_ai_used=false unless a future real external AI adapter explicitly records otherwise.';


comment on table
public.tour_provider_health_checks
is
  'Observed provider/API health history. Health is not fabricated by registry configuration.';


comment on table
public.tour_notifications
is
  'Internal Tour OS notifications. Records do not imply external email/WhatsApp delivery.';


comment on table
public.tour_travel_companion_snapshots
is
  'Reservation journey companion operational snapshot; existing seyahat token/public journey system remains separate and preserved.';

