begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-D
-- EXTRA IYZICO PAYMENT + VOUCHER
-- =========================================================


-- ---------------------------------------------------------
-- Voucher source extension
-- ---------------------------------------------------------

alter table public.package_vouchers
  add column if not exists extra_order_id uuid
  references public.package_extra_orders(id)
  on delete cascade;


alter table public.package_vouchers
  add column if not exists extra_order_item_id uuid
  references public.package_extra_order_items(id)
  on delete cascade;


create unique index if not exists
  uq_package_voucher_extra_order_item
on public.package_vouchers(
  extra_order_item_id
)
where extra_order_item_id is not null;


create index if not exists
  idx_package_vouchers_extra_order
on public.package_vouchers(
  company_id,
  extra_order_id
);


-- ---------------------------------------------------------
-- Safe public extra-order payment data
-- ---------------------------------------------------------

create or replace function
public.get_package_extra_order_public(
  p_order_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.package_extra_orders%rowtype;
  v_booking public.package_bookings%rowtype;

  v_items jsonb;
begin

  select *
  into v_order
  from public.package_extra_orders
  where public_token = p_order_token
  limit 1;


  if not found then
    raise exception
      'Ekstra sipariş bulunamadı.';
  end if;


  select *
  into v_booking
  from public.package_bookings
  where id = v_order.booking_id
  limit 1;


  if not found then
    raise exception
      'Paket rezervasyonu bulunamadı.';
  end if;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          i.id,

        'name',
          i.name,

        'quantity',
          i.quantity,

        'unit_sale_price',
          i.unit_sale_price,

        'total_sale_price',
          i.total_sale_price,

        'currency',
          i.currency,

        'requires_slot',
          i.requires_slot,

        'voucher_code',
          v.voucher_code,

        'voucher_token',
          v.qr_token,

        'voucher_status',
          v.status
      )
      order by i.created_at
    ),
    '[]'::jsonb
  )
  into v_items
  from public.package_extra_order_items i

  left join public.package_vouchers v
    on v.extra_order_item_id = i.id

  where i.order_id =
    v_order.id;


  return jsonb_build_object(
    'order_token',
      v_order.public_token,

    'booking_token',
      v_booking.public_token,

    'booking_code',
      v_booking.booking_code,

    'customer_name',
      v_booking.customer_name,

    'customer_phone',
      v_booking.customer_phone,

    'customer_email',
      v_booking.customer_email,

    'destination',
      v_booking.destination,

    'currency',
      v_order.currency,

    'sale_price',
      v_order.sale_price,

    'status',
      v_order.status,

    'operation_status',
      v_order.operation_status,

    'service_date',
      v_order.service_date,

    'service_time',
      v_order.service_time,

    'payment_provider',
      v_order.payment_provider,

    'items',
      v_items
  );

end;
$$;


revoke all
on function public.get_package_extra_order_public(uuid)
from public;


grant execute
on function public.get_package_extra_order_public(uuid)
to anon, authenticated;


-- ---------------------------------------------------------
-- Finalize verified Iyzico extra payment
-- Service-role only
-- ---------------------------------------------------------

