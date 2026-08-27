-- ============================================================
-- TUR-015A3 — Automatic departure_24h scheduler
--
-- SAFETY:
-- - additive migration
-- - applied migrations remain immutable
-- - no business-data backfill
-- - no fake provider delivery
-- - no state transition
-- - no financial/refund mutation
-- - existing outbox idempotency remains authoritative
-- - departure_3h remains disabled
-- ============================================================

begin;

create extension if not exists pg_cron;

-- ============================================================
-- Scheduler-safe existing queue RPC
-- Manual authenticated behavior is preserved.
-- pg_cron/service_role may execute without auth.uid().
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
  v_scheduler_context boolean := false;
  v_rule
    public.tour_automation_rules%rowtype;
  v_id uuid;
  v_status text;
begin

  v_actor := auth.uid();

  v_scheduler_context :=
    coalesce(auth.role(), '') = 'service_role'
    or
    session_user = 'postgres';

  if
    v_actor is null
    and
    not v_scheduler_context
  then
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


  if
    not v_scheduler_context
    and
    not public.is_active_company_member(
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

revoke all
on function public.queue_tour_automation_message(
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
on function public.queue_tour_automation_message(
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

grant execute
on function public.queue_tour_automation_message(
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
to service_role;


-- ============================================================
-- Scheduler-safe existing 24h evaluator
-- Exact business logic preserved.
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
  v_scheduler_context boolean := false;
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

  v_scheduler_context :=
    coalesce(auth.role(), '') = 'service_role'
    or
    session_user = 'postgres';

  if
    v_actor is null
    and
    not v_scheduler_context
  then
    raise exception
      'Authentication required';
  end if;


  if
    not v_scheduler_context
    and
    not public.is_active_company_member(
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
on function public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
from public;

grant execute
on function public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
to authenticated;

grant execute
on function public.evaluate_tour_departure_24h_automation(
  uuid,
  uuid,
  uuid,
  date
)
to service_role;


-- ============================================================
-- RUN HISTORY
-- Internal scheduler history.
-- No direct authenticated table access.
-- ============================================================

create table if not exists
public.tour_automation_scheduler_runs (
  id uuid
    primary key
    default gen_random_uuid(),

  run_type text
    not null
    default 'scheduled'
    check (
      run_type in (
        'scheduled',
        'manual'
      )
    ),

  status text
    not null
    default 'running'
    check (
      status in (
        'running',
        'success',
        'partial',
        'failed'
      )
    ),

  reference_date date
    not null,

  candidate_departures integer
    not null
    default 0,

  evaluated_departures integer
    not null
    default 0,

  eligible_departures integer
    not null
    default 0,

  queued_or_deduplicated integer
    not null
    default 0,

  skipped_missing_contact integer
    not null
    default 0,

  error_count integer
    not null
    default 0,

  started_at timestamptz
    not null
    default now(),

  completed_at timestamptz,

  duration_ms integer,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);

create index if not exists
tour_automation_scheduler_runs_created_idx
on public.tour_automation_scheduler_runs(
  created_at desc
);

alter table
public.tour_automation_scheduler_runs
enable row level security;

revoke all
on public.tour_automation_scheduler_runs
from anon;

revoke all
on public.tour_automation_scheduler_runs
from authenticated;


-- ============================================================
-- AUTOMATIC SCHEDULER ENGINE
-- Europe/Istanbul local date is canonical scheduler reference.
-- Evaluates ONLY tomorrow's canonical departure_date rows.
-- ============================================================

create or replace function
public.run_tour_departure_24h_automation_scheduler(
  p_reference_date date default null,
  p_run_type text default 'scheduled'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reference_date date :=
    coalesce(
      p_reference_date,
      (
        now()
        at time zone 'Europe/Istanbul'
      )::date
    );

  v_run_id uuid;
  v_started_at timestamptz :=
    clock_timestamp();

  v_completed_at timestamptz;
  v_duration_ms integer;

  v_departure record;
  v_result jsonb;

  v_candidates integer := 0;
  v_evaluated integer := 0;
  v_eligible integer := 0;
  v_queued integer := 0;
  v_missing_contact integer := 0;
  v_errors integer := 0;
begin

  if p_run_type not in (
    'scheduled',
    'manual'
  ) then
    raise exception
      'INVALID_RUN_TYPE';
  end if;


  insert into
  public.tour_automation_scheduler_runs (
    run_type,
    status,
    reference_date,
    started_at,
    metadata
  )
  values (
    p_run_type,
    'running',
    v_reference_date,
    v_started_at,
    jsonb_build_object(
      'timezone',
      'Europe/Istanbul',
      'event_key',
      'departure_24h',
      'engine',
      'pg_cron'
    )
  )
  returning id
  into v_run_id;


  select count(*)
  into v_candidates
  from public.tour_departures d
  join public.tours t
    on t.id = d.tour_id
  where
    d.departure_date =
      v_reference_date + 1
    and
    t.company_id =
      d.company_id;


  for v_departure in

    select
      d.id as departure_id,
      d.tour_id,
      d.company_id,
      d.departure_date

    from public.tour_departures d

    join public.tours t
      on t.id = d.tour_id

    where
      d.departure_date =
        v_reference_date + 1
      and
      t.company_id =
        d.company_id

    order by
      d.departure_date,
      d.id

  loop

    begin

      v_result :=
        public.evaluate_tour_departure_24h_automation(
          v_departure.company_id,
          v_departure.tour_id,
          v_departure.departure_id,
          v_reference_date
        );

      v_evaluated :=
        v_evaluated + 1;

      if
        coalesce(
          (
            v_result ->> 'eligible'
          )::boolean,
          false
        )
      then
        v_eligible :=
          v_eligible + 1;
      end if;

      v_queued :=
        v_queued +
        coalesce(
          (
            v_result
            ->>
            'queued_or_deduplicated'
          )::integer,
          (
            v_result
            ->>
            'queued'
          )::integer,
          0
        );

      v_missing_contact :=
        v_missing_contact +
        coalesce(
          (
            v_result
            ->>
            'skipped_missing_contact'
          )::integer,
          0
        );

    exception
      when others then

        v_errors :=
          v_errors + 1;

        -- Do not stop all companies/departures because one
        -- departure failed. No fabricated repair/backfill.
        continue;

    end;

  end loop;


  v_completed_at :=
    clock_timestamp();

  v_duration_ms :=
    round(
      extract(
        epoch from (
          v_completed_at -
          v_started_at
        )
      ) * 1000
    )::integer;


  update
  public.tour_automation_scheduler_runs
  set
    status =
      case
        when v_errors = 0
          then 'success'
        when
          v_errors > 0
          and
          v_evaluated > 0
          then 'partial'
        else 'failed'
      end,

    candidate_departures =
      v_candidates,

    evaluated_departures =
      v_evaluated,

    eligible_departures =
      v_eligible,

    queued_or_deduplicated =
      v_queued,

    skipped_missing_contact =
      v_missing_contact,

    error_count =
      v_errors,

    completed_at =
      v_completed_at,

    duration_ms =
      v_duration_ms

  where id = v_run_id;


  return jsonb_build_object(
    'ok',
    v_errors = 0,

    'run_id',
    v_run_id,

    'reference_date',
    v_reference_date,

    'candidate_departures',
    v_candidates,

    'evaluated_departures',
    v_evaluated,

    'eligible_departures',
    v_eligible,

    'queued_or_deduplicated',
    v_queued,

    'skipped_missing_contact',
    v_missing_contact,

    'error_count',
    v_errors,

    'duration_ms',
    v_duration_ms,

    'provider_delivery_claimed',
    false
  );

end;
$$;


revoke all
on function
public.run_tour_departure_24h_automation_scheduler(
  date,
  text
)
from public;

grant execute
on function
public.run_tour_departure_24h_automation_scheduler(
  date,
  text
)
to service_role;


-- ============================================================
-- AUTHENTICATED HEALTH VIEW
-- Aggregate scheduler status only.
-- ============================================================

create or replace function
public.get_tour_24h_automation_scheduler_health()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  v_actor uuid :=
    auth.uid();

  v_last
    public.tour_automation_scheduler_runs%rowtype;

  v_job record;
  v_failures integer := 0;
begin

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not exists (
    select 1
    from public.company_members cm
    where
      cm.user_id = v_actor
      and
      coalesce(
        cm.is_active,
        true
      ) = true
  )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_last
  from
    public.tour_automation_scheduler_runs
  order by
    started_at desc
  limit 1;


  select
    jobid,
    jobname,
    schedule,
    active

  into v_job

  from cron.job

  where
    jobname =
      'turobus-tour-24h-automation'

  limit 1;


  select count(*)
  into v_failures

  from
    public.tour_automation_scheduler_runs

  where
    status in (
      'failed',
      'partial'
    )
    and
    created_at >
      now() -
      interval '24 hours';


  return jsonb_build_object(
    'healthy',
      (
        v_job.jobid is not null
        and
        coalesce(
          v_job.active,
          false
        ) = true
        and
        (
          v_last.id is null
          or
          v_last.status in (
            'success',
            'partial'
          )
        )
      ),

    'scheduler',
      jsonb_build_object(
        'installed',
          v_job.jobid is not null,
        'active',
          coalesce(
            v_job.active,
            false
          ),
        'job_id',
          v_job.jobid,
        'job_name',
          v_job.jobname,
        'schedule',
          v_job.schedule
      ),

    'last_run',
      case
        when v_last.id is null
          then null
        else
          jsonb_build_object(
            'id',
              v_last.id,
            'status',
              v_last.status,
            'run_type',
              v_last.run_type,
            'reference_date',
              v_last.reference_date,
            'candidate_departures',
              v_last.candidate_departures,
            'evaluated_departures',
              v_last.evaluated_departures,
            'eligible_departures',
              v_last.eligible_departures,
            'queued_or_deduplicated',
              v_last.queued_or_deduplicated,
            'skipped_missing_contact',
              v_last.skipped_missing_contact,
            'error_count',
              v_last.error_count,
            'started_at',
              v_last.started_at,
            'completed_at',
              v_last.completed_at,
            'duration_ms',
              v_last.duration_ms
          )
      end,

    'recent_problem_runs_24h',
      v_failures,

    'checked_at',
      now()
  );

end;
$$;


revoke all
on function
public.get_tour_24h_automation_scheduler_health()
from public;

grant execute
on function
public.get_tour_24h_automation_scheduler_health()
to authenticated;


-- ============================================================
-- PG_CRON
-- Hourly is sufficient because current 24h rule is DATE based.
-- Idempotency protects repeated runs.
-- ============================================================

do $$
declare
  v_job_id bigint;
begin

  select jobid
  into v_job_id
  from cron.job
  where
    jobname =
      'turobus-tour-24h-automation'
  limit 1;

  if v_job_id is not null then
    perform
      cron.unschedule(
        v_job_id
      );
  end if;

end;
$$;


select cron.schedule(
  'turobus-tour-24h-automation',
  '0 * * * *',
  $cron$
    select
      public.run_tour_departure_24h_automation_scheduler(
        null,
        'scheduled'
      );
  $cron$
);


comment on function
public.run_tour_departure_24h_automation_scheduler(
  date,
  text
)
is
'Hourly Tour OS departure_24h scheduler. Uses Europe/Istanbul reference date and existing idempotent provider-safe outbox. Does not run departure_3h.';


commit;
