create table
public.tour_closeout_snapshots (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete restrict,

  departure_id uuid
    not null
    references public.tour_departures(id)
    on delete restrict,

  closeout_status text
    not null
    check (
      closeout_status in (
        'blocked',
        'ready',
        'closed',
        'reopened'
      )
    ),

  operation_stage text,

  ready_to_close boolean
    not null
    default false,

  blocker_count integer
    not null
    default 0,

  blockers jsonb
    not null
    default '[]'::jsonb,

  readiness_blocker_count integer
    not null
    default 0,

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

  open_change_case_count integer
    not null
    default 0,

  open_refund_count integer
    not null
    default 0,

  pending_automation_count integer
    not null
    default 0,

  failed_automation_count integer
    not null
    default 0,

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

  source_snapshot_id uuid,

  action_reason text,

  generated_by uuid
    not null,

  generated_at timestamptz
    not null
    default now()
);

create index
tour_closeout_snapshots_scope_idx
on public.tour_closeout_snapshots (
  company_id,
  tour_id,
  departure_id,
  generated_at desc
);

alter table
public.tour_closeout_snapshots
enable row level security;

create policy
tour_closeout_snapshots_select_company
on public.tour_closeout_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);

revoke insert, update, delete
on public.tour_closeout_snapshots
from authenticated;

grant select
on public.tour_closeout_snapshots
to authenticated;


create or replace function
public.prevent_tour_closeout_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'TOUR_CLOSEOUT_SNAPSHOT_IMMUTABLE';
end;
$$;

create trigger
tour_closeout_snapshots_no_update
before update
on public.tour_closeout_snapshots
for each row
execute function
public.prevent_tour_closeout_snapshot_mutation();

create trigger
tour_closeout_snapshots_no_delete
before delete
on public.tour_closeout_snapshots
for each row
execute function
public.prevent_tour_closeout_snapshot_mutation();


