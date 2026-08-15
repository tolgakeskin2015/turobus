begin;

create table if not exists public.villa_b2b_bookings (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  partner_company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  access_id uuid not null references public.villa_b2b_access(id) on delete restrict,
  reservation_id uuid not null references public.villa_reservations(id) on delete cascade,
  partner_reference text,
  customer_total numeric(14,2) not null default 0,
  owner_total numeric(14,2) not null default 0,
  partner_margin numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_b2b_booking_status_check check (status in ('pending','confirmed','cancelled','completed'))
);

create index if not exists idx_villa_b2b_bookings_partner on public.villa_b2b_bookings(partner_company_id, created_at desc);
create index if not exists idx_villa_b2b_bookings_owner on public.villa_b2b_bookings(owner_company_id, created_at desc);
create index if not exists idx_villa_b2b_bookings_villa on public.villa_b2b_bookings(villa_id, created_at desc);

alter table public.villa_b2b_bookings enable row level security;

drop policy if exists villa_b2b_bookings_network_access on public.villa_b2b_bookings;
create policy villa_b2b_bookings_network_access
on public.villa_b2b_bookings
for select
to authenticated
using (
  public.is_company_member(owner_company_id)
  or public.is_company_member(partner_company_id)
);

drop policy if exists villa_b2b_bookings_owner_update on public.villa_b2b_bookings;
create policy villa_b2b_bookings_owner_update
on public.villa_b2b_bookings
for update
to authenticated
using (public.is_company_member(owner_company_id))
with check (public.is_company_member(owner_company_id));

