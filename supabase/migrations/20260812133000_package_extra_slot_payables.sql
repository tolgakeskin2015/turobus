begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-E
-- EXTRA SLOT + SUPPLIER PAYABLE
-- =========================================================


-- ---------------------------------------------------------
-- EXTRA ITEM -> ACTIVITY SLOT
-- ---------------------------------------------------------

alter table public.package_extra_order_items
  add column if not exists activity_slot_id uuid
  references public.package_activity_slots(id)
  on delete set null;


create index if not exists
  idx_package_extra_items_activity_slot
on public.package_extra_order_items(
  company_id,
  activity_slot_id
);


-- ---------------------------------------------------------
-- SUPPLIER PAYABLE -> EXTRA ORDER
-- ---------------------------------------------------------

alter table public.package_supplier_payables
  add column if not exists extra_order_id uuid
  references public.package_extra_orders(id)
  on delete set null;


alter table public.package_supplier_payables
  add column if not exists extra_order_item_id uuid
  references public.package_extra_order_items(id)
  on delete set null;


create unique index if not exists
  uq_package_supplier_payables_extra_item
on public.package_supplier_payables(
  extra_order_item_id
)
where extra_order_item_id is not null;


create index if not exists
  idx_package_supplier_payables_extra_order
on public.package_supplier_payables(
  company_id,
  extra_order_id
);


-- ---------------------------------------------------------
-- AUTO CREATE SUPPLIER PAYABLE
-- When extra order becomes PAID
-- ---------------------------------------------------------

create or replace function
public.create_package_extra_supplier_payables()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if new.status <> 'paid' then
    return new;
  end if;


  insert into public.package_supplier_payables (
    company_id,

    booking_id,
    booking_item_id,

    extra_order_id,
    extra_order_item_id,

    supplier_id,

    amount,
    currency,

    due_date,

    paid_amount,

    status,

    notes,

    metadata
  )

  select
    i.company_id,

    new.booking_id,

    null,

    new.id,
    i.id,

    i.supplier_id,

    i.total_cost,

    i.currency,

    current_date,

    0,

    'open',

    'Ekstra hizmet tedarikçi hakedişi',

    jsonb_build_object(
      'source',
        'package_extra_order',

      'extra_order_id',
        new.id,

      'extra_order_item_id',
        i.id,

      'activity_id',
        i.activity_id,

      'service_name',
        i.name
    )

  from public.package_extra_order_items i

  where i.order_id =
      new.id

    and i.supplier_id
      is not null

    and i.total_cost > 0

  on conflict (
    extra_order_item_id
  )
  where extra_order_item_id is not null
  do nothing;


  return new;

end;
$$;


drop trigger if exists
  trg_package_extra_supplier_payables
on public.package_extra_orders;


create trigger
  trg_package_extra_supplier_payables

after insert or update of status
on public.package_extra_orders

for each row

when (
  new.status = 'paid'
)

execute function
  public.create_package_extra_supplier_payables();


-- Backfill already-paid extras
insert into public.package_supplier_payables (
  company_id,

  booking_id,
  booking_item_id,

  extra_order_id,
  extra_order_item_id,

  supplier_id,

  amount,
  currency,

  due_date,

  paid_amount,

  status,

  notes,

  metadata
)

select
  i.company_id,

  o.booking_id,

  null,

  o.id,
  i.id,

  i.supplier_id,

  i.total_cost,

  i.currency,

  current_date,

  0,

  'open',

  'Ekstra hizmet tedarikçi hakedişi',

  jsonb_build_object(
    'source',
      'package_extra_order',

    'extra_order_id',
      o.id,

    'extra_order_item_id',
      i.id,

    'activity_id',
      i.activity_id,

    'service_name',
      i.name
  )

from public.package_extra_orders o

join public.package_extra_order_items i
  on i.order_id =
    o.id

where o.status =
    'paid'

  and i.supplier_id
    is not null

  and i.total_cost > 0

on conflict (
  extra_order_item_id
)
where extra_order_item_id is not null
do nothing;


-- ---------------------------------------------------------
-- PUBLIC EXTRA SLOT LIST
-- PAID ORDERS ONLY
-- No internal cost / supplier financial data exposed
-- ---------------------------------------------------------

