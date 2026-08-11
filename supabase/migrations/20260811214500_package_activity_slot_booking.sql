begin;

-- =========================================================
-- PACKAGE OS
-- Customer activity slot scheduling
-- Atomic capacity reservation
-- =========================================================


alter table public.package_booking_items
  add column if not exists activity_slot_id uuid
  references public.package_activity_slots(id)
  on delete set null;


create index if not exists
  idx_package_booking_items_activity_slot
on public.package_booking_items(
  company_id,
  activity_slot_id
);


-- =========================================================
-- CUSTOMER WALLET
-- redefine trip payload with activity slot information
-- =========================================================

create or replace function public.get_package_trip_public(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_items jsonb;
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token = p_token
    and status <> 'cancelled'
  limit 1;

  if not found then
    raise exception 'Seyahat kaydı bulunamadı.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', bi.id,

        'item_type', bi.item_type,
        'name', bi.name,

        'reference_id', bi.reference_id,

        'service_date', bi.service_date,
        'service_time', bi.service_time,

        'quantity', bi.quantity,

        'supplier_status', bi.supplier_status,
        'customer_status', bi.customer_status,

        'activity_slot_id', bi.activity_slot_id,

        'activity_requires_slot',
          coalesce(pa.requires_slot, false),

        'voucher_code', pv.voucher_code,
        'voucher_token', pv.qr_token,
        'voucher_status', pv.status
      )
      order by
        bi.service_date nulls last,
        bi.service_time nulls last,
        bi.created_at
    ),
    '[]'::jsonb
  )
  into v_items
  from public.package_booking_items bi

  left join public.package_vouchers pv
    on pv.booking_item_id = bi.id

  left join public.package_activities pa
    on pa.id = bi.reference_id
    and bi.item_type = 'activity'

  where bi.booking_id = v_booking.id;

  return jsonb_build_object(
    'booking_code', v_booking.booking_code,

    'customer_name', v_booking.customer_name,

    'package_type', v_booking.package_type,

    'destination', v_booking.destination,

    'check_in', v_booking.check_in,
    'check_out', v_booking.check_out,

    'nights', v_booking.nights,

    'adults', v_booking.adults,
    'children', v_booking.children,

    'currency', v_booking.currency,

    'sale_price', v_booking.sale_price,
    'paid_amount', v_booking.paid_amount,
    'balance_amount', v_booking.balance_amount,

    'payment_status', v_booking.payment_status,
    'status', v_booking.status,

    'payment_token', v_booking.public_token,

    'items', v_items
  );
end;
$$;


revoke all
on function public.get_package_trip_public(uuid)
from public;


grant execute
on function public.get_package_trip_public(uuid)
to anon, authenticated;


-- =========================================================
-- PUBLIC AVAILABLE SLOTS
-- No supplier cost / internal data exposed
-- =========================================================

