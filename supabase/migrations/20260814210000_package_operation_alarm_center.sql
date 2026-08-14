begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 13
-- OPERASYON ALARM MERKEZI
-- =========================================================


create table if not exists
public.package_operation_alerts (

  id uuid
  primary key
  default gen_random_uuid(),

  company_id uuid
  not null,

  booking_id uuid
  not null,

  booking_item_id uuid,

  alert_type text
  not null,

  severity text
  not null
  default 'warning',

  title text
  not null,

  description text,

  dedupe_key text
  not null,

  assigned_to uuid,

  read_at timestamptz,

  read_by uuid,

  muted_until timestamptz,

  resolved_at timestamptz,

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
    dedupe_key
  )
);


alter table public.package_operation_alerts
drop constraint if exists
package_operation_alerts_alert_type_check;


alter table public.package_operation_alerts
add constraint
package_operation_alerts_alert_type_check
check (
  alert_type in (
    'critical_task',
    'sla_overdue'
  )
);


alter table public.package_operation_alerts
drop constraint if exists
package_operation_alerts_severity_check;


alter table public.package_operation_alerts
add constraint
package_operation_alerts_severity_check
check (
  severity in (
    'warning',
    'critical'
  )
);


create index if not exists
idx_package_operation_alerts_company_created
on public.package_operation_alerts (
  company_id,
  created_at desc
);


create index if not exists
idx_package_operation_alerts_open
on public.package_operation_alerts (
  company_id,
  resolved_at,
  read_at
);


create index if not exists
idx_package_operation_alerts_booking
on public.package_operation_alerts (
  booking_id,
  booking_item_id
);


alter table
public.package_operation_alerts
enable row level security;


-- =========================================================
-- ALERT CENTER LIST RPC
-- =========================================================

create or replace function
public.get_package_operation_alert_center(
  p_company_id uuid
)
returns table (
  id uuid,
  booking_id uuid,
  booking_item_id uuid,
  alert_type text,
  severity text,
  title text,
  description text,
  assigned_to uuid,
  read_at timestamptz,
  muted_until timestamptz,
  resolved_at timestamptz,
  metadata jsonb,
  created_at timestamptz,
  booking_code text,
  customer_name text,
  item_name text
)

language plpgsql
security definer
set search_path = public

as $$
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
  )
  then

    raise exception
      'Bu şirket için yetkiniz bulunmuyor.';

  end if;


  return query

  select
    a.id,
    a.booking_id,
    a.booking_item_id,
    a.alert_type,
    a.severity,
    a.title,
    a.description,
    a.assigned_to,
    a.read_at,
    a.muted_until,
    a.resolved_at,
    a.metadata,
    a.created_at,
    b.booking_code,
    b.customer_name,
    i.name

  from public.package_operation_alerts a

  join public.package_bookings b
    on b.id =
      a.booking_id
    and b.company_id =
      a.company_id

  left join public.package_booking_items i
    on i.id =
      a.booking_item_id

  where
    a.company_id =
      p_company_id

  order by
    case
      when a.resolved_at is null
        then 0
      else 1
    end,
    case
      when a.severity = 'critical'
        then 0
      else 1
    end,
    a.created_at desc;

end;
$$;


revoke all
on function
public.get_package_operation_alert_center(
  uuid
)
from public;


grant execute
on function
public.get_package_operation_alert_center(
  uuid
)
to authenticated;


-- =========================================================
-- ALERT ACTION RPC
-- =========================================================

