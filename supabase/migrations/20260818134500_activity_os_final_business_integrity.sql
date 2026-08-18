begin;

-- =========================================================
-- TUROBUS ACTIVITY OS
-- FINAL BUSINESS / FINANCE INTEGRITY
-- =========================================================


-- =========================================================
-- 1. BOOKING FINANCE RECALCULATION
-- Rezervasyon satış, kişi, kanal, satıcı veya slot değişirse
-- finans eski kalmasın.
-- =========================================================

create or replace function public.activity_os_recalculate_booking_finance(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
  v_activity record;
  v_slot record;
  v_seller record;
  v_settings record;

  v_internal_cost numeric(14,2) := 0;
  v_seller_commission numeric(14,2) := 0;
  v_turobus_commission numeric(14,2) := 0;
begin

  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id;

  if not found then
    raise exception 'Rezervasyon bulunamadı';
  end if;


  select *
  into v_activity
  from public.package_activities
  where id = v_booking.activity_id
    and company_id = v_booking.company_id;

  if not found then
    raise exception 'Aktivite bulunamadı';
  end if;


  if v_booking.slot_id is not null then
    select *
    into v_slot
    from public.package_activity_slots
    where id = v_booking.slot_id;
  end if;


  insert into public.activity_os_settings(
    company_id
  )
  values (
    v_booking.company_id
  )
  on conflict(company_id)
  do nothing;


  select *
  into v_settings
  from public.activity_os_settings
  where company_id = v_booking.company_id;


  v_internal_cost :=
    coalesce(
      v_slot.cost,
      v_activity.default_cost,
      0
    )
    *
    greatest(
      v_booking.quantity,
      1
    );


  if v_booking.seller_id is not null then

    select *
    into v_seller
    from public.activity_os_sellers
    where id = v_booking.seller_id
      and company_id = v_booking.company_id;


    if found then

      if v_seller.commission_type = 'percent' then

        v_seller_commission :=
          greatest(
            v_booking.sale_total,
            0
          )
          *
          coalesce(
            v_seller.commission_value,
            0
          )
          /
          100;

      elsif v_seller.commission_type = 'fixed' then

        v_seller_commission :=
          coalesce(
            v_seller.commission_value,
            0
          )
          *
          greatest(
            v_booking.quantity,
            1
          );

      end if;

    end if;

  end if;


  -- =======================================================
  -- TUROBUS KOMİSYON KURALI
  -- SADECE TUROBUS MARKETPLACE
  -- =======================================================

  if v_booking.source_channel = 'turobus_marketplace' then

    v_turobus_commission :=
      greatest(
        v_booking.sale_total,
        0
      )
      *
      coalesce(
        v_settings.marketplace_commission_percent,
        10
      )
      /
      100;

  else

    v_turobus_commission := 0;

  end if;


  insert into public.activity_os_booking_finance(
    booking_id,
    company_id,
    gross_sale,
    internal_cost,
    seller_commission,
    turobus_commission
  )
  values (
    v_booking.id,
    v_booking.company_id,
    greatest(
      v_booking.sale_total,
      0
    ),
    greatest(
      v_internal_cost,
      0
    ),
    greatest(
      v_seller_commission,
      0
    ),
    greatest(
      v_turobus_commission,
      0
    )
  )
  on conflict(booking_id)
  do update
  set
    gross_sale =
      excluded.gross_sale,

    internal_cost =
      excluded.internal_cost,

    seller_commission =
      excluded.seller_commission,

    turobus_commission =
      excluded.turobus_commission,

    updated_at =
      now();


  return jsonb_build_object(
    'ok',true,

    'gross_sale',
      v_booking.sale_total,

    'internal_cost',
      v_internal_cost,

    'seller_commission',
      v_seller_commission,

    'turobus_commission',
      v_turobus_commission,

    'net_profit',
      greatest(
        v_booking.sale_total,
        0
      )
      -
      greatest(
        v_internal_cost,
        0
      )
      -
      greatest(
        v_seller_commission,
        0
      )
      -
      greatest(
        v_turobus_commission,
        0
      )
  );

end;
$$;


-- =========================================================
-- 2. PROFESSIONAL BOOKING UPDATE
-- ÖDENEN TUTAR REZERVASYON FORMUNDAN DEĞİŞTİRİLEMEZ.
-- SADECE ÖDEME / İADE MOTORU DEĞİŞTİRİR.
-- =========================================================

create or replace function public.activity_os_update_booking(
  p_company_id uuid,
  p_booking_id uuid,
  p_slot_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_quantity integer,
  p_sale_total numeric,
  p_paid_total numeric,
  p_hotel_name text,
  p_pickup_location text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin

  if not public.activity_os_can_sell(
    p_company_id
  ) then
    raise exception
      'Satış yetkisi gerekli';
  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  if greatest(
    coalesce(
      p_quantity,
      0
    ),
    0
  ) <= 0 then

    raise exception
      'Kişi sayısı en az 1 olmalıdır';

  end if;


  if coalesce(
    p_sale_total,
    0
  ) <
  coalesce(
    v_booking.paid_total,
    0
  ) then

    raise exception
      'Satış tutarı tahsil edilmiş tutardan düşük olamaz';

  end if;


  if abs(
    coalesce(
      p_paid_total,
      0
    )
    -
    coalesce(
      v_booking.paid_total,
      0
    )
  ) > 0.01 then

    raise exception
      'Tahsilat rezervasyon düzenleme ekranından değiştirilemez. Ödeme Merkezi kullanılmalıdır.';

  end if;


  update public.activity_os_bookings
  set
    slot_id =
      p_slot_id,

    customer_name =
      trim(
        p_customer_name
      ),

    customer_phone =
      nullif(
        trim(
          coalesce(
            p_customer_phone,
            ''
          )
        ),
        ''
      ),

    customer_email =
      nullif(
        trim(
          coalesce(
            p_customer_email,
            ''
          )
        ),
        ''
      ),

    quantity =
      greatest(
        p_quantity,
        1
      ),

    sale_total =
      greatest(
        coalesce(
          p_sale_total,
          0
        ),
        0
      ),

    hotel_name =
      nullif(
        trim(
          coalesce(
            p_hotel_name,
            ''
          )
        ),
        ''
      ),

    pickup_required =
      nullif(
        trim(
          coalesce(
            p_pickup_location,
            ''
          )
        ),
        ''
      ) is not null,

    pickup_location =
      nullif(
        trim(
          coalesce(
            p_pickup_location,
            ''
          )
        ),
        ''
      ),

    status =
      p_status,

    updated_at =
      now()

  where id = p_booking_id
    and company_id = p_company_id;


  perform public.activity_os_recalculate_booking_finance(
    p_booking_id
  );


  return jsonb_build_object(
    'ok',true
  );

end;
$$;


grant execute
on function public.activity_os_update_booking(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  numeric,
  numeric,
  text,
  text,
  text
)
to authenticated;


-- =========================================================
-- 3. MANUAL COLLECTION HARDENING
-- Nakit / POS / Havale
-- Kalan bakiyeden fazla tahsilat yasak.
-- =========================================================

create or replace function public.activity_os_add_payment(
  p_company_id uuid,
  p_booking_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;

  v_amount numeric(14,2);

  v_remaining numeric(14,2);

  v_new_paid numeric(14,2);

  v_status text;

  v_payment_id uuid;
begin

  if not public.activity_os_can_view_finance(
    p_company_id
  ) then
    raise exception
      'Finans yetkisi gerekli';
  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  if v_booking.status in (
    'cancelled',
    'no_show'
  ) then
    raise exception
      'İptal / no-show rezervasyona tahsilat girilemez';
  end if;


  v_amount :=
    round(
      greatest(
        coalesce(
          p_amount,
          0
        ),
        0
      ),
      2
    );


  if v_amount <= 0 then
    raise exception
      'Tahsilat tutarı sıfırdan büyük olmalıdır';
  end if;


  v_remaining :=
    greatest(
      v_booking.sale_total -
      v_booking.paid_total,
      0
    );


  if v_remaining <= 0 then
    raise exception
      'Rezervasyonun kalan bakiyesi bulunmuyor';
  end if;


  if v_amount >
     v_remaining
     + 0.01
  then

    raise exception
      'Tahsilat kalan bakiyeden fazla olamaz. Kalan: %',
      v_remaining;

  end if;


  insert into public.activity_os_payments(
    company_id,
    booking_id,

    payment_type,
    payment_method,

    amount,
    currency,

    note,

    payment_date,

    created_by,

    provider,
    status,
    paid_at,

    metadata
  )
  values (
    p_company_id,
    p_booking_id,

    'collection',
    coalesce(
      p_payment_method,
      'cash'
    ),

    v_amount,
    'TRY',

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),

    now(),

    auth.uid(),

    'manual',
    'paid',
    now(),

    jsonb_build_object(
      'source',
      'activity_os_manual_collection'
    )
  )
  returning id
  into v_payment_id;


  v_new_paid :=
    least(
      v_booking.sale_total,
      v_booking.paid_total +
      v_amount
    );


  v_status :=
    case
      when v_new_paid <= 0
        then 'unpaid'

      when v_new_paid >=
           v_booking.sale_total
        then 'paid'

      else 'partial'
    end;


  update public.activity_os_bookings
  set
    paid_total =
      v_new_paid,

    payment_status =
      v_status,

    updated_at =
      now()

  where id =
    p_booking_id;


  insert into public.activity_os_booking_events(
    company_id,
    booking_id,
    event_type,

    old_status,
    new_status,

    old_quantity,
    new_quantity,

    old_slot_id,
    new_slot_id,

    user_id,

    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,

    'manual_payment',

    v_booking.status,
    v_booking.status,

    v_booking.quantity,
    v_booking.quantity,

    v_booking.slot_id,
    v_booking.slot_id,

    auth.uid(),

    jsonb_build_object(
      'payment_id',
        v_payment_id,

      'amount',
        v_amount,

      'payment_method',
        p_payment_method,

      'payment_status',
        v_status
    )
  );


  return jsonb_build_object(
    'ok',true,

    'payment_id',
      v_payment_id,

    'paid_total',
      v_new_paid,

    'remaining_total',
      greatest(
        v_booking.sale_total -
        v_new_paid,
        0
      ),

    'payment_status',
      v_status
  );

end;
$$;


grant execute
on function public.activity_os_add_payment(
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;


-- =========================================================
-- 4. MANUAL REFUND
-- Nakit / POS / Havale ödemeleri de sistemde iade edilebilir.
-- =========================================================

create or replace function public.activity_os_add_manual_refund(
  p_company_id uuid,
  p_booking_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;

  v_amount numeric(14,2);

  v_new_paid numeric(14,2);

  v_payment_status text;

  v_payment_id uuid;
begin

  if not public.activity_os_can_view_finance(
    p_company_id
  ) then
    raise exception
      'Finans yetkisi gerekli';
  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  v_amount :=
    round(
      greatest(
        coalesce(
          p_amount,
          0
        ),
        0
      ),
      2
    );


  if v_amount <= 0 then
    raise exception
      'İade tutarı sıfırdan büyük olmalıdır';
  end if;


  if v_amount >
     v_booking.paid_total
     + 0.01
  then

    raise exception
      'İade edilen tutar tahsil edilmiş bakiyeden fazla olamaz. Tahsilat: %',
      v_booking.paid_total;

  end if;


  insert into public.activity_os_payments(
    company_id,
    booking_id,

    payment_type,
    payment_method,

    amount,
    currency,

    note,

    payment_date,

    created_by,

    provider,
    status,
    paid_at,

    metadata
  )
  values (
    p_company_id,
    p_booking_id,

    'refund',
    coalesce(
      p_payment_method,
      'cash'
    ),

    v_amount,
    'TRY',

    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),

    now(),

    auth.uid(),

    'manual',
    'refunded',
    now(),

    jsonb_build_object(
      'source',
      'activity_os_manual_refund'
    )
  )
  returning id
  into v_payment_id;


  v_new_paid :=
    greatest(
      v_booking.paid_total -
      v_amount,
      0
    );


  v_payment_status :=
    case
      when v_new_paid <= 0
        and v_booking.sale_total > 0
        then 'refunded'

      when v_new_paid >=
           v_booking.sale_total
        then 'paid'

      else 'partial'
    end;


  update public.activity_os_bookings
  set
    paid_total =
      v_new_paid,

    payment_status =
      v_payment_status,

    updated_at =
      now()

  where id =
    p_booking_id;


  insert into public.activity_os_booking_events(
    company_id,
    booking_id,
    event_type,

    old_status,
    new_status,

    old_quantity,
    new_quantity,

    old_slot_id,
    new_slot_id,

    user_id,

    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,

    'manual_refund',

    v_booking.status,
    v_booking.status,

    v_booking.quantity,
    v_booking.quantity,

    v_booking.slot_id,
    v_booking.slot_id,

    auth.uid(),

    jsonb_build_object(
      'payment_id',
        v_payment_id,

      'amount',
        v_amount,

      'payment_method',
        p_payment_method,

      'payment_status',
        v_payment_status
    )
  );


  return jsonb_build_object(
    'ok',true,

    'payment_id',
      v_payment_id,

    'paid_total',
      v_new_paid,

    'payment_status',
      v_payment_status
  );

end;
$$;


grant execute
on function public.activity_os_add_manual_refund(
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;


-- =========================================================
-- 5. SYSTEM HEALTH RPC
-- Gerçek veri hatalarını otomatik yakalar.
-- =========================================================

create or replace function public.get_activity_os_system_health(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overbooked integer;
  v_counter_mismatch integer;
  v_orphan_bookings integer;
  v_payment_mismatch integer;
  v_commission_violation integer;
  v_finance_mismatch integer;
begin

  if not public.activity_os_can_manage(
    p_company_id
  ) then
    raise exception
      'Yönetim yetkisi gerekli';
  end if;


  select count(*)
  into v_overbooked
  from public.package_activity_slots s
  where s.company_id = p_company_id
    and public.activity_os_slot_reserved(
      s.id,
      null
    ) > s.capacity;


  select count(*)
  into v_counter_mismatch
  from public.package_activity_slots s
  where s.company_id = p_company_id
    and s.reserved_count <>
      public.activity_os_slot_reserved(
        s.id,
        null
      );


  select count(*)
  into v_orphan_bookings
  from public.activity_os_bookings b
  join public.package_activities a
    on a.id = b.activity_id
  where b.company_id = p_company_id
    and a.requires_slot = true
    and b.status not in (
      'cancelled',
      'no_show'
    )
    and b.slot_id is null;


  select count(*)
  into v_payment_mismatch
  from public.activity_os_bookings b
  where b.company_id = p_company_id
    and (
      b.paid_total < 0

      or b.paid_total >
         b.sale_total + 0.01

      or (
        b.payment_status = 'paid'
        and b.paid_total <
            b.sale_total - 0.01
      )

      or (
        b.payment_status = 'unpaid'
        and b.paid_total > 0.01
      )
    );


  select count(*)
  into v_commission_violation
  from public.activity_os_bookings b
  join public.activity_os_booking_finance f
    on f.booking_id = b.id
  where b.company_id = p_company_id
    and b.source_channel <>
        'turobus_marketplace'
    and abs(
      coalesce(
        f.turobus_commission,
        0
      )
    ) > 0.01;


  select count(*)
  into v_finance_mismatch
  from public.activity_os_bookings b
  join public.activity_os_booking_finance f
    on f.booking_id = b.id
  where b.company_id = p_company_id
    and abs(
      coalesce(
        f.gross_sale,
        0
      )
      -
      coalesce(
        b.sale_total,
        0
      )
    ) > 0.01;


  return jsonb_build_object(

    'ok',
      (
        v_overbooked = 0
        and
        v_counter_mismatch = 0
        and
        v_orphan_bookings = 0
        and
        v_payment_mismatch = 0
        and
        v_commission_violation = 0
        and
        v_finance_mismatch = 0
      ),

    'overbooked_slots',
      v_overbooked,

    'slot_counter_mismatch',
      v_counter_mismatch,

    'active_bookings_without_slot',
      v_orphan_bookings,

    'payment_mismatch',
      v_payment_mismatch,

    'turobus_commission_violation',
      v_commission_violation,

    'finance_mismatch',
      v_finance_mismatch
  );

end;
$$;


grant execute
on function public.get_activity_os_system_health(uuid)
to authenticated;


-- =========================================================
-- 6. MEVCUT FİNANSLARI YENİDEN HESAPLA
-- =========================================================

do $$
declare
  v_booking record;
begin

  for v_booking in
    select id
    from public.activity_os_bookings
  loop

    perform public.activity_os_recalculate_booking_finance(
      v_booking.id
    );

  end loop;

end $$;


-- =========================================================
-- 7. SLOT COUNTERLARINI SON KEZ GERÇEK REZERVASYONDAN ONAR
-- =========================================================

update public.package_activity_slots s
set
  reserved_count =
    public.activity_os_slot_reserved(
      s.id,
      null
    ),

  status =
    case
      when public.activity_os_slot_reserved(
        s.id,
        null
      ) >= s.capacity
        then 'full'

      when s.status = 'full'
        then 'open'

      else s.status
    end,

  updated_at =
    now();

commit;
