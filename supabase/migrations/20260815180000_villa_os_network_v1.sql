begin;

-- ============================================================
-- TUROBUS VILLA OS + NETWORK V1
-- ============================================================

create table if not exists public.villas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  slug text,
  city text,
  district text,
  address text,
  latitude numeric,
  longitude numeric,
  bedrooms integer not null default 1,
  bathrooms integer not null default 1,
  max_guests integer not null default 2,
  base_nightly_rate numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  cleaning_fee numeric(14,2) not null default 0,
  cleaning_fee_under_nights integer,
  security_deposit numeric(14,2) not null default 0,
  minimum_stay integer not null default 1,
  check_in_time time default '15:00',
  check_out_time time default '11:00',
  marketplace_enabled boolean not null default false,
  marketplace_commission_rate numeric(8,4) not null default 0,
  is_active boolean not null default true,
  description text,
  amenities jsonb not null default '[]'::jsonb,
  house_rules jsonb not null default '[]'::jsonb,
  wifi_name text,
  wifi_password text,
  guest_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table if not exists public.villa_photos (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references public.villas(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  storage_path text,
  public_url text,
  caption text,
  category text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.villa_calendar (
  id uuid primary key default gen_random_uuid(),
  villa_id uuid not null references public.villas(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  calendar_date date not null,
  nightly_rate numeric(14,2),
  minimum_stay integer,
  status text not null default 'available',
  source text not null default 'villa_os',
  external_uid text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(villa_id, calendar_date),
  constraint villa_calendar_status_check check (status in ('available','reserved','blocked','maintenance','owner_use'))
);

create table if not exists public.villa_reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete restrict,
  reservation_code text not null unique,
  sales_channel text not null default 'direct',
  source_reference text,
  guest_name text not null,
  guest_phone text,
  guest_email text,
  guest_count integer not null default 1,
  check_in date not null,
  check_out date not null,
  nights integer not null,
  nightly_total numeric(14,2) not null default 0,
  cleaning_fee numeric(14,2) not null default 0,
  security_deposit numeric(14,2) not null default 0,
  extra_total numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,
  paid_total numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  status text not null default 'confirmed',
  check_in_status text not null default 'pending',
  check_out_status text not null default 'pending',
  cleaning_status text not null default 'pending',
  invoice_status text not null default 'pending',
  guest_token text unique,
  guest_access_enabled boolean not null default true,
  turobus_commission_rate numeric(8,4) not null default 0,
  turobus_commission_amount numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_reservation_status_check check (status in ('pending','confirmed','checked_in','checked_out','cancelled','completed')),
  constraint villa_sales_channel_check check (sales_channel in ('direct','agency','b2b','airbnb','booking','vrbo','external','turobus_marketplace'))
);

create table if not exists public.villa_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reservation_id uuid not null references public.villa_reservations(id) on delete cascade,
  payment_type text not null default 'payment',
  method text not null default 'cash',
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  payment_date timestamptz not null default now(),
  reference text,
  note text,
  created_at timestamptz not null default now(),
  constraint villa_payment_type_check check (payment_type in ('payment','deposit','deposit_refund','refund','extra'))
);

create table if not exists public.villa_cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  task_date date not null,
  task_type text not null default 'checkout',
  status text not null default 'pending',
  assigned_user_id uuid,
  fee numeric(14,2) not null default 0,
  checklist jsonb not null default '[]'::jsonb,
  before_photos jsonb not null default '[]'::jsonb,
  after_photos jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  inspected_at timestamptz,
  inspector_user_id uuid,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_cleaning_status_check check (status in ('pending','assigned','in_progress','completed','inspected','failed')),
  constraint villa_cleaning_type_check check (task_type in ('checkout','midstay','extra','deep_clean','inspection'))
);

create table if not exists public.villa_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reservation_id uuid not null references public.villa_reservations(id) on delete cascade,
  invoice_status text not null default 'pending',
  provider text,
  provider_document_id text,
  invoice_no text,
  invoice_type text not null default 'e_archive',
  total_amount numeric(14,2) not null default 0,
  currency text not null default 'TRY',
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  issued_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_invoice_status_check check (invoice_status in ('pending','queued','issued','sent','cancelled','failed'))
);

