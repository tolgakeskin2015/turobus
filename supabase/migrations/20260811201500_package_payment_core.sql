begin;

-- =========================================================
-- PACKAGE OS PAYMENT CORE
-- completed payment -> booking totals/status
-- =========================================================

create unique index if not exists
  uq_package_customer_payments_provider_reference
on public.package_customer_payments(
  company_id,
  provider,
  provider_reference
)
where
  provider is not null
  and provider_reference is not null;


create or replace function public.add_package_customer_payment(
  p_booking_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_provider text default null,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_booking public.package_bookings%rowtype;

  v_payment_id uuid;

  v_paid numeric(14,2);
  v_balance numeric(14,2);

  v_payment_status text;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Tahsilat tutarı sıfırdan büyük olmalıdır.';
  end if;

  select *
  into v_booking
  from public.package_bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'Paket rezervasyonu bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = v_booking.company_id
      and cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  ) then
    raise exception 'Bu şirket için yetkiniz yok.';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'İptal edilmiş rezervasyona tahsilat girilemez.';
  end if;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.package_customer_payments p
  where p.booking_id = v_booking.id
    and p.status = 'completed';

  v_balance :=
    greatest(
      v_booking.sale_price - v_paid,
      0
    );

  if p_amount > v_balance then
    raise exception
      'Tahsilat kalan bakiyeden yüksek olamaz. Kalan: %',
      v_balance;
  end if;

  insert into public.package_customer_payments (
    company_id,
    booking_id,
    amount,
    currency,
    payment_method,
    provider,
    provider_reference,
    status,
    received_by,
    paid_at,
    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,
    p_amount,
    v_booking.currency,
    nullif(trim(p_payment_method), ''),
    nullif(trim(coalesce(p_provider, '')), ''),
    nullif(trim(coalesce(p_provider_reference, '')), ''),
    'completed',
    v_uid,
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id
  into v_payment_id;

  select coalesce(sum(p.amount), 0)
  into v_paid
  from public.package_customer_payments p
  where p.booking_id = v_booking.id
    and p.status = 'completed';

  v_balance :=
    greatest(
      v_booking.sale_price - v_paid,
      0
    );

  if v_paid <= 0 then
    v_payment_status := 'unpaid';
  elsif v_balance <= 0 then
    v_payment_status := 'paid';
  else
    v_payment_status := 'partial';
  end if;

  update public.package_bookings
  set
    paid_amount = v_paid,
    balance_amount = v_balance,
    payment_status = v_payment_status,

    status = case
      when status = 'pending'
        and v_paid > 0
        then 'confirmed'
      else status
    end,

    updated_at = now()
  where id = v_booking.id;

  return jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'paid_amount', v_paid,
    'balance_amount', v_balance,
    'payment_status', v_payment_status,
    'booking_status',
      case
        when v_booking.status = 'pending'
          and v_paid > 0
          then 'confirmed'
        else v_booking.status
      end
  );
end;
$$;


revoke all
on function public.add_package_customer_payment(
  uuid,
  numeric,
  text,
  text,
  text,
  jsonb
)
from public;


grant execute
on function public.add_package_customer_payment(
  uuid,
  numeric,
  text,
  text,
  text,
  jsonb
)
to authenticated;

commit;