create or replace function
public.get_package_extra_slots_public(
  p_order_token uuid,
  p_extra_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order
    public.package_extra_orders%rowtype;

  v_item
    public.package_extra_order_items%rowtype;

  v_activity
    public.package_activities%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_slots jsonb;
begin

  select *
  into v_order

  from public.package_extra_orders

  where public_token =
    p_order_token

  limit 1;


  if not found then
    raise exception
      'Ekstra sipariş bulunamadı.';
  end if;


  if v_order.status <>
    'paid'
  then
    raise exception
      'Saat seçebilmek için ekstra hizmet ödenmiş olmalıdır.';
  end if;


  if v_order.operation_status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'Bu ekstra hizmet artık değiştirilemez.';
  end if;


  select *
  into v_item

  from public.package_extra_order_items

  where id =
      p_extra_item_id

    and order_id =
      v_order.id;


  if not found then
    raise exception
      'Ekstra hizmet bulunamadı.';
  end if;


  if not v_item.requires_slot then
    raise exception
      'Bu ekstra hizmet için saat seçimi gerekmiyor.';
  end if;


  select *
  into v_activity

  from public.package_activities

  where id =
      v_item.activity_id

    and company_id =
      v_order.company_id

    and is_active =
      true;


  if not found then
    raise exception
      'Aktivite bulunamadı.';
  end if;


  select *
  into v_booking

  from public.package_bookings

  where id =
    v_order.booking_id;


  if not found then
    raise exception
      'Paket rezervasyonu bulunamadı.';
  end if;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          s.id,

        'slot_date',
          s.slot_date,

        'start_time',
          s.start_time,

        'capacity',
          s.capacity,

        'reserved_count',
          s.reserved_count,

        'available_capacity',
          greatest(
            s.capacity -
            s.reserved_count,
            0
          ),

        'selected',
          s.id =
          v_item.activity_slot_id
      )
      order by
        s.slot_date,
        s.start_time
    ),
    '[]'::jsonb
  )
  into v_slots

  from public.package_activity_slots s

  where s.company_id =
      v_order.company_id

    and s.activity_id =
      v_item.activity_id

    and s.status in (
      'open',
      'full'
    )

    and s.slot_date >=
      v_booking.check_in

    and s.slot_date <=
      v_booking.check_out

    and (
      s.id =
        v_item.activity_slot_id

      or

      (
        s.status =
          'open'

        and

        s.reserved_count <
          s.capacity
      )
    );


  return jsonb_build_object(
    'order_token',
      v_order.public_token,

    'extra_item_id',
      v_item.id,

    'activity_name',
      v_item.name,

    'quantity',
      v_item.quantity,

    'selected_slot_id',
      v_item.activity_slot_id,

    'slots',
      v_slots
  );

end;
$$;


revoke all
on function public.get_package_extra_slots_public(
  uuid,
  uuid
)
from public;


grant execute
on function public.get_package_extra_slots_public(
  uuid,
  uuid
)
to anon, authenticated;


-- ---------------------------------------------------------
-- SELECT EXTRA SLOT
-- Atomic / capacity-safe
-- ---------------------------------------------------------