create table if not exists public.villa_channel_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  channel text not null,
  connection_type text not null default 'ical',
  import_url text,
  export_token text unique default encode(gen_random_bytes(18),'hex'),
  external_listing_id text,
  is_active boolean not null default true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_channel_check check (channel in ('airbnb','booking','vrbo','google','other'))
);

create table if not exists public.villa_b2b_access (
  id uuid primary key default gen_random_uuid(),
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  partner_company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  access_role text not null default 'sales',
  pricing_type text not null default 'discount',
  net_rate numeric(14,2),
  discount_rate numeric(8,4) not null default 0,
  instant_confirm boolean not null default true,
  can_view_calendar boolean not null default true,
  can_book boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_company_id, villa_id),
  constraint villa_b2b_role_check check (access_role in ('viewer','sales','manager')),
  constraint villa_b2b_pricing_check check (pricing_type in ('discount','net_rate','public_rate'))
);

create table if not exists public.villa_os_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  auth_user_id uuid not null,
  role text not null default 'sales',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, auth_user_id),
  constraint villa_os_user_role_check check (role in ('owner','manager','sales','cleaning','accountant'))
);

-- ============================================================
-- RLS
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'villas','villa_photos','villa_calendar','villa_reservations','villa_payments',
    'villa_cleaning_tasks','villa_invoices','villa_channel_connections','villa_os_users'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_company_access', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', t || '_company_access', t);
  end loop;
end $$;

alter table public.villa_b2b_access enable row level security;
drop policy if exists villa_b2b_access_policy on public.villa_b2b_access;
create policy villa_b2b_access_policy on public.villa_b2b_access for select to authenticated using (
  public.is_company_member(owner_company_id) or public.is_company_member(partner_company_id)
);

-- ============================================================
-- STORAGE
-- ============================================================

insert into storage.buckets (id, name, public)
values ('villa-media','villa-media',true)
on conflict (id) do nothing;

-- ============================================================
-- PRICING
-- ============================================================

create or replace function public.calculate_villa_cleaning_fee(
  p_villa_id uuid,
  p_nights integer
)
returns numeric
language sql
stable
set search_path=public
as $$
  select case
    when cleaning_fee_under_nights is null then cleaning_fee
    when p_nights < cleaning_fee_under_nights then cleaning_fee
    else 0
  end
  from public.villas
  where id = p_villa_id;
$$;