create or replace function public.get_villa_b2b_catalog(p_partner_company_id uuid)
returns table (
  access_id uuid,
  owner_company_id uuid,
  villa_id uuid,
  villa_name text,
  city text,
  district text,
  max_guests integer,
  base_nightly_rate numeric,
  minimum_stay integer,
  pricing_type text,
  net_rate numeric,
  discount_rate numeric,
  effective_nightly_rate numeric,
  instant_confirm boolean,
  can_book boolean,
  marketplace_enabled boolean,
  cover_url text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;

  return query
  select
    a.id,
    a.owner_company_id,
    v.id,
    v.name,
    v.city,
    v.district,
    v.max_guests,
    v.base_nightly_rate,
    v.minimum_stay,
    a.pricing_type,
    a.net_rate,
    a.discount_rate,
    case
      when a.pricing_type = 'net_rate' and coalesce(a.net_rate,0) > 0 then a.net_rate
      when a.pricing_type = 'discount' then round(v.base_nightly_rate * (1 - case when a.discount_rate > 1 then a.discount_rate / 100 else a.discount_rate end), 2)
      else v.base_nightly_rate
    end as effective_nightly_rate,
    a.instant_confirm,
    a.can_book,
    v.marketplace_enabled,
    (
      select p.public_url
      from public.villa_photos p
      where p.villa_id = v.id
      order by p.is_cover desc, p.sort_order asc, p.created_at asc
      limit 1
    ) as cover_url
  from public.villa_b2b_access a
  join public.villas v on v.id = a.villa_id
  where a.partner_company_id = p_partner_company_id
    and a.is_active = true
    and v.is_active = true
    and a.can_view_calendar = true
  order by v.name;
end;
$$;

grant execute on function public.get_villa_b2b_catalog(uuid) to authenticated;

create or replace function public.create_villa_b2b_booking(
  p_partner_company_id uuid,
  p_villa_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date,
  p_customer_total numeric,
  p_partner_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.villa_b2b_access%rowtype;
  v_villa public.villas%rowtype;
  v_reservation_id uuid;
  v_code text;
  v_token text;
  v_nights integer;
  v_public_total numeric := 0;
  v_owner_total numeric := 0;
  v_margin numeric := 0;
  v_discount numeric := 0;
  v_conflict boolean := false;
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Partner firma yetkisi bulunamadı';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  select * into v_access
  from public.villa_b2b_access
  where partner_company_id = p_partner_company_id
    and villa_id = p_villa_id
    and is_active = true
    and can_book = true
  limit 1;

  if not found then
    raise exception 'Bu villa için B2B satış yetkisi yok';
  end if;

  select * into v_villa
  from public.villas
  where id = p_villa_id
    and is_active = true;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_villa_id::text));

  select exists (
    select 1
    from public.villa_reservations r
    where r.villa_id = p_villa_id
      and r.status <> 'cancelled'
      and daterange(r.check_in, r.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Seçilen tarihler başka rezervasyonla çakışıyor';
  end if;

  select exists (
    select 1
    from public.villa_calendar c
    where c.villa_id = p_villa_id
      and c.calendar_date >= p_check_in
      and c.calendar_date < p_check_out
      and c.status in ('reserved','blocked','maintenance','owner_use')
  ) into v_conflict;

  if v_conflict then
    raise exception 'Seçilen tarihler satışa kapalı';
  end if;

  v_nights := p_check_out - p_check_in;

  select coalesce(sum(coalesce(c.nightly_rate, v_villa.base_nightly_rate)),0)
  into v_public_total
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d::date;

  if v_access.pricing_type = 'net_rate' and coalesce(v_access.net_rate,0) > 0 then
    v_owner_total := v_access.net_rate * v_nights;
  elsif v_access.pricing_type = 'discount' then
    v_discount := case when v_access.discount_rate > 1 then v_access.discount_rate / 100 else v_access.discount_rate end;
    v_owner_total := round(v_public_total * (1 - v_discount), 2);
  else
    v_owner_total := v_public_total;
  end if;

  if coalesce(p_customer_total,0) <= 0 then
    p_customer_total := v_owner_total;
  end if;

  if p_customer_total < v_owner_total then
    raise exception 'Müşteri satış toplamı net B2B tutarının altında olamaz';
  end if;

  v_margin := p_customer_total - v_owner_total;
  v_code := public.villa_generate_code();
  v_token := public.villa_generate_guest_token();

  insert into public.villa_reservations (
    company_id,
    villa_id,
    reservation_code,
    sales_channel,
    source_reference,
    guest_name,
    guest_phone,
    guest_email,
    guest_count,
    check_in,
    check_out,
    nights,
    nightly_total,
    grand_total,
    paid_total,
    balance,
    currency,
    status,
    guest_token,
    guest_access_enabled,
    notes
  ) values (
    v_access.owner_company_id,
    p_villa_id,
    v_code,
    'b2b',
    'partner_company:' || p_partner_company_id::text,
    p_guest_name,
    p_guest_phone,
    p_guest_email,
    greatest(coalesce(p_guest_count,1),1),
    p_check_in,
    p_check_out,
    v_nights,
    v_owner_total,
    v_owner_total,
    0,
    v_owner_total,
    v_villa.currency,
    case when v_access.instant_confirm then 'confirmed' else 'pending' end,
    v_token,
    true,
    'B2B partner reservation'
  ) returning id into v_reservation_id;

  insert into public.villa_b2b_bookings (
    owner_company_id,
    partner_company_id,
    villa_id,
    access_id,
    reservation_id,
    partner_reference,
    customer_total,
    owner_total,
    partner_margin,
    currency,
    status
  ) values (
    v_access.owner_company_id,
    p_partner_company_id,
    p_villa_id,
    v_access.id,
    v_reservation_id,
    p_partner_reference,
    p_customer_total,
    v_owner_total,
    v_margin,
    v_villa.currency,
    case when v_access.instant_confirm then 'confirmed' else 'pending' end
  );

  insert into public.villa_calendar (
    villa_id,
    company_id,
    calendar_date,
    nightly_rate,
    minimum_stay,
    status,
    source,
    external_uid,
    note,
    updated_at
  )
  select
    p_villa_id,
    v_access.owner_company_id,
    d::date,
    coalesce(c.nightly_rate, v_villa.base_nightly_rate),
    coalesce(c.minimum_stay, v_villa.minimum_stay),
    'reserved',
    'b2b',
    v_reservation_id::text,
    p_guest_name,
    now()
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d::date
  on conflict (villa_id, calendar_date)
  do update set
    status = excluded.status,
    source = excluded.source,
    external_uid = excluded.external_uid,
    note = excluded.note,
    updated_at = now();

  insert into public.villa_cleaning_tasks (
    company_id,
    villa_id,
    reservation_id,
    task_date,
    task_type,
    status,
    fee,
    note
  ) values (
    v_access.owner_company_id,
    p_villa_id,
    v_reservation_id,
    p_check_out,
    'checkout',
    'pending',
    public.calculate_villa_cleaning_fee(p_villa_id, v_nights),
    'B2B rezervasyon çıkış temizliği'
  );

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'reservation_code', v_code,
    'owner_total', v_owner_total,
    'customer_total', p_customer_total,
    'partner_margin', v_margin,
    'currency', v_villa.currency,
    'status', case when v_access.instant_confirm then 'confirmed' else 'pending' end
  );
end;
$$;

grant execute on function public.create_villa_b2b_booking(uuid,uuid,text,text,text,integer,date,date,numeric,text) to authenticated;

commit;
