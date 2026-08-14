begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 14
-- CANLI ALARM SAYACLARI
-- =========================================================

create or replace function
public.get_package_operation_alert_summary(
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
  v_sla integer := 0;
  v_active integer := 0;
  v_muted integer := 0;

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
        a.resolved_at is null
        and a.read_at is null
    ),

    count(*) filter (
      where
        a.resolved_at is null
        and a.severity = 'critical'
    ),

    count(*) filter (
      where
        a.resolved_at is null
        and a.alert_type = 'sla_overdue'
    ),

    count(*) filter (
      where
        a.resolved_at is null
        and (
          a.muted_until is null
          or a.muted_until <= now()
        )
    ),

    count(*) filter (
      where
        a.resolved_at is null
        and a.muted_until > now()
    )

  into
    v_unread,
    v_critical,
    v_sla,
    v_active,
    v_muted

  from public.package_operation_alerts a

  where
    a.company_id =
      p_company_id;


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
      ),

    'sla',
      coalesce(
        v_sla,
        0
      ),

    'active',
      coalesce(
        v_active,
        0
      ),

    'muted',
      coalesce(
        v_muted,
        0
      )
  );

end;
$$;


revoke all
on function
public.get_package_operation_alert_summary(
  uuid
)
from public;


grant execute
on function
public.get_package_operation_alert_summary(
  uuid
)
to authenticated;


commit;
