begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-I
-- AUTOMATIC SUPPLIER REMINDER ENGINE
-- =========================================================


alter table
public.package_supplier_notifications

add column if not exists
priority text not null
default 'normal';


alter table
public.package_supplier_notifications

add column if not exists
dedupe_key text;


alter table
public.package_supplier_notifications

add column if not exists
expires_at timestamptz;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_supplier_notifications_priority_check'
  ) then

    alter table
    public.package_supplier_notifications

    add constraint
    package_supplier_notifications_priority_check

    check (
      priority in (
        'normal',
        'high',
        'critical'
      )
    );

  end if;

end;
$$;


create unique index if not exists
uq_package_supplier_notifications_dedupe

on public.package_supplier_notifications(
  dedupe_key
)

where dedupe_key is not null;


create index if not exists
idx_package_supplier_notifications_priority

on public.package_supplier_notifications(
  company_id,
  priority,
  status,
  created_at desc
);


-- =========================================================
-- REMINDER ENGINE
-- Istanbul local operational clock
-- =========================================================

create or replace function
public.run_package_supplier_reminders(
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

  v_tomorrow date :=
    (
      p_now at time zone
        'Europe/Istanbul'
    )::date + 1;

  v_inserted integer :=
    0;

  v_updated integer :=
    0;

  v_count integer :=
    0;

begin

  -- =======================================================
  -- PACKAGE / TOMORROW / STILL NOT CONFIRMED
  -- =======================================================

  with upserted as (

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

      'Yarınki operasyon onay bekliyor',

      concat(
        bi.name,
        ' · ',
        bi.service_date::text,
        case
          when bi.service_time
            is not null
          then
            ' · ' ||
            to_char(
              bi.service_time,
              'HH24:MI'
            )
          else ''
        end
      ),

      'system',

      'unread',

      'high',

      concat(
        'package:',
        bi.id::text,
        ':tomorrow-unconfirmed:',
        bi.service_date::text
      ),

      (
        bi.service_date::timestamp
        +
        coalesce(
          bi.service_time,
          time '23:59'
        )
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'tomorrow_unconfirmed',

        'service_name',
          bi.name,

        'service_date',
          bi.service_date,

        'service_time',
          bi.service_time,

        'booking_id',
          bi.booking_id,

        'quantity',
          bi.quantity
      )

    from public.package_booking_items bi

    where bi.supplier_id
      is not null

      and bi.service_date =
        v_tomorrow

      and coalesce(
        bi.supplier_status,
        ''
      ) not in (
        'confirmed',
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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- PACKAGE / TODAY / UNCONFIRMED = CRITICAL
  -- =======================================================

  with upserted as (

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

      'KRİTİK: Bugünkü operasyon onaylanmadı',

      concat(
        bi.name,
        ' · ',
        coalesce(
          to_char(
            bi.service_time,
            'HH24:MI'
          ),
          'Saat belirtilmedi'
        )
      ),

      'system',

      'unread',

      'critical',

      concat(
        'package:',
        bi.id::text,
        ':today-unconfirmed:',
        bi.service_date::text
      ),

      (
        bi.service_date::timestamp
        +
        coalesce(
          bi.service_time,
          time '23:59'
        )
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'today_unconfirmed',

        'service_name',
          bi.name,

        'service_date',
          bi.service_date,

        'service_time',
          bi.service_time,

        'booking_id',
          bi.booking_id,

        'quantity',
          bi.quantity
      )

    from public.package_booking_items bi

    where bi.supplier_id
      is not null

      and bi.service_date =
        v_today

      and coalesce(
        bi.supplier_status,
        ''
      ) not in (
        'confirmed',
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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- PACKAGE / WITHIN 3 HOURS
  -- =======================================================

  with upserted as (

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

      'Operasyon yaklaşıyor',

      concat(
        bi.name,
        ' · ',
        to_char(
          bi.service_time,
          'HH24:MI'
        ),
        ' · 3 saatten az kaldı'
      ),

      'system',

      'unread',

      'high',

      concat(
        'package:',
        bi.id::text,
        ':approaching:',
        bi.service_date::text
      ),

      (
        bi.service_date::timestamp
        +
        bi.service_time
        +
        interval '6 hours'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'approaching',

        'service_name',
          bi.name,

        'service_date',
          bi.service_date,

        'service_time',
          bi.service_time,

        'booking_id',
          bi.booking_id,

        'quantity',
          bi.quantity
      )

    from public.package_booking_items bi

    where bi.supplier_id
      is not null

      and bi.service_date =
        v_today

      and bi.service_time
        is not null

      and coalesce(
        bi.supplier_status,
        ''
      ) not in (
        'completed',
        'cancelled'
      )

      and (
        bi.service_date::timestamp
        +
        bi.service_time
      ) >
        v_local_now

      and (
        bi.service_date::timestamp
        +
        bi.service_time
      ) <=
        v_local_now +
        interval '3 hours'

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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- EXTRA / TOMORROW / NEW = HIGH
  -- =======================================================

  with upserted as (

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

      'Yarınki ekstra operasyon onay bekliyor',

      concat(
        ei.name,
        ' · ',
        eo.service_date::text,
        case
          when eo.service_time
            is not null
          then
            ' · ' ||
            to_char(
              eo.service_time,
              'HH24:MI'
            )
          else ''
        end
      ),

      'system',

      'unread',

      'high',

      concat(
        'extra:',
        ei.id::text,
        ':tomorrow-unconfirmed:',
        eo.service_date::text
      ),

      (
        eo.service_date::timestamp
        +
        coalesce(
          eo.service_time,
          time '23:59'
        )
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'tomorrow_unconfirmed',

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
          ei.quantity
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
        v_tomorrow

      and eo.operation_status =
        'new'

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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- EXTRA / TODAY / NEW = CRITICAL
  -- =======================================================

  with upserted as (

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

      'KRİTİK: Bugünkü ekstra operasyon onaylanmadı',

      concat(
        ei.name,
        ' · ',
        coalesce(
          to_char(
            eo.service_time,
            'HH24:MI'
          ),
          'Saat belirtilmedi'
        )
      ),

      'system',

      'unread',

      'critical',

      concat(
        'extra:',
        ei.id::text,
        ':today-unconfirmed:',
        eo.service_date::text
      ),

      (
        eo.service_date::timestamp
        +
        coalesce(
          eo.service_time,
          time '23:59'
        )
        +
        interval '1 day'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'today_unconfirmed',

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
          ei.quantity
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

      and eo.operation_status =
        'new'

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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- EXTRA / WITHIN 3 HOURS
  -- =======================================================

  with upserted as (

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

      'Ekstra operasyon yaklaşıyor',

      concat(
        ei.name,
        ' · ',
        to_char(
          eo.service_time,
          'HH24:MI'
        ),
        ' · 3 saatten az kaldı'
      ),

      'system',

      'unread',

      'high',

      concat(
        'extra:',
        ei.id::text,
        ':approaching:',
        eo.service_date::text
      ),

      (
        eo.service_date::timestamp
        +
        eo.service_time
        +
        interval '6 hours'
      )
      at time zone
        'Europe/Istanbul',

      jsonb_build_object(

        'reminder_type',
          'approaching',

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
          ei.quantity
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

      and eo.operation_status
        not in (
          'completed',
          'cancelled'
        )

      and (
        eo.service_date::timestamp
        +
        eo.service_time
      ) >
        v_local_now

      and (
        eo.service_date::timestamp
        +
        eo.service_time
      ) <=
        v_local_now +
        interval '3 hours'

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
        excluded.priority,

      metadata =
        excluded.metadata,

      expires_at =
        excluded.expires_at,

      updated_at =
        now()

    returning
      (xmax = 0) as inserted

  )

  select
    count(*) filter (
      where inserted
    ),

    count(*) filter (
      where not inserted
    )

  into
    v_count,
    v_updated

  from upserted;


  v_inserted :=
    v_inserted +
    coalesce(
      v_count,
      0
    );


  -- =======================================================
  -- AUTO DISMISS EXPIRED REMINDERS
  -- =======================================================

  update
  public.package_supplier_notifications

  set
    status =
      'dismissed',

    updated_at =
      now()

  where notification_type =
      'system'

    and status =
      'unread'

    and expires_at
      is not null

    and expires_at <
      p_now;


  return jsonb_build_object(

    'success',
      true,

    'local_time',
      v_local_now,

    'today',
      v_today,

    'tomorrow',
      v_tomorrow,

    'new_notifications',
      v_inserted
  );

end;
$$;


revoke all
on function
public.run_package_supplier_reminders(
  timestamptz
)
from public;


grant execute
on function
public.run_package_supplier_reminders(
  timestamptz
)
to service_role;


commit;
