alter table public.tour_departures
add column if not exists company_id uuid;

update public.tour_departures d
set company_id = x.company_id
from (
  select
    departure_id,
    min(company_id::text)::uuid as company_id
  from public.reservations
  where departure_id is not null
  group by departure_id
  having count(distinct company_id) = 1
) x
where d.id = x.departure_id
  and d.company_id is null;

do $$
declare
  v_missing integer;
  v_conflict integer;
  v_bad_operation integer;
  v_bad_manifest integer;
begin
  select count(*)
  into v_missing
  from public.tour_departures
  where company_id is null;

  if v_missing > 0 then
    raise exception
      '% departure company_id olmadan kaldi',
      v_missing;
  end if;

  select count(*)
  into v_conflict
  from (
    select departure_id
    from public.reservations
    where departure_id is not null
    group by departure_id
    having count(distinct company_id) > 1
  ) q;

  if v_conflict > 0 then
    raise exception
      '% departure birden fazla şirkete bagli',
      v_conflict;
  end if;

  select count(*)
  into v_bad_operation
  from public.tour_departure_operations o
  join public.tour_departures d
    on d.id = o.departure_id
  where o.company_id <> d.company_id;

  if v_bad_operation > 0 then
    raise exception
      '% operation company/departure uyumsuz',
      v_bad_operation;
  end if;

  select count(*)
  into v_bad_manifest
  from public.tour_manifest_entries m
  join public.tour_departures d
    on d.id = m.departure_id
  where m.company_id <> d.company_id;

  if v_bad_manifest > 0 then
    raise exception
      '% manifest company/departure uyumsuz',
      v_bad_manifest;
  end if;
end;
$$;

alter table public.tour_departures
alter column company_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tour_departures_company_id_fkey'
  ) then
    alter table public.tour_departures
    add constraint tour_departures_company_id_fkey
    foreign key (company_id)
    references public.companies(id)
    on delete restrict;
  end if;
end;
$$;

create index if not exists
idx_tour_departures_company
on public.tour_departures(company_id);

create index if not exists
idx_tour_departures_company_tour_date
on public.tour_departures(
  company_id,
  tour_id,
  departure_date
);

create unique index if not exists
uq_tour_departures_id_company
on public.tour_departures(
  id,
  company_id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tour_departure_operations_departure_company_fkey'
  ) then
    alter table public.tour_departure_operations
    add constraint
      tour_departure_operations_departure_company_fkey
    foreign key (
      departure_id,
      company_id
    )
    references public.tour_departures(
      id,
      company_id
    )
    on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'tour_manifest_entries_departure_company_fkey'
  ) then
    alter table public.tour_manifest_entries
    add constraint
      tour_manifest_entries_departure_company_fkey
    foreign key (
      departure_id,
      company_id
    )
    references public.tour_departures(
      id,
      company_id
    )
    on delete cascade;
  end if;
end;
$$;

alter table public.tour_departures
enable row level security;

drop policy if exists
tour_departures_public_read
on public.tour_departures;

create policy
tour_departures_public_read
on public.tour_departures
for select
using (true);

drop policy if exists
tour_departures_company_insert
on public.tour_departures;

create policy
tour_departures_company_insert
on public.tour_departures
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);

drop policy if exists
tour_departures_company_update
on public.tour_departures;

create policy
tour_departures_company_update
on public.tour_departures
for update
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists
tour_departures_company_delete
on public.tour_departures;

create policy
tour_departures_company_delete
on public.tour_departures
for delete
to authenticated
using (
  public.is_company_member(company_id)
);

create or replace function
public.get_or_create_tour_departure_operation(
  p_company_id uuid,
  p_departure_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation_id uuid;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  if not exists (
    select 1
    from public.tour_departures
    where id = p_departure_id
      and company_id = p_company_id
  ) then
    raise exception
      'Departure does not belong to company';
  end if;

  insert into public.tour_departure_operations (
    company_id,
    departure_id,
    operation_status,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  values (
    p_company_id,
    p_departure_id,
    'planned',
    auth.uid(),
    auth.uid(),
    now(),
    now()
  )
  on conflict (
    company_id,
    departure_id
  )
  do update
  set updated_at =
    public.tour_departure_operations.updated_at
  returning id
  into v_operation_id;

  perform public.sync_tour_departure_manifest(
    p_company_id,
    p_departure_id
  );

  return v_operation_id;
end;
$$;

revoke all on function
public.get_or_create_tour_departure_operation(
  uuid,
  uuid
)
from public;

grant execute on function
public.get_or_create_tour_departure_operation(
  uuid,
  uuid
)
to authenticated;

create or replace function
public.sync_tour_departure_manifest(
  p_company_id uuid,
  p_departure_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  if not exists (
    select 1
    from public.tour_departures
    where id = p_departure_id
      and company_id = p_company_id
  ) then
    raise exception
      'Departure does not belong to company';
  end if;

  insert into public.tour_manifest_entries (
    company_id,
    departure_id,
    reservation_id,
    pickup_order,
    pickup_point,
    manifest_status,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  select
    r.company_id,
    r.departure_id,
    r.id,
    0,
    null,
    case
      when c.current_status = 'no_show'
        then 'no_show'
      when c.current_status = 'completed'
        then 'completed'
      when c.current_status = 'in_vehicle'
        then 'in_vehicle'
      when c.current_status = 'transfer_waiting'
        then 'pickup_waiting'
      when coalesce(c.checked_in, false)
        then 'checked_in'
      else 'waiting'
    end,
    auth.uid(),
    auth.uid(),
    now(),
    now()
  from public.reservations r
  left join public.tour_checkins c
    on c.reservation_id = r.id
   and c.company_id = r.company_id
  where r.company_id = p_company_id
    and r.departure_id = p_departure_id
  on conflict (
    company_id,
    reservation_id
  )
  do update
  set
    departure_id = excluded.departure_id,
    updated_by = coalesce(
      auth.uid(),
      public.tour_manifest_entries.updated_by
    ),
    updated_at = now();

  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

revoke all on function
public.sync_tour_departure_manifest(
  uuid,
  uuid
)
from public;

grant execute on function
public.sync_tour_departure_manifest(
  uuid,
  uuid
)
to authenticated;
