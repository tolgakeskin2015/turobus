begin;

-- =========================================================
-- TUROBUS PACKAGE OS — TRANSACTIONAL E2E SELF TEST
--
-- Bu migration gerçek DB üzerinde kritik Package OS ilişkilerini
-- doğrular, ardından oluşturduğu tüm test kayıtlarını aynı transaction
-- içinde temizler. Worker'lar test WhatsApp satırını göremez çünkü
-- kayıt commit edilmeden önce silinir.
-- =========================================================

do $$
declare
  v_company_id uuid;
  v_quote_id uuid := gen_random_uuid();
  v_quote_item_id uuid := gen_random_uuid();
  v_booking_id uuid := gen_random_uuid();
  v_booking_item_id uuid := gen_random_uuid();
  v_payment_id uuid := gen_random_uuid();
  v_payable_id uuid := gen_random_uuid();
  v_voucher_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_whatsapp_id uuid := gen_random_uuid();

  v_quote_code text :=
    'E2E-Q-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  v_booking_code text :=
    'E2E-B-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  v_guest_count integer := 0;
  v_booking_guest_count integer := 0;
  v_booking_item_count integer := 0;
  v_payment_count integer := 0;
  v_payable_count integer := 0;
  v_voucher_count integer := 0;
  v_event_count integer := 0;
  v_whatsapp_count integer := 0;
  v_snapshot jsonb;
  v_snapshot_created_at timestamptz;
  v_total_cost numeric := 10000;
  v_sale_price numeric := 15000;
  v_payment_amount numeric := 5000;
  v_balance numeric := 10000;
