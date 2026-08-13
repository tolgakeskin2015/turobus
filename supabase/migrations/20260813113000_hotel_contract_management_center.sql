begin;

alter table public.package_hotel_rates
add column if not exists room_type_id uuid;

alter table public.package_hotel_rates
add column if not exists price_input_type text not null default 'net';

alter table public.package_hotel_rates
add column if not exists list_price numeric;

alter table public.package_hotel_rates
add column if not exists agency_discount_percent numeric;

alter table public.package_hotel_rates
add column if not exists source_type text not null default 'manual';

alter table public.package_hotel_rates
add column if not exists external_rate_id text;

alter table public.package_hotel_rates
add column if not exists release_days integer not null default 0;

alter table public.package_hotel_rates
add column if not exists closed_to_arrival boolean not null default false;

alter table public.package_hotel_rates
add column if not exists closed_to_departure boolean not null default false;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_hotel_rates_price_input_type_check'
  ) then
    alter table public.package_hotel_rates
    add constraint package_hotel_rates_price_input_type_check
    check (
      price_input_type in (
        'net',
        'list_discount'
      )
    );
  end if;
end;
$$;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_hotel_rates_source_type_check'
  ) then
    alter table public.package_hotel_rates
    add constraint package_hotel_rates_source_type_check
    check (
      source_type in (
        'manual',
        'hotelrunner',
        'elektra',
        'booking',
        'custom_api'
      )
    );
  end if;
end;
$$;


create or replace function
public.package_hotel_rate_normalize_cost()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if new.price_input_type = 'list_discount' then

    new.list_price :=
      greatest(
        coalesce(
          new.list_price,
          0
        ),
        0
      );

    new.agency_discount_percent :=
      least(
        greatest(
          coalesce(
            new.agency_discount_percent,
            0
          ),
          0
        ),
        100
      );

    new.nightly_cost :=
      round(
        new.list_price *
        (
          1 -
          (
            new.agency_discount_percent /
            100
          )
        ),
        2
      );

  else

    new.nightly_cost :=
      greatest(
        coalesce(
          new.nightly_cost,
          0
        ),
        0
      );

  end if;

  return new;
end;
$$;


drop trigger if exists
package_hotel_rate_normalize_cost_trigger
on public.package_hotel_rates;


create trigger
package_hotel_rate_normalize_cost_trigger
before insert or update of
  price_input_type,
  list_price,
  agency_discount_percent,
  nightly_cost
on public.package_hotel_rates
for each row
execute function
public.package_hotel_rate_normalize_cost();


create table if not exists
public.package_hotel_integrations (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  provider text not null,

  display_name text not null,

  external_account_id text,

  base_url text,

  status text not null default 'draft',

  settings jsonb not null default '{}'::jsonb,

  last_sync_at timestamptz,

  last_sync_status text,

  last_sync_error text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint package_hotel_integrations_provider_check
  check (
    provider in (
      'hotelrunner',
      'elektra',
      'booking',
      'custom_api'
    )
  ),

  constraint package_hotel_integrations_status_check
  check (
    status in (
      'draft',
      'active',
      'paused',
      'error'
    )
  )
);


create index if not exists
idx_package_hotel_integrations_company
on public.package_hotel_integrations (
  company_id,
  provider,
  status
);


alter table
public.package_hotel_integrations
enable row level security;


drop policy if exists
package_hotel_media_admin_write
on public.package_hotel_media;


create policy
package_hotel_media_admin_write
on public.package_hotel_media
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);


drop policy if exists
package_hotel_room_types_admin_write
on public.package_hotel_room_types;


create policy
package_hotel_room_types_admin_write
on public.package_hotel_room_types
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);


drop policy if exists
package_hotel_integrations_admin
on public.package_hotel_integrations;


create policy
package_hotel_integrations_admin
on public.package_hotel_integrations
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);


create or replace function
public.get_package_hotel_contract_admin(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_uid uuid :=
    auth.uid();

  v_company_id uuid;

  v_result jsonb;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id =
      v_uid
    and coalesce(
      cm.is_active,
      true
    ) = true
    and cm.company_id = (
      select h.company_id
      from public.package_catalog_hotels h
      where h.id =
        p_hotel_id
      limit 1
    )
  limit 1;


  if v_company_id is null then
    raise exception
      'Otel veya şirket üyeliği bulunamadı.';
  end if;


  if not public.package_user_can_view_costs(
    v_company_id
  ) then
    raise exception
      'Bu alana erişim yetkiniz bulunmuyor.';
  end if;


  select jsonb_build_object(

    'hotel',
    (
      select to_jsonb(h)
      from public.package_catalog_hotels h
      where h.id =
        p_hotel_id
        and h.company_id =
          v_company_id
      limit 1
    ),

    'media',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(m)
          order by
            m.is_cover desc,
            m.sort_order asc,
            m.created_at asc
        )
        from public.package_hotel_media m
        where m.package_hotel_id =
          p_hotel_id
          and m.company_id =
            v_company_id
      ),
      '[]'::jsonb
    ),

    'room_types',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(r)
          order by
            r.name asc
        )
        from public.package_hotel_room_types r
        where r.package_hotel_id =
          p_hotel_id
          and r.company_id =
            v_company_id
          and r.is_active = true
      ),
      '[]'::jsonb
    ),

    'rates',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(r)
          order by
            r.valid_from desc,
            r.room_type_name asc
        )
        from public.package_hotel_rates r
        where r.package_hotel_id =
          p_hotel_id
          and r.company_id =
            v_company_id
          and r.is_active = true
      ),
      '[]'::jsonb
    ),

    'promotions',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(p)
          order by
            p.priority asc,
            p.stay_from asc
        )
        from public.package_hotel_promotions p
        where p.package_hotel_id =
          p_hotel_id
          and p.company_id =
            v_company_id
          and p.is_active = true
      ),
      '[]'::jsonb
    ),

    'child_policies',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(c)
          order by
            c.child_order asc,
            c.age_from asc
        )
        from public.package_hotel_child_policies c
        where c.package_hotel_id =
          p_hotel_id
          and c.company_id =
            v_company_id
          and c.is_active = true
      ),
      '[]'::jsonb
    ),

    'integrations',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(i)
          order by
            i.created_at desc
        )
        from public.package_hotel_integrations i
        where i.company_id =
          v_company_id
      ),
      '[]'::jsonb
    )

  )
  into v_result;


  return v_result;

end;
$$;


grant execute
on function
public.get_package_hotel_contract_admin(uuid)
to authenticated;


commit;