create or replace function
public.select_package_extra_slot_public(
  p_order_token uuid,
  p_extra_item_id uuid,
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order
    public.package_extra_orders%rowtype;

  v_item
    public.package_extra_order_items%rowtype;

  v_activity
    public.package_activities%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_new_slot
    public.package_activity_slots%rowtype;

  v_old_slot
    public.package_activity_slots%rowtype;

  v_required_units integer;

  v_new_reserved integer;
begin

  select *
  into v_order

  from public.package_extra_orders

  where public_token =
    p_order_token

  for update;


  if not found then
    raise exception
      'Ekstra sipariş bulunamadı.';
  end if;


  if v_order.status <>
    'paid'
  then
    raise exception
      'Ödenmemiş ekstra hizmet için saat seçilemez.';
  end if;


  if v_order.operation_status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'Bu ekstra hizmet artık değiştirilemez.';
  end if;


  select *
  into v_item

  from public.package_extra_order_items

  where id =
      p_extra_item_id

    and order_id =
      v_order.id

  for update;


  if not found then
    raise exception
      'Ekstra hizmet bulunamadı.';
  end if;


  if not v_item.requires_slot then
    raise exception
      'Bu hizmet saat seçimi gerektirmiyor.';
  end if;


  select *
  into v_activity

  from public.package_activities

  where id =
      v_item.activity_id

    and company_id =
      v_order.company_id

    and is_active =
      true;


  if not found then
    raise exception
      'Aktivite bulunamadı.';
  end if;


  select *
  into v_booking

  from public.package_bookings

  where id =
    v_order.booking_id;


  if not found then
    raise exception
      'Paket rezervasyonu bulunamadı.';
  end if;


  v_required_units :=
    greatest(
      ceil(
        coalesce(
          v_item.quantity,
          1
        )
      )::integer,
      1
    );


  perform id

  from public.package_activity_slots

  where id in (
    p_slot_id,
    v_item.activity_slot_id
  )

  order by id

  for update;


  select *
  into v_new_slot

  from public.package_activity_slots

  where id =
    p_slot_id;


  if not found then
    raise exception
      'Seçilen saat bulunamadı.';
  end if;


  if v_new_slot.company_id <>
    v_order.company_id
  then
    raise exception
      'Geçersiz aktivite saati.';
  end if;


  if v_new_slot.activity_id <>
    v_activity.id
  then
    raise exception
      'Bu saat başka aktiviteye ait.';
  end if;


  if
    v_new_slot.slot_date <
      v_booking.check_in

    or

    v_new_slot.slot_date >
      v_booking.check_out
  then
    raise exception
      'Seçilen tarih seyahat tarihleri dışında.';
  end if;


  if v_item.activity_slot_id =
    v_new_slot.id
  then

    return jsonb_build_object(
      'success',
        true,

      'already_selected',
        true,

      'extra_item_id',
        v_item.id,

      'slot_id',
        v_new_slot.id,

      'service_date',
        v_new_slot.slot_date,

      'service_time',
        v_new_slot.start_time
    );

  end if;


  if v_new_slot.status <>
    'open'
  then
    raise exception
      'Seçilen saat artık müsait değil.';
  end if;


  if (
    v_new_slot.capacity -
    v_new_slot.reserved_count
  ) < v_required_units
  then
    raise exception
      'Seçilen saatte yeterli kapasite kalmadı.';
  end if;


  if v_item.activity_slot_id
    is not null
  then

    select *
    into v_old_slot

    from public.package_activity_slots

    where id =
      v_item.activity_slot_id;


    if found then

      update public.package_activity_slots
      set
        reserved_count =
          greatest(
            reserved_count -
            v_required_units,
            0
          ),

        status =
          case
            when status =
              'full'
            then 'open'
            else status
          end,

        updated_at =
          now()

      where id =
        v_old_slot.id;

    end if;

  end if;


  v_new_reserved :=
    v_new_slot.reserved_count +
    v_required_units;


  update public.package_activity_slots
  set
    reserved_count =
      v_new_reserved,

    status =
      case
        when v_new_reserved >=
          capacity
        then 'full'
        else 'open'
      end,

    updated_at =
      now()

  where id =
    v_new_slot.id;


  update public.package_extra_order_items
  set
    activity_slot_id =
      v_new_slot.id,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'service_date',
          v_new_slot.slot_date,

        'service_time',
          v_new_slot.start_time,

        'slot_selected_at',
          now()
      )

  where id =
    v_item.id;


  update public.package_extra_orders
  set
    service_date =
      v_new_slot.slot_date,

    service_time =
      v_new_slot.start_time,

    operation_status =
      case
        when operation_status =
          'new'
        then 'confirmed'
        else operation_status
      end,

    updated_at =
      now()

  where id =
    v_order.id;


  return jsonb_build_object(
    'success',
      true,

    'already_selected',
      false,

    'extra_item_id',
      v_item.id,

    'activity_name',
      v_item.name,

    'slot_id',
      v_new_slot.id,

    'service_date',
      v_new_slot.slot_date,

    'service_time',
      v_new_slot.start_time,

    'reserved_units',
      v_required_units,

    'available_capacity',
      greatest(
        v_new_slot.capacity -
        v_new_reserved,
        0
      )
  );

end;
$$;


revoke all
on function public.select_package_extra_slot_public(
  uuid,
  uuid,
  uuid
)
from public;


grant execute
on function public.select_package_extra_slot_public(
  uuid,
  uuid,
  uuid
)
to anon, authenticated;


commit;
