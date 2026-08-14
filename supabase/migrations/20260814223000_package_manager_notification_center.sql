begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 16
-- YONETICI BILDIRIM MERKEZI
-- =========================================================


create table if not exists
public.package_manager_notifications (

  id uuid
  primary key
  default gen_random_uuid(),

  company_id uuid
  not null,

  user_id uuid
  not null,

  notification_type text
  not null
  default 'alarm_escalation',

  severity text
  not null
  default 'warning',

  title text
  not null,

  body text,

  href text,

  source_alert_id uuid,

  escalation_level smallint,

  dedupe_key text
  not null,

  read_at timestamptz,

  created_at timestamptz
  not null
  default now(),

  updated_at timestamptz
  not null
  default now(),

  unique (
    company_id,
    user_id,
    dedupe_key
  )
);


alter table public.package_manager_notifications
drop constraint if exists
package_manager_notifications_severity_check;


alter table public.package_manager_notifications
add constraint
package_manager_notifications_severity_check
check (
  severity in (
    'info',
    'warning',
    'critical'
  )
);


alter table public.package_manager_notifications
drop constraint if exists
package_manager_notifications_escalation_level_check;


alter table public.package_manager_notifications
add constraint
package_manager_notifications_escalation_level_check
check (
  escalation_level is null
  or escalation_level between 1 and 3
);


create index if not exists
idx_package_manager_notifications_user
on public.package_manager_notifications (
  company_id,
  user_id,
  read_at,
  created_at desc
);


create index if not exists
idx_package_manager_notifications_alert
on public.package_manager_notifications (
  source_alert_id
);


alter table
public.package_manager_notifications
enable row level security;


-- =========================================================
-- ESKALASYON -> YONETICI BILDIRIMI
-- =========================================================

create or replace function
public.package_operation_alert_notification_trigger()
returns trigger

language plpgsql
security definer
set search_path = public

as $$
declare

  v_booking_code text;

  v_customer_name text;

  v_item_name text;

  v_dedupe_key text;

begin

  if
    new.escalation_level >
      old.escalation_level

    and new.escalation_level in (
      2,
      3
    )

    and new.escalated_to
      is not null
  then

    select
      b.booking_code,
      b.customer_name,
      i.name

    into
      v_booking_code,
      v_customer_name,
      v_item_name

    from public.package_bookings b

    left join public.package_booking_items i
      on i.id =
        new.booking_item_id

    where
      b.id =
        new.booking_id

      and b.company_id =
        new.company_id

    limit 1;


    v_dedupe_key :=
      concat(
        'package-alert:',
        new.id::text,
        ':L',
        new.escalation_level::text
      );


    insert into public.package_manager_notifications (
      company_id,
      user_id,
      notification_type,
      severity,
      title,
      body,
      href,
      source_alert_id,
      escalation_level,
      dedupe_key
    )
    values (
      new.company_id,
      new.escalated_to,

      'alarm_escalation',

      case
        when new.escalation_level =
          3
        then 'critical'
        else 'warning'
      end,

      case
        when new.escalation_level =
          3
        then 'L3 · Kritik alarm yönetim seviyesine yükseldi'
        else 'L2 · Alarm operasyon müdürüne yükseldi'
      end,

      concat(
        coalesce(
          v_booking_code,
          'Rezervasyon'
        ),
        ' · ',
        coalesce(
          v_customer_name,
          'Müşteri'
        ),
        case
          when v_item_name is not null
          then concat(
            ' · ',
            v_item_name
          )
          else ''
        end,
        ' · ',
        new.title
      ),

      concat(
        '/dashboard/package-os/bookings/',
        new.booking_id::text
      ),

      new.id,

      new.escalation_level,

      v_dedupe_key
    )

    on conflict (
      company_id,
      user_id,
      dedupe_key
    )
    do nothing;

  end if;


  return new;

end;
$$;


drop trigger if exists
trg_package_operation_alert_notification
on public.package_operation_alerts;


create trigger
trg_package_operation_alert_notification

after update of escalation_level
on public.package_operation_alerts

