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
  export_token text unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
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

alter table public.villas enable row level security;
alter table public.villa_photos enable row level security;
alter table public.villa_calendar enable row level security;
alter table public.villa_reservations enable row level security;
alter table public.villa_payments enable row level security;
alter table public.villa_cleaning_tasks enable row level security;
alter table public.villa_invoices enable row level security;
alter table public.villa_channel_connections enable row level security;
alter table public.villa_b2b_access enable row level security;
alter table public.villa_os_users enable row level security;

create policy villas_company_access on public.villas for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_photos_company_access on public.villa_photos for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_calendar_company_access on public.villa_calendar for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_reservations_company_access on public.villa_reservations for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_payments_company_access on public.villa_payments for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_cleaning_company_access on public.villa_cleaning_tasks for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_invoices_company_access on public.villa_invoices for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_channels_company_access on public.villa_channel_connections for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy villa_b2b_owner_access on public.villa_b2b_access for all to authenticated using (public.is_company_member(owner_company_id) or public.is_company_member(partner_company_id)) with check (public.is_company_member(owner_company_id));
create policy villa_users_company_access on public.villa_os_users for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

-- ============================================================
-- HELPERS
-- ============================================================

create or replace function public.villa_generate_code()
returns text language sql volatile as $$
  select 'V-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,10));
$$;

