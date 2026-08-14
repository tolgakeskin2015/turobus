begin;

-- =========================================================
-- TUROBUS PACKAGE OS V3 - PHASE 12
-- OTOMATIK KRITIK / SLA UYARI MOTORU
-- =========================================================


alter table public.package_booking_items
add column if not exists
supplier_room_issue_last_critical_alert_at timestamptz;


alter table public.package_booking_items
add column if not exists
supplier_room_issue_last_sla_alert_at timestamptz;


alter table public.package_booking_items
add column if not exists
supplier_room_issue_alert_count integer
not null default 0;


-- =========================================================
-- CRON MOTORU
--
-- KRITIK:
--   aktif kritik görev
--   2 saatte bir tekrar alarm
--
-- SLA:
--   SLA geçmiş aktif görev
--   saatte bir tekrar alarm
--
-- Aynı cron çok sık çalışsa bile spam üretmez.
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

  v_total integer := 0;

  v_minutes_overdue integer;

begin

  -- ======================================================
  -- 1. KRITIK GOREV ALARMLARI
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
        v_item.name,
        ' için kritik operasyon görevi açık.'
      ),

      jsonb_build_object(
        'source',
          'package_task_sla_engine',

        'alert_type',
          'critical',

        'priority',
          v_item.supplier_room_issue_priority,

        'issue_status',
          v_item.supplier_room_issue_status,

        'assigned_to',
          v_item.supplier_room_issue_assigned_to,

        'sla_due_at',
          v_item.supplier_room_issue_sla_due_at,

        'generated_at',
          p_now
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
  -- 2. SLA GECIKME ALARMLARI
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
        coalesce(
          v_item.booking_code,
          '-'
        ),
        ' · ',
        v_item.name,
        ' görevi SLA süresini ',
        v_minutes_overdue,
        ' dakika geçti.'
      ),

      jsonb_build_object(
        'source',
          'package_task_sla_engine',

        'alert_type',
          'sla_overdue',

        'priority',
          v_item.supplier_room_issue_priority,

        'issue_status',
          v_item.supplier_room_issue_status,

        'assigned_to',
          v_item.supplier_room_issue_assigned_to,

        'sla_due_at',
          v_item.supplier_room_issue_sla_due_at,

        'minutes_overdue',
          v_minutes_overdue,

        'generated_at',
          p_now
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


  v_total :=
    v_critical_created +
    v_sla_created;


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
      v_total
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


-- =========================================================
-- GOREV COZULURSE SONRAKI YENIDEN ACILMADA
-- ALARM MOTORUNUN TEMIZ BASLAMASI ICIN RESET
-- =========================================================

create or replace function
public.package_task_alert_state_reset()
returns trigger

language plpgsql
set search_path = public

as $$
begin

  if
    old.supplier_room_issue_status is distinct from
    new.supplier_room_issue_status
  then

    if new.supplier_room_issue_status =
      'resolved'
    then

      new.supplier_room_issue_last_critical_alert_at :=
        null;

      new.supplier_room_issue_last_sla_alert_at :=
        null;

    elsif
      old.supplier_room_issue_status =
        'resolved'
      and
      new.supplier_room_issue_status in (
        'open',
        'waiting_supplier',
        'assigned'
      )
    then

      new.supplier_room_issue_last_critical_alert_at :=
        null;

      new.supplier_room_issue_last_sla_alert_at :=
        null;

      new.supplier_room_issue_alert_count :=
        0;

    end if;

  end if;


  if
    old.supplier_room_issue_sla_due_at
      is distinct from
    new.supplier_room_issue_sla_due_at
  then

    new.supplier_room_issue_last_sla_alert_at :=
      null;

  end if;


  if
    old.supplier_room_issue_priority
      is distinct from
    new.supplier_room_issue_priority
  then

    new.supplier_room_issue_last_critical_alert_at :=
      null;

  end if;


  return new;

end;
$$;


drop trigger if exists
trg_package_task_alert_state_reset
on public.package_booking_items;


create trigger
trg_package_task_alert_state_reset

before update
on public.package_booking_items

for each row

execute function
public.package_task_alert_state_reset();


commit;
