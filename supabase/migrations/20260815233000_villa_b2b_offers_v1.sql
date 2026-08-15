begin;

create table if not exists public.villa_b2b_offers (
  id uuid primary key default gen_random_uuid(),
  partner_company_id uuid not null references public.companies(id) on delete cascade,
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  access_id uuid not null references public.villa_b2b_access(id) on delete restrict,
  public_token text not null unique default gen_random_uuid()::text,
  offer_code text not null unique,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  guest_count integer not null default 2,
  check_in date not null,
  check_out date not null,
  nights integer not null,
  currency text not null default 'TRY',
  public_total numeric(14,2) not null default 0,
  partner_total numeric(14,2) not null default 0,
  customer_total numeric(14,2) not null default 0,
  partner_margin numeric(14,2) not null default 0,
  note text,
  status text not null default 'sent',
  view_count integer not null default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_b2b_offer_status_check check (status in ('draft','sent','viewed','accepted','expired','cancelled','converted')),
  constraint villa_b2b_offer_dates_check check (check_out > check_in)
);

create index if not exists idx_villa_b2b_offers_partner on public.villa_b2b_offers(partner_company_id, created_at desc);
create index if not exists idx_villa_b2b_offers_owner on public.villa_b2b_offers(owner_company_id, created_at desc);
create index if not exists idx_villa_b2b_offers_token on public.villa_b2b_offers(public_token);

alter table public.villa_b2b_offers enable row level security;

drop policy if exists villa_b2b_offers_company_read on public.villa_b2b_offers;
create policy villa_b2b_offers_company_read
on public.villa_b2b_offers
for select
to authenticated
using (
  public.is_company_member(partner_company_id)
  or public.is_company_member(owner_company_id)
);

drop policy if exists villa_b2b_offers_partner_manage on public.villa_b2b_offers;
create policy villa_b2b_offers_partner_manage
on public.villa_b2b_offers
for update
to authenticated
using (public.is_company_member(partner_company_id))
with check (public.is_company_member(partner_company_id));

create or replace function public.create_villa_b2b_offer(
  p_partner_company_id uuid,
  p_villa_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date,
  p_customer_total numeric,
  p_note text default null,
  p_valid_hours integer default 48
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.villa_b2b_access%rowtype;
  v_quote jsonb;
  v_offer_id uuid;
  v_token text;
  v_code text;
  v_partner_total numeric;
  v_public_total numeric;
  v_nights integer;
  v_currency text;
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Partner firma yetkisi bulunamadı';
  end if;

  select * into v_access
  from public.villa_b2b_access
  where partner_company_id = p_partner_company_id
    and villa_id = p_villa_id
    and is_active = true
    and can_book = true
  limit 1;

  if not found then
    raise exception 'Bu villa için aktif B2B satış yetkisi yok';
  end if;

  v_quote := public.get_villa_b2b_sales_quote(
    p_partner_company_id,
    p_villa_id,
    p_check_in,
    p_check_out
  );

  if coalesce((v_quote->>'available')::boolean, false) = false then
    raise exception 'Seçilen tarihler teklif için müsait değil';
  end if;

  v_partner_total := coalesce((v_quote->>'partner_total')::numeric, 0);
  v_public_total := coalesce((v_quote->>'public_total')::numeric, 0);
  v_nights := coalesce((v_quote->>'nights')::integer, p_check_out - p_check_in);
  v_currency := coalesce(v_quote->>'currency', 'TRY');

  if coalesce(p_customer_total, 0) < v_partner_total then
    raise exception 'Müşteri fiyatı net B2B maliyetinin altında olamaz';
  end if;

  v_token := gen_random_uuid()::text;
  v_code := 'VBO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.villa_b2b_offers (
    partner_company_id,
    owner_company_id,
    villa_id,
    access_id,
    public_token,
    offer_code,
    customer_name,
    customer_phone,
    customer_email,
    guest_count,
    check_in,
    check_out,
    nights,
    currency,
    public_total,
    partner_total,
    customer_total,
    partner_margin,
    note,
    status,
    expires_at
  ) values (
    p_partner_company_id,
    v_access.owner_company_id,
    p_villa_id,
    v_access.id,
    v_token,
    v_code,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone,'')),''),
    nullif(trim(coalesce(p_customer_email,'')),''),
    greatest(coalesce(p_guest_count,1),1),
    p_check_in,
    p_check_out,
    v_nights,
    v_currency,
    v_public_total,
    v_partner_total,
    p_customer_total,
    p_customer_total - v_partner_total,
    nullif(trim(coalesce(p_note,'')),''),
    'sent',
    now() + make_interval(hours => greatest(coalesce(p_valid_hours,48),1))
  ) returning id into v_offer_id;

  return jsonb_build_object(
    'ok', true,
    'offer_id', v_offer_id,
    'offer_code', v_code,
    'public_token', v_token,
    'customer_total', p_customer_total,
    'partner_total', v_partner_total,
    'partner_margin', p_customer_total - v_partner_total,
    'currency', v_currency
  );
