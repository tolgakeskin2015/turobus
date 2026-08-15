begin;

alter table public.villa_b2b_offers
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paid_at timestamptz,
  add column if not exists paid_amount numeric(14,2) not null default 0;

alter table public.villa_b2b_offers
  drop constraint if exists villa_b2b_offer_payment_status_check;

alter table public.villa_b2b_offers
  add constraint villa_b2b_offer_payment_status_check
  check (payment_status in ('unpaid','pending','paid','failed','refunded'));

create table if not exists public.villa_b2b_offer_payments (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.villa_b2b_offers(id) on delete cascade,
  partner_company_id uuid not null references public.companies(id) on delete cascade,
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  provider text not null default 'iyzico',
  provider_reference text,
  provider_payment_id text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_b2b_offer_payment_status_row_check check (status in ('pending','succeeded','failed','refunded'))
);

create index if not exists idx_villa_b2b_offer_payments_offer
  on public.villa_b2b_offer_payments(offer_id, created_at desc);
create index if not exists idx_villa_b2b_offer_payments_provider_ref
  on public.villa_b2b_offer_payments(provider, provider_reference);

alter table public.villa_b2b_offer_payments enable row level security;

drop policy if exists villa_b2b_offer_payments_company_read on public.villa_b2b_offer_payments;
create policy villa_b2b_offer_payments_company_read
on public.villa_b2b_offer_payments
for select
to authenticated
using (
  public.is_company_member(partner_company_id)
  or public.is_company_member(owner_company_id)
);

create or replace function public.get_villa_b2b_payment_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.villa_b2b_offers%rowtype;
  v_villa public.villas%rowtype;
  v_cover text;
begin
  select * into v_offer
  from public.villa_b2b_offers
  where public_token = p_token
  limit 1;

  if not found then
    raise exception 'Teklif bulunamadı';
  end if;

  select * into v_villa from public.villas where id = v_offer.villa_id;

  select p.public_url into v_cover
  from public.villa_photos p
  where p.villa_id = v_offer.villa_id
  order by p.is_cover desc, p.sort_order asc, p.created_at asc
  limit 1;

  return jsonb_build_object(
    'offer_code', v_offer.offer_code,
    'customer_name', v_offer.customer_name,
    'customer_phone', v_offer.customer_phone,
    'customer_email', v_offer.customer_email,
    'villa_name', v_villa.name,
    'city', v_villa.city,
    'district', v_villa.district,
    'check_in', v_offer.check_in,
    'check_out', v_offer.check_out,
    'nights', v_offer.nights,
    'guest_count', v_offer.guest_count,
    'currency', v_offer.currency,
    'customer_total', v_offer.customer_total,
    'offer_status', v_offer.status,
    'payment_status', v_offer.payment_status,
    'paid_amount', v_offer.paid_amount,
    'paid_at', v_offer.paid_at,
    'reservation_id', v_offer.reservation_id,
    'cover_url', v_cover
  );
end;
$$;

grant execute on function public.get_villa_b2b_payment_public(text) to anon, authenticated;

create or replace function public.check_villa_b2b_offer_payable(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.villa_b2b_offers%rowtype;
  v_conflict boolean := false;
begin
  select * into v_offer
  from public.villa_b2b_offers
  where public_token = p_token
  for update;

  if not found then
    raise exception 'Teklif bulunamadı';
  end if;

  if v_offer.status in ('cancelled','expired') then
    raise exception 'Bu teklif artık aktif değil';
  end if;

  if v_offer.status not in ('accepted','converted') then
    raise exception 'Ödeme için teklif önce kabul edilmelidir';
  end if;

  if v_offer.payment_status = 'paid' then
    return jsonb_build_object(
      'ok', true,
      'already_paid', true,
      'offer_id', v_offer.id,
      'amount', v_offer.customer_total,
      'currency', v_offer.currency,
      'reservation_id', v_offer.reservation_id
    );
  end if;

  if v_offer.reservation_id is null then
    select exists (
      select 1
      from public.villa_reservations r
      where r.villa_id = v_offer.villa_id
        and r.status <> 'cancelled'
        and daterange(r.check_in, r.check_out, '[)') && daterange(v_offer.check_in, v_offer.check_out, '[)')
    ) into v_conflict;

    if not v_conflict then
      select exists (
        select 1
        from public.villa_calendar c
        where c.villa_id = v_offer.villa_id
          and c.calendar_date >= v_offer.check_in
          and c.calendar_date < v_offer.check_out
          and c.status in ('reserved','blocked','maintenance','owner_use')
      ) into v_conflict;
    end if;

    if v_conflict then
      raise exception 'Villa bu tarihler için artık müsait değil';
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_paid', false,
    'offer_id', v_offer.id,
    'partner_company_id', v_offer.partner_company_id,
    'owner_company_id', v_offer.owner_company_id,
    'villa_id', v_offer.villa_id,
    'offer_code', v_offer.offer_code,
    'customer_name', v_offer.customer_name,
    'customer_phone', v_offer.customer_phone,
    'customer_email', v_offer.customer_email,
    'amount', v_offer.customer_total,
    'currency', v_offer.currency,
    'reservation_id', v_offer.reservation_id
  );