create or replace function
public.generate_tour_closeout_snapshot(
  p_tour_id uuid,
  p_departure_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;
  v_operation_stage text;

  v_readiness jsonb;
  v_readiness_blockers integer := 0;

  v_open_tasks integer := 0;
  v_overdue_tasks integer := 0;

  v_open_incidents integer := 0;
  v_critical_incidents integer := 0;

  v_open_change_cases integer := 0;
  v_open_refunds integer := 0;

  v_pending_automation integer := 0;
  v_failed_automation integer := 0;

  v_finance_status text := 'unknown';
  v_net numeric(14,2) := 0;
  v_receivable numeric(14,2) := 0;
  v_payable numeric(14,2) := 0;

  v_blockers jsonb := '[]'::jsonb;
  v_blocker_count integer := 0;
  v_ready boolean := false;

  v_id uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'AUTHENTICATION_REQUIRED';
  end if;

  select
    t.company_id,
    coalesce(
      d.operation_stage,
      t.operation_stage,
      'draft'
    )
  into
    v_company_id,
    v_operation_stage
  from
    public.tour_departures d
  join
    public.tours t
      on t.id = d.tour_id
  where
    d.id = p_departure_id
    and
    d.tour_id = p_tour_id;

  if not found then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
  end if;

  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'COMPANY_ACCESS_DENIED';
  end if;


  v_readiness :=
    public.get_tour_operation_readiness_by_departure(
      v_company_id,
      p_tour_id,
      p_departure_id
    );

  v_readiness_blockers :=
    coalesce(
      (
        v_readiness ->
        'blockers'
      )::text::integer,
      0
    );


  select
    count(*)::integer,
    count(*) filter (
      where
        task.due_at is not null
        and task.due_at < now()
        and task.status not in (
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
    task.company_id = v_company_id
    and
    task.tour_id = p_tour_id
    and
    task.departure_id = p_departure_id
    and
    task.status not in (
      'completed',
      'cancelled'
    );


  select
    count(*)::integer,
    count(*) filter (
      where
        incident.severity = 'critical'
    )::integer
  into
    v_open_incidents,
    v_critical_incidents
  from
    public.tour_operation_incidents incident
  where
    incident.company_id = v_company_id
    and
    incident.tour_id = p_tour_id
    and
    incident.departure_id = p_departure_id
    and
    incident.status not in (
      'resolved',
      'closed',
      'cancelled'
    );


  select
    count(*)::integer
  into
    v_open_change_cases
  from
    public.tour_change_cases change_case
  where
    change_case.company_id = v_company_id
    and
    change_case.tour_id = p_tour_id
    and
    change_case.departure_id = p_departure_id
    and
    change_case.status not in (
      'completed',
      'rejected',
      'cancelled'
    );


  select
    count(*)::integer
  into
    v_open_refunds
  from
    public.tour_change_refunds refund
  where
    refund.company_id = v_company_id
    and
    refund.tour_id = p_tour_id
    and
    refund.departure_id = p_departure_id
    and
    refund.status not in (
      'paid',
      'cancelled'
    );


  select
    count(*) filter (
      where
        outbox.status in (
          'ready',
          'blocked_no_provider',
          'processing'
        )
    )::integer,

    count(*) filter (
      where
        outbox.status = 'failed'
    )::integer
  into
    v_pending_automation,
    v_failed_automation
  from
    public.tour_automation_outbox outbox
  where
    outbox.company_id = v_company_id
    and
    outbox.tour_id = p_tour_id
    and
    outbox.departure_id = p_departure_id;


  select
    control.finance_status,
    control.operational_net_result,
    control.outstanding_receivable,
    control.outstanding_payable
  into
    v_finance_status,
    v_net,
    v_receivable,
    v_payable
  from
    public.tour_control_tower_snapshots control
  where
    control.company_id = v_company_id
    and
    control.tour_id = p_tour_id
    and
    control.departure_id = p_departure_id
  order by
    control.generated_at desc
  limit 1;


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


  if v_operation_stage <> 'completed' then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'operation_not_completed',
          'label',
          'Operasyon aşaması henüz tamamlanmadı',
          'value',
          v_operation_stage
        )
      );
  end if;

  if v_readiness_blockers > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'readiness_blockers',
          'label',
          'Operasyon hazırlık kontrollerinde açık maddeler bulunuyor',
          'count',
          v_readiness_blockers
        )
      );
  end if;

  if v_open_tasks > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'open_tasks',
          'label',
          'Açık operasyon görevleri bulunuyor',
          'count',
          v_open_tasks
        )
      );
  end if;

  if v_overdue_tasks > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'overdue_tasks',
          'label',
          'Gecikmiş görevler bulunuyor',
          'count',
          v_overdue_tasks
        )
      );
  end if;

  if v_open_incidents > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'open_incidents',
          'label',
          'Açık operasyon vakaları bulunuyor',
          'count',
          v_open_incidents
        )
      );
  end if;

  if v_critical_incidents > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'critical_incidents',
          'label',
          'Kritik operasyon vakaları bulunuyor',
          'count',
          v_critical_incidents
        )
      );
  end if;

  if v_open_change_cases > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'open_change_cases',
          'label',
          'Sonuçlanmamış değişiklik / iptal dosyaları bulunuyor',
          'count',
          v_open_change_cases
        )
      );
  end if;

  if v_open_refunds > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'open_refunds',
          'label',
          'Sonuçlanmamış iade kayıtları bulunuyor',
          'count',
          v_open_refunds
        )
      );
  end if;

  if v_pending_automation > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'pending_automation',
          'label',
          'Bekleyen otomasyon kayıtları bulunuyor',
          'count',
          v_pending_automation
        )
      );
  end if;

  if v_failed_automation > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'failed_automation',
          'label',
          'Başarısız otomasyon kayıtları bulunuyor',
          'count',
          v_failed_automation
        )
      );
  end if;

  if v_receivable > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'outstanding_receivable',
          'label',
          'Tahsil edilmemiş müşteri bakiyesi bulunuyor',
          'amount',
          v_receivable
        )
      );
  end if;

  if v_payable > 0 then
    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'key',
          'outstanding_payable',
          'label',
          'Ödenmemiş operasyon / tedarikçi bakiyesi bulunuyor',
          'amount',
          v_payable
        )
      );
  end if;


  v_blocker_count :=
    jsonb_array_length(
      v_blockers
    );

  v_ready :=
    v_blocker_count = 0;


  insert into
    public.tour_closeout_snapshots (
      company_id,
      tour_id,
      departure_id,

      closeout_status,
      operation_stage,

      ready_to_close,
      blocker_count,
      blockers,

      readiness_blocker_count,

      open_task_count,
      overdue_task_count,

      open_incident_count,
      critical_incident_count,

      open_change_case_count,
      open_refund_count,

      pending_automation_count,
      failed_automation_count,

      finance_status,
      operational_net_result,
      outstanding_receivable,
      outstanding_payable,

      generated_by
    )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,

    case
      when v_ready
        then 'ready'
      else 'blocked'
    end,

    v_operation_stage,

    v_ready,
    v_blocker_count,
    v_blockers,

    v_readiness_blockers,

    v_open_tasks,
    v_overdue_tasks,

    v_open_incidents,
    v_critical_incidents,

    v_open_change_cases,
    v_open_refunds,

    v_pending_automation,
    v_failed_automation,

    v_finance_status,
    v_net,
    v_receivable,
    v_payable,

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
      'tour_closeout_snapshot',
      v_id,
      'Tour closeout readiness snapshot generated.',
      null,
      jsonb_build_object(
        'ready_to_close',
        v_ready,
        'blocker_count',
        v_blocker_count,
        'operation_stage',
        v_operation_stage
      ),
      jsonb_build_object(
        'source',
        'tour_closeout_v1'
      )
    );


  return v_id;
