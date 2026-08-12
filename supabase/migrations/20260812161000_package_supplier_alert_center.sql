begin;

create table if not exists
public.package_supplier_notifications (

  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null,

  supplier_id uuid not null,

  source text not null
    check (
      source in (
        'package',
        'extra',
        'system'
      )
    ),

  source_id uuid,

  title text not null,

  message text,

  notification_type text not null
    default 'operation'
    check (
      notification_type in (
        'operation',
        'payment',
        'portal',
        'system'
      )
    ),

  status text not null
    default 'unread'
    check (
      status in (
        'unread',
        'read',
        'dismissed'
      )
    ),

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  read_at timestamptz,

  updated_at timestamptz not null
    default now()
);


create index if not exists
idx_package_supplier_notifications_company
on public.package_supplier_notifications(
  company_id,
  status,
  created_at desc
);


create index if not exists
idx_package_supplier_notifications_supplier
on public.package_supplier_notifications(
  company_id,
  supplier_id,
  status,
  created_at desc
);


create unique index if not exists
uq_package_supplier_notification_operation
on public.package_supplier_notifications(
  company_id,
  supplier_id,
  source,
  source_id,
  notification_type
)
where
  source_id is not null
  and notification_type = 'operation';


alter table
public.package_supplier_notifications
enable row level security;


drop policy if exists
"Package supplier notification members"
on public.package_supplier_notifications;


create policy
"Package supplier notification members"
on public.package_supplier_notifications

for all
to authenticated

using (
  exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      package_supplier_notifications.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
)