end;
$$;

grant execute on function public.check_villa_b2b_offer_payable(text) to anon, authenticated, service_role;

create or replace function public.finalize_villa_b2b_iyzico_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_paid_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.villa_b2b_offer_payments%rowtype;
  v_offer public.villa_b2b_offers%rowtype;
  v_villa public.villas%rowtype;
  v_reservation_id uuid;
  v_booking_id uuid;
  v_code text;
  v_guest_token text;
  v_conflict boolean := false;
  v_status text;
begin
  select * into v_payment
  from public.villa_b2b_offer_payments
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'Ödeme kaydı bulunamadı';
  end if;

  if v_payment.status = 'succeeded' then
    return jsonb_build_object(
      'ok', true,
      'already_finalized', true,
      'reservation_id', v_payment.reservation_id
    );
  end if;

  if abs(coalesce(p_paid_amount,0) - v_payment.amount) >= 0.01 then
    raise exception 'Ödeme tutarı beklenen tutarla uyuşmuyor';
  end if;

  select * into v_offer
  from public.villa_b2b_offers
  where id = v_payment.offer_id
  for update;

  if not found then
    raise exception 'Teklif bulunamadı';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_offer.villa_id::text));

  v_reservation_id := v_offer.reservation_id;

  if v_reservation_id is null then
    select * into v_villa
    from public.villas
    where id = v_offer.villa_id
      and is_active = true;

    if not found then
      raise exception 'Villa bulunamadı';
    end if;

    select exists (
      select 1
      from public.villa_reservations r
      where r.villa_id = v_offer.villa_id
        and r.status <> 'cancelled'
        and daterange(r.check_in, r.check_out, '[)') && daterange(v_offer.check_in, v_offer.check_out, '[)')
    ) into v_conflict;

    if not v_conflict then
      select exists (
        select 1
        from public.villa_calendar c
        where c.villa_id = v_offer.villa_id
          and c.calendar_date >= v_offer.check_in
          and c.calendar_date < v_offer.check_out
          and c.status in ('reserved','blocked','maintenance','owner_use')
      ) into v_conflict;
    end if;

    if v_conflict then
      raise exception 'Ödeme alındı ancak villa tarihleri artık müsait değil; manuel inceleme gerekli';
    end if;

    v_code := public.villa_generate_code();
    v_guest_token := public.villa_generate_guest_token();
    v_status := 'confirmed';

    insert into public.villa_reservations (
      company_id, villa_id, reservation_code, sales_channel, source_reference,
      guest_name, guest_phone, guest_email, guest_count,
      check_in, check_out, nights, nightly_total, grand_total,
      paid_total, balance, currency, status, guest_token,
      guest_access_enabled, notes
    ) values (
      v_offer.owner_company_id, v_offer.villa_id, v_code, 'b2b',
      'b2b_offer:' || v_offer.offer_code,
      v_offer.customer_name, v_offer.customer_phone, v_offer.customer_email, v_offer.guest_count,
      v_offer.check_in, v_offer.check_out, v_offer.nights,
      v_offer.partner_total, v_offer.partner_total,
      v_offer.partner_total, 0, v_offer.currency, v_status, v_guest_token,
      true, 'B2B teklif online ödeme ile kesinleşti'
    ) returning id into v_reservation_id;

    insert into public.villa_b2b_bookings (
      owner_company_id, partner_company_id, villa_id, access_id,
      reservation_id, partner_reference, customer_total, owner_total,
      partner_margin, currency, status
    ) values (
      v_offer.owner_company_id, v_offer.partner_company_id, v_offer.villa_id, v_offer.access_id,
      v_reservation_id, v_offer.offer_code, v_offer.customer_total, v_offer.partner_total,
      v_offer.partner_margin, v_offer.currency, 'confirmed'
    ) returning id into v_booking_id;

    insert into public.villa_calendar (
      villa_id, company_id, calendar_date, nightly_rate, minimum_stay,
      status, source, external_uid, note, updated_at
    )
    select
      v_offer.villa_id,
      v_offer.owner_company_id,
      d::date,
      coalesce(c.nightly_rate, v_villa.base_nightly_rate),
      coalesce(c.minimum_stay, v_villa.minimum_stay),
      'reserved',
      'b2b',
      v_reservation_id::text,
      v_offer.customer_name,
      now()
    from generate_series(v_offer.check_in, v_offer.check_out - 1, interval '1 day') d
    left join public.villa_calendar c
      on c.villa_id = v_offer.villa_id
     and c.calendar_date = d::date
    on conflict (villa_id, calendar_date)
    do update set
      status = excluded.status,
      source = excluded.source,
      external_uid = excluded.external_uid,
      note = excluded.note,
      updated_at = now();

    insert into public.villa_cleaning_tasks (
      company_id, villa_id, reservation_id, task_date,
      task_type, status, fee, note
    ) values (
      v_offer.owner_company_id,
      v_offer.villa_id,
      v_reservation_id,
      v_offer.check_out,
      'checkout',
      'pending',
      public.calculate_villa_cleaning_fee(v_offer.villa_id, v_offer.nights),
      'Online ödemeli B2B rezervasyon çıkış temizliği'
    );

    update public.villa_b2b_offers
    set
      status = 'converted',
      reservation_id = v_reservation_id,
      payment_status = 'paid',
      paid_amount = p_paid_amount,
      paid_at = now(),
      updated_at = now()
    where id = v_offer.id;
  else
    update public.villa_reservations
    set
      paid_total = greatest(paid_total, v_offer.partner_total),
      balance = greatest(grand_total - greatest(paid_total, v_offer.partner_total), 0),
      status = case when status = 'pending' then 'confirmed' else status end,
      updated_at = now()
    where id = v_reservation_id;

    update public.villa_b2b_offers
    set
      payment_status = 'paid',
      paid_amount = p_paid_amount,
      paid_at = now(),
      updated_at = now()
    where id = v_offer.id;
  end if;

  if not exists (
    select 1 from public.villa_payments
    where reservation_id = v_reservation_id
      and reference = coalesce(p_provider_payment_id, v_payment.provider_reference)
  ) then
    insert into public.villa_payments (
      company_id, reservation_id, payment_type, method,
      amount, currency, reference, note
    ) values (
      v_offer.owner_company_id,
      v_reservation_id,
      'payment',
      'credit_card',
      v_offer.partner_total,
      v_offer.currency,
      coalesce(p_provider_payment_id, v_payment.provider_reference),
      'B2B villa online ödeme - villa sahibine ait net tutar'
    );
  end if;

  update public.villa_b2b_offer_payments
  set
    reservation_id = v_reservation_id,
    provider_payment_id = p_provider_payment_id,
    status = 'succeeded',
    paid_at = now(),
    metadata = coalesce(metadata,'{}'::jsonb) || coalesce(p_metadata,'{}'::jsonb),
    updated_at = now()
  where id = v_payment.id;

  return jsonb_build_object(
    'ok', true,
    'offer_id', v_offer.id,
    'reservation_id', v_reservation_id,
    'booking_id', v_booking_id,
    'customer_total', v_offer.customer_total,
    'owner_total', v_offer.partner_total,
    'partner_margin', v_offer.partner_margin,
    'currency', v_offer.currency,
    'payment_status', 'paid'
  );
end;
$$;

grant execute on function public.finalize_villa_b2b_iyzico_payment(uuid,text,numeric,jsonb) to service_role;

commit;