create or replace function public.calculate_villa_quote(
  p_villa_id uuid,
  p_check_in date,
  p_check_out date,
  p_sales_channel text default 'direct'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_villa public.villas%rowtype;
  v_nights integer;
  v_nightly numeric := 0;
  v_cleaning numeric := 0;
  v_total numeric := 0;
  v_commission numeric := 0;
begin
  select * into v_villa from public.villas where id=p_villa_id and is_active=true;
  if not found then raise exception 'Villa not found'; end if;
  v_nights := p_check_out - p_check_in;
  if v_nights < greatest(v_villa.minimum_stay,1) then raise exception 'Minimum stay not met'; end if;

  select coalesce(sum(coalesce(vc.nightly_rate,v_villa.base_nightly_rate)),0)
  into v_nightly
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') d(day)
  left join public.villa_calendar vc on vc.villa_id=v_villa.id and vc.calendar_date=d.day::date;

  if exists (
    select 1 from generate_series(p_check_in,p_check_out-1,interval '1 day') d(day)
    join public.villa_calendar vc on vc.villa_id=v_villa.id and vc.calendar_date=d.day::date
    where vc.status <> 'available'
  ) then raise exception 'Villa is not available'; end if;

  v_cleaning := public.calculate_villa_cleaning_fee(v_villa.id,v_nights);
  v_total := v_nightly + v_cleaning;
  if p_sales_channel='turobus_marketplace' then
    v_commission := round(v_total * v_villa.marketplace_commission_rate / 100,2);
  end if;

  return jsonb_build_object(
    'villa_id',v_villa.id,'nights',v_nights,'nightly_total',v_nightly,
    'cleaning_fee',v_cleaning,'security_deposit',v_villa.security_deposit,
    'grand_total',v_total,'commission',v_commission,'currency',v_villa.currency
  );
end;
$$;

-- ============================================================
-- RESERVATION CREATE
-- ============================================================

create or replace function public.create_villa_reservation(
  p_company_id uuid,
  p_villa_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date,
  p_sales_channel text default 'direct'
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_quote jsonb;
  v_id uuid;
  v_code text;
  v_token text;
  v_nights integer;
  v_company uuid;
  v_rate numeric;
  v_commission numeric;
begin
  select company_id, marketplace_commission_rate into v_company, v_rate from public.villas where id=p_villa_id for update;
  if not found then raise exception 'Villa not found'; end if;
  if not (public.is_company_member(p_company_id) or p_sales_channel='turobus_marketplace') then raise exception 'Company membership required'; end if;

  v_quote := public.calculate_villa_quote(p_villa_id,p_check_in,p_check_out,p_sales_channel);
  v_nights := (v_quote->>'nights')::integer;
  v_code := 'V-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,10));
  v_token := encode(gen_random_bytes(24),'hex');
  v_commission := (v_quote->>'commission')::numeric;

  insert into public.villa_reservations(
    company_id,villa_id,reservation_code,sales_channel,guest_name,guest_phone,guest_email,guest_count,
    check_in,check_out,nights,nightly_total,cleaning_fee,security_deposit,grand_total,balance,currency,
    guest_token,turobus_commission_rate,turobus_commission_amount
  ) values (
    v_company,p_villa_id,v_code,p_sales_channel,p_guest_name,p_guest_phone,p_guest_email,greatest(p_guest_count,1),
    p_check_in,p_check_out,v_nights,(v_quote->>'nightly_total')::numeric,(v_quote->>'cleaning_fee')::numeric,
    (v_quote->>'security_deposit')::numeric,(v_quote->>'grand_total')::numeric,(v_quote->>'grand_total')::numeric,
    v_quote->>'currency',v_token,case when p_sales_channel='turobus_marketplace' then v_rate else 0 end,v_commission
  ) returning id into v_id;

  insert into public.villa_calendar(villa_id,company_id,calendar_date,status,source)
  select p_villa_id,v_company,d.day::date,'reserved',p_sales_channel
  from generate_series(p_check_in,p_check_out-1,interval '1 day') d(day)
  on conflict(villa_id,calendar_date) do update set status='reserved',source=excluded.source,updated_at=now();

  insert into public.villa_cleaning_tasks(company_id,villa_id,reservation_id,task_date,task_type,fee)
  values(v_company,p_villa_id,v_id,p_check_out,'checkout',(v_quote->>'cleaning_fee')::numeric);

  return jsonb_build_object('ok',true,'reservation_id',v_id,'reservation_code',v_code,'guest_token',v_token,'quote',v_quote);
end;
$$;

grant execute on function public.calculate_villa_quote(uuid,date,date,text) to authenticated, anon;
grant execute on function public.create_villa_reservation(uuid,uuid,text,text,text,integer,date,date,text) to authenticated;

-- ============================================================
-- PAYMENTS REFRESH BALANCE
-- ============================================================

create or replace function public.refresh_villa_reservation_balance()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.villa_reservations r
  set paid_total = coalesce((select sum(case when payment_type in ('payment','deposit','extra') then amount else -amount end) from public.villa_payments p where p.reservation_id=r.id),0),
      balance = greatest(r.grand_total - coalesce((select sum(case when payment_type in ('payment','extra') then amount when payment_type='refund' then -amount else 0 end) from public.villa_payments p where p.reservation_id=r.id),0),0),
      updated_at=now()
  where r.id=coalesce(new.reservation_id,old.reservation_id);
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_villa_payment_balance on public.villa_payments;
create trigger trg_villa_payment_balance after insert or update or delete on public.villa_payments
for each row execute function public.refresh_villa_reservation_balance();

-- ============================================================
-- DASHBOARD METRICS
-- ============================================================

create or replace function public.get_villa_os_dashboard(p_company_id uuid,p_month date default date_trunc('month',current_date)::date)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_start date := date_trunc('month',p_month)::date;
  v_end date := (date_trunc('month',p_month)+interval '1 month')::date;
  v_villas integer;
  v_total_nights integer;
  v_reserved_nights integer;
  v_revenue numeric;
  v_paid numeric;
  v_balance numeric;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Company membership required'; end if;
  select count(*) into v_villas from public.villas where company_id=p_company_id and is_active=true;
  v_total_nights := greatest((v_end-v_start)*v_villas,0);
  select count(*) into v_reserved_nights from public.villa_calendar where company_id=p_company_id and calendar_date>=v_start and calendar_date<v_end and status='reserved';
  select coalesce(sum(grand_total),0),coalesce(sum(paid_total),0),coalesce(sum(balance),0) into v_revenue,v_paid,v_balance
  from public.villa_reservations where company_id=p_company_id and status<>'cancelled' and check_in<v_end and check_out>v_start;
  return jsonb_build_object(
    'month',v_start,'villa_count',v_villas,'total_nights',v_total_nights,'reserved_nights',v_reserved_nights,
    'occupancy_rate',case when v_total_nights>0 then round(v_reserved_nights::numeric*100/v_total_nights,1) else 0 end,
    'revenue',v_revenue,'paid',v_paid,'balance',v_balance,
    'today_checkins',(select count(*) from public.villa_reservations where company_id=p_company_id and check_in=current_date and status<>'cancelled'),
    'today_checkouts',(select count(*) from public.villa_reservations where company_id=p_company_id and check_out=current_date and status<>'cancelled'),
    'cleaning_pending',(select count(*) from public.villa_cleaning_tasks where company_id=p_company_id and status in ('pending','assigned','in_progress'))
  );
end;
$$;

grant execute on function public.get_villa_os_dashboard(uuid,date) to authenticated;

-- ============================================================
-- GUEST PORTAL
-- ============================================================

create or replace function public.get_villa_guest_portal(p_token text)
returns jsonb
language sql
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'reservation',jsonb_build_object(
      'code',r.reservation_code,'guest_name',r.guest_name,'check_in',r.check_in,'check_out',r.check_out,
      'guest_count',r.guest_count,'status',r.status,'paid_total',r.paid_total,'balance',r.balance,'currency',r.currency
    ),
    'villa',jsonb_build_object(
      'id',v.id,'name',v.name,'city',v.city,'district',v.district,'address',v.address,'latitude',v.latitude,'longitude',v.longitude,
      'check_in_time',v.check_in_time,'check_out_time',v.check_out_time,'wifi_name',v.wifi_name,'wifi_password',v.wifi_password,
      'guest_notes',v.guest_notes,'house_rules',v.house_rules,'amenities',v.amenities
    ),
    'photos',coalesce((select jsonb_agg(jsonb_build_object('url',coalesce(p.public_url,p.storage_path),'caption',p.caption,'category',p.category,'is_cover',p.is_cover) order by p.sort_order) from public.villa_photos p where p.villa_id=v.id),'[]'::jsonb),
    'upsell_enabled',true
  )
  from public.villa_reservations r
  join public.villas v on v.id=r.villa_id
  where r.guest_token=p_token and r.guest_access_enabled=true
  limit 1;
$$;

grant execute on function public.get_villa_guest_portal(text) to anon, authenticated;

-- ============================================================
-- NETWORK SYNC
-- ============================================================

create or replace function public.sync_turobus_villa_network()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_count integer:=0;
begin
  insert into public.turobus_network_resources(
    owner_company_id,resource_type,source_system,source_id,name,city,district,is_active,marketplace_enabled,metadata
  )
  select company_id,'villa','villa_os',id,name,city,district,is_active,marketplace_enabled,
    jsonb_build_object('slug',slug,'bedrooms',bedrooms,'bathrooms',bathrooms,'max_guests',max_guests,'base_nightly_rate',base_nightly_rate,
      'currency',currency,'cleaning_fee',cleaning_fee,'cleaning_fee_under_nights',cleaning_fee_under_nights,'security_deposit',security_deposit,'minimum_stay',minimum_stay)
  from public.villas
  on conflict(owner_company_id,source_system,source_id) do update set
    name=excluded.name,city=excluded.city,district=excluded.district,is_active=excluded.is_active,
    marketplace_enabled=excluded.marketplace_enabled,metadata=excluded.metadata,updated_at=now();
  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'villas',v_count);
end;
$$;

grant execute on function public.sync_turobus_villa_network() to authenticated;

commit;
