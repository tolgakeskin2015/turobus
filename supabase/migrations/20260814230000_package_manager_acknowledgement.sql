begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 17
-- YONETICI MUDAHALE / ACKNOWLEDGEMENT
-- =========================================================


alter table public.package_manager_notifications
add column if not exists
acknowledged_at timestamptz;


alter table public.package_manager_notifications
add column if not exists
acknowledged_by uuid;


alter table public.package_manager_notifications
add column if not exists
acknowledgement_seconds integer;


-- =========================================================
-- AYRI ACK TABLOSU
-- Her L2 / L3 seviyesi bağımsız ölçülür.
-- =========================================================

create table if not exists
public.package_alert_acknowledgements (

  id uuid
  primary key
  default gen_random_uuid(),

  company_id uuid
  not null,

  alert_id uuid
  not null,

  notification_id uuid
  not null,

  escalation_level smallint
  not null,

  acknowledged_by uuid
  not null,

  acknowledged_at timestamptz
  not null
  default now(),

  response_seconds integer
  not null
  default 0,

  created_at timestamptz
  not null
  default now(),

  unique (
    alert_id,
    escalation_level
  )
);


alter table public.package_alert_acknowledgements
drop constraint if exists
package_alert_acknowledgements_level_check;


alter table public.package_alert_acknowledgements
add constraint
package_alert_acknowledgements_level_check
check (
  escalation_level between 2 and 3
);


create index if not exists
idx_package_alert_acknowledgements_company
on public.package_alert_acknowledgements (
  company_id,
  acknowledged_at desc
);


create index if not exists
idx_package_alert_acknowledgements_user
on public.package_alert_acknowledgements (
  company_id,
  acknowledged_by,
  acknowledged_at desc
);


alter table
public.package_alert_acknowledgements
enable row level security;


-- =========================================================
-- BILDIRIM LISTESI V2
-- Mevcut RETURNS TABLE tipi değiştiği için önce DROP gerekir.
-- =========================================================

drop function if exists
public.get_my_package_manager_notifications(
  uuid,
  integer
);

create function
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
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  acknowledgement_seconds integer,
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
    n.acknowledged_at,
    n.acknowledged_by,
    n.acknowledgement_seconds,
    n.created_at

  from public.package_manager_notifications n

  where
    n.company_id =
      p_company_id

    and n.user_id =
      auth.uid()

  order by

    case
      when n.acknowledged_at is null
      then 0
      else 1
    end,

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


