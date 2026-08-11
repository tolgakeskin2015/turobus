-- ============================================================
-- TUROBUS
-- TOUR MANIFEST / DEPARTURE HARDENING
-- Phase 4
-- ============================================================

-- ------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ------------------------------------------------------------

create or replace function
public.touch_tour_operations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();

  if to_jsonb(new) ? 'updated_by' then
    new.updated_by = coalesce(
      auth.uid(),
      new.updated_by
    );
  end if;

  return new;
end;
$$;


drop trigger if exists
trg_touch_tour_departure_operations
on public.tour_departure_operations;

create trigger
trg_touch_tour_departure_operations
before update
on public.tour_departure_operations
for each row
execute function
public.touch_tour_operations_updated_at();


drop trigger if exists
trg_touch_tour_manifest_entries
on public.tour_manifest_entries;

create trigger
trg_touch_tour_manifest_entries
before update
on public.tour_manifest_entries
for each row
execute function
public.touch_tour_operations_updated_at();


-- ------------------------------------------------------------
-- GET / CREATE DEPARTURE OPERATION
-- Race-safe UPSERT
-- ------------------------------------------------------------

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

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;

  if not exists (
    select 1
    from public.tour_departures
    where id = p_departure_id
  ) then
    raise exception
      'Tour departure not found';
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
  set
    updated_at =
      public.tour_departure_operations.updated_at

  returning id
  into v_operation_id;

  perform
    public.sync_tour_departure_manifest(
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


-- ------------------------------------------------------------
-- MANIFEST SYNC
-- Idempotent + audit user
-- ------------------------------------------------------------

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

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  if not exists (
    select 1
    from public.tour_departures
    where id = p_departure_id
  ) then
    raise exception
      'Tour departure not found';
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
      when coalesce(
        c.current_status,
        ''
      ) = 'no_show'
      then 'no_show'

      when coalesce(
        c.current_status,
        ''
      ) = 'completed'
      then 'completed'

      when coalesce(
        c.current_status,
        ''
      ) = 'in_vehicle'
      then 'in_vehicle'

      when coalesce(
        c.current_status,
        ''
      ) = 'transfer_waiting'
      then 'pickup_waiting'

      when coalesce(
        c.checked_in,
        false
      ) = true
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

  where r.company_id =
      p_company_id

    and r.departure_id =
      p_departure_id

  on conflict (
    company_id,
    reservation_id
  )
  do update
  set
    departure_id =
      excluded.departure_id,

    updated_by =
      coalesce(
        auth.uid(),
        public.tour_manifest_entries.updated_by
      ),

    updated_at = now();


  get diagnostics
    v_count = row_count;


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


-- ------------------------------------------------------------
-- BASIC DATA INTEGRITY INDEXES
-- ------------------------------------------------------------

create index if not exists
idx_tour_manifest_departure_status
on public.tour_manifest_entries (
  company_id,
  departure_id,
  manifest_status
);


create index if not exists
idx_tour_departure_operations_status
on public.tour_departure_operations (
  company_id,
  operation_status,
  departure_id
);


create index if not exists
idx_reservations_company_departure
on public.reservations (
  company_id,
  departure_id
)
where departure_id is not null;


-- ------------------------------------------------------------
-- SECURITY
-- ------------------------------------------------------------

revoke all on function
public.touch_tour_operations_updated_at()
from public;