create or replace function public.villa_generate_guest_token()
returns text language sql volatile as $$
  select lower(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
$$;

create or replace function public.calculate_villa_cleaning_fee(p_villa_id uuid, p_nights integer)
returns numeric language sql stable set search_path=public as $$
  select case when cleaning_fee_under_nights is not null and p_nights < cleaning_fee_under_nights then cleaning_fee else 0 end
  from public.villas where id=p_villa_id;
$$;

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
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_villa public.villas%rowtype;
  v_nights integer;
  v_nightly numeric := 0;
  v_cleaning numeric := 0;
  v_total numeric := 0;
  v_commission numeric := 0;
  v_res public.villa_reservations%rowtype;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Company membership required'; end if;
  select * into v_villa from public.villas where id=p_villa_id and company_id=p_company_id and is_active=true;
  if not found then raise exception 'Villa not found'; end if;
  if p_check_out <= p_check_in then raise exception 'Invalid dates'; end if;
  v_nights := p_check_out-p_check_in;
  if v_nights < v_villa.minimum_stay then raise exception 'Minimum stay not met'; end if;
  if exists(select 1 from public.villa_calendar c where c.villa_id=p_villa_id and c.calendar_date>=p_check_in and c.calendar_date<p_check_out and c.status<>'available') then raise exception 'Villa is not available'; end if;
  select coalesce(sum(coalesce(c.nightly_rate,v_villa.base_nightly_rate)),0) into v_nightly
  from generate_series(p_check_in,p_check_out-1,interval '1 day') d(day)
  left join public.villa_calendar c on c.villa_id=p_villa_id and c.calendar_date=d.day::date;
  if v_nightly=0 then v_nightly := v_villa.base_nightly_rate*v_nights; end if;
  v_cleaning := coalesce(public.calculate_villa_cleaning_fee(p_villa_id,v_nights),0);
  v_total := v_nightly + v_cleaning;
  if p_sales_channel='turobus_marketplace' then
    v_commission := round(v_total*v_villa.marketplace_commission_rate/100,2);
  end if;
  insert into public.villa_reservations(
    company_id,villa_id,reservation_code,sales_channel,guest_name,guest_phone,guest_email,guest_count,
    check_in,check_out,nights,nightly_total,cleaning_fee,security_deposit,grand_total,balance,currency,
    guest_token,turobus_commission_rate,turobus_commission_amount
  ) values(
    p_company_id,p_villa_id,public.villa_generate_code(),p_sales_channel,p_guest_name,p_guest_phone,p_guest_email,greatest(p_guest_count,1),
    p_check_in,p_check_out,v_nights,v_nightly,v_cleaning,v_villa.security_deposit,v_total,v_total,v_villa.currency,
    public.villa_generate_guest_token(),case when p_sales_channel='turobus_marketplace' then v_villa.marketplace_commission_rate else 0 end,v_commission
  ) returning * into v_res;
  insert into public.villa_calendar(villa_id,company_id,calendar_date,status,source,note)
  select p_villa_id,p_company_id,d::date,'reserved',p_sales_channel,'Reservation '||v_res.reservation_code
  from generate_series(p_check_in,p_check_out-1,interval '1 day') d
  on conflict(villa_id,calendar_date) do update set status='reserved',source=excluded.source,note=excluded.note,updated_at=now();
  insert into public.villa_cleaning_tasks(company_id,villa_id,reservation_id,task_date,task_type,status,fee)
  values(p_company_id,p_villa_id,v_res.id,p_check_out,'checkout','pending',v_cleaning);
  return jsonb_build_object('ok',true,'reservation_id',v_res.id,'reservation_code',v_res.reservation_code,'guest_token',v_res.guest_token,'grand_total',v_total,'cleaning_fee',v_cleaning,'turobus_commission',v_commission);
end;
$$;

grant execute on function public.create_villa_reservation(uuid,uuid,text,text,text,integer,date,date,text) to authenticated;

create or replace function public.record_villa_payment(
  p_company_id uuid,p_reservation_id uuid,p_amount numeric,p_method text,p_payment_type text default 'payment',p_note text default null
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res public.villa_reservations%rowtype; v_paid numeric;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Company membership required'; end if;
  select * into v_res from public.villa_reservations where id=p_reservation_id and company_id=p_company_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  insert into public.villa_payments(company_id,reservation_id,payment_type,method,amount,currency,note)
  values(p_company_id,p_reservation_id,p_payment_type,p_method,p_amount,v_res.currency,p_note);
  select coalesce(sum(case when payment_type in ('payment','deposit','extra') then amount else -amount end),0) into v_paid from public.villa_payments where reservation_id=p_reservation_id;
  update public.villa_reservations set paid_total=v_paid,balance=greatest(grand_total-v_paid,0),updated_at=now() where id=p_reservation_id;
  return jsonb_build_object('ok',true,'paid_total',v_paid,'balance',greatest(v_res.grand_total-v_paid,0));
end;
$$;

grant execute on function public.record_villa_payment(uuid,uuid,numeric,text,text,text) to authenticated;

create or replace function public.sync_turobus_villa_network()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_count integer:=0;
begin
  insert into public.turobus_network_resources(owner_company_id,resource_type,source_system,source_id,name,city,district,is_active,marketplace_enabled,metadata)
  select v.company_id,'villa','villa_os',v.id,v.name,v.city,v.district,v.is_active,v.marketplace_enabled,
    jsonb_build_object('slug',v.slug,'bedrooms',v.bedrooms,'bathrooms',v.bathrooms,'max_guests',v.max_guests,'base_nightly_rate',v.base_nightly_rate,'currency',v.currency,'cleaning_fee',v.cleaning_fee,'cleaning_fee_under_nights',v.cleaning_fee_under_nights,'security_deposit',v.security_deposit,'minimum_stay',v.minimum_stay)
  from public.villas v where v.company_id is not null
  on conflict(owner_company_id,source_system,source_id) do update set name=excluded.name,city=excluded.city,district=excluded.district,is_active=excluded.is_active,marketplace_enabled=excluded.marketplace_enabled,metadata=excluded.metadata,updated_at=now();
  get diagnostics v_count=row_count;
  return jsonb_build_object('ok',true,'villas',v_count);
end;
$$;

grant execute on function public.sync_turobus_villa_network() to authenticated;

create or replace function public.get_villa_os_dashboard(p_company_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_start date:=date_trunc('month',current_date)::date; v_end date:=(date_trunc('month',current_date)+interval '1 month')::date;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Company membership required'; end if;
  return jsonb_build_object(
    'villa_count',(select count(*) from public.villas where company_id=p_company_id and is_active),
    'arrivals_today',(select count(*) from public.villa_reservations where company_id=p_company_id and check_in=current_date and status<>'cancelled'),
    'departures_today',(select count(*) from public.villa_reservations where company_id=p_company_id and check_out=current_date and status<>'cancelled'),
    'cleaning_pending',(select count(*) from public.villa_cleaning_tasks where company_id=p_company_id and status in('pending','assigned','in_progress')),
    'month_revenue',(select coalesce(sum(grand_total),0) from public.villa_reservations where company_id=p_company_id and check_in>=v_start and check_in<v_end and status<>'cancelled'),
    'month_paid',(select coalesce(sum(p.amount),0) from public.villa_payments p join public.villa_reservations r on r.id=p.reservation_id where p.company_id=p_company_id and r.check_in>=v_start and r.check_in<v_end),
    'month_occupancy',(
      select case when count(v.id)=0 then 0 else round(100.0*coalesce((select count(*) from public.villa_calendar c where c.company_id=p_company_id and c.calendar_date>=v_start and c.calendar_date<v_end and c.status='reserved'),0)/(count(v.id)*(v_end-v_start)),1) end
      from public.villas v where v.company_id=p_company_id and v.is_active
    ),
    'marketplace_villas',(select count(*) from public.villas where company_id=p_company_id and is_active and marketplace_enabled)
  );
end;
$$;

grant execute on function public.get_villa_os_dashboard(uuid) to authenticated;

create or replace function public.get_villa_guest_portal(p_token text)
returns jsonb language sql security definer set search_path=public as $$
  select jsonb_build_object(
    'reservation',jsonb_build_object('code',r.reservation_code,'guest_name',r.guest_name,'check_in',r.check_in,'check_out',r.check_out,'status',r.status,'paid_total',r.paid_total,'balance',r.balance,'currency',r.currency,'check_in_status',r.check_in_status,'check_out_status',r.check_out_status),
    'villa',jsonb_build_object('name',v.name,'city',v.city,'district',v.district,'address',v.address,'latitude',v.latitude,'longitude',v.longitude,'wifi_name',v.wifi_name,'wifi_password',v.wifi_password,'guest_notes',v.guest_notes,'check_in_time',v.check_in_time,'check_out_time',v.check_out_time,'amenities',v.amenities,'house_rules',v.house_rules),
    'photos',coalesce((select jsonb_agg(jsonb_build_object('url',p.public_url,'caption',p.caption,'category',p.category,'cover',p.is_cover) order by p.sort_order) from public.villa_photos p where p.villa_id=v.id),'[]'::jsonb),
    'upsell',jsonb_build_object('enabled',true,'title','Tatilini Geliştir','discount_label','Villa misafirlerine özel fırsatlar','tours_path','/turlar')
  )
  from public.villa_reservations r join public.villas v on v.id=r.villa_id
  where r.guest_token=p_token and r.guest_access_enabled=true
  limit 1;
$$;

grant execute on function public.get_villa_guest_portal(text) to anon,authenticated;

select public.sync_turobus_villa_network();

commit;
