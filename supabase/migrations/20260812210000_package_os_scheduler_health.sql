begin;

create extension if not exists pg_cron;

create table if not exists public.package_os_automation_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'scheduled',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  reminder_result jsonb,
  overdue_result jsonb,
  error_message text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint package_os_automation_runs_status_check
  check (
    status in (
      'running',
      'success',
      'failed'
    )
  ),

  constraint package_os_automation_runs_type_check
  check (
    run_type in (
      'scheduled',
      'manual'
    )
  )
);

create index if not exists idx_package_os_automation_runs_created
on public.package_os_automation_runs (
  created_at desc
);

alter table public.package_os_automation_runs
enable row level security;

drop policy if exists package_os_automation_runs_members
on public.package_os_automation_runs;

create policy package_os_automation_runs_members
on public.package_os_automation_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and coalesce(cm.is_active, true) = true
  )
);

create or replace function public.run_package_os_automation(
  p_run_type text default 'scheduled'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_started_at timestamptz := clock_timestamp();
  v_completed_at timestamptz;
  v_reminder jsonb;
  v_overdue jsonb;
  v_error text;
  v_duration integer;
begin
  if p_run_type not in ('scheduled', 'manual') then
    raise exception 'Geçersiz otomasyon tipi.';
  end if;

  insert into public.package_os_automation_runs (
    run_type,
    status,
    started_at
  )
  values (
    p_run_type,
    'running',
    v_started_at
  )
  returning id into v_run_id;

  begin
    v_reminder :=
      public.run_package_supplier_reminders(now());

    v_overdue :=
      public.run_package_operation_overdue_alerts(now());

    v_completed_at := clock_timestamp();

    v_duration :=
      round(
        extract(
          epoch from (
            v_completed_at - v_started_at
          )
        ) * 1000
      )::integer;

    update public.package_os_automation_runs
    set
      status = 'success',
      reminder_result = v_reminder,
      overdue_result = v_overdue,
      completed_at = v_completed_at,
      duration_ms = v_duration,
      metadata = jsonb_build_object(
        'timezone',
        'Europe/Istanbul',
        'engine',
        'pg_cron'
      )
    where id = v_run_id;

    return jsonb_build_object(
      'success', true,
      'run_id', v_run_id,
      'reminders', v_reminder,
      'overdue', v_overdue,
      'duration_ms', v_duration
    );

  exception
    when others then
      v_error := sqlerrm;
      v_completed_at := clock_timestamp();

      v_duration :=
        round(
          extract(
            epoch from (
              v_completed_at - v_started_at
            )
          ) * 1000
        )::integer;

      update public.package_os_automation_runs
      set
        status = 'failed',
        error_message = v_error,
        completed_at = v_completed_at,
        duration_ms = v_duration,
        metadata = jsonb_build_object(
          'timezone',
          'Europe/Istanbul',
          'engine',
          'pg_cron'
        )
      where id = v_run_id;

      return jsonb_build_object(
        'success', false,
        'run_id', v_run_id,
        'error', v_error,
        'duration_ms', v_duration
      );
  end;
end;
$$;

revoke all
on function public.run_package_os_automation(text)
from public;

grant execute
on function public.run_package_os_automation(text)
to service_role;

create or replace function public.get_package_os_automation_health()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  v_uid uuid := auth.uid();
  v_last public.package_os_automation_runs%rowtype;
  v_job record;
  v_recent_failures integer := 0;
  v_is_healthy boolean := false;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  ) then
    raise exception 'Yetkiniz yok.';
  end if;

  select *
  into v_last
  from public.package_os_automation_runs
  order by started_at desc
  limit 1;

  select
    jobid,
    jobname,
    schedule,
    active
  into v_job
  from cron.job
  where jobname = 'turobus-package-os-automation'
  limit 1;

  select count(*)
  into v_recent_failures
  from public.package_os_automation_runs
  where status = 'failed'
    and created_at > now() - interval '24 hours';

  v_is_healthy :=
    v_job.jobid is not null
    and coalesce(v_job.active, false) = true
    and v_last.id is not null
    and v_last.status = 'success'
    and v_last.started_at > now() - interval '15 minutes';

  return jsonb_build_object(
    'healthy',
      v_is_healthy,

    'scheduler',
      jsonb_build_object(
        'installed',
          v_job.jobid is not null,
        'active',
          coalesce(v_job.active, false),
        'job_id',
          v_job.jobid,
        'job_name',
          v_job.jobname,
        'schedule',
          v_job.schedule
      ),

    'last_run',
      case
        when v_last.id is null then null
        else jsonb_build_object(
          'id',
            v_last.id,
          'status',
            v_last.status,
          'run_type',
            v_last.run_type,
          'started_at',
            v_last.started_at,
          'completed_at',
            v_last.completed_at,
          'duration_ms',
            v_last.duration_ms,
          'reminder_result',
            v_last.reminder_result,
          'overdue_result',
            v_last.overdue_result,
          'error_message',
            v_last.error_message
        )
      end,

    'recent_failures_24h',
      v_recent_failures,

    'checked_at',
      now()
  );
end;
$$;

revoke all
on function public.get_package_os_automation_health()
from public;

grant execute
on function public.get_package_os_automation_health()
to authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid
  into v_job_id
  from cron.job
  where jobname = 'turobus-package-os-automation'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end;
$$;

select cron.schedule(
  'turobus-package-os-automation',
  '*/5 * * * *',
  'select public.run_package_os_automation(''scheduled'');'
);

commit;