end;
$$;


create or replace function
public.close_tour_departure_with_human_approval(
  p_tour_id uuid,
  p_departure_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_company_id uuid;

  v_readiness_id uuid;

  v_source
    public.tour_closeout_snapshots%rowtype;

  v_id uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'AUTHENTICATION_REQUIRED';
  end if;

  select
    t.company_id
  into
    v_company_id
  from
    public.tour_departures d
  join
    public.tours t
      on t.id = d.tour_id
  where
    d.id = p_departure_id
    and
    d.tour_id = p_tour_id;

  if not found then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
  end if;

  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'COMPANY_ACCESS_DENIED';
  end if;


  v_readiness_id :=
    public.generate_tour_closeout_snapshot(
      p_tour_id,
      p_departure_id
    );


  select *
  into
    v_source
  from
    public.tour_closeout_snapshots
  where
    id = v_readiness_id;


  if not
    coalesce(
      v_source.ready_to_close,
      false
    )
  then
    raise exception
      'CLOSEOUT_BLOCKED:%',
      v_source.blockers::text;
  end if;


  insert into
    public.tour_closeout_snapshots (
      company_id,
      tour_id,
      departure_id,

      closeout_status,
      operation_stage,

      ready_to_close,
      blocker_count,
      blockers,

      readiness_blocker_count,

      open_task_count,
      overdue_task_count,

      open_incident_count,
      critical_incident_count,

      open_change_case_count,
      open_refund_count,

      pending_automation_count,
      failed_automation_count,

      finance_status,
      operational_net_result,
      outstanding_receivable,
      outstanding_payable,

      source_snapshot_id,
      action_reason,
      generated_by
    )
  values (
    v_source.company_id,
    v_source.tour_id,
    v_source.departure_id,

    'closed',
    v_source.operation_stage,

    true,
    0,
    '[]'::jsonb,

    v_source.readiness_blocker_count,

    v_source.open_task_count,
    v_source.overdue_task_count,

    v_source.open_incident_count,
    v_source.critical_incident_count,

    v_source.open_change_case_count,
    v_source.open_refund_count,

    v_source.pending_automation_count,
    v_source.failed_automation_count,

    v_source.finance_status,
    v_source.operational_net_result,
    v_source.outstanding_receivable,
    v_source.outstanding_payable,

    v_source.id,

    nullif(
      btrim(
        coalesce(
          p_reason,
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
      v_company_id,
      p_tour_id,
      p_departure_id,
      null,
      'closed',
      'tour_closeout_snapshot',
      v_id,
      'Tour departure closeout completed with human approval.',
      jsonb_build_object(
        'source_snapshot_id',
        v_source.id,
        'status',
        v_source.closeout_status
      ),
      jsonb_build_object(
        'status',
        'closed',
        'human_approval',
        true
      ),
      jsonb_build_object(
        'reason',
        nullif(
          btrim(
            coalesce(
              p_reason,
              ''
            )
          ),
          ''
        )
      )
    );


  return v_id;
end;
$$;


create or replace function
public.reopen_tour_departure_closeout(
  p_tour_id uuid,
  p_departure_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_company_id uuid;

  v_source
    public.tour_closeout_snapshots%rowtype;

  v_reason text;
  v_id uuid;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'AUTHENTICATION_REQUIRED';
  end if;

  v_reason :=
    nullif(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    );

  if
    v_reason is null
    or length(v_reason) < 5
  then
    raise exception
      'REOPEN_REASON_REQUIRED';
  end if;


  select
    t.company_id
  into
    v_company_id
  from
    public.tour_departures d
  join
    public.tours t
      on t.id = d.tour_id
  where
    d.id = p_departure_id
    and
    d.tour_id = p_tour_id;

  if not found then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
  end if;

  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'COMPANY_ACCESS_DENIED';
  end if;


  select *
  into
    v_source
  from
    public.tour_closeout_snapshots snapshot
  where
    snapshot.company_id = v_company_id
    and
    snapshot.tour_id = p_tour_id
    and
    snapshot.departure_id = p_departure_id
  order by
    snapshot.generated_at desc
  limit 1;


  if not found then
    raise exception
      'CLOSEOUT_NOT_FOUND';
  end if;

  if
    v_source.closeout_status <> 'closed'
  then
    raise exception
      'ONLY_CLOSED_CLOSEOUT_CAN_BE_REOPENED';
  end if;


  insert into
    public.tour_closeout_snapshots (
      company_id,
      tour_id,
      departure_id,

      closeout_status,
      operation_stage,

      ready_to_close,
      blocker_count,
      blockers,

      readiness_blocker_count,

      open_task_count,
      overdue_task_count,

      open_incident_count,
      critical_incident_count,

      open_change_case_count,
      open_refund_count,

      pending_automation_count,
      failed_automation_count,

      finance_status,
      operational_net_result,
      outstanding_receivable,
      outstanding_payable,

      source_snapshot_id,
      action_reason,
      generated_by
    )
  values (
    v_source.company_id,
    v_source.tour_id,
    v_source.departure_id,

    'reopened',
    v_source.operation_stage,

    false,
    0,
    '[]'::jsonb,

    v_source.readiness_blocker_count,

    v_source.open_task_count,
    v_source.overdue_task_count,

    v_source.open_incident_count,
    v_source.critical_incident_count,

    v_source.open_change_case_count,
    v_source.open_refund_count,

    v_source.pending_automation_count,
    v_source.failed_automation_count,

    v_source.finance_status,
    v_source.operational_net_result,
    v_source.outstanding_receivable,
    v_source.outstanding_payable,

    v_source.id,
    v_reason,
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
      'reopened',
      'tour_closeout_snapshot',
      v_id,
      'Tour departure administrative closeout reopened.',
      jsonb_build_object(
        'status',
        'closed',
        'source_snapshot_id',
        v_source.id
      ),
      jsonb_build_object(
        'status',
        'reopened',
        'journey_stage_unchanged',
        true
      ),
      jsonb_build_object(
        'reason',
        v_reason
      )
    );


  return v_id;
end;
$$;


revoke all
on function
public.generate_tour_closeout_snapshot(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_closeout_snapshot(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.close_tour_departure_with_human_approval(
  uuid,
  uuid,
  text
)
from public;

grant execute
on function
public.close_tour_departure_with_human_approval(
  uuid,
  uuid,
  text
)
to authenticated;


revoke all
on function
public.reopen_tour_departure_closeout(
  uuid,
  uuid,
  text
)
from public;

grant execute
on function
public.reopen_tour_departure_closeout(
  uuid,
  uuid,
  text
)
to authenticated;