-- =========================================================
-- ACTION RPC V2
-- read / unread / read_all / acknowledge
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

  v_notification
    public.package_manager_notifications%rowtype;

  v_response_seconds integer := 0;

  v_booking_id uuid;

  v_booking_item_id uuid;

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
    'read_all',
    'acknowledge'
  )
  then

    raise exception
      'Geçersiz bildirim işlemi.';

  end if;


  -- ======================================================
  -- TUMUNU OKU
  -- ======================================================

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


    return jsonb_build_object(
      'success',
        true,

      'action',
        p_action,

      'affected',
        v_count
    );

  end if;


  if p_notification_id
    is null
  then

    raise exception
      'Bildirim kimliği gerekli.';

  end if;


  select *
  into v_notification

  from public.package_manager_notifications

  where
    id =
      p_notification_id

    and company_id =
      p_company_id

    and user_id =
      auth.uid()

  for update;


  if not found then

    raise exception
      'Bildirim bulunamadı.';

  end if;


  -- ======================================================
  -- OKUNDU
  -- ======================================================

  if p_action =
    'read'
  then

    update public.package_manager_notifications

    set
      read_at =
        now(),

      updated_at =
        now()

    where id =
      v_notification.id;


    v_count := 1;


  -- ======================================================
  -- OKUNMADI
  -- ======================================================

  elsif p_action =
    'unread'
  then

    update public.package_manager_notifications

    set
      read_at =
        null,

      updated_at =
        now()

    where id =
      v_notification.id;


    v_count := 1;


  -- ======================================================
  -- USTLENDIM
  -- ======================================================

  elsif p_action =
    'acknowledge'
  then

    if v_notification.source_alert_id
      is null
    then

      raise exception
        'Bu bildirime bağlı alarm bulunamadı.';

    end if;


    if v_notification.escalation_level
      is null
    then

      raise exception
        'Bu bildirim eskalasyon bildirimi değil.';

    end if;


    v_response_seconds :=
      greatest(
        0,
        floor(
          extract(
            epoch from (
              now() -
              v_notification.created_at
            )
          )
        )::integer
      );


    update public.package_manager_notifications

    set
      acknowledged_at =
        coalesce(
          acknowledged_at,
          now()
        ),

      acknowledged_by =
        coalesce(
          acknowledged_by,
          auth.uid()
        ),

      acknowledgement_seconds =
        coalesce(
          acknowledgement_seconds,
          v_response_seconds
        ),

      read_at =
        coalesce(
          read_at,
          now()
        ),

      updated_at =
        now()

    where id =
      v_notification.id;


    insert into public.package_alert_acknowledgements (
      company_id,
      alert_id,
      notification_id,
      escalation_level,
      acknowledged_by,
      acknowledged_at,
      response_seconds
    )
    values (
      p_company_id,
      v_notification.source_alert_id,
      v_notification.id,
      v_notification.escalation_level,
      auth.uid(),
      now(),
      v_response_seconds
    )

    on conflict (
      alert_id,
      escalation_level
    )
    do nothing;


    select
      a.booking_id,
      a.booking_item_id

    into
      v_booking_id,
      v_booking_item_id

    from public.package_operation_alerts a

    where
      a.id =
        v_notification.source_alert_id

    limit 1;


    if v_booking_id
      is not null
    then

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
        p_company_id,
        v_booking_id,
        v_booking_item_id,

        'manager_alert_acknowledged',

        concat(
          'L',
          v_notification.escalation_level,
          ' alarmı yönetici tarafından üstlenildi'
        ),

        concat(
          'Yönetici alarmı ',
          greatest(
            1,
            ceil(
              v_response_seconds /
              60.0
            )::integer
          ),
          ' dakika içinde üstlendi.'
        ),

        jsonb_build_object(
          'notification_id',
            v_notification.id,

          'alert_id',
            v_notification.source_alert_id,

          'escalation_level',
            v_notification.escalation_level,

          'acknowledged_by',
            auth.uid(),

          'response_seconds',
            v_response_seconds,

          'response_minutes',
            round(
              v_response_seconds /
              60.0,
              2
            )
        ),

        auth.uid()
      );

    end if;


    v_count := 1;

  end if;


  return jsonb_build_object(
    'success',
      true,

    'action',
      p_action,

    'affected',
      v_count,

    'response_seconds',
      case
        when p_action =
          'acknowledge'
        then v_response_seconds
        else null
      end
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


-- =========================================================
-- YONETICI PERFORMANS OZETI
-- Phase 18 rapor ekranında kullanacağız.
-- =========================================================

create or replace function
public.get_package_manager_acknowledgement_summary(
  p_company_id uuid,
  p_days integer default 30
)
returns table (
  user_id uuid,
  full_name text,
  role text,
  acknowledged_count bigint,
  level_2_count bigint,
  level_3_count bigint,
  average_response_seconds numeric,
  fastest_response_seconds integer,
  slowest_response_seconds integer
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

      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager'
      )
  )
  then

    raise exception
      'Bu raporu görüntüleme yetkiniz bulunmuyor.';

  end if;


  return query

  select
    a.acknowledged_by,

    coalesce(
      cm.full_name,
      'Kullanıcı'
    ),

    cm.role,

    count(*)::bigint,

    count(*) filter (
      where
        a.escalation_level =
          2
    )::bigint,

    count(*) filter (
      where
        a.escalation_level =
          3
    )::bigint,

    round(
      avg(
        a.response_seconds
      ),
      2
    ),

    min(
      a.response_seconds
    ),

    max(
      a.response_seconds
    )

  from public.package_alert_acknowledgements a

  left join public.company_members cm
    on cm.company_id =
      a.company_id

    and cm.user_id =
      a.acknowledged_by

  where
    a.company_id =
      p_company_id

    and a.acknowledged_at >=
      now() -
      make_interval(
        days =>
          greatest(
            1,
            least(
              coalesce(
                p_days,
                30
              ),
              365
            )
          )
      )

  group by
    a.acknowledged_by,
    cm.full_name,
    cm.role

  order by
    avg(
      a.response_seconds
    ) asc nulls last;

end;
$$;


revoke all
on function
public.get_package_manager_acknowledgement_summary(
  uuid,
  integer
)
from public;


grant execute
on function
public.get_package_manager_acknowledgement_summary(
  uuid,
  integer
)
to authenticated;


commit;