create or replace function
public.package_operation_alert_action(
  p_alert_id uuid,
  p_action text
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_alert
    public.package_operation_alerts%rowtype;

  v_booking
    public.package_bookings%rowtype;

begin

  select *
  into v_alert
  from public.package_operation_alerts
  where id =
    p_alert_id
  for update;


  if not found then
    raise exception
      'Alarm bulunamadı.';
  end if;


  v_booking :=
    public.package_assert_booking_member(
      v_alert.booking_id
    );


  if p_action not in (
    'read',
    'unread',
    'mute_4h',
    'unmute',
    'assign_to_me',
    'resolve',
    'reopen'
  )
  then

    raise exception
      'Geçersiz alarm aksiyonu.';

  end if;


  if p_action =
    'read'
  then

    update public.package_operation_alerts
    set
      read_at =
        now(),

      read_by =
        auth.uid(),

      updated_at =
        now()

    where id =
      p_alert_id;


  elsif p_action =
    'unread'
  then

    update public.package_operation_alerts
    set
      read_at =
        null,

      read_by =
        null,

      updated_at =
        now()

    where id =
      p_alert_id;


  elsif p_action =
    'mute_4h'
  then

    update public.package_operation_alerts
    set
      muted_until =
        now() +
        interval '4 hours',

      read_at =
        coalesce(
          read_at,
          now()
        ),

      read_by =
        coalesce(
          read_by,
          auth.uid()
        ),

      updated_at =
        now()

    where id =
      p_alert_id;


  elsif p_action =
    'unmute'
  then

    update public.package_operation_alerts
    set
      muted_until =
        null,

      updated_at =
        now()

    where id =
      p_alert_id;


  elsif p_action =
    'assign_to_me'
  then

    update public.package_operation_alerts
    set
      assigned_to =
        auth.uid(),

      read_at =
        coalesce(
          read_at,
          now()
        ),

      read_by =
        coalesce(
          read_by,
          auth.uid()
        ),

      updated_at =
        now()

    where id =
      p_alert_id;


    if v_alert.booking_item_id
      is not null
    then

      update public.package_booking_items
      set
        supplier_room_issue_assigned_to =
          auth.uid(),

        supplier_room_issue_status =
          case
            when supplier_room_issue_status in (
              'none',
              'open'
            )
            then 'assigned'
            else supplier_room_issue_status
          end,

        updated_at =
          now()

      where id =
        v_alert.booking_item_id;

    end if;


  elsif p_action =
    'resolve'
  then

    update public.package_operation_alerts
    set
      resolved_at =
        now(),

      read_at =
        coalesce(
          read_at,
          now()
        ),

      read_by =
        coalesce(
          read_by,
          auth.uid()
        ),

      updated_at =
        now()

    where id =
      p_alert_id;


  elsif p_action =
    'reopen'
  then

    update public.package_operation_alerts
    set
      resolved_at =
        null,

      muted_until =
        null,

      updated_at =
        now()

    where id =
      p_alert_id;

  end if;


  insert into public.package_booking_events (
    company_id,
    booking_id,
    booking_item_id,
    event_type,
    title,
    description,
    metadata,
    created_by
  )
  values (
    v_alert.company_id,
    v_alert.booking_id,
    v_alert.booking_item_id,

    'operation_alert_action',

    'Operasyon alarmı güncellendi',

    concat(
      v_alert.title,
      ' alarmında ',
      p_action,
      ' işlemi uygulandı.'
    ),

    jsonb_build_object(
      'alert_id',
        p_alert_id,

      'action',
        p_action
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'success',
      true,

    'alert_id',
      p_alert_id,

    'action',
      p_action
  );

end;
$$;


revoke all
on function
public.package_operation_alert_action(
  uuid,
  text
)
from public;


grant execute
on function
public.package_operation_alert_action(
  uuid,
  text
)
to authenticated;


-- =========================================================
-- PHASE 12 MOTORUNU ALERT CENTER'E BAGLA
-- =========================================================

create or replace function
public.run_package_task_sla_alerts(
  p_now timestamptz default now()
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_item record;

  v_critical_created integer := 0;

  v_sla_created integer := 0;

  v_minutes_overdue integer;

  v_dedupe_key text;

begin

  -- ======================================================
  -- KRITIK
  -- ======================================================

  for v_item in

    select
      i.id,
      i.company_id,
      i.booking_id,
      i.name,
      i.supplier_room_issue_status,
      i.supplier_room_issue_priority,
      i.supplier_room_issue_assigned_to,
      i.supplier_room_issue_sla_due_at,
      i.supplier_room_issue_last_critical_alert_at,
      b.booking_code,
      b.customer_name

    from public.package_booking_items i

    join public.package_bookings b
      on b.id =
        i.booking_id
      and b.company_id =
        i.company_id

    where
      i.supplier_room_issue_status in (
        'open',
        'waiting_supplier',
        'assigned'
      )

      and i.supplier_room_issue_priority =
        'critical'

      and (
        i.supplier_room_issue_last_critical_alert_at
          is null
        or
        i.supplier_room_issue_last_critical_alert_at
          <=
          p_now -
          interval '2 hours'
      )

  loop

    v_dedupe_key :=
      concat(
        'critical:',
        v_item.id::text,
        ':',
        floor(
          extract(
            epoch from p_now
          )
          /
          7200
        )::bigint
      );


    insert into public.package_operation_alerts (
      company_id,
      booking_id,
      booking_item_id,
      alert_type,
      severity,
      title,
      description,
      dedupe_key,
      assigned_to,
      metadata
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,

      'critical_task',

      'critical',

      'KRİTİK operasyon görevi',

      concat(
        coalesce(
          v_item.booking_code,
          '-'
        ),
        ' · ',
        coalesce(
          v_item.customer_name,
          'Müşteri'
        ),
        ' · ',
        v_item.name
      ),

      v_dedupe_key,

      v_item.supplier_room_issue_assigned_to,

      jsonb_build_object(
        'priority',
          v_item.supplier_room_issue_priority,

        'issue_status',
          v_item.supplier_room_issue_status,

        'sla_due_at',
          v_item.supplier_room_issue_sla_due_at
      )
    )
    on conflict (
      company_id,
      dedupe_key
    )
    do nothing;


    insert into public.package_booking_events (
      company_id,
      booking_id,
      booking_item_id,
      event_type,
      title,
      description,
      metadata,
      created_by
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,

      'task_critical_alert',

      'KRİTİK operasyon görevi',

      concat(
        v_item.name,
        ' için kritik operasyon görevi açık.'
      ),

      jsonb_build_object(
        'source',
          'package_task_sla_engine',

        'alert_type',
          'critical'
      ),

      null
    );


    update public.package_booking_items
    set
      supplier_room_issue_last_critical_alert_at =
        p_now,

      supplier_room_issue_alert_count =
        coalesce(
          supplier_room_issue_alert_count,
          0
        ) + 1,

      updated_at =
        now()

    where id =
      v_item.id;


    v_critical_created :=
      v_critical_created + 1;

  end loop;


  -- ======================================================
  -- SLA GECIKTI
  -- ======================================================

  for v_item in

    select
      i.id,
      i.company_id,
      i.booking_id,
      i.name,
      i.supplier_room_issue_status,
      i.supplier_room_issue_priority,
      i.supplier_room_issue_assigned_to,
      i.supplier_room_issue_sla_due_at,
      i.supplier_room_issue_last_sla_alert_at,
      b.booking_code,
      b.customer_name

    from public.package_booking_items i

    join public.package_bookings b
      on b.id =
        i.booking_id
      and b.company_id =
        i.company_id

    where
      i.supplier_room_issue_status in (
        'open',
        'waiting_supplier',
        'assigned'
      )

      and i.supplier_room_issue_sla_due_at
        is not null

      and i.supplier_room_issue_sla_due_at
        < p_now

      and (
        i.supplier_room_issue_last_sla_alert_at
          is null
        or
        i.supplier_room_issue_last_sla_alert_at
          <=
          p_now -
          interval '1 hour'
      )

  loop

    v_minutes_overdue :=
      greatest(
        1,
        floor(
          extract(
            epoch from (
              p_now -
              v_item.supplier_room_issue_sla_due_at
            )
          )
          /
          60
        )::integer
      );


    v_dedupe_key :=
      concat(
        'sla:',
        v_item.id::text,
        ':',
        floor(
          extract(
            epoch from p_now
          )
          /
          3600
        )::bigint
      );


    insert into public.package_operation_alerts (
      company_id,
      booking_id,
      booking_item_id,
      alert_type,
      severity,
      title,
      description,
      dedupe_key,
      assigned_to,
      metadata
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,

      'sla_overdue',

      case
        when v_item.supplier_room_issue_priority =
          'critical'
        then 'critical'
        else 'warning'
      end,

      'SLA GECİKTİ',

      concat(
        coalesce(
          v_item.booking_code,
          '-'
        ),
        ' · ',
        v_item.name,
        ' · ',
        v_minutes_overdue,
        ' dakika gecikti.'
      ),

      v_dedupe_key,

      v_item.supplier_room_issue_assigned_to,

      jsonb_build_object(
        'minutes_overdue',
          v_minutes_overdue,

        'priority',
          v_item.supplier_room_issue_priority,

        'sla_due_at',
          v_item.supplier_room_issue_sla_due_at
      )
    )
    on conflict (
      company_id,
      dedupe_key
    )
    do nothing;


    insert into public.package_booking_events (
      company_id,
      booking_id,
      booking_item_id,
      event_type,
      title,
      description,
      metadata,
      created_by
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,

      'task_sla_overdue_alert',

      'SLA GECİKTİ',

      concat(
        v_item.name,
        ' görevi SLA süresini ',
        v_minutes_overdue,
        ' dakika geçti.'
      ),

      jsonb_build_object(
        'source',
          'package_task_sla_engine',

        'minutes_overdue',
          v_minutes_overdue
      ),

      null
    );


    update public.package_booking_items
    set
      supplier_room_issue_last_sla_alert_at =
        p_now,

      supplier_room_issue_alert_count =
        coalesce(
          supplier_room_issue_alert_count,
          0
        ) + 1,

      updated_at =
        now()

    where id =
      v_item.id;


    v_sla_created :=
      v_sla_created + 1;

  end loop;


  return jsonb_build_object(
    'success',
      true,

    'generated_at',
      p_now,

    'critical_alerts',
      v_critical_created,

    'sla_alerts',
      v_sla_created,

    'total_alerts',
      v_critical_created +
      v_sla_created
  );

end;
$$;


revoke all
on function
public.run_package_task_sla_alerts(
  timestamptz
)
from public;


grant execute
on function
public.run_package_task_sla_alerts(
  timestamptz
)
to service_role;


commit;