with check (
  exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      package_supplier_notifications.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


create or replace function
public.notify_package_supplier_assignment()
returns trigger

language plpgsql
security definer
set search_path = public

as $$
begin

  if new.supplier_id is null then
    return new;
  end if;


  if
    tg_op = 'INSERT'
    or old.supplier_id is distinct from new.supplier_id
    or old.service_date is distinct from new.service_date
    or old.service_time is distinct from new.service_time
  then

    insert into
      public.package_supplier_notifications (
        company_id,
        supplier_id,
        source,
        source_id,
        title,
        message,
        notification_type,
        metadata
      )

    values (
      new.company_id,
      new.supplier_id,
      'package',
      new.id,

      'Yeni paket operasyonu',

      concat(
        new.name,
        case
          when new.service_date is not null
          then ' · ' || new.service_date::text
          else ''
        end,
        case
          when new.service_time is not null
          then ' · ' || to_char(
            new.service_time,
            'HH24:MI'
          )
          else ''
        end
      ),

      'operation',

      jsonb_build_object(
        'booking_id',
          new.booking_id,

        'service_name',
          new.name,

        'service_date',
          new.service_date,

        'service_time',
          new.service_time,

        'quantity',
          new.quantity
      )
    )

    on conflict (
      company_id,
      supplier_id,
      source,
      source_id,
      notification_type
    )
    where
      source_id is not null
      and notification_type = 'operation'

    do update set

      title =
        excluded.title,

      message =
        excluded.message,

      status =
        'unread',

      read_at =
        null,

      metadata =
        excluded.metadata,

      updated_at =
        now();

  end if;


  return new;

end;
$$;


drop trigger if exists
trg_notify_package_supplier_assignment
on public.package_booking_items;


create trigger
trg_notify_package_supplier_assignment

after insert or update of
  supplier_id,
  service_date,
  service_time

on public.package_booking_items

for each row

execute function
public.notify_package_supplier_assignment();


create or replace function
public.notify_package_extra_supplier_assignment()
returns trigger

language plpgsql
security definer
set search_path = public

as $$
declare

  v_order
    public.package_extra_orders%rowtype;

begin

  if new.supplier_id is null then
    return new;
  end if;


  select *
  into v_order

  from public.package_extra_orders

  where id =
    new.order_id

  limit 1;


  if not found then
    return new;
  end if;


  if v_order.status <>
    'paid'
  then
    return new;
  end if;


  if
    tg_op = 'INSERT'
    or old.supplier_id is distinct from new.supplier_id
    or old.activity_slot_id is distinct from new.activity_slot_id
  then

    insert into
      public.package_supplier_notifications (
        company_id,
        supplier_id,
        source,
        source_id,
        title,
        message,
        notification_type,
        metadata
      )

    values (
      new.company_id,
      new.supplier_id,
      'extra',
      new.id,

      'Yeni ekstra operasyon',

      concat(
        new.name,
        case
          when v_order.service_date is not null
          then ' · ' || v_order.service_date::text
          else ''
        end,
        case
          when v_order.service_time is not null
          then ' · ' || to_char(
            v_order.service_time,
            'HH24:MI'
          )
          else ''
        end
      ),

      'operation',

      jsonb_build_object(
        'extra_order_id',
          new.order_id,

        'booking_id',
          v_order.booking_id,

        'service_name',
          new.name,

        'service_date',
          v_order.service_date,

        'service_time',
          v_order.service_time,

        'quantity',
          new.quantity
      )
    )

    on conflict (
      company_id,
      supplier_id,
      source,
      source_id,
      notification_type
    )
    where
      source_id is not null
      and notification_type = 'operation'

    do update set

      title =
        excluded.title,

      message =
        excluded.message,

      status =
        'unread',

      read_at =
        null,

      metadata =
        excluded.metadata,

      updated_at =
        now();

  end if;


  return new;

end;
$$;


drop trigger if exists
trg_notify_package_extra_supplier_assignment
on public.package_extra_order_items;


create trigger
trg_notify_package_extra_supplier_assignment

after insert or update of
  supplier_id,
  activity_slot_id

on public.package_extra_order_items

for each row

execute function
public.notify_package_extra_supplier_assignment();


create or replace function
public.notify_paid_package_extra_suppliers()
returns trigger

language plpgsql
security definer
set search_path = public

as $$
declare
  v_item
    public.package_extra_order_items%rowtype;

begin

  if new.status <>
    'paid'
  then
    return new;
  end if;


  if
    tg_op = 'UPDATE'
    and old.status =
      'paid'
  then
    return new;
  end if;


  for v_item in

    select *
    from public.package_extra_order_items

    where order_id =
        new.id

      and supplier_id
        is not null

  loop

    insert into
      public.package_supplier_notifications (
        company_id,
        supplier_id,
        source,
        source_id,
        title,
        message,
        notification_type,
        metadata
      )

    values (
      v_item.company_id,
      v_item.supplier_id,
      'extra',
      v_item.id,

      'Yeni ekstra operasyon',

      concat(
        v_item.name,
        case
          when new.service_date is not null
          then ' · ' || new.service_date::text
          else ''
        end,
        case
          when new.service_time is not null
          then ' · ' || to_char(
            new.service_time,
            'HH24:MI'
          )
          else ''
        end
      ),

      'operation',

      jsonb_build_object(
        'extra_order_id',
          new.id,

        'booking_id',
          new.booking_id,

        'service_name',
          v_item.name,

        'service_date',
          new.service_date,

        'service_time',
          new.service_time,

        'quantity',
          v_item.quantity
      )
    )

    on conflict (
      company_id,
      supplier_id,
      source,
      source_id,
      notification_type
    )
    where
      source_id is not null
      and notification_type = 'operation'

    do update set

      status =
        'unread',

      read_at =
        null,

      message =
        excluded.message,

      metadata =
        excluded.metadata,

      updated_at =
        now();

  end loop;


  return new;

end;
$$;


drop trigger if exists
trg_notify_paid_package_extra_suppliers
on public.package_extra_orders;


create trigger
trg_notify_paid_package_extra_suppliers

after insert or update of status
on public.package_extra_orders

for each row

when (
  new.status =
    'paid'
)

execute function
public.notify_paid_package_extra_suppliers();


create or replace function
public.mark_package_supplier_notification(
  p_notification_id uuid,
  p_status text default 'read'
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_uid uuid :=
    auth.uid();

  v_notification
    public.package_supplier_notifications%rowtype;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if p_status not in (
    'read',
    'dismissed'
  ) then
    raise exception
      'Geçersiz bildirim durumu.';
  end if;


  select *
  into v_notification

  from public.package_supplier_notifications

  where id =
    p_notification_id

  for update;


  if not found then
    raise exception
      'Bildirim bulunamadı.';
  end if;


  if not exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      v_notification.company_id

      and cm.user_id =
        v_uid

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu bildirim için yetkiniz yok.';
  end if;


  update
    public.package_supplier_notifications

  set
    status =
      p_status,

    read_at =
      case
        when p_status =
          'read'
        then now()
        else read_at
      end,

    updated_at =
      now()

  where id =
    v_notification.id;


  return jsonb_build_object(
    'success',
      true,

    'notification_id',
      v_notification.id,

    'status',
      p_status
  );

end;
$$;


revoke all
on function
public.mark_package_supplier_notification(
  uuid,
  text
)
from public;


grant execute
on function
public.mark_package_supplier_notification(
  uuid,
  text
)
to authenticated;


commit;
