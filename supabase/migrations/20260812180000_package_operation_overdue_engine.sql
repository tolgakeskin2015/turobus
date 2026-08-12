begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-K
-- OVERDUE OPERATION ALARM ENGINE
-- =========================================================


create or replace function
public.run_package_operation_overdue_alerts(
  p_now timestamptz default now()
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_local_now timestamp :=
    p_now at time zone
      'Europe/Istanbul';

  v_today date :=
    (
      p_now at time zone
        'Europe/Istanbul'
    )::date;

  v_package_count integer :=
    0;

  v_extra_count integer :=
    0;

begin

  -- =======================================================
  -- PACKAGE OPERATIONS
  -- =======================================================

  with overdue_rows as (

    insert into
    public.package_supplier_notifications (

      company_id,
      supplier_id,
      source,
      source_id,
      title,
      message,
      notification_type,
      status,
      priority,
      dedupe_key,
      expires_at,
      metadata

    )

    select

      bi.company_id,

      bi.supplier_id,

      'package',

      bi.id,

      'KRİTİK: Operasyon gecikti',

      concat(
        bi.name,
        ' · ',
        to_char(
          bi.service_time,
          'HH24:MI'
        ),
        ' operasyon saati geçti'
      ),

      'system',

      'unread',

      'critical',

      concat(
        'package:',
        bi.id::text,
        ':overdue:',
        bi.service_date::text
      ),

      (
        bi.service_date::timestamp
        +
        bi.service_time
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'overdue',

        'service_name',
          bi.name,

        'service_date',
          bi.service_date,

        'service_time',
          bi.service_time,

        'booking_id',
          bi.booking_id,

        'quantity',
          bi.quantity,

        'supplier_status',
          bi.supplier_status

      )

    from
      public.package_booking_items bi

    where bi.supplier_id
      is not null

      and bi.service_date =
        v_today

      and bi.service_time
        is not null

      and (
        bi.service_date::timestamp
        +
        bi.service_time
      ) <
        v_local_now

      and coalesce(
        bi.supplier_status,
        ''
      ) not in (
        'completed',
        'cancelled'
      )

    on conflict (
      dedupe_key
    )
    where dedupe_key
      is not null

    do update set

      title =
        excluded.title,

      message =
        excluded.message,

      priority =
        'critical',

      metadata =
        excluded.metadata,

      updated_at =
        now()

    returning id
  )

  select
    count(*)
  into
    v_package_count
  from overdue_rows;


  -- =======================================================
  -- EXTRA OPERATIONS
  -- =======================================================

  with overdue_rows as (

    insert into
    public.package_supplier_notifications (

      company_id,
      supplier_id,
      source,
      source_id,
      title,
      message,
      notification_type,
      status,
      priority,
      dedupe_key,
      expires_at,
      metadata

    )

    select

      ei.company_id,

      ei.supplier_id,

      'extra',

      ei.id,

      'KRİTİK: Ekstra operasyon gecikti',

      concat(
        ei.name,
        ' · ',
        to_char(
          eo.service_time,
          'HH24:MI'
        ),
        ' operasyon saati geçti'
      ),

      'system',

      'unread',

      'critical',

      concat(
        'extra:',
        ei.id::text,
        ':overdue:',
        eo.service_date::text
      ),

      (
        eo.service_date::timestamp
        +
        eo.service_time
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'overdue',

        'extra_order_id',
          eo.id,

        'booking_id',
          eo.booking_id,

        'service_name',
          ei.name,

        'service_date',
          eo.service_date,

        'service_time',
          eo.service_time,

        'quantity',
          ei.quantity,

        'operation_status',
          eo.operation_status

      )

    from
      public.package_extra_order_items ei

    join
      public.package_extra_orders eo

      on eo.id =
        ei.order_id

    where ei.supplier_id
      is not null

      and eo.status =
        'paid'

      and eo.service_date =
        v_today

      and eo.service_time
        is not null

      and (
        eo.service_date::timestamp
        +
        eo.service_time
      ) <
        v_local_now

      and coalesce(
        eo.operation_status,
        ''
      ) not in (
        'completed',
        'cancelled'
      )

    on conflict (
      dedupe_key
    )
    where dedupe_key
      is not null

    do update set

      title =
        excluded.title,

      message =
        excluded.message,

      priority =
        'critical',

      metadata =
        excluded.metadata,

      updated_at =
        now()

    returning id
  )

  select
    count(*)
  into
    v_extra_count
  from overdue_rows;


  return jsonb_build_object(

    'success',
      true,

    'local_time',
      v_local_now,

    'package_overdue',
      v_package_count,

    'extra_overdue',
      v_extra_count,

    'total_overdue',
      v_package_count +
      v_extra_count

  );

end;
$$;


revoke all
on function
public.run_package_operation_overdue_alerts(
  timestamptz
)
from public;


grant execute
on function
public.run_package_operation_overdue_alerts(
  timestamptz
)
to service_role;


commit;