create or replace function
public.finalize_package_extra_iyzico_payment(
  p_order_id uuid,
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
  v_order public.package_extra_orders%rowtype;
  v_item public.package_extra_order_items%rowtype;

  v_booking public.package_bookings%rowtype;

  v_voucher_code text;
  v_voucher_token uuid;

  v_vouchers jsonb :=
    '[]'::jsonb;
begin

  select *
  into v_order
  from public.package_extra_orders
  where id = p_order_id
  for update;


  if not found then
    raise exception
      'Ekstra sipariş bulunamadı.';
  end if;


  if v_order.status = 'cancelled' then
    raise exception
      'İptal edilmiş ekstra sipariş ödenemez.';
  end if;


  if v_order.status = 'expired' then
    raise exception
      'Süresi dolmuş ekstra sipariş ödenemez.';
  end if;


  if
    p_paid_amount is null
    or abs(
      p_paid_amount -
      v_order.sale_price
    ) >= 0.01
  then
    raise exception
      'Ödeme tutarı ekstra sipariş tutarıyla uyuşmuyor.';
  end if;


  select *
  into v_booking
  from public.package_bookings
  where id = v_order.booking_id
  limit 1;


  if not found then
    raise exception
      'Paket rezervasyonu bulunamadı.';
  end if;


  -- Idempotent callback
  if v_order.status = 'paid' then

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'voucher_code',
            pv.voucher_code,

          'voucher_token',
            pv.qr_token,

          'status',
            pv.status
        )
      ),
      '[]'::jsonb
    )
    into v_vouchers
    from public.package_vouchers pv
    where pv.extra_order_id =
      v_order.id;


    return jsonb_build_object(
      'success',
        true,

      'already_paid',
        true,

      'order_id',
        v_order.id,

      'status',
        v_order.status,

      'operation_status',
        v_order.operation_status,

      'vouchers',
        v_vouchers
    );

  end if;


  update public.package_extra_orders
  set
    status =
      'paid',

    operation_status =
      case
        when operation_status =
          'new'
        then 'confirmed'
        else operation_status
      end,

    confirmed_at =
      coalesce(
        confirmed_at,
        now()
      ),

    payment_provider =
      'iyzico',

    payment_reference =
      nullif(
        trim(
          coalesce(
            p_provider_reference,
            ''
          )
        ),
        ''
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'paid_at',
          now(),

        'paid_amount',
          p_paid_amount,

        'payment_source',
          'package_extra_iyzico'
      ),

    updated_at =
      now()

  where id =
    v_order.id;


  for v_item in

    select *
    from public.package_extra_order_items
    where order_id =
      v_order.id
    order by created_at

  loop

    select
      pv.voucher_code,
      pv.qr_token
    into
      v_voucher_code,
      v_voucher_token

    from public.package_vouchers pv
    where pv.extra_order_item_id =
      v_item.id
    limit 1;


    if not found then

      v_voucher_code :=
        'EX-' ||
        upper(
          substr(
            replace(
              gen_random_uuid()::text,
              '-',
              ''
            ),
            1,
            10
          )
        );


      insert into public.package_vouchers (
        company_id,
        booking_id,

        booking_item_id,

        extra_order_id,
        extra_order_item_id,

        voucher_code,

        status,

        metadata
      )
      values (
        v_order.company_id,
        v_order.booking_id,

        null,

        v_order.id,
        v_item.id,

        v_voucher_code,

        'active',

        jsonb_build_object(
          'source',
            'package_extra_order',

          'extra_order_id',
            v_order.id,

          'extra_order_item_id',
            v_item.id,

          'activity_id',
            v_item.activity_id,

          'service_name',
            v_item.name
        )
      )
      returning qr_token
      into v_voucher_token;

    end if;


    v_vouchers :=
      v_vouchers ||
      jsonb_build_array(
        jsonb_build_object(
          'voucher_code',
            v_voucher_code,

          'voucher_token',
            v_voucher_token,

          'service_name',
            v_item.name,

          'status',
            'active'
        )
      );

  end loop;


  return jsonb_build_object(
    'success',
      true,

    'already_paid',
      false,

    'order_id',
      v_order.id,

    'booking_id',
      v_order.booking_id,

    'booking_code',
      v_booking.booking_code,

    'status',
      'paid',

    'operation_status',
      'confirmed',

    'paid_amount',
      p_paid_amount,

    'vouchers',
      v_vouchers
  );

end;
$$;


revoke all
on function public.finalize_package_extra_iyzico_payment(
  uuid,
  text,
  numeric,
  jsonb
)
from public;


grant execute
on function public.finalize_package_extra_iyzico_payment(
  uuid,
  text,
  numeric,
  jsonb
)
to service_role;


-- ---------------------------------------------------------
-- Extend public voucher reader for extra-order vouchers
-- ---------------------------------------------------------

create or replace function
public.get_package_voucher_public(
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

    'voucher_code',
      v.voucher_code,

    'voucher_token',
      v.qr_token,

    'voucher_status',
      v.status,

    'used_at',
      v.used_at,


    'booking_code',
      b.booking_code,

    'customer_name',
      b.customer_name,

    'destination',
      b.destination,


    'check_in',
      b.check_in,

    'check_out',
      b.check_out,


    'service_name',
      coalesce(
        bi.name,
        ei.name,
        v.metadata->>'service_name'
      ),


    'item_type',
      case
        when
          v.extra_order_item_id is not null
        then 'extra_activity'
        else bi.item_type
      end,


    'service_date',
      coalesce(
        bi.service_date,
        eo.service_date
      ),


    'service_time',
      coalesce(
        bi.service_time,
        eo.service_time
      ),


    'quantity',
      coalesce(
        bi.quantity,
        ei.quantity
      ),


    'customer_status',
      case
        when
          v.extra_order_item_id is not null
        then
          case
            when v.status =
              'used'
            then 'used'
            else 'scheduled'
          end

        else
          bi.customer_status
      end,


    'supplier_status',
      case
        when
          v.extra_order_item_id is not null
        then
          eo.operation_status
        else
          bi.supplier_status
      end


  )
  into v_result

  from public.package_vouchers v

  join public.package_bookings b
    on b.id =
      v.booking_id


  left join public.package_booking_items bi
    on bi.id =
      v.booking_item_id


  left join public.package_extra_order_items ei
    on ei.id =
      v.extra_order_item_id


  left join public.package_extra_orders eo
    on eo.id =
      v.extra_order_id


  where v.qr_token =
    p_token

    and b.status <>
      'cancelled'

    and (
      eo.id is null
      or eo.status =
        'paid'
    )

  limit 1;


  if v_result is null then
    raise exception
      'Voucher bulunamadı.';
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