create or replace function public.get_package_activity_slots_public(
  p_booking_token uuid,
  p_booking_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_item public.package_booking_items%rowtype;
  v_activity public.package_activities%rowtype;

  v_slots jsonb;
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token = p_booking_token
    and status <> 'cancelled'
  limit 1;

  if not found then
    raise exception 'Seyahat bulunamadı.';
  end if;

  select *
  into v_item
  from public.package_booking_items
  where id = p_booking_item_id
    and booking_id = v_booking.id;

  if not found then
    raise exception 'Aktivite rezervasyonu bulunamadı.';
  end if;

  if v_item.item_type <> 'activity' then
    raise exception 'Bu hizmet aktivite değildir.';
  end if;

  if v_item.customer_status in (
    'used',
    'cancelled'
  ) then
    raise exception 'Bu aktivitenin zamanı değiştirilemez.';
  end if;

  if v_item.reference_id is null then
    raise exception 'Aktivite bağlantısı bulunamadı.';
  end if;

  select *
  into v_activity
  from public.package_activities
  where id = v_item.reference_id
    and company_id = v_booking.company_id
    and is_active = true;

  if not found then
    raise exception 'Aktivite bulunamadı.';
  end if;

  if not v_activity.requires_slot then
    raise exception 'Bu aktivite için saat seçimi gerekmiyor.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,

        'slot_date', s.slot_date,
        'start_time', s.start_time,

        'capacity', s.capacity,

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
      v_booking.company_id

    and s.activity_id =
      v_activity.id

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
        s.status = 'open'
        and
        s.reserved_count <
          s.capacity
      )
    );

  return jsonb_build_object(
    'booking_code',
      v_booking.booking_code,

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
on function public.get_package_activity_slots_public(
  uuid,
  uuid
)
from public;


grant execute
on function public.get_package_activity_slots_public(
  uuid,
  uuid
)
to anon, authenticated;


-- =========================================================
-- CUSTOMER SELECT SLOT
-- Atomic / concurrency safe / capacity protected
-- =========================================================

create or replace function public.select_package_activity_slot_public(
  p_booking_token uuid,
  p_booking_item_id uuid,
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_item public.package_booking_items%rowtype;
  v_activity public.package_activities%rowtype;

  v_new_slot public.package_activity_slots%rowtype;
  v_old_slot public.package_activity_slots%rowtype;

  v_required_units integer;

  v_new_reserved integer;
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token = p_booking_token
  for update;

  if not found then
    raise exception 'Seyahat bulunamadı.';
  end if;

  if v_booking.status not in (
    'pending',
    'confirmed',
    'in_service'
  ) then
    raise exception 'Bu rezervasyonda aktivite planlaması yapılamaz.';
  end if;

  select *
  into v_item
  from public.package_booking_items
  where id = p_booking_item_id
    and booking_id = v_booking.id
  for update;

  if not found then
    raise exception 'Aktivite rezervasyonu bulunamadı.';
  end if;

  if v_item.item_type <> 'activity' then
    raise exception 'Bu hizmet aktivite değildir.';
  end if;

  if v_item.customer_status in (
    'used',
    'cancelled'
  ) then
    raise exception 'Bu aktivite artık değiştirilemez.';
  end if;

  if v_item.reference_id is null then
    raise exception 'Aktivite bağlantısı bulunamadı.';
  end if;

  select *
  into v_activity
  from public.package_activities
  where id = v_item.reference_id
    and company_id = v_booking.company_id
    and is_active = true;

  if not found then
    raise exception 'Aktivite bulunamadı.';
  end if;

  if not v_activity.requires_slot then
    raise exception 'Bu aktivite saat seçimi gerektirmiyor.';
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


  -- Lock old and new slot rows
  -- deterministic order prevents re-selection deadlocks

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
  where id = p_slot_id;

  if not found then
    raise exception 'Seçilen aktivite saati bulunamadı.';
  end if;


  if v_new_slot.company_id <>
      v_booking.company_id then

    raise exception 'Geçersiz aktivite saati.';
  end if;


  if v_new_slot.activity_id <>
      v_activity.id then

    raise exception 'Bu saat başka bir aktiviteye ait.';
  end if;


  if v_new_slot.slot_date <
      v_booking.check_in

     or

     v_new_slot.slot_date >
      v_booking.check_out then

    raise exception 'Seçilen tarih seyahat tarihleri dışında.';
  end if;


  -- Same slot selection is idempotent

  if v_item.activity_slot_id =
      v_new_slot.id then

    return jsonb_build_object(
      'success', true,
      'already_selected', true,

      'booking_item_id',
        v_item.id,

      'slot_id',
        v_new_slot.id,

      'service_date',
        v_new_slot.slot_date,

      'service_time',
        v_new_slot.start_time
    );
  end if;


  if v_new_slot.status <> 'open' then
    raise exception 'Seçilen saat artık müsait değil.';
  end if;


  if (
    v_new_slot.capacity -
    v_new_slot.reserved_count
  ) < v_required_units then

    raise exception 'Seçilen saatte yeterli kapasite kalmadı.';
  end if;


  -- Release previous selected slot if customer changes time

  if v_item.activity_slot_id is not null then

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
            when status = 'full'
              then 'open'
            else status
          end,

        updated_at = now()

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

    updated_at = now()

  where id =
    v_new_slot.id;


  update public.package_booking_items
  set
    activity_slot_id =
      v_new_slot.id,

    service_date =
      v_new_slot.slot_date,

    service_time =
      v_new_slot.start_time,

    customer_status =
      'scheduled',

    updated_at =
      now()

  where id =
    v_item.id;


  return jsonb_build_object(
    'success', true,

    'already_selected', false,

    'booking_item_id',
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
on function public.select_package_activity_slot_public(
  uuid,
  uuid,
  uuid
)
from public;


grant execute
on function public.select_package_activity_slot_public(
  uuid,
  uuid,
  uuid
)
to anon, authenticated;


commit;
