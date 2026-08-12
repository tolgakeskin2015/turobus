begin;

create table if not exists
public.package_whatsapp_queue (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  supplier_id uuid,

  notification_id uuid,

  source text not null default 'supplier_notification',

  source_id uuid,

  to_phone text not null,

  supplier_name text,

  title text not null,

  message text,

  template_name text,

  template_language text not null default 'tr',

  status text not null default 'pending',

  attempts integer not null default 0,

  max_attempts integer not null default 5,

  next_attempt_at timestamptz not null default now(),

  locked_at timestamptz,

  sent_at timestamptz,

  delivered_at timestamptz,

  read_at timestamptz,

  failed_at timestamptz,

  provider_message_id text,

  provider_response jsonb,

  last_error text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint package_whatsapp_queue_status_check
  check (
    status in (
      'pending',
      'processing',
      'sent',
      'delivered',
      'read',
      'retry',
      'failed',
      'cancelled'
    )
  ),

  constraint package_whatsapp_queue_source_check
  check (
    source in (
      'supplier_notification',
      'manual',
      'system'
    )
  )
);

create unique index if not exists
uq_package_whatsapp_queue_notification
on public.package_whatsapp_queue (
  notification_id
)
where notification_id is not null;

create unique index if not exists
uq_package_whatsapp_queue_provider_message
on public.package_whatsapp_queue (
  provider_message_id
)
where provider_message_id is not null;

create index if not exists
idx_package_whatsapp_queue_worker
on public.package_whatsapp_queue (
  status,
  next_attempt_at,
  created_at
);

create index if not exists
idx_package_whatsapp_queue_company
on public.package_whatsapp_queue (
  company_id,
  created_at desc
);

alter table
public.package_whatsapp_queue
enable row level security;

drop policy if exists
package_whatsapp_queue_members
on public.package_whatsapp_queue;

create policy
package_whatsapp_queue_members
on public.package_whatsapp_queue
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_whatsapp_queue.company_id
      and cm.user_id =
        auth.uid()
      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);

create or replace function
public.normalize_package_whatsapp_phone(
  p_phone text
)
returns text

language plpgsql
immutable
set search_path = public

as $$
declare
  v_digits text;
begin
  v_digits :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '[^0-9]',
      '',
      'g'
    );

  if v_digits = '' then
    return null;
  end if;

  if length(v_digits) = 11
     and left(
       v_digits,
       1
     ) = '0'
  then
    return
      '90' ||
      substring(
        v_digits
        from 2
      );
  end if;

  if length(v_digits) = 10 then
    return
      '90' ||
      v_digits;
  end if;

  return v_digits;
end;
$$;

create or replace function
public.enqueue_package_whatsapp_messages()
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare
  v_inserted integer := 0;
begin
  with queued as (
    insert into
    public.package_whatsapp_queue (
      company_id,
      supplier_id,
      notification_id,
      source,
      source_id,
      to_phone,
      supplier_name,
      title,
      message,
      metadata
    )

    select
      n.company_id,
      n.supplier_id,
      n.id,
      'supplier_notification',
      n.source_id,
      public.normalize_package_whatsapp_phone(
        coalesce(
          s.whatsapp_phone,
          s.phone
        )
      ),
      s.name,
      n.title,
      n.message,
      jsonb_build_object(
        'notification_type',
          n.notification_type,
        'priority',
          n.priority,
        'notification_source',
          n.source,
        'dedupe_key',
          n.dedupe_key
      )

    from
      public.package_supplier_notifications n

    join
      public.suppliers s
      on s.id =
        n.supplier_id
      and s.company_id =
        n.company_id

    where n.status =
      'unread'

      and n.priority in (
        'high',
        'critical'
      )

      and public.normalize_package_whatsapp_phone(
        coalesce(
          s.whatsapp_phone,
          s.phone
        )
      ) is not null

    on conflict (
      notification_id
    )
    where notification_id is not null

    do nothing

    returning id
  )

  select count(*)
  into v_inserted
  from queued;

  return jsonb_build_object(
    'success',
      true,
    'queued',
      v_inserted,
    'executed_at',
      now()
  );
end;
$$;

revoke all
on function
public.enqueue_package_whatsapp_messages()
from public;

grant execute
on function
public.enqueue_package_whatsapp_messages()
to service_role;

create or replace function
public.claim_package_whatsapp_queue(
  p_limit integer default 20
)
returns setof public.package_whatsapp_queue

language plpgsql
security definer
set search_path = public

