begin;

-- =========================================================
-- TUROBUS NETWORK V1
-- MEVCUT HOTEL / TOUR / PACKAGE SISTEMLERINI BOZMADAN
-- ORTAK BAGLANTI KATMANI
-- =========================================================


-- =========================================================
-- 1. ORTAK KAYNAK KATALOGU
-- =========================================================

create table if not exists
public.turobus_network_resources (

  id uuid
  primary key
  default gen_random_uuid(),

  owner_company_id uuid
  not null
  references public.companies(id)
  on delete cascade,

  resource_type text
  not null,

  source_system text
  not null,

  source_id uuid,

  name text
  not null,

  city text,
  district text,

  is_active boolean
  not null
  default true,

  marketplace_enabled boolean
  not null
  default false,

  metadata jsonb
  not null
  default '{}'::jsonb,

  created_at timestamptz
  not null
  default now(),

  updated_at timestamptz
  not null
  default now(),

  unique (
    owner_company_id,
    source_system,
    source_id
  )
);


alter table public.turobus_network_resources
drop constraint if exists
turobus_network_resources_type_check;


alter table public.turobus_network_resources
add constraint
turobus_network_resources_type_check
check (
  resource_type in (
    'hotel',
    'villa',
    'tour',
    'activity',
    'transfer',
    'package'
  )
);


alter table public.turobus_network_resources
drop constraint if exists
turobus_network_resources_source_check;


alter table public.turobus_network_resources
add constraint
turobus_network_resources_source_check
check (
  source_system in (
    'hotel_os',
    'tour_os',
    'package_os',
    'activity_os',
    'villa_os',
    'private_contract',
    'external_supplier',
    'manual'
  )
);


create index if not exists
idx_turobus_network_resources_lookup
on public.turobus_network_resources (
  resource_type,
  source_system,
  is_active
);


create index if not exists
idx_turobus_network_resources_marketplace
on public.turobus_network_resources (
  marketplace_enabled,
  resource_type
)
where marketplace_enabled = true;


alter table
public.turobus_network_resources
enable row level security;


drop policy if exists
"turobus_network_resources_company_access"
on public.turobus_network_resources;


create policy
"turobus_network_resources_company_access"
on public.turobus_network_resources
for select
to authenticated
using (
  public.is_company_member(
    owner_company_id
  )
  or marketplace_enabled = true
);


-- =========================================================
-- 2. B2B / PRIVATE / EXTERNAL TEDARIK BAGLANTISI
-- =========================================================

create table if not exists
public.turobus_inventory_sources (

  id uuid
  primary key
  default gen_random_uuid(),

  buyer_company_id uuid
  not null
  references public.companies(id)
  on delete cascade,

  resource_id uuid
  references public.turobus_network_resources(id)
  on delete cascade,

  source_type text
  not null,

  supplier_company_id uuid
  references public.companies(id)
  on delete set null,

  external_supplier_name text,

  private_reference text,

  commission_rate numeric(8,4)
  not null
  default 0,

  is_active boolean
  not null
  default true,

  metadata jsonb
  not null
  default '{}'::jsonb,

  created_at timestamptz
  not null
  default now(),

  updated_at timestamptz
  not null
  default now()
);


alter table public.turobus_inventory_sources
drop constraint if exists
turobus_inventory_sources_type_check;


alter table public.turobus_inventory_sources
add constraint
turobus_inventory_sources_type_check
check (
  source_type in (
    'private_contract',
    'turobus_network',
    'external_supplier',
    'manual'
  )
);


create index if not exists
idx_turobus_inventory_sources_buyer
on public.turobus_inventory_sources (
  buyer_company_id,
  source_type,
  is_active
);


alter table
public.turobus_inventory_sources
enable row level security;


drop policy if exists
"turobus_inventory_sources_company_access"
on public.turobus_inventory_sources;


create policy
"turobus_inventory_sources_company_access"
on public.turobus_inventory_sources
for all
to authenticated
using (
  public.is_company_member(
    buyer_company_id
  )
)
with check (
  public.is_company_member(
    buyer_company_id
  )
);


-- =========================================================
-- 3. SATIS KANALI
-- KOMISYON SADECE TUROBUS MARKETPLACE
-- =========================================================

alter table public.package_quotes
add column if not exists
sales_channel text
not null
default 'agency_direct';


alter table public.package_quotes
add column if not exists
turobus_commission_rate numeric(8,4)
not null
default 0;


alter table public.package_quotes
add column if not exists
turobus_commission_amount numeric(14,2)
not null
default 0;


alter table public.package_bookings
add column if not exists
sales_channel text
not null
default 'agency_direct';


alter table public.package_bookings
add column if not exists
turobus_commission_rate numeric(8,4)
not null
default 0;


alter table public.package_bookings
add column if not exists
turobus_commission_amount numeric(14,2)
not null
default 0;


