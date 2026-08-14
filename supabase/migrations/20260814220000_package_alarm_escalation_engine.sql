begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 15
-- ALARM ESKALASYON MOTORU
--
-- L1 = Operasyon
-- L2 = Operasyon Müdürü
-- L3 = Firma Sahibi
-- =========================================================


alter table public.package_operation_alerts
add column if not exists
escalation_level smallint
not null
default 1;


alter table public.package_operation_alerts
add column if not exists
escalated_at timestamptz;


alter table public.package_operation_alerts
add column if not exists
escalated_to uuid;


alter table public.package_operation_alerts
add column if not exists
escalation_target_role text;


alter table public.package_operation_alerts
drop constraint if exists
package_operation_alerts_escalation_level_check;


alter table public.package_operation_alerts
add constraint
package_operation_alerts_escalation_level_check
check (
  escalation_level between 1 and 3
);


create index if not exists
idx_package_operation_alerts_escalation
on public.package_operation_alerts (
  company_id,
  resolved_at,
  severity,
  escalation_level,
  escalated_at
);


-- =========================================================
-- ALARM MERKEZI V2
-- =========================================================

create or replace function
public.get_package_operation_alert_center_v2(
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
  item_name text,
  escalation_level smallint,
  escalated_at timestamptz,
  escalated_to uuid,
  escalation_target_role text,
  escalation_target_name text
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
    i.name,

    a.escalation_level,
    a.escalated_at,
    a.escalated_to,
    a.escalation_target_role,

    (
      select
        cm.full_name
      from public.company_members cm
      where
        cm.company_id =
          a.company_id
        and cm.user_id =
          a.escalated_to
      limit 1
    ) as escalation_target_name

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

    a.escalation_level desc,

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
public.get_package_operation_alert_center_v2(
  uuid
)
from public;


grant execute
on function
public.get_package_operation_alert_center_v2(
  uuid
)
to authenticated;


-- =========================================================
-- ESKALASYON MOTORU
--
-- L1 -> L2 : kritik alarm 30 dakika açık
-- L2 -> L3 : L2'de 60 dakika daha açık
-- =========================================================

create or replace function
public.run_package_operation_alert_escalations(
  p_now timestamptz default now()
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_alert record;

  v_next_level smallint;

  v_target_role text;

  v_target_user uuid;

  v_target_name text;

  v_l2_count integer := 0;

  v_l3_count integer := 0;

begin

  for v_alert in

    select
      a.id,
      a.company_id,
      a.booking_id,
      a.booking_item_id,
      a.title,
      a.description,
      a.severity,
      a.alert_type,
      a.created_at,
      a.escalation_level,
      a.escalated_at

    from public.package_operation_alerts a

    where
      a.resolved_at is null

      and a.severity =
        'critical'

      and a.escalation_level <
        3

      and (

        (
          a.escalation_level =
            1

          and a.created_at <=
            p_now -
            interval '30 minutes'
        )

        or

        (
          a.escalation_level =
            2

          and coalesce(
            a.escalated_at,
            a.created_at
          ) <=
            p_now -
            interval '60 minutes'
        )

      )

    order by
      a.created_at asc

    for update
    skip locked

  loop

    v_next_level :=
      least(
        3,
        v_alert.escalation_level +
        1
      );


    if v_next_level =
      2
    then

      v_target_role :=
        'operation_manager';

    else

      v_target_role :=
        'company_owner';

    end if;


    v_target_user :=
      null;

    v_target_name :=
      null;


    -- =====================================================
    -- L2: once operasyon muduru
    -- =====================================================

    if v_next_level =
      2
    then

      select
        cm.user_id,
        cm.full_name
      into
        v_target_user,
        v_target_name

      from public.company_members cm

      where
        cm.company_id =
          v_alert.company_id

        and cm.role =
          'operation_manager'

        and coalesce(
          cm.is_active,
          true
        ) = true

      limit 1;


      -- Müdür yoksa firma sahibine yükselt.
      if v_target_user is null then

        select
          cm.user_id,
          cm.full_name
        into
          v_target_user,
          v_target_name

        from public.company_members cm

        where
          cm.company_id =
            v_alert.company_id

          and cm.role =
            'company_owner'

          and coalesce(
            cm.is_active,
            true
          ) = true

        limit 1;


        if v_target_user is not null then
          v_target_role :=
            'company_owner';
        end if;

      end if;

    end if;


    -- =====================================================
    -- L3: firma sahibi
    -- =====================================================

    if v_next_level =
      3
    then

      select
        cm.user_id,
        cm.full_name
      into
        v_target_user,
        v_target_name

      from public.company_members cm

      where
        cm.company_id =
          v_alert.company_id

        and cm.role =
          'company_owner'

        and coalesce(
          cm.is_active,
          true
        ) = true

      limit 1;


      -- Firma sahibi üyeliği bulunamazsa super admin.
      if v_target_user is null then

        select
          cm.user_id,
          cm.full_name
        into
          v_target_user,
          v_target_name

        from public.company_members cm

        where
          cm.company_id =
            v_alert.company_id

          and cm.role =
            'super_admin'

          and coalesce(
            cm.is_active,
            true
          ) = true

        limit 1;


        if v_target_user is not null then
          v_target_role :=
            'super_admin';
        end if;

      end if;

    end if;


    update public.package_operation_alerts
    set
      escalation_level =
        v_next_level,

      escalated_at =
        p_now,

      escalated_to =
        v_target_user,

      escalation_target_role =
        v_target_role,

      read_at =
        null,

      read_by =
        null,

      updated_at =
        now(),

      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'escalation_level',
            v_next_level,

          'escalation_target_role',
            v_target_role,

          'escalated_to',
            v_target_user,

          'escalated_at',
            p_now
        )

    where id =
      v_alert.id;


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

      'operation_alert_escalated',

      concat(
        'Alarm L',
        v_next_level,
        ' seviyesine yükseltildi'
      ),

      concat(
        v_alert.title,
        ' alarmı çözülmediği için ',
        case
          when v_next_level = 2
          then 'Operasyon Müdürü'
          else 'Firma Sahibi'
        end,
        ' seviyesine yükseltildi.'
      ),

      jsonb_build_object(
        'alert_id',
          v_alert.id,

        'from_level',
          v_alert.escalation_level,

        'to_level',
          v_next_level,

        'target_role',
          v_target_role,

        'target_user',
          v_target_user,

        'target_name',
          v_target_name,

        'escalated_at',
          p_now
      ),

      null
    );


    if v_next_level =
      2
    then

      v_l2_count :=
        v_l2_count + 1;

    else

      v_l3_count :=
        v_l3_count + 1;

    end if;

  end loop;


  return jsonb_build_object(
    'success',
      true,

    'generated_at',
      p_now,

    'level_2_escalations',
      v_l2_count,

    'level_3_escalations',
      v_l3_count,

    'total_escalations',
      v_l2_count +
      v_l3_count
  );

end;
$$;


revoke all
on function
public.run_package_operation_alert_escalations(
  timestamptz
)
from public;


grant execute
on function
public.run_package_operation_alert_escalations(
  timestamptz
)
to service_role;


commit;
