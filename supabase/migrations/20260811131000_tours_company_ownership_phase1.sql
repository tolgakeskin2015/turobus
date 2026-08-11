-- TUROBUS
-- Phase 7B
-- Tours company ownership foundation

alter table public.tours
add column if not exists company_id uuid;

update public.tours t
set company_id = x.company_id
from (
  select
    td.tour_id,
    min(td.company_id::text)::uuid as company_id
  from public.tour_departures td
  group by td.tour_id
  having count(
    distinct td.company_id
  ) = 1
) x
where t.id = x.tour_id
  and t.company_id is null;

do $$
declare
  v_multi_company_count integer;
begin
  select count(*)
  into v_multi_company_count
  from (
    select td.tour_id
    from public.tour_departures td
    group by td.tour_id
    having count(
      distinct td.company_id
    ) > 1
  ) q;

  if v_multi_company_count > 0 then
    raise exception
      'Cannot continue: % tours have departures from multiple companies',
      v_multi_company_count;
  end if;
end;
$$;

alter table public.tours
drop constraint if exists
tours_company_id_fkey;

alter table public.tours
add constraint
tours_company_id_fkey
foreign key (company_id)
references public.companies(id)
on delete restrict;

create index if not exists
idx_tours_company_id
on public.tours(company_id);

create index if not exists
idx_tours_company_status
on public.tours(
  company_id,
  status
);

create unique index if not exists
uq_tours_id_company
on public.tours(
  id,
  company_id
)
where company_id is not null;

alter table public.tours
enable row level security;

drop policy if exists
tours_company_select
on public.tours;

drop policy if exists
tours_company_insert
on public.tours;

drop policy if exists
tours_company_update
on public.tours;

drop policy if exists
tours_company_delete
on public.tours;

create policy
tours_company_select
on public.tours
for select
using (
  status = 'active'
  or public.is_company_member(
    company_id
  )
);

create policy
tours_company_insert
on public.tours
for insert
to authenticated
with check (
  public.is_company_member(
    company_id
  )
);

create policy
tours_company_update
on public.tours
for update
to authenticated
using (
  public.is_company_member(
    company_id
  )
)
with check (
  public.is_company_member(
    company_id
  )
);

create policy
tours_company_delete
on public.tours
for delete
to authenticated
using (
  public.is_company_member(
    company_id
  )
);