end;
$$;

grant execute on function public.create_villa_b2b_offer(uuid,uuid,text,text,text,integer,date,date,numeric,text,integer) to authenticated;

create or replace function public.get_villa_b2b_offer_public(p_token text)
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

  if v_offer.status in ('cancelled','expired') then
    raise exception 'Bu teklif artık aktif değil';
  end if;

  if v_offer.expires_at is not null and v_offer.expires_at < now() and v_offer.status not in ('accepted','converted') then
    update public.villa_b2b_offers
    set status = 'expired', updated_at = now()
    where id = v_offer.id;
    raise exception 'Teklif süresi dolmuş';
  end if;

  update public.villa_b2b_offers
  set
    view_count = view_count + 1,
    first_viewed_at = coalesce(first_viewed_at, now()),
    last_viewed_at = now(),
    status = case when status = 'sent' then 'viewed' else status end,
    updated_at = now()
  where id = v_offer.id;

  select * into v_villa from public.villas where id = v_offer.villa_id;

  select p.public_url into v_cover
  from public.villa_photos p
  where p.villa_id = v_offer.villa_id
  order by p.is_cover desc, p.sort_order asc, p.created_at asc
  limit 1;

  return jsonb_build_object(
    'offer_code', v_offer.offer_code,
    'customer_name', v_offer.customer_name,
    'villa_name', v_villa.name,
    'city', v_villa.city,
    'district', v_villa.district,
    'max_guests', v_villa.max_guests,
    'check_in', v_offer.check_in,
    'check_out', v_offer.check_out,
    'nights', v_offer.nights,
    'guest_count', v_offer.guest_count,
    'currency', v_offer.currency,
    'customer_total', v_offer.customer_total,
    'note', v_offer.note,
    'status', v_offer.status,
    'expires_at', v_offer.expires_at,
    'cover_url', v_cover
  );
end;
$$;

grant execute on function public.get_villa_b2b_offer_public(text) to anon, authenticated;

create or replace function public.accept_villa_b2b_offer_public(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.villa_b2b_offers%rowtype;
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

  if v_offer.expires_at is not null and v_offer.expires_at < now() then
    update public.villa_b2b_offers set status = 'expired', updated_at = now() where id = v_offer.id;
    raise exception 'Teklif süresi dolmuş';
  end if;

  update public.villa_b2b_offers
  set status = 'accepted', accepted_at = coalesce(accepted_at, now()), updated_at = now()
  where id = v_offer.id;

  return jsonb_build_object('ok', true, 'offer_id', v_offer.id, 'status', 'accepted');
end;
$$;

grant execute on function public.accept_villa_b2b_offer_public(text) to anon, authenticated;

create or replace function public.convert_villa_b2b_offer_to_booking(
  p_partner_company_id uuid,
  p_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.villa_b2b_offers%rowtype;
  v_booking jsonb;
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Partner firma yetkisi bulunamadı';
  end if;

  select * into v_offer
  from public.villa_b2b_offers
  where id = p_offer_id
    and partner_company_id = p_partner_company_id
  for update;

  if not found then
    raise exception 'Teklif bulunamadı';
  end if;

  if v_offer.status not in ('accepted','viewed','sent') then
    raise exception 'Teklif rezervasyona dönüştürülemez';
  end if;

  if v_offer.reservation_id is not null then
    return jsonb_build_object('ok', true, 'reservation_id', v_offer.reservation_id, 'already_converted', true);
  end if;

  v_booking := public.create_villa_b2b_booking(
    p_partner_company_id,
    v_offer.villa_id,
    v_offer.customer_name,
    v_offer.customer_phone,
    v_offer.customer_email,
    v_offer.guest_count,
    v_offer.check_in,
    v_offer.check_out,
    v_offer.customer_total,
    v_offer.offer_code
  );

  update public.villa_b2b_offers
  set
    status = 'converted',
    reservation_id = (v_booking->>'reservation_id')::uuid,
    updated_at = now()
  where id = v_offer.id;

  return v_booking || jsonb_build_object('offer_id', v_offer.id, 'offer_code', v_offer.offer_code);
end;
$$;

grant execute on function public.convert_villa_b2b_offer_to_booking(uuid,uuid) to authenticated;

commit;
