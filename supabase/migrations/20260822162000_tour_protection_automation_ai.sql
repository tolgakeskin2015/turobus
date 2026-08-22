-- ============================================================
-- TUROBUS PACKAGE A — PHASE 17 + 18 + 19
--
-- 17: Customer Protection / Guarantee Engine
-- 18: Communication Automation / Outbox Engine
-- 19: AI Operations Intelligence Foundation
--
-- No fake provider delivery.
-- No automatic financial settlement.
-- No external LLM claim without a provider.
-- ============================================================


-- ============================================================
-- PHASE 17 — CUSTOMER PROTECTION ENGINE
-- ============================================================

create table if not exists
public.tour_protection_plans (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  name text
    not null,

  description text,

  coverage_delay boolean
    not null
    default false,

  coverage_missing_service boolean
    not null
    default false,

  coverage_supplier_failure boolean
    not null
    default false,

  coverage_transport_failure boolean
    not null
    default false,

  coverage_accommodation_failure boolean
    not null
    default false,

  coverage_cancellation boolean
    not null
    default false,

  coverage_medical_emergency boolean
    not null
    default false,

  max_compensation_amount numeric(14,2)
    not null
    default 0
    check (
      max_compensation_amount >= 0
    ),

  currency text
    not null
    default 'TRY',

  active boolean
    not null
    default true,

  terms jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create table if not exists
public.tour_protection_enrollments (
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

  protection_plan_id uuid
    not null
    references public.tour_protection_plans(id)
    on delete restrict,

  status text
    not null
    default 'active'
    check (
      status in (
        'active',
        'expired',
        'cancelled',
        'used'
      )
    ),

  coverage_snapshot jsonb
    not null
    default '{}'::jsonb,

  enrolled_at timestamptz
    not null
    default now(),

  expires_at timestamptz,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    reservation_id,
    protection_plan_id
  )
);


create table if not exists
public.tour_protection_claims (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  enrollment_id uuid
    not null
    references public.tour_protection_enrollments(id)
    on delete cascade,

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

  incident_id uuid
    references public.tour_operation_incidents(id)
    on delete set null,

  change_case_id uuid
    references public.tour_change_cases(id)
    on delete set null,

  claim_number text
    not null,

  claim_type text
    not null
    check (
      claim_type in (
        'delay',
        'missing_service',
        'supplier_failure',
        'transport_failure',
        'accommodation_failure',
        'cancellation',
        'medical_emergency',
        'other'
      )
    ),

  status text
    not null
    default 'submitted'
    check (
      status in (
        'draft',
        'submitted',
        'reviewing',
        'approved',
        'rejected',
        'action_required',
        'completed',
        'cancelled'
      )
    ),

  requested_amount numeric(14,2)
    not null
    default 0
    check (
      requested_amount >= 0
    ),

  approved_amount numeric(14,2)
    not null
    default 0
    check (
      approved_amount >= 0
    ),

  currency text
    not null
    default 'TRY',

  description text,

  decision_note text,

  submitted_by uuid,

  decided_by uuid,

  submitted_at timestamptz,

  decided_at timestamptz,

  completed_at timestamptz,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    claim_number
  )
);


