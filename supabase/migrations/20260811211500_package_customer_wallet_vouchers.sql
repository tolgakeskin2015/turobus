begin;

-- =========================================================
-- PACKAGE OS
-- Customer wallet + secure voucher QR
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
        'service_date', bi.service_date,
        'service_time', bi.service_time,
        'quantity', bi.quantity,
        'supplier_status', bi.supplier_status,
        'customer_status', bi.customer_status,
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


create or replace function public.get_package_voucher_public(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'voucher_code', v.voucher_code,
    'voucher_token', v.qr_token,
    'voucher_status', v.status,
    'used_at', v.used_at,

    'booking_code', b.booking_code,
    'customer_name', b.customer_name,
    'destination', b.destination,

    'check_in', b.check_in,
    'check_out', b.check_out,

    'service_name', bi.name,
    'item_type', bi.item_type,
    'service_date', bi.service_date,
    'service_time', bi.service_time,
    'quantity', bi.quantity,

    'customer_status', bi.customer_status,
    'supplier_status', bi.supplier_status
  )
  into v_result
  from public.package_vouchers v
  join public.package_bookings b
    on b.id = v.booking_id
  left join public.package_booking_items bi
    on bi.id = v.booking_item_id
  where v.qr_token = p_token
    and b.status <> 'cancelled'
  limit 1;

  if v_result is null then
    raise exception 'Voucher bulunamadı.';
  end if;

  return v_result;
end;
$$;


revoke all
on function public.get_package_voucher_public(uuid)
from public;

grant execute
on function public.get_package_voucher_public(uuid)
to anon, authenticated;


create or replace function public.redeem_package_voucher(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_voucher public.package_vouchers%rowtype;
  v_booking public.package_bookings%rowtype;
  v_item public.package_booking_items%rowtype;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select *
  into v_voucher
  from public.package_vouchers
  where qr_token = p_token
  for update;

  if not found then
    raise exception 'Voucher bulunamadı.';
  end if;

  select *
  into v_booking
  from public.package_bookings
  where id = v_voucher.booking_id;

  if not found then
    raise exception 'Rezervasyon bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = v_voucher.company_id
      and cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  ) then
    raise exception 'Bu voucher için yetkiniz yok.';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'İptal edilmiş rezervasyon voucherı kullanılamaz.';
  end if;

  if v_voucher.status = 'used' then
    return jsonb_build_object(
      'success', true,
      'already_used', true,
      'voucher_code', v_voucher.voucher_code,
      'used_at', v_voucher.used_at
    );
  end if;

  if v_voucher.status <> 'active' then
    raise exception 'Voucher aktif değil.';
  end if;

  if v_voucher.booking_item_id is not null then
    select *
    into v_item
    from public.package_booking_items
    where id = v_voucher.booking_item_id
    for update;
  end if;

  update public.package_vouchers
  set
    status = 'used',
    used_at = now(),
    used_by = v_uid
  where id = v_voucher.id;

  if v_voucher.booking_item_id is not null then
    update public.package_booking_items
    set
      customer_status = 'used',
      updated_at = now()
    where id = v_voucher.booking_item_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'already_used', false,
    'voucher_code', v_voucher.voucher_code,
    'booking_code', v_booking.booking_code,
    'customer_name', v_booking.customer_name,
    'service_name', v_item.name,
    'used_at', now()
  );
end;
$$;


revoke all
on function public.redeem_package_voucher(uuid)
from public;

grant execute
on function public.redeem_package_voucher(uuid)
to authenticated;

commit;