begin

  -- Aktif bir şirket bul. Test mevcut şirkete yalnızca transaction
  -- içinde bağlanır; kalıcı müşteri/rezervasyon verisi bırakmaz.
  select cm.company_id
  into v_company_id
  from public.company_members cm
  where coalesce(cm.is_active, true) = true
  order by cm.company_id
  limit 1;

  if v_company_id is null then
    raise exception
      'PACKAGE_OS_E2E_FAIL: aktif company_members kaydı bulunamadı.';
  end if;

  raise notice 'PACKAGE_OS_E2E: company bulundu %', v_company_id;


  -- -------------------------------------------------------
  -- 1) TEKLIF
  -- -------------------------------------------------------

  insert into public.package_quotes (
    id,
    company_id,
    quote_code,
    customer_name,
    customer_phone,
    customer_email,
    package_type,
    destination,
    check_in,
    check_out,
    adults,
    children,
    nights,
    currency,
    total_cost,
    gross_profit,
    sale_price,
    margin_percent,
    pricing_mode,
    pricing_value,
    status,
    notes,
    metadata
  )
  values (
    v_quote_id,
    v_company_id,
    v_quote_code,
    'TUROBUS E2E TEST MISAFIR',
    '+905000000000',
    'e2e-test@invalid.local',
    'custom',
    'Fethiye',
    current_date + 30,
    current_date + 34,
    2,
    0,
    4,
    'TRY',
    v_total_cost,
    5000,
    v_sale_price,
    33.3333,
    'target_price',
    v_sale_price,
    'accepted',
    'TUROBUS PACKAGE OS E2E SELF TEST',
    jsonb_build_object(
      'e2e_test', true,
      'test_marker', v_quote_code
    )
  );


  insert into public.package_quote_guests (
    company_id,
    quote_id,
    guest_order,
    guest_type,
    full_name,
    phone,
    email,
    address,
    is_primary
  )
  values
    (
      v_company_id,
      v_quote_id,
      1,
      'adult',
      'TUROBUS TEST MISAFIR 1',
      '+905000000001',
      'guest1@invalid.local',
      'Fethiye / Muğla',
      true
    ),
    (
      v_company_id,
      v_quote_id,
      2,
      'adult',
      'TUROBUS TEST MISAFIR 2',
      '+905000000002',
      'guest2@invalid.local',
      'Fethiye / Muğla',
      false
    );


  insert into public.package_quote_items (
    id,
    company_id,
    quote_id,
    item_type,
    name,
    service_date,
    quantity,
    unit_cost,
    total_cost,
    unit_sale_price,
    total_sale_price,
    currency,
    cost_snapshot,
    sort_order,
    metadata
  )
  values (
    v_quote_item_id,
    v_company_id,
    v_quote_id,
    'hotel',
    'TUROBUS E2E TEST OTEL',
    current_date + 30,
    1,
    v_total_cost,
    v_total_cost,
    v_sale_price,
    v_sale_price,
    'TRY',
    jsonb_build_object(
      'e2e_test', true,
      'calculation', '10000 cost -> 15000 sale'
    ),
    1,
    jsonb_build_object('e2e_test', true)
  );


  select count(*)
  into v_guest_count
  from public.package_quote_guests
  where quote_id = v_quote_id;

  if v_guest_count <> 2 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: quote guest beklenen 2, bulunan %',
      v_guest_count;
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: teklif + 2 misafir + teklif kalemi';


  -- -------------------------------------------------------
  -- 2) REZERVASYON + SNAPSHOT TRIGGER
  -- -------------------------------------------------------

  insert into public.package_bookings (
    id,
    company_id,
    booking_code,
    quote_id,
    customer_name,
    customer_phone,
    customer_email,
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
    v_booking_id,
    v_company_id,
    v_booking_code,
    v_quote_id,
    'TUROBUS E2E TEST MISAFIR',
    '+905000000000',
    'e2e-test@invalid.local',
    'custom',
    'Fethiye',
    current_date + 30,
    current_date + 34,
    2,
    0,
    4,
    'TRY',
    v_total_cost,
    v_sale_price,
    5000,
    5000,
    33.3333,
    0,
    v_sale_price,
    'unpaid',
    'confirmed',
    'TUROBUS PACKAGE OS E2E SELF TEST',
    jsonb_build_object('e2e_test', true)
  );


  select
    quote_snapshot,
    quote_snapshot_created_at
  into
    v_snapshot,
    v_snapshot_created_at
  from public.package_bookings
  where id = v_booking_id;

  if v_snapshot_created_at is null then
    raise exception
      'PACKAGE_OS_E2E_FAIL: booking quote snapshot timestamp oluşmadı.';
  end if;

  if coalesce(v_snapshot, '{}'::jsonb) = '{}'::jsonb then
    raise exception
      'PACKAGE_OS_E2E_FAIL: booking quote snapshot boş.';
  end if;


  select count(*)
  into v_booking_guest_count
  from public.package_booking_guests
  where booking_id = v_booking_id;

  if v_booking_guest_count <> 2 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: booking guest snapshot beklenen 2, bulunan %',
      v_booking_guest_count;
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: rezervasyon + quote snapshot + guest snapshot';


  -- -------------------------------------------------------
  -- 3) BOOKING ITEM / TEDARIKCI DURUM AKISI
  -- -------------------------------------------------------

  insert into public.package_booking_items (
    id,
    company_id,
    booking_id,
    source_quote_item_id,
    item_type,
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
    v_booking_item_id,
    v_company_id,
    v_booking_id,
    v_quote_item_id,
    'hotel',
    'TUROBUS E2E TEST OTEL',
    current_date + 30,
    1,
    v_total_cost,
    v_total_cost,
    v_sale_price,
    v_sale_price,
    'TRY',
    'requested',
    'scheduled',
    jsonb_build_object('e2e_test', true),
    jsonb_build_object('e2e_test', true)
  );

  update public.package_booking_items
  set
    supplier_status = 'confirmed',
    supplier_requested_at = now(),
    supplier_confirmed_at = now(),
    supplier_confirmation_code = 'E2E-CONFIRM-001',
    supplier_due_date = current_date + 20,
    supplier_note = 'E2E test teyidi'
  where id = v_booking_item_id;

  select count(*)
  into v_booking_item_count
  from public.package_booking_items
  where id = v_booking_item_id
    and supplier_status = 'confirmed'
    and supplier_confirmation_code = 'E2E-CONFIRM-001';

  if v_booking_item_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: booking item supplier teyit akışı başarısız.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: booking item + supplier requested/confirmed';


  -- -------------------------------------------------------
  -- 4) MUSTERI TAHSILATI
  -- -------------------------------------------------------

  insert into public.package_customer_payments (
    id,
    company_id,
    booking_id,
    amount,
    currency,
    payment_method,
    provider,
    status,
    metadata
  )
  values (
    v_payment_id,
    v_company_id,
    v_booking_id,
    v_payment_amount,
    'TRY',
    'bank_transfer',
    'e2e_test',
    'completed',
    jsonb_build_object('e2e_test', true)
  );

  update public.package_bookings
  set
    paid_amount = v_payment_amount,
    balance_amount = v_balance,
    payment_status = 'partial'
  where id = v_booking_id;

  select count(*)
  into v_payment_count
  from public.package_customer_payments
  where id = v_payment_id
    and amount = v_payment_amount
    and status = 'completed';

  if v_payment_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: müşteri tahsilat kaydı oluşmadı.';
  end if;

  if (
    select balance_amount
    from public.package_bookings
    where id = v_booking_id
  ) <> (v_sale_price - v_payment_amount)
  then
    raise exception
      'PACKAGE_OS_E2E_FAIL: müşteri kalan bakiye hesabı yanlış.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: tahsilat + partial ödeme + kalan bakiye';


  -- -------------------------------------------------------
  -- 5) TEDARIKCI HAKEDIS
  -- -------------------------------------------------------

  insert into public.package_supplier_payables (
    id,
    company_id,
    booking_id,
    booking_item_id,
    amount,
    currency,
    due_date,
    paid_amount,
    status,
    notes,
    metadata
  )
  values (
    v_payable_id,
    v_company_id,
    v_booking_id,
    v_booking_item_id,
    v_total_cost,
    'TRY',
    current_date + 20,
    4000,
    'partial',
    'TUROBUS E2E TEST HAKEDIS',
    jsonb_build_object('e2e_test', true)
  );

  select count(*)
  into v_payable_count
  from public.package_supplier_payables
  where id = v_payable_id
    and amount = 10000
    and paid_amount = 4000
    and (amount - paid_amount) = 6000
    and status = 'partial';

  if v_payable_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: hakediş/ödenen/kalan hesabı başarısız.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: tedarikçi hakediş + 4000 ödenen + 6000 kalan';


  -- -------------------------------------------------------
  -- 6) VOUCHER
  -- -------------------------------------------------------

  insert into public.package_vouchers (
    id,
    company_id,
    booking_id,
    booking_item_id,
    voucher_code,
    status,
    metadata
  )
  values (
    v_voucher_id,
    v_company_id,
    v_booking_id,
    v_booking_item_id,
    'E2E-VCH-' || upper(substr(replace(v_voucher_id::text, '-', ''), 1, 8)),
    'active',
    jsonb_build_object('e2e_test', true)
  );

  update public.package_booking_items
  set voucher_created_at = now()
  where id = v_booking_item_id;

  select count(*)
  into v_voucher_count
  from public.package_vouchers
  where id = v_voucher_id
    and booking_id = v_booking_id
    and booking_item_id = v_booking_item_id;

  if v_voucher_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: voucher kaydı oluşmadı.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: voucher + booking item bağlantısı';


  -- -------------------------------------------------------
  -- 7) OPERASYON TIMELINE
  -- -------------------------------------------------------

  insert into public.package_booking_events (
    id,
    company_id,
    booking_id,
    booking_item_id,
    event_type,
    title,
    description,
    metadata
  )
  values (
    v_event_id,
    v_company_id,
    v_booking_id,
    v_booking_item_id,
    'e2e_test',
    'TUROBUS E2E Test Event',
    'Transaction içi operasyon timeline testi',
    jsonb_build_object('e2e_test', true)
  );

  select count(*)
  into v_event_count
  from public.package_booking_events
  where id = v_event_id;

  if v_event_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: booking event timeline kaydı oluşmadı.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: operasyon timeline';


  -- -------------------------------------------------------
  -- 8) WHATSAPP QUEUE
  -- Satır transaction commit edilmeden silinecek; worker göremez.
  -- -------------------------------------------------------

  insert into public.package_whatsapp_queue (
    id,
    company_id,
    source,
    source_id,
    to_phone,
    supplier_name,
    title,
    message,
    status,
    max_attempts,
    metadata
  )
  values (
    v_whatsapp_id,
    v_company_id,
    'system',
    v_booking_item_id,
    '905000000099',
    'TUROBUS E2E TEST',
    'TUROBUS E2E test WhatsApp',
    'Bu satır transaction bitmeden silinir ve gönderilmez.',
    'pending',
    1,
    jsonb_build_object('e2e_test', true)
  );

  select count(*)
  into v_whatsapp_count
  from public.package_whatsapp_queue
  where id = v_whatsapp_id
    and status = 'pending';

  if v_whatsapp_count <> 1 then
    raise exception
      'PACKAGE_OS_E2E_FAIL: WhatsApp queue kaydı oluşmadı.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: WhatsApp queue transaction-içi';


  -- -------------------------------------------------------
  -- 9) HIZMET TAMAMLAMA DURUMU
  -- -------------------------------------------------------

  update public.package_booking_items
  set
    supplier_status = 'completed',
    supplier_completed_at = now()
  where id = v_booking_item_id;

  if (
    select supplier_status
    from public.package_booking_items
    where id = v_booking_item_id
  ) <> 'completed'
  then
    raise exception
      'PACKAGE_OS_E2E_FAIL: hizmet completed durumuna geçmedi.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: hizmet completed';


  -- -------------------------------------------------------
  -- 10) TEMIZLIK
  -- Restrict ilişkileri nedeniyle child -> parent sırası.
  -- -------------------------------------------------------

  delete from public.package_whatsapp_queue
  where id = v_whatsapp_id;

  delete from public.package_booking_events
  where booking_id = v_booking_id;

  delete from public.package_vouchers
  where booking_id = v_booking_id;

  delete from public.package_customer_payments
  where booking_id = v_booking_id;

  delete from public.package_supplier_payables
  where booking_id = v_booking_id;

  delete from public.package_booking_guests
  where booking_id = v_booking_id;

  delete from public.package_booking_items
  where booking_id = v_booking_id;

  delete from public.package_bookings
  where id = v_booking_id;

  delete from public.package_quote_guests
  where quote_id = v_quote_id;

  delete from public.package_quote_items
  where quote_id = v_quote_id;

  delete from public.package_quotes
  where id = v_quote_id;


  -- Kalıntı kontrolü
  if exists (
    select 1
    from public.package_quotes
    where id = v_quote_id
  )
  or exists (
    select 1
    from public.package_bookings
    where id = v_booking_id
  )
  or exists (
    select 1
    from public.package_whatsapp_queue
    where id = v_whatsapp_id
  )
  then
    raise exception
      'PACKAGE_OS_E2E_FAIL: test temizliği tamamlanamadı.';
  end if;

  raise notice 'PACKAGE_OS_E2E_OK: test kayıtlarının tamamı temizlendi';
  raise notice 'PACKAGE_OS_E2E_SUCCESS: teklif -> misafir -> rezervasyon -> snapshot -> hizmet -> tahsilat -> hakediş -> voucher -> timeline -> WhatsApp zinciri geçti';

end;
$$;

commit;