for each row

execute function
public.package_operation_alert_notification_trigger();


-- =========================================================
-- BILDIRIM LISTESI
-- =========================================================

create or replace function
public.get_my_package_manager_notifications(
  p_company_id uuid,
  p_limit integer default 30
)
returns table (
  id uuid,
  notification_type text,
  severity text,
  title text,
  body text,
  href text,
  source_alert_id uuid,
  escalation_level smallint,
  read_at timestamptz,
  created_at timestamptz
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
    n.id,
    n.notification_type,
    n.severity,
    n.title,
    n.body,
    n.href,
    n.source_alert_id,
    n.escalation_level,
    n.read_at,
    n.created_at

  from public.package_manager_notifications n

  where
    n.company_id =
      p_company_id

    and n.user_id =
      auth.uid()

  order by
    case
      when n.read_at is null
      then 0
      else 1
    end,

    n.created_at desc

  limit greatest(
    1,
    least(
      coalesce(
        p_limit,
        30
      ),
      100
    )
  );

end;
$$;


revoke all
on function
public.get_my_package_manager_notifications(
  uuid,
  integer
)
from public;


grant execute
on function
public.get_my_package_manager_notifications(
  uuid,
  integer
)
to authenticated;


-- =========================================================
-- BILDIRIM SAYACI
-- =========================================================

create or replace function
public.get_my_package_notification_summary(
  p_company_id uuid
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_unread integer := 0;

  v_critical integer := 0;

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


  select

    count(*) filter (
      where
        n.read_at is null
    ),

    count(*) filter (
      where
        n.read_at is null
        and n.severity =
          'critical'
    )

  into
    v_unread,
    v_critical

  from public.package_manager_notifications n

  where
    n.company_id =
      p_company_id

    and n.user_id =
      auth.uid();


  return jsonb_build_object(
    'unread',
      coalesce(
        v_unread,
        0
      ),

    'critical',
      coalesce(
        v_critical,
        0
      )
  );

end;
$$;


revoke all
on function
public.get_my_package_notification_summary(
  uuid
)
from public;


grant execute
on function
public.get_my_package_notification_summary(
  uuid
)
to authenticated;


-- =========================================================
-- OKUNDU / TUMUNU OKU
-- =========================================================

create or replace function
public.package_manager_notification_action(
  p_company_id uuid,
  p_notification_id uuid default null,
  p_action text default 'read'
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_count integer := 0;

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


  if p_action not in (
    'read',
    'unread',
    'read_all'
  )
  then

    raise exception
      'Geçersiz bildirim işlemi.';

  end if;


  if p_action =
    'read_all'
  then

    update public.package_manager_notifications

    set
      read_at =
        now(),

      updated_at =
        now()

    where
      company_id =
        p_company_id

      and user_id =
        auth.uid()

      and read_at is null;


    get diagnostics
      v_count =
        row_count;


  elsif p_action =
    'read'
  then

    if p_notification_id
      is null
    then
      raise exception
        'Bildirim kimliği gerekli.';
    end if;


    update public.package_manager_notifications

    set
      read_at =
        now(),

      updated_at =
        now()

    where
      id =
        p_notification_id

      and company_id =
        p_company_id

      and user_id =
        auth.uid();


    get diagnostics
      v_count =
        row_count;


  elsif p_action =
    'unread'
  then

    if p_notification_id
      is null
    then
      raise exception
        'Bildirim kimliği gerekli.';
    end if;


    update public.package_manager_notifications

    set
      read_at =
        null,

      updated_at =
        now()

    where
      id =
        p_notification_id

      and company_id =
        p_company_id

      and user_id =
        auth.uid();


    get diagnostics
      v_count =
        row_count;

  end if;


  return jsonb_build_object(
    'success',
      true,

    'action',
      p_action,

    'affected',
      v_count
  );

end;
$$;


revoke all
on function
public.package_manager_notification_action(
  uuid,
  uuid,
  text
)
from public;


grant execute
on function
public.package_manager_notification_action(
  uuid,
  uuid,
  text
)
to authenticated;


commit;