as $$
begin
  return query

  with candidates as (
    select q.id

    from
      public.package_whatsapp_queue q

    where q.status in (
      'pending',
      'retry'
    )

      and q.next_attempt_at <=
        now()

      and q.attempts <
        q.max_attempts

    order by
      q.created_at asc

    limit greatest(
      least(
        p_limit,
        100
      ),
      1
    )

    for update
    skip locked
  )

  update
    public.package_whatsapp_queue q

  set
    status =
      'processing',

    attempts =
      q.attempts + 1,

    locked_at =
      now(),

    updated_at =
      now()

  from
    candidates c

  where q.id =
    c.id

  returning q.*;
end;
$$;

revoke all
on function
public.claim_package_whatsapp_queue(integer)
from public;

grant execute
on function
public.claim_package_whatsapp_queue(integer)
to service_role;

create or replace function
public.mark_package_whatsapp_sent(
  p_id uuid,
  p_provider_message_id text,
  p_provider_response jsonb default '{}'::jsonb
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
begin
  update
    public.package_whatsapp_queue

  set
    status =
      'sent',

    provider_message_id =
      p_provider_message_id,

    provider_response =
      p_provider_response,

    sent_at =
      now(),

    locked_at =
      null,

    last_error =
      null,

    updated_at =
      now()

  where id =
    p_id;

  if not found then
    raise exception
      'WhatsApp kuyruk kaydı bulunamadı.';
  end if;

  return jsonb_build_object(
    'success',
      true,
    'id',
      p_id,
    'status',
      'sent'
  );
end;
$$;

revoke all
on function
public.mark_package_whatsapp_sent(
  uuid,
  text,
  jsonb
)
from public;

grant execute
on function
public.mark_package_whatsapp_sent(
  uuid,
  text,
  jsonb
)
to service_role;

create or replace function
public.mark_package_whatsapp_failed(
  p_id uuid,
  p_error text
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare
  v_attempts integer;
  v_max_attempts integer;
  v_status text;
  v_delay_minutes integer;
begin
  select
    attempts,
    max_attempts

  into
    v_attempts,
    v_max_attempts

  from
    public.package_whatsapp_queue

  where id =
    p_id

  limit 1;

  if not found then
    raise exception
      'WhatsApp kuyruk kaydı bulunamadı.';
  end if;

  if v_attempts >=
    v_max_attempts
  then
    v_status :=
      'failed';
  else
    v_status :=
      'retry';
  end if;

  v_delay_minutes :=
    least(
      greatest(
        power(
          2,
          greatest(
            v_attempts - 1,
            0
          )
        )::integer * 5,
        5
      ),
      240
    );

  update
    public.package_whatsapp_queue

  set
    status =
      v_status,

    last_error =
      left(
        coalesce(
          p_error,
          'Bilinmeyen WhatsApp hatası'
        ),
        2000
      ),

    failed_at =
      case
        when v_status =
          'failed'
        then now()
        else failed_at
      end,

    next_attempt_at =
      case
        when v_status =
          'retry'
        then
          now() +
          make_interval(
            mins =>
              v_delay_minutes
          )
        else next_attempt_at
      end,

    locked_at =
      null,

    updated_at =
      now()

  where id =
    p_id;

  return jsonb_build_object(
    'success',
      true,
    'id',
      p_id,
    'status',
      v_status,
    'next_delay_minutes',
      case
        when v_status =
          'retry'
        then v_delay_minutes
        else null
      end
  );
end;
$$;

revoke all
on function
public.mark_package_whatsapp_failed(
  uuid,
  text
)
from public;

grant execute
on function
public.mark_package_whatsapp_failed(
  uuid,
  text
)
to service_role;

create or replace function
public.update_package_whatsapp_delivery(
  p_provider_message_id text,
  p_status text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare
  v_internal_status text;
begin
  v_internal_status :=
    case p_status
      when 'sent'
        then 'sent'
      when 'delivered'
        then 'delivered'
      when 'read'
        then 'read'
      when 'failed'
        then 'failed'
      else null
    end;

  if v_internal_status is null then
    return jsonb_build_object(
      'success',
        false,
      'ignored',
        true,
      'provider_status',
        p_status
    );
  end if;

  update
    public.package_whatsapp_queue

  set
    status =
      v_internal_status,

    sent_at =
      case
        when v_internal_status =
          'sent'
        then coalesce(
          sent_at,
          now()
        )
        else sent_at
      end,

    delivered_at =
      case
        when v_internal_status =
          'delivered'
        then now()
        else delivered_at
      end,

    read_at =
      case
        when v_internal_status =
          'read'
        then now()
        else read_at
      end,

    failed_at =
      case
        when v_internal_status =
          'failed'
        then now()
        else failed_at
      end,

    provider_response =
      coalesce(
        provider_response,
        '{}'::jsonb
      ) ||
      jsonb_build_object(
        'last_webhook',
          p_payload
      ),

    updated_at =
      now()

  where provider_message_id =
    p_provider_message_id;

  return jsonb_build_object(
    'success',
      found,
    'provider_message_id',
      p_provider_message_id,
    'status',
      v_internal_status
  );
end;
$$;

revoke all
on function
public.update_package_whatsapp_delivery(
  text,
  text,
  jsonb
)
from public;

grant execute
on function
public.update_package_whatsapp_delivery(
  text,
  text,
  jsonb
)
to service_role;

create or replace function
public.get_package_whatsapp_queue_stats()
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare
  v_uid uuid :=
    auth.uid();

  v_result jsonb;
begin
  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.user_id =
      v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Yetkiniz yok.';
  end if;

  select jsonb_build_object(
    'pending',
      count(*) filter (
        where status in (
          'pending',
          'retry'
        )
      ),

    'processing',
      count(*) filter (
        where status =
          'processing'
      ),

    'sent',
      count(*) filter (
        where status =
          'sent'
      ),

    'delivered',
      count(*) filter (
        where status =
          'delivered'
      ),

    'read',
      count(*) filter (
        where status =
          'read'
      ),

    'failed',
      count(*) filter (
        where status =
          'failed'
      ),

    'today',
      count(*) filter (
        where created_at >=
          date_trunc(
            'day',
            now()
          )
      )
  )

  into v_result

  from public.package_whatsapp_queue q

  where exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      q.company_id
      and cm.user_id =
        v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  );

  return v_result;
end;
$$;

revoke all
on function
public.get_package_whatsapp_queue_stats()
from public;

grant execute
on function
public.get_package_whatsapp_queue_stats()
to authenticated;

create or replace function
public.run_package_os_automation(
  p_run_type text default 'scheduled'
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare
  v_run_id uuid;

  v_started_at timestamptz :=
    clock_timestamp();

  v_completed_at timestamptz;

  v_reminder jsonb;

  v_overdue jsonb;

  v_whatsapp jsonb;

  v_error text;

  v_duration integer;
begin
  if p_run_type not in (
    'scheduled',
    'manual'
  ) then
    raise exception
      'Geçersiz otomasyon tipi.';
  end if;

  insert into
  public.package_os_automation_runs (
    run_type,
    status,
    started_at
  )

  values (
    p_run_type,
    'running',
    v_started_at
  )

  returning id
  into v_run_id;

  begin
    v_reminder :=
      public.run_package_supplier_reminders(
        now()
      );

    v_overdue :=
      public.run_package_operation_overdue_alerts(
        now()
      );

    v_whatsapp :=
      public.enqueue_package_whatsapp_messages();

    v_completed_at :=
      clock_timestamp();

    v_duration :=
      round(
        extract(
          epoch from (
            v_completed_at -
            v_started_at
          )
        ) * 1000
      )::integer;

    update
      public.package_os_automation_runs

    set
      status =
        'success',

      reminder_result =
        v_reminder,

      overdue_result =
        v_overdue,

      completed_at =
        v_completed_at,

      duration_ms =
        v_duration,

      metadata =
        jsonb_build_object(
          'timezone',
            'Europe/Istanbul',
          'engine',
            'pg_cron',
          'whatsapp_queue',
            v_whatsapp
        )

    where id =
      v_run_id;

    return jsonb_build_object(
      'success',
        true,

      'run_id',
        v_run_id,

      'reminders',
        v_reminder,

      'overdue',
        v_overdue,

      'whatsapp_queue',
        v_whatsapp,

      'duration_ms',
        v_duration
    );

  exception
    when others then
      v_error :=
        sqlerrm;

      v_completed_at :=
        clock_timestamp();

      v_duration :=
        round(
          extract(
            epoch from (
              v_completed_at -
              v_started_at
          )
        ) * 1000
      )::integer;

      update
        public.package_os_automation_runs

      set
        status =
          'failed',

        error_message =
          v_error,

        completed_at =
          v_completed_at,

        duration_ms =
          v_duration,

        metadata =
          jsonb_build_object(
            'timezone',
              'Europe/Istanbul',
            'engine',
              'pg_cron'
          )

      where id =
        v_run_id;

      return jsonb_build_object(
        'success',
          false,

        'run_id',
          v_run_id,

        'error',
          v_error,

        'duration_ms',
          v_duration
      );
  end;
end;
$$;

revoke all
on function
public.run_package_os_automation(text)
from public;

grant execute
on function
public.run_package_os_automation(text)
to service_role;

commit;
