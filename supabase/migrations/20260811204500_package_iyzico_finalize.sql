begin;

-- =========================================================
-- PACKAGE OS / IYZICO FINALIZE
-- service_role only
-- atomic + idempotent
-- =========================================================

create or replace function public.finalize_package_iyzico_payment(
  p_payment_id uuid,
  p_provider_reference text,
  p_paid_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.package_customer_payments%rowtype;
  v_booking public.package_bookings%rowtype;

  v_total_paid numeric(14,2);
  v_balance numeric(14,2);
  v_payment_status text;
begin
  select *
  into v_payment
  from public.package_customer_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Ödeme kaydı bulunamadı.';
  end if;

  select *
  into v_booking
  from public.package_bookings
  where id = v_payment.booking_id
  for update;

  if not found then
    raise exception 'Paket rezervasyonu bulunamadı.';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'İptal edilmiş rezervasyona ödeme işlenemez.';
  end if;

  if v_payment.status = 'completed' then
    return jsonb_build_object(
      'success', true,
      'already_completed', true,
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code,
      'payment_id', v_payment.id,
      'paid_amount', v_booking.paid_amount,
      'balance_amount', v_booking.balance_amount,
      'payment_status', v_booking.payment_status
    );
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Bu ödeme artık tamamlanabilir durumda değil.';
  end if;

  if p_paid_amount is null or p_paid_amount <= 0 then
    raise exception 'Ödenen tutar geçersiz.';
  end if;

  if abs(p_paid_amount - v_payment.amount) >= 0.01 then
    raise exception 'Iyzico ödeme tutarı beklenen tutarla uyuşmuyor.';
  end if;

  select coalesce(sum(p.amount), 0)
  into v_total_paid
  from public.package_customer_payments p
  where p.booking_id = v_booking.id
    and p.status = 'completed';

  v_balance :=
    greatest(
      v_booking.sale_price - v_total_paid,
      0
    );

  if v_payment.amount > v_balance then
    raise exception 'Ödeme mevcut kalan bakiyeden yüksek.';
  end if;

  update public.package_customer_payments
  set
    status = 'completed',
    provider_reference =
      nullif(trim(p_provider_reference), ''),
    paid_at = now(),
    metadata =
      coalesce(v_payment.metadata, '{}'::jsonb)
      ||
      coalesce(p_metadata, '{}'::jsonb)
  where id = v_payment.id;

  select coalesce(sum(p.amount), 0)
  into v_total_paid
  from public.package_customer_payments p
  where p.booking_id = v_booking.id
    and p.status = 'completed';

  v_balance :=
    greatest(
      v_booking.sale_price - v_total_paid,
      0
    );

  if v_total_paid <= 0 then
    v_payment_status := 'unpaid';
  elsif v_balance <= 0 then
    v_payment_status := 'paid';
  else
    v_payment_status := 'partial';
  end if;

  update public.package_bookings
  set
    paid_amount = v_total_paid,
    balance_amount = v_balance,
    payment_status = v_payment_status,

    status = case
      when status = 'pending'
        and v_total_paid > 0
        then 'confirmed'
      else status
    end,

    updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'success', true,
    'already_completed', false,
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'payment_id', v_payment.id,
    'paid_amount', v_total_paid,
    'balance_amount', v_balance,
    'payment_status', v_payment_status
  );
end;
$$;


revoke all
on function public.finalize_package_iyzico_payment(
  uuid,
  text,
  numeric,
  jsonb
)
from public;


grant execute
on function public.finalize_package_iyzico_payment(
  uuid,
  text,
  numeric,
  jsonb
)
to service_role;


create or replace function public.get_package_booking_payment_public(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token = p_token
    and status <> 'cancelled'
  limit 1;

  if not found then
    raise exception 'Ödeme bağlantısı bulunamadı.';
  end if;

  return jsonb_build_object(
    'id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'customer_name', v_booking.customer_name,
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
    'status', v_booking.status
  );
end;
$$;


revoke all
on function public.get_package_booking_payment_public(uuid)
from public;


grant execute
on function public.get_package_booking_payment_public(uuid)
to anon, authenticated;

commit;
