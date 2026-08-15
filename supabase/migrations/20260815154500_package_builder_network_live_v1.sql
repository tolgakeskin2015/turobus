begin;

create table if not exists public.package_quote_network_selections (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  quote_id uuid not null
    references public.package_quotes(id)
    on delete cascade,

  network_resource_id uuid not null
    references public.turobus_network_resources(id)
    on delete restrict,

  network_unit_id uuid not null
    references public.turobus_network_inventory_units(id)
    on delete restrict,

  resource_type text not null,

  quantity integer not null default 1,

  snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint package_quote_network_quantity_check
    check (quantity > 0)
);

create unique index if not exists
idx_package_quote_network_unique
on public.package_quote_network_selections (
  quote_id,
  network_unit_id
);

alter table public.package_quote_network_selections
enable row level security;

drop policy if exists package_quote_network_member
on public.package_quote_network_selections;

create policy package_quote_network_member
on public.package_quote_network_selections
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create or replace function
public.save_package_quote_network_selections(
  p_company_id uuid,
  p_quote_code text,
  p_selections jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_selection jsonb;
  v_unit record;
  v_resource record;
  v_count integer := 0;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select q.id
  into v_quote_id
  from public.package_quotes q
  where q.company_id = p_company_id
    and q.quote_code = p_quote_code
  limit 1;

  if v_quote_id is null then
    raise exception 'Package quote not found';
  end if;

  delete from public.package_quote_network_selections
  where company_id = p_company_id
    and quote_id = v_quote_id;

  for v_selection in
    select value
    from jsonb_array_elements(
      coalesce(p_selections, '[]'::jsonb)
    )
  loop

    select *
    into v_unit
    from public.turobus_network_inventory_units
    where id =
      nullif(
        v_selection ->> 'unitId',
        ''
      )::uuid
      and is_active = true
    limit 1;

    if not found then
      continue;
    end if;

    select *
    into v_resource
    from public.turobus_network_resources
    where id = v_unit.resource_id
      and is_active = true
    limit 1;

    if not found then
      continue;
    end if;

    insert into public.package_quote_network_selections (
      company_id,
      quote_id,
      network_resource_id,
      network_unit_id,
      resource_type,
      quantity,
      snapshot
    )
    values (
      p_company_id,
      v_quote_id,
      v_resource.id,
      v_unit.id,
      v_resource.resource_type,
      greatest(
        coalesce(
          nullif(
            v_selection ->> 'quantity',
            ''
          )::integer,
          1
        ),
        1
      ),
      jsonb_build_object(
        'resource_name',
          v_resource.name,
        'unit_name',
          v_unit.name,
        'source_system',
          v_resource.source_system,
        'owner_company_id',
          v_resource.owner_company_id
      )
    )
    on conflict (
      quote_id,
      network_unit_id
    )
    do update set
      quantity = excluded.quantity,
      snapshot = excluded.snapshot,
      updated_at = now();

    v_count := v_count + 1;

  end loop;

  return jsonb_build_object(
    'ok', true,
    'quote_id', v_quote_id,
    'selection_count', v_count
  );

end;
$$;

revoke all
on function public.save_package_quote_network_selections(
  uuid,
  text,
  jsonb
)
from public;

grant execute
on function public.save_package_quote_network_selections(
  uuid,
  text,
  jsonb
)
to authenticated;

commit;
