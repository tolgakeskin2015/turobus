-- =========================================================
-- TurOS Company Verticals
-- Otel, villa, tur, acente ve diğer işletme türleri
-- =========================================================

create table if not exists public.platform_verticals (
  id uuid primary key default gen_random_uuid(),

  vertical_key text not null unique,
  vertical_name text not null,
  description text,

  icon_key text,
  sort_order integer not null default 0,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.company_verticals (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  vertical_id uuid not null
    references public.platform_verticals(id)
    on delete cascade,

  is_primary boolean not null default false,
  is_enabled boolean not null default true,

  settings jsonb not null default '{}'::jsonb,

  enabled_at timestamptz not null default now(),
  disabled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, vertical_id)
);


create index if not exists company_verticals_company_idx
on public.company_verticals(company_id);

create index if not exists company_verticals_vertical_idx
on public.company_verticals(vertical_id);


insert into public.platform_verticals (
  vertical_key,
  vertical_name,
  description,
  icon_key,
  sort_order
)
values
  (
    'travel_agency',
    'Seyahat Acentesi',
    'Müşteri, teklif, rezervasyon, paket ve tedarikçi yönetimi',
    'building',
    10
  ),
  (
    'tour_operator',
    'Tur Operatörü',
    'Tur, kontenjan, araç, rehber ve operasyon yönetimi',
    'bus',
    20
  ),
  (
    'holiday_packages',
    'Tatil Paketleri',
    'Konaklama, transfer ve aktivite içeren paketlerin yönetimi',
    'suitcase',
    30
  ),
  (
    'hotel',
    'Otel',
    'Oda, kontenjan, fiyat, rezervasyon ve kanal yönetimi',
    'hotel',
    40
  ),
  (
    'villa',
    'Villa',
    'Villa takvimi, fiyat, minimum gece ve rezervasyon yönetimi',
    'home',
    50
  ),
  (
    'transfer',
    'Transfer Firması',
    'Transfer, uçuş, araç, şoför ve rota yönetimi',
    'shuttle',
    60
  ),
  (
    'activity',
    'Aktivite Sağlayıcısı',
    'Aktivite, seans, kontenjan ve rezervasyon yönetimi',
    'ticket',
    70
  ),
  (
    'rent_a_car',
    'Rent a Car',
    'Araç kiralama, teslim, iade, hasar ve sözleşme yönetimi',
    'car',
    80
  ),
  (
    'boat',
    'Tekne İşletmesi',
    'Tekne, sefer, kapasite ve rezervasyon yönetimi',
    'ship',
    90
  ),
  (
    'mixed',
    'Karma Turizm İşletmesi',
    'Birden fazla turizm faaliyetini aynı şirket altında yönetme',
    'cubes',
    100
  )
on conflict (vertical_key)
do update set
  vertical_name = excluded.vertical_name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();


alter table public.platform_verticals
enable row level security;

alter table public.company_verticals
enable row level security;


grant select
on public.platform_verticals
to authenticated;

grant select, insert, update, delete
on public.company_verticals
to authenticated;


drop policy if exists "Authenticated users view verticals"
on public.platform_verticals;

create policy "Authenticated users view verticals"
on public.platform_verticals
for select
to authenticated
using (
  is_active = true
);


drop policy if exists "Company members view company verticals"
on public.company_verticals;

create policy "Company members view company verticals"
on public.company_verticals
for select
to authenticated
using (
  public.is_company_member(company_id)
  or public.is_platform_admin()
);


drop policy if exists "Platform admins manage company verticals"
on public.company_verticals;

create policy "Platform admins manage company verticals"
on public.company_verticals
for all
to authenticated
using (
  public.is_platform_admin()
)
with check (
  public.is_platform_admin()
);


create or replace function public.company_has_vertical(
  target_company_id uuid,
  target_vertical_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_verticals cv
    join public.platform_verticals pv
      on pv.id = cv.vertical_id
    where cv.company_id = target_company_id
      and pv.vertical_key = target_vertical_key
      and pv.is_active = true
      and cv.is_enabled = true
  );
$$;

grant execute
on function public.company_has_vertical(uuid, text)
to authenticated;