create table if not exists
public.tour_protection_claim_events (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  claim_id uuid
    not null
    references public.tour_protection_claims(id)
    on delete cascade,

  event_type text
    not null,

  actor_id uuid,

  note text,

  payload jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_protection_enrollments_reservation_idx
on public.tour_protection_enrollments (
  company_id,
  reservation_id
);


create index if not exists
tour_protection_claims_status_idx
on public.tour_protection_claims (
  company_id,
  status,
  created_at desc
);


create index if not exists
tour_protection_claims_incident_idx
on public.tour_protection_claims (
  company_id,
  incident_id
);


-- ============================================================
-- PHASE 18 — AUTOMATION ENGINE
-- ============================================================

create table if not exists
public.tour_automation_rules (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  name text
    not null,

  event_key text
    not null
    check (
      event_key in (
        'reservation_created',
        'payment_pending',
        'payment_completed',
        'departure_24h',
        'departure_3h',
        'document_missing',
        'incident_created',
        'incident_critical',
        'refund_completed',
        'protection_claim_created',
        'tour_completed'
      )
    ),

  channel text
    not null
    default 'system'
    check (
      channel in (
        'system',
        'email',
        'whatsapp',
        'sms'
      )
    ),

  recipient_type text
    not null
    default 'customer'
    check (
      recipient_type in (
        'customer',
        'staff',
        'supplier',
        'manager'
      )
    ),

  template_subject text,

  template_body text
    not null,

  active boolean
    not null
    default true,

  requires_provider boolean
    not null
    default false,

  conditions jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create table if not exists
public.tour_automation_outbox (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  rule_id uuid
    references public.tour_automation_rules(id)
    on delete set null,

  tour_id uuid
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  incident_id uuid
    references public.tour_operation_incidents(id)
    on delete set null,

  protection_claim_id uuid
    references public.tour_protection_claims(id)
    on delete set null,

  event_key text
    not null,

  channel text
    not null,

  recipient_type text
    not null,

  recipient_name text,

  recipient_address text,

  subject text,

  message_body text
    not null,

  status text
    not null
    default 'ready'
    check (
      status in (
        'ready',
        'blocked_no_provider',
        'processing',
        'sent',
        'delivered',
        'failed',
        'cancelled'
      )
    ),

  provider text,

  provider_message_id text,

  provider_error text,

  idempotency_key text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  available_at timestamptz
    not null
    default now(),

  sent_at timestamptz,

  delivered_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    idempotency_key
  )
);


create index if not exists
tour_automation_outbox_status_idx
on public.tour_automation_outbox (
  company_id,
  status,
  available_at
);


create index if not exists
tour_automation_outbox_tour_idx
on public.tour_automation_outbox (
  company_id,
  tour_id,
  created_at desc
);


-- ============================================================
-- PHASE 19 — OPERATIONS INTELLIGENCE SNAPSHOT
-- ============================================================

create table if not exists
public.tour_ai_operation_snapshots (
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

  risk_score integer
    not null
    default 0
    check (
      risk_score between 0 and 100
    ),

  risk_level text
    not null
    default 'low'
    check (
      risk_level in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  open_incidents integer
    not null
    default 0,

  critical_incidents integer
    not null
    default 0,

  overdue_tasks integer
    not null
    default 0,

  pending_claims integer
    not null
    default 0,

  missing_document_signals integer
    not null
    default 0,

  protection_risk integer
    not null
    default 0,

  automation_backlog integer
    not null
    default 0,

  findings jsonb
    not null
    default '[]'::jsonb,

  recommended_actions jsonb
    not null
    default '[]'::jsonb,

  engine text
    not null
    default 'rules_v1',

  external_ai_used boolean
    not null
    default false,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid,

  unique (
    company_id,
    tour_id,
    departure_id
  )
);


-- ============================================================
-- UPDATED_AT FUNCTIONS
-- ============================================================

create or replace function
public.touch_tour_protection_updated_at()
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
tour_protection_plans_touch
on public.tour_protection_plans;

create trigger
tour_protection_plans_touch
before update
on public.tour_protection_plans
for each row
execute function
public.touch_tour_protection_updated_at();


drop trigger if exists
tour_protection_claims_touch
on public.tour_protection_claims;

create trigger
tour_protection_claims_touch
before update
on public.tour_protection_claims
for each row
execute function
public.touch_tour_protection_updated_at();


drop trigger if exists
tour_automation_rules_touch
on public.tour_automation_rules;

create trigger
tour_automation_rules_touch
before update
on public.tour_automation_rules
for each row
execute function
public.touch_tour_protection_updated_at();


-- ============================================================
-- IMMUTABLE CLAIM EVENTS
-- ============================================================

create or replace function
public.prevent_tour_protection_claim_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Protection claim events are immutable';
end;
$$;


drop trigger if exists
tour_protection_claim_events_no_update
on public.tour_protection_claim_events;

create trigger
tour_protection_claim_events_no_update
before update
on public.tour_protection_claim_events
for each row
execute function
public.prevent_tour_protection_claim_event_mutation();


drop trigger if exists
tour_protection_claim_events_no_delete
on public.tour_protection_claim_events;

create trigger
tour_protection_claim_events_no_delete
before delete
on public.tour_protection_claim_events
for each row
execute function
public.prevent_tour_protection_claim_event_mutation();


-- ============================================================
-- PHASE 17 RPC — CREATE PLAN
-- ============================================================

create or replace function
public.create_tour_protection_plan(
  p_company_id uuid,
  p_name text,
  p_description text default null,
  p_max_compensation numeric default 0,
  p_delay boolean default true,
  p_missing_service boolean default true,
  p_supplier_failure boolean default true,
  p_transport_failure boolean default true,
  p_accommodation_failure boolean default true,
  p_cancellation boolean default true
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


  if nullif(
    btrim(
      coalesce(
        p_name,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Plan name required';
  end if;


  if coalesce(
    p_max_compensation,
    0
  ) < 0
  then
    raise exception
      'Invalid max compensation';
  end if;


  insert into
  public.tour_protection_plans (
    company_id,
    name,
    description,
    max_compensation_amount,
    coverage_delay,
    coverage_missing_service,
    coverage_supplier_failure,
    coverage_transport_failure,
    coverage_accommodation_failure,
    coverage_cancellation,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    btrim(p_name),
    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),
    coalesce(
      p_max_compensation,
      0
    ),
    p_delay,
    p_missing_service,
    p_supplier_failure,
    p_transport_failure,
    p_accommodation_failure,
    p_cancellation,
    v_actor,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- PHASE 17 RPC — ENROLL RESERVATION
-- ============================================================

create or replace function
public.enroll_tour_reservation_protection(
  p_reservation_id uuid,
  p_plan_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_reservation public.reservations%rowtype;
  v_plan public.tour_protection_plans%rowtype;
  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id;


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
  into v_plan
  from public.tour_protection_plans
  where
    id = p_plan_id
    and
    company_id =
      v_reservation.company_id
    and
    active = true;


  if not found then
    raise exception
      'Protection plan not found';
  end if;


  insert into
  public.tour_protection_enrollments (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    protection_plan_id,
    coverage_snapshot,
    created_by
  )
  values (
    v_reservation.company_id,
    v_reservation.tour_id,
    v_reservation.departure_id,
    v_reservation.id,
    v_plan.id,
    jsonb_build_object(
      'name',
      v_plan.name,
      'max_compensation_amount',
      v_plan.max_compensation_amount,
      'currency',
      v_plan.currency,
      'coverage_delay',
      v_plan.coverage_delay,
      'coverage_missing_service',
      v_plan.coverage_missing_service,
      'coverage_supplier_failure',
      v_plan.coverage_supplier_failure,
      'coverage_transport_failure',
      v_plan.coverage_transport_failure,
      'coverage_accommodation_failure',
      v_plan.coverage_accommodation_failure,
      'coverage_cancellation',
      v_plan.coverage_cancellation
    ),
    v_actor
  )
  on conflict (
    company_id,
    reservation_id,
    protection_plan_id
  )
  do update
  set
    status = 'active'
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- PHASE 17 RPC — CREATE CLAIM
-- ============================================================

create or replace function
public.create_tour_protection_claim(
  p_enrollment_id uuid,
  p_claim_type text,
  p_requested_amount numeric default 0,
  p_description text default null,
  p_incident_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_enrollment
    public.tour_protection_enrollments%rowtype;
  v_plan
    public.tour_protection_plans%rowtype;
  v_claim_number text;
  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_enrollment
  from public.tour_protection_enrollments
  where id = p_enrollment_id;


  if not found then
    raise exception
      'Enrollment not found';
  end if;


  if not
    public.is_active_company_member(
      v_enrollment.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_plan
  from public.tour_protection_plans
  where id =
    v_enrollment.protection_plan_id;


  if coalesce(
    p_requested_amount,
    0
  ) < 0
  then
    raise exception
      'Requested amount cannot be negative';
  end if;


  if
    v_plan.max_compensation_amount > 0
    and
    coalesce(
      p_requested_amount,
      0
    ) >
      v_plan.max_compensation_amount
  then
    raise exception
      'Requested amount exceeds protection limit';
  end if;


  if
    p_incident_id is not null
    and
    not exists (
      select 1
      from public.tour_operation_incidents i
      where
        i.id = p_incident_id
        and
        i.company_id =
          v_enrollment.company_id
        and
        i.tour_id =
          v_enrollment.tour_id
    )
  then
    raise exception
      'Incident scope mismatch';
  end if;


  v_claim_number :=
    'PRT-' ||
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
        5
      )
    );


  insert into
  public.tour_protection_claims (
    company_id,
    enrollment_id,
    tour_id,
    departure_id,
    reservation_id,
    incident_id,
    claim_number,
    claim_type,
    status,
    requested_amount,
    currency,
    description,
    submitted_by,
    submitted_at
  )
  values (
    v_enrollment.company_id,
    v_enrollment.id,
    v_enrollment.tour_id,
    v_enrollment.departure_id,
    v_enrollment.reservation_id,
    p_incident_id,
    v_claim_number,
    p_claim_type,
    'submitted',
    coalesce(
      p_requested_amount,
      0
    ),
    v_plan.currency,
    nullif(
      btrim(
        coalesce(
          p_description,
          ''
        )
      ),
      ''
    ),
    v_actor,
    now()
  )
  returning id
  into v_id;


  insert into
  public.tour_protection_claim_events (
    company_id,
    claim_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values (
    v_enrollment.company_id,
    v_id,
    'created',
    v_actor,
    'Müşteri koruma talebi oluşturuldu.',
    jsonb_build_object(
      'claim_number',
      v_claim_number,
      'claim_type',
      p_claim_type,
      'requested_amount',
      p_requested_amount
    )
  );


  return v_id;

end;
$$;


-- ============================================================
-- PHASE 17 RPC — DECIDE CLAIM
-- ============================================================

create or replace function
public.decide_tour_protection_claim(
  p_claim_id uuid,
  p_approved boolean,
  p_approved_amount numeric default 0,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_claim
    public.tour_protection_claims%rowtype;
  v_enrollment
    public.tour_protection_enrollments%rowtype;
  v_plan
    public.tour_protection_plans%rowtype;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_claim
  from public.tour_protection_claims
  where id = p_claim_id
  for update;


  if not found then
    raise exception
      'Claim not found';
  end if;


  if not
    public.is_active_company_member(
      v_claim.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_enrollment
  from public.tour_protection_enrollments
  where id =
    v_claim.enrollment_id;


  select *
  into v_plan
  from public.tour_protection_plans
  where id =
    v_enrollment.protection_plan_id;


  if p_approved then

    if coalesce(
      p_approved_amount,
      0
    ) < 0
    then
      raise exception
        'Approved amount invalid';
    end if;


    if
      coalesce(
        p_approved_amount,
        0
      ) >
        v_claim.requested_amount
    then
      raise exception
        'Approved amount exceeds requested';
    end if;


    if
      v_plan.max_compensation_amount > 0
      and
      coalesce(
        p_approved_amount,
        0
      ) >
        v_plan.max_compensation_amount
    then
      raise exception
        'Approved amount exceeds plan limit';
    end if;

  end if;


  update
  public.tour_protection_claims
  set
    status =
      case
        when p_approved
        then 'approved'
        else 'rejected'
      end,

    approved_amount =
      case
        when p_approved
        then coalesce(
          p_approved_amount,
          0
        )
        else 0
      end,

    decision_note =
      nullif(
        btrim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      ),

    decided_by =
      v_actor,

    decided_at =
      now()

  where id =
    v_claim.id;


  insert into
  public.tour_protection_claim_events (
    company_id,
    claim_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values (
    v_claim.company_id,
    v_claim.id,
    case
      when p_approved
      then 'approved'
      else 'rejected'
    end,
    v_actor,
    p_note,
    jsonb_build_object(
      'approved',
      p_approved,
      'approved_amount',
      p_approved_amount
    )
  );

end;
$$;


-- ============================================================
-- PHASE 18 — CREATE AUTOMATION RULE
-- ============================================================

create or replace function
public.create_tour_automation_rule(
  p_company_id uuid,
  p_name text,
  p_event_key text,
  p_channel text,
  p_recipient_type text,
  p_subject text,
  p_body text,
  p_requires_provider boolean default false
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


  if nullif(
    btrim(
      coalesce(
        p_name,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Rule name required';
  end if;


  if nullif(
    btrim(
      coalesce(
        p_body,
        ''
      )
    ),
    ''
  ) is null
  then
    raise exception
      'Template body required';
  end if;


  insert into
  public.tour_automation_rules (
    company_id,
    name,
    event_key,
    channel,
    recipient_type,
    template_subject,
    template_body,
    requires_provider,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    btrim(p_name),
    p_event_key,
    p_channel,
    p_recipient_type,
    p_subject,
    p_body,
    p_requires_provider,
    v_actor,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- PHASE 18 — QUEUE AUTOMATION MESSAGE
-- ============================================================

create or replace function
public.queue_tour_automation_message(
  p_rule_id uuid,
  p_tour_id uuid,
  p_departure_id uuid default null,
  p_reservation_id uuid default null,
  p_incident_id uuid default null,
  p_claim_id uuid default null,
  p_recipient_name text default null,
  p_recipient_address text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_rule
    public.tour_automation_rules%rowtype;
  v_id uuid;
  v_status text;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_rule
  from public.tour_automation_rules
  where
    id = p_rule_id
    and
    active = true;


  if not found then
    raise exception
      'Automation rule not found';
  end if;


  if not
    public.is_active_company_member(
      v_rule.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if not exists (
    select 1
    from public.tours t
    where
      t.id = p_tour_id
      and
      t.company_id =
        v_rule.company_id
  )
  then
    raise exception
      'Tour scope mismatch';
  end if;


  v_status :=
    case
      when
        v_rule.requires_provider
        or
        v_rule.channel in (
          'email',
          'whatsapp',
          'sms'
        )
      then
        'blocked_no_provider'
      else
        'ready'
    end;


  insert into
  public.tour_automation_outbox (
    company_id,
    rule_id,
    tour_id,
    departure_id,
    reservation_id,
    incident_id,
    protection_claim_id,
    event_key,
    channel,
    recipient_type,
    recipient_name,
    recipient_address,
    subject,
    message_body,
    status,
    idempotency_key,
    metadata
  )
  values (
    v_rule.company_id,
    v_rule.id,
    p_tour_id,
    p_departure_id,
    p_reservation_id,
    p_incident_id,
    p_claim_id,
    v_rule.event_key,
    v_rule.channel,
    v_rule.recipient_type,
    p_recipient_name,
    p_recipient_address,
    v_rule.template_subject,
    v_rule.template_body,
    v_status,
    p_idempotency_key,
    jsonb_build_object(
      'provider_delivery_claimed',
      false,
      'queued_by',
      v_actor
    )
  )
  on conflict (
    company_id,
    idempotency_key
  )
  do update
  set
    metadata =
      public.tour_automation_outbox.metadata
      ||
      jsonb_build_object(
        'duplicate_queue_attempt_at',
        now()
      )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- PHASE 19 — GENERATE RISK SNAPSHOT
-- ============================================================

create or replace function
public.generate_tour_operation_risk_snapshot(
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
  v_open_incidents integer := 0;
  v_critical_incidents integer := 0;
  v_overdue_tasks integer := 0;
  v_pending_claims integer := 0;
  v_automation_backlog integer := 0;
  v_score integer := 0;
  v_level text;
  v_findings jsonb := '[]'::jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id =
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
    count(*) filter (
      where severity = 'critical'
    )::integer
  into
    v_open_incidents,
    v_critical_incidents
  from
    public.tour_operation_incidents i
  where
    i.company_id =
      v_company_id
    and
    i.tour_id =
      p_tour_id
    and
    (
      p_departure_id is null
      or
      i.departure_id =
        p_departure_id
    )
    and
    i.status not in (
      'resolved',
      'closed',
      'cancelled'
    );


  select
    count(*)::integer
  into
    v_overdue_tasks
  from
    public.tour_operation_tasks t
  where
    t.company_id =
      v_company_id
    and
    t.tour_id =
      p_tour_id
    and
    (
      p_departure_id is null
      or
      t.departure_id =
        p_departure_id
    )
    and
    t.status not in (
      'completed',
      'cancelled'
    )
    and
    t.due_at is not null
    and
    t.due_at < now();


  select
    count(*)::integer
  into
    v_pending_claims
  from
    public.tour_protection_claims c
  where
    c.company_id =
      v_company_id
    and
    c.tour_id =
      p_tour_id
    and
    (
      p_departure_id is null
      or
      c.departure_id =
        p_departure_id
    )
    and
    c.status in (
      'submitted',
      'reviewing',
      'action_required',
      'approved'
    );


  select
    count(*)::integer
  into
    v_automation_backlog
  from
    public.tour_automation_outbox o
  where
    o.company_id =
      v_company_id
    and
    o.tour_id =
      p_tour_id
    and
    (
      p_departure_id is null
      or
      o.departure_id =
        p_departure_id
    )
    and
    o.status in (
      'ready',
      'blocked_no_provider',
      'failed'
    );


  v_score :=
    least(
      100,
      (
        v_open_incidents * 8
        +
        v_critical_incidents * 25
        +
        v_overdue_tasks * 7
        +
        v_pending_claims * 6
        +
        v_automation_backlog * 2
      )
    );


  v_level :=
    case
      when v_score >= 75
      then 'critical'

      when v_score >= 50
      then 'high'

      when v_score >= 25
      then 'medium'

      else 'low'
    end;


  if v_critical_incidents > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'critical_incident',
          'count',
          v_critical_incidents,
          'message',
          'Kritik operasyon vakası mevcut.'
        )
      );


    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'critical',
          'action',
          'Kritik operasyon vakalarını hemen incele.'
        )
      );

  end if;


  if v_overdue_tasks > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'overdue_task',
          'count',
          v_overdue_tasks,
          'message',
          'SLA süresi geçmiş görev bulunuyor.'
        )
      );


    v_actions :=
      v_actions ||
      jsonb_build_array(
        jsonb_build_object(
          'priority',
          'high',
          'action',
          'Geciken görevleri yeniden ata veya tamamla.'
        )
      );

  end if;


  if v_pending_claims > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'protection_claim',
          'count',
          v_pending_claims,
          'message',
          'Bekleyen müşteri koruma talebi bulunuyor.'
        )
      );

  end if;


  if v_automation_backlog > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'automation_backlog',
          'count',
          v_automation_backlog,
          'message',
          'Gönderim veya provider bekleyen otomasyon kaydı var.'
        )
      );

  end if;


  insert into
  public.tour_ai_operation_snapshots (
    company_id,
    tour_id,
    departure_id,
    risk_score,
    risk_level,
    open_incidents,
    critical_incidents,
    overdue_tasks,
    pending_claims,
    automation_backlog,
    findings,
    recommended_actions,
    engine,
    external_ai_used,
    generated_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,
    v_score,
    v_level,
    v_open_incidents,
    v_critical_incidents,
    v_overdue_tasks,
    v_pending_claims,
    v_automation_backlog,
    v_findings,
    v_actions,
    'rules_v1',
    false,
    v_actor
  )
  on conflict (
    company_id,
    tour_id,
    departure_id
  )
  do update
  set
    risk_score =
      excluded.risk_score,

    risk_level =
      excluded.risk_level,

    open_incidents =
      excluded.open_incidents,

    critical_incidents =
      excluded.critical_incidents,

    overdue_tasks =
      excluded.overdue_tasks,

    pending_claims =
      excluded.pending_claims,

    automation_backlog =
      excluded.automation_backlog,

    findings =
      excluded.findings,

    recommended_actions =
      excluded.recommended_actions,

    engine =
      'rules_v1',

    external_ai_used =
      false,

    generated_at =
      now(),

    generated_by =
      v_actor

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function
public.create_tour_protection_plan(
  uuid,
  text,
  text,
  numeric,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
)
from public;

grant execute
on function
public.create_tour_protection_plan(
  uuid,
  text,
  text,
  numeric,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean
)
to authenticated;


revoke all
on function
public.enroll_tour_reservation_protection(
  uuid,
  uuid
)
from public;

grant execute
on function
public.enroll_tour_reservation_protection(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.create_tour_protection_claim(
  uuid,
  text,
  numeric,
  text,
  uuid
)
from public;

grant execute
on function
public.create_tour_protection_claim(
  uuid,
  text,
  numeric,
  text,
  uuid
)
to authenticated;


revoke all
on function
public.decide_tour_protection_claim(
  uuid,
  boolean,
  numeric,
  text
)
from public;

grant execute
on function
public.decide_tour_protection_claim(
  uuid,
  boolean,
  numeric,
  text
)
to authenticated;


revoke all
on function
public.create_tour_automation_rule(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
from public;

grant execute
on function
public.create_tour_automation_rule(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean
)
to authenticated;


revoke all
on function
public.queue_tour_automation_message(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
from public;

grant execute
on function
public.queue_tour_automation_message(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text
)
to authenticated;


revoke all
on function
public.generate_tour_operation_risk_snapshot(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_operation_risk_snapshot(
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_protection_plans
enable row level security;

alter table
public.tour_protection_enrollments
enable row level security;

alter table
public.tour_protection_claims
enable row level security;

alter table
public.tour_protection_claim_events
enable row level security;

alter table
public.tour_automation_rules
enable row level security;

alter table
public.tour_automation_outbox
enable row level security;

alter table
public.tour_ai_operation_snapshots
enable row level security;


create policy
tour_protection_plans_select
on public.tour_protection_plans
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_protection_enrollments_select
on public.tour_protection_enrollments
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_protection_claims_select
on public.tour_protection_claims
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_protection_claim_events_select
on public.tour_protection_claim_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_automation_rules_select
on public.tour_automation_rules
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_automation_outbox_select
on public.tour_automation_outbox
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_ai_operation_snapshots_select
on public.tour_ai_operation_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
public.tour_protection_claims
is
  'Customer protection claims. Approval does not itself execute payment/refund.';


comment on table
public.tour_automation_outbox
is
  'Provider-safe communication outbox. External channels remain blocked until a real provider adapter is connected.';


comment on table
public.tour_ai_operation_snapshots
is
  'Rule-based operations intelligence snapshot. external_ai_used=false unless a real AI provider is later connected.';

