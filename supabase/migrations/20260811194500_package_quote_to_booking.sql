begin;

-- =========================================================
-- PACKAGE OS
-- Accepted quote -> booking
-- Atomic conversion
-- =========================================================

create or replace function public.convert_package_quote_to_booking(
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_quote public.package_quotes%rowtype;

  v_booking public.package_bookings%rowtype;

  v_booking_code text;

  v_item record;

  v_booking_item_id uuid;

  v_voucher_code text;

  v_existing_booking_id uuid;

  v_member_exists boolean;
begin
  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select *
  into v_quote
  from public.package_quotes
  where id = p_quote_id
  for update;

  if not found then
    raise exception 'Teklif bulunamadı.';
  end if;

  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = v_quote.company_id
      and cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  )
  into v_member_exists;

  if not v_member_exists then
    raise exception 'Bu şirket için yetkiniz yok.';
  end if;

  select pb.id
  into v_existing_booking_id
  from public.package_bookings pb
  where pb.quote_id = v_quote.id
  limit 1;

  if v_existing_booking_id is not null then
    select *
    into v_booking
    from public.package_bookings
    where id = v_existing_booking_id;

    return jsonb_build_object(
      'success', true,
      'already_converted', true,
      'booking_id', v_booking.id,
      'booking_code', v_booking.booking_code
    );
  end if;

  if v_quote.status <> 'accepted' then
    raise exception 'Yalnızca kabul edilmiş teklifler rezervasyona çevrilebilir.';
  end if;

  if (
    v_quote.valid_until is not null
    and v_quote.valid_until < now()
  ) then
    raise exception 'Teklifin geçerlilik süresi dolmuş.';
  end if;

  v_booking_code :=
    'PKR-' ||
    to_char(now(), 'YYYYMMDD') ||
    '-' ||
    upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.package_bookings (
    company_id,

    booking_code,
    quote_id,

    customer_id,

    customer_name,
    customer_phone,
    customer_email,

    sales_user_id,

    package_type,
    destination,

    check_in,
    check_out,

    adults,
    children,
    nights,

    currency,

    total_cost,
    sale_price,

    gross_profit,

    payment_fee,
    salesperson_commission,
    other_expenses,

    net_profit,
    margin_percent,

    paid_amount,
    balance_amount,

    payment_status,
    status,

    notes,

    metadata
  )
  values (
    v_quote.company_id,

    v_booking_code,
    v_quote.id,

    v_quote.customer_id,

    v_quote.customer_name,
    v_quote.customer_phone,
    v_quote.customer_email,

    v_quote.sales_user_id,

    v_quote.package_type,
    v_quote.destination,

    v_quote.check_in,
    v_quote.check_out,

    v_quote.adults,
    v_quote.children,
    v_quote.nights,

    v_quote.currency,

    v_quote.total_cost,
    v_quote.sale_price,

    v_quote.gross_profit,

    0,
    0,
    0,

    v_quote.gross_profit,
    v_quote.margin_percent,

    0,
    v_quote.sale_price,

    'unpaid',
    'pending',

    v_quote.notes,

    jsonb_build_object(
      'source', 'package_quote',
      'quote_code', v_quote.quote_code,
      'converted_by', v_uid,
      'converted_at', now()
    )
  )
  returning *
  into v_booking;


  for v_item in
    select *
    from public.package_quote_items
    where quote_id = v_quote.id
    order by sort_order, created_at
  loop
    insert into public.package_booking_items (
      company_id,

      booking_id,

      source_quote_item_id,

      item_type,

      reference_id,
      supplier_id,

      name,

      service_date,

      quantity,

      unit_cost,
      total_cost,

      unit_sale_price,
      total_sale_price,

      currency,

      supplier_status,
      customer_status,

      cost_snapshot,

      metadata
    )
    values (
      v_quote.company_id,

      v_booking.id,

      v_item.id,

      v_item.item_type,

      v_item.reference_id,
      v_item.supplier_id,

      v_item.name,

      v_item.service_date,

      v_item.quantity,

      v_item.unit_cost,
      v_item.total_cost,

      v_item.unit_sale_price,
      v_item.total_sale_price,

      v_item.currency,

      case
        when v_item.supplier_id is null
          then 'confirmed'
        else 'pending'
      end,

      'pending',

      v_item.cost_snapshot,

      jsonb_build_object(
        'quote_item_id', v_item.id,
        'copied_at', now()
      )
    )
    returning id
    into v_booking_item_id;


    if (
      v_item.supplier_id is not null
      and coalesce(v_item.total_cost, 0) > 0
    ) then
      insert into public.package_supplier_payables (
        company_id,

        booking_id,
        booking_item_id,

        supplier_id,

        amount,
        currency,

        status,

        metadata
      )
      values (
        v_quote.company_id,

        v_booking.id,
        v_booking_item_id,

        v_item.supplier_id,

        v_item.total_cost,
        v_item.currency,

        'open',

        jsonb_build_object(
          'source', 'booking_conversion',
          'quote_item_id', v_item.id
        )
      );
    end if;


    v_voucher_code :=
      'VCH-' ||
      upper(substr(md5(gen_random_uuid()::text), 1, 10));

    insert into public.package_vouchers (
      company_id,

      booking_id,
      booking_item_id,

      voucher_code,

      status,

      metadata
    )
    values (
      v_quote.company_id,

      v_booking.id,
      v_booking_item_id,

      v_voucher_code,

      'active',

      jsonb_build_object(
        'service_name', v_item.name,
        'service_date', v_item.service_date,
        'item_type', v_item.item_type
      )
    );
  end loop;


  update public.package_quotes
  set
    status = 'converted',
    updated_at = now()
  where id = v_quote.id;


  return jsonb_build_object(
    'success', true,
    'already_converted', false,
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'payment_status', v_booking.payment_status,
    'status', v_booking.status
  );
end;
$$;


revoke all
on function public.convert_package_quote_to_booking(uuid)
from public;


grant execute
on function public.convert_package_quote_to_booking(uuid)
to authenticated;

commit;