-- ---------------------------------------------------------
-- Extend voucher redeem for extra services
-- ---------------------------------------------------------

create or replace function
public.redeem_package_voucher(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_voucher public.package_vouchers%rowtype;

  v_booking public.package_bookings%rowtype;

  v_item public.package_booking_items%rowtype;

  v_extra_item public.package_extra_order_items%rowtype;

  v_extra_order public.package_extra_orders%rowtype;

  v_service_name text;
begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  select *
  into v_voucher
  from public.package_vouchers
  where qr_token =
    p_token
  for update;


  if not found then
    raise exception
      'Voucher bulunamadı.';
  end if;


  select *
  into v_booking
  from public.package_bookings
  where id =
    v_voucher.booking_id;


  if not found then
    raise exception
      'Rezervasyon bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm

    where cm.company_id =
      v_voucher.company_id

      and cm.user_id =
        v_uid

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu voucher için yetkiniz yok.';
  end if;


  if v_booking.status =
    'cancelled'
  then
    raise exception
      'İptal edilmiş rezervasyon voucherı kullanılamaz.';
  end if;


  if v_voucher.status =
    'used'
  then

    return jsonb_build_object(
      'success',
        true,

      'already_used',
        true,

      'voucher_code',
        v_voucher.voucher_code,

      'used_at',
        v_voucher.used_at
    );

  end if;


  if v_voucher.status <>
    'active'
  then
    raise exception
      'Voucher aktif değil.';
  end if;


  if
    v_voucher.booking_item_id
      is not null
  then

    select *
    into v_item
    from public.package_booking_items

    where id =
      v_voucher.booking_item_id

    for update;


    if found then
      v_service_name :=
        v_item.name;
    end if;

  end if;


  if
    v_voucher.extra_order_item_id
      is not null
  then

    select *
    into v_extra_item
    from public.package_extra_order_items

    where id =
      v_voucher.extra_order_item_id

    for update;


    if not found then
      raise exception
        'Ekstra hizmet bulunamadı.';
    end if;


    select *
    into v_extra_order
    from public.package_extra_orders

    where id =
      v_extra_item.order_id

    for update;


    if not found then
      raise exception
        'Ekstra sipariş bulunamadı.';
    end if;


    if v_extra_order.status <>
      'paid'
    then
      raise exception
        'Ödenmemiş ekstra hizmet kullanılamaz.';
    end if;


    if v_extra_order.operation_status =
      'cancelled'
    then
      raise exception
        'İptal edilmiş ekstra hizmet kullanılamaz.';
    end if;


    v_service_name :=
      v_extra_item.name;

  end if;


  update public.package_vouchers
  set
    status =
      'used',

    used_at =
      now(),

    used_by =
      v_uid

  where id =
    v_voucher.id;


  if
    v_voucher.booking_item_id
      is not null
  then

    update public.package_booking_items
    set
      customer_status =
        'used',

      updated_at =
        now()

    where id =
      v_voucher.booking_item_id;

  end if;


  if
    v_voucher.extra_order_id
      is not null
  then

    if not exists (
      select 1

      from public.package_vouchers pv

      where pv.extra_order_id =
        v_voucher.extra_order_id

        and pv.id <>
          v_voucher.id

        and pv.status <>
          'used'
    ) then

      update public.package_extra_orders
      set
        operation_status =
          'completed',

        completed_at =
          coalesce(
            completed_at,
            now()
          ),

        updated_at =
          now()

      where id =
        v_voucher.extra_order_id;

    end if;

  end if;


  return jsonb_build_object(
    'success',
      true,

    'already_used',
      false,

    'voucher_code',
      v_voucher.voucher_code,

    'booking_code',
      v_booking.booking_code,

    'customer_name',
      v_booking.customer_name,

    'service_name',
      v_service_name,

    'used_at',
      now()
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