alter table public.package_quotes
drop constraint if exists
package_quotes_sales_channel_check;


alter table public.package_quotes
add constraint
package_quotes_sales_channel_check
check (
  sales_channel in (
    'agency_direct',
    'supplier_direct',
    'b2b',
    'whatsapp',
    'instagram',
    'external',
    'manual',
    'turobus_marketplace'
  )
);


alter table public.package_bookings
drop constraint if exists
package_bookings_sales_channel_check;


alter table public.package_bookings
add constraint
package_bookings_sales_channel_check
check (
  sales_channel in (
    'agency_direct',
    'supplier_direct',
    'b2b',
    'whatsapp',
    'instagram',
    'external',
    'manual',
    'turobus_marketplace'
  )
);


-- =========================================================
-- 4. PACKAGE QUOTE ITEM NETWORK SNAPSHOT
-- =========================================================

alter table public.package_quote_items
add column if not exists
network_resource_id uuid
references public.turobus_network_resources(id)
on delete set null;


alter table public.package_quote_items
add column if not exists
inventory_source_id uuid
references public.turobus_inventory_sources(id)
on delete set null;


alter table public.package_quote_items
add column if not exists
inventory_source_type text;


alter table public.package_booking_items
add column if not exists
network_resource_id uuid
references public.turobus_network_resources(id)
on delete set null;


alter table public.package_booking_items
add column if not exists
inventory_source_id uuid
references public.turobus_inventory_sources(id)
on delete set null;


alter table public.package_booking_items
add column if not exists
inventory_source_type text;


-- =========================================================
-- 5. KOMISYON KURALI
-- =========================================================

create or replace function
public.calculate_turobus_marketplace_commission(
  p_sales_channel text,
  p_sale_amount numeric,
  p_commission_rate numeric
)
returns numeric
language sql
immutable
as $$

  select
    case

      when p_sales_channel =
        'turobus_marketplace'

      then
        round(
          greatest(
            coalesce(
              p_sale_amount,
              0
            ),
            0
          )
          *
          greatest(
            coalesce(
              p_commission_rate,
              0
            ),
            0
          )
          /
          100,
          2
        )

      else
        0

    end;

$$;


-- =========================================================
-- 6. LEGACY / MEVCUT MODULLER
--
-- Burada tablo adi tahmin etmiyoruz.
-- Network Core once bagimsiz ve guvenli kurulur.
--
-- Hotel OS / Tour OS / Package OS gercek tablolarinin
-- kaynak kayitlari bir sonraki integration bridge
-- migrationinda source_id ile baglanacaktir.
--
-- MEVCUT TABLOLARA DOKUNULMAZ.
-- =========================================================


-- =========================================================
-- 7. NETWORK CATALOG RPC
-- MEVCUT BUILDER'A EK VERI SAGLAR.
-- =========================================================

create or replace function
public.get_turobus_network_catalog(
  p_company_id uuid
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$

declare

  v_result jsonb;

begin

  if not public.is_company_member(
    p_company_id
  )
  then

    raise exception
      'Company membership required';

  end if;


  select
    jsonb_build_object(

      'resources',

      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',
              r.id,

            'resource_type',
              r.resource_type,

            'source_system',
              r.source_system,

            'source_id',
              r.source_id,

            'name',
              r.name,

            'city',
              r.city,

            'district',
              r.district,

            'marketplace_enabled',
              r.marketplace_enabled,

            'inventory_sources',

              coalesce(
                (
                  select
                    jsonb_agg(
                      jsonb_build_object(
                        'id',
                          s.id,

                        'source_type',
                          s.source_type,

                        'supplier_company_id',
                          s.supplier_company_id,

                        'external_supplier_name',
                          s.external_supplier_name,

                        'commission_rate',
                          s.commission_rate
                      )
                    )

                  from public.turobus_inventory_sources s

                  where
                    s.resource_id =
                      r.id

                    and s.buyer_company_id =
                      p_company_id

                    and s.is_active =
                      true
                ),
                '[]'::jsonb
              )
          )

          order by
            r.resource_type,
            r.name
        ),
        '[]'::jsonb
      )

    )

  into
    v_result

  from public.turobus_network_resources r

  where
    r.is_active =
      true

    and (
      r.owner_company_id =
        p_company_id

      or r.marketplace_enabled =
        true

      or exists (
        select 1

        from public.turobus_inventory_sources s

        where
          s.resource_id =
            r.id

          and s.buyer_company_id =
            p_company_id

          and s.is_active =
            true
      )
    );


  return
    coalesce(
      v_result,
      jsonb_build_object(
        'resources',
        '[]'::jsonb
      )
    );

end;
$$;


revoke all
on function
public.get_turobus_network_catalog(
  uuid
)
from public;


grant execute
on function
public.get_turobus_network_catalog(
  uuid
)
to authenticated;


commit;
