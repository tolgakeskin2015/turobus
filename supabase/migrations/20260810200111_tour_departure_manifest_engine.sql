-- ============================================================
-- TUROBUS TOUR DEPARTURE & MANIFEST ENGINE
-- ============================================================

create table if not exists public.tour_departure_operations (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  departure_id uuid not null
    references public.tour_departures(id)
    on delete cascade,

  vehicle_id uuid
    references public.vehicles(id)
    on delete set null,

  guide_id uuid
    references public.staff_profiles(id)
    on delete set null,

  driver_id uuid
    references public.staff_profiles(id)
    on delete set null,

  operation_status text not null default 'planned'
    check (
      operation_status in (
        'planned',
        'ready',
        'pickup_started',
        'departed',
        'activity_started',
        'returning',
        'completed',
        'cancelled'
      )
    ),

  planned_start_at timestamptz,
  actual_start_at timestamptz,
  completed_at timestamptz,

  meeting_point text,
  destination_name text,
  notes text,

  created_by uuid,
  updated_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, departure_id)
);

create index if not exists
tour_departure_operations_company_idx
on public.tour_departure_operations(company_id);

create index if not exists
tour_departure_operations_departure_idx
on public.tour_departure_operations(departure_id);

create index if not exists
tour_departure_operations_status_idx
on public.tour_departure_operations(
  company_id,
  operation_status
);

-- ============================================================

create table if not exists public.tour_manifest_entries (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  departure_id uuid not null
    references public.tour_departures(id)
    on delete cascade,

  reservation_id uuid not null
    references public.reservations(id)
    on delete cascade,

  pickup_order integer not null default 0
    check (pickup_order >= 0),

  pickup_point text,
  pickup_time time,

  manifest_status text not null default 'waiting'
    check (
      manifest_status in (
        'waiting',
        'pickup_waiting',
        'checked_in',
        'in_vehicle',
        'no_show',
        'completed',
        'cancelled'
      )
    ),

  checked_in_at timestamptz,
  boarded_at timestamptz,
  no_show_at timestamptz,

  notes text,

  created_by uuid,
  updated_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, reservation_id)
);

create index if not exists
tour_manifest_entries_departure_idx
on public.tour_manifest_entries(
  company_id,
  departure_id
);

create index if not exists
tour_manifest_entries_pickup_idx
on public.tour_manifest_entries(
  company_id,
  departure_id,
  pickup_order
);

-- ============================================================
-- RLS
-- ============================================================

alter table public.tour_departure_operations
enable row level security;

alter table public.tour_manifest_entries
enable row level security;

drop policy if exists
"tour_departure_operations_company_access"
on public.tour_departure_operations;

create policy
"tour_departure_operations_company_access"
on public.tour_departure_operations
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists
"tour_manifest_entries_company_access"
on public.tour_manifest_entries;

create policy
"tour_manifest_entries_company_access"
on public.tour_manifest_entries
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

-- ============================================================
-- MANIFEST SENKRONIZASYONU
-- departure_id bulunan rezervasyonları manifest içine alır.
-- ============================================================

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

  insert into public.tour_manifest_entries (
    company_id,
    departure_id,
    reservation_id,
    manifest_status
  )
  select
    r.company_id,
    r.departure_id,
    r.id,
    case
      when r.status = 'cancelled'
        then 'cancelled'
      else 'waiting'
    end
  from public.reservations r
  where r.company_id = p_company_id
    and r.departure_id = p_departure_id
  on conflict (
    company_id,
    reservation_id
  )
  do update set
    departure_id =
      excluded.departure_id,
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

-- ============================================================
-- ÇIKIŞ OPERASYONU OLUŞTUR / GETİR
-- ============================================================

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

  select id
  into v_operation_id
  from public.tour_departure_operations
  where company_id = p_company_id
    and departure_id = p_departure_id;

  if v_operation_id is not null then
    return v_operation_id;
  end if;

  insert into
    public.tour_departure_operations (
      company_id,
      departure_id
    )
  values (
    p_company_id,
    p_departure_id
  )
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

-- ============================================================
-- MANIFEST DURUM GÜNCELLEME
-- ============================================================

create or replace function
public.update_tour_manifest_status(
  p_company_id uuid,
  p_manifest_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;

  if p_status not in (
    'waiting',
    'pickup_waiting',
    'checked_in',
    'in_vehicle',
    'no_show',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Invalid manifest status';
  end if;

  update public.tour_manifest_entries
  set
    manifest_status = p_status,

    checked_in_at =
      case
        when p_status = 'checked_in'
        then coalesce(
          checked_in_at,
          now()
        )
        else checked_in_at
      end,

    boarded_at =
      case
        when p_status = 'in_vehicle'
        then coalesce(
          boarded_at,
          now()
        )
        else boarded_at
      end,

    no_show_at =
      case
        when p_status = 'no_show'
        then coalesce(
          no_show_at,
          now()
        )
        else no_show_at
      end,

    updated_at = now()

  where id = p_manifest_id
    and company_id = p_company_id;

  if not found then
    raise exception
      'Manifest entry not found';
  end if;
end;
$$;

revoke all on function
public.update_tour_manifest_status(
  uuid,
  uuid,
  text
)
from public;

grant execute on function
public.update_tour_manifest_status(
  uuid,
  uuid,
  text
)
to authenticated;

-- ============================================================
-- DEPARTURE OPERASYON DURUMU
-- ============================================================

create or replace function
public.update_tour_departure_operation_status(
  p_company_id uuid,
  p_operation_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;

  if p_status not in (
    'planned',
    'ready',
    'pickup_started',
    'departed',
    'activity_started',
    'returning',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Invalid operation status';
  end if;

  update public.tour_departure_operations
  set
    operation_status = p_status,

    actual_start_at =
      case
        when p_status = 'departed'
        then coalesce(
          actual_start_at,
          now()
        )
        else actual_start_at
      end,

    completed_at =
      case
        when p_status = 'completed'
        then coalesce(
          completed_at,
          now()
        )
        else completed_at
      end,

    updated_at = now()

  where id = p_operation_id
    and company_id = p_company_id;

  if not found then
    raise exception
      'Departure operation not found';
  end if;
end;
$$;

revoke all on function
public.update_tour_departure_operation_status(
  uuid,
  uuid,
  text
)
from public;

grant execute on function
public.update_tour_departure_operation_status(
  uuid,
  uuid,
  text
)
to authenticated;

-- ============================================================
-- MANIFEST VIEW
-- ============================================================

create or replace view
public.tour_departure_manifest_view
with (security_invoker = true)
as
select
  m.id as manifest_id,
  m.company_id,
  m.departure_id,
  m.reservation_id,

  m.pickup_order,
  m.pickup_point,
  m.pickup_time,
  m.manifest_status,

  r.reservation_code,
  r.tour_title,
  r.tour_date,
  r.full_name,
  r.phone,
  r.email,
  r.guests,
  r.payment_status,
  r.status as reservation_status,

  c.checked_in,
  c.current_status
    as live_operation_status,

  a.vehicle_id,
  a.guide_id,
  a.driver_id,

  v.plate_number,
  v.display_name
    as vehicle_name,
  v.capacity
    as vehicle_capacity,

  g.full_name
    as guide_name,

  d.full_name
    as driver_name

from public.tour_manifest_entries m

join public.reservations r
  on r.id = m.reservation_id

left join public.tour_checkins c
  on c.reservation_id =
     m.reservation_id

left join public.operation_assignments a
  on a.reservation_id =
     m.reservation_id

left join public.vehicles v
  on v.id = a.vehicle_id

left join public.staff_profiles g
  on g.id = a.guide_id

left join public.staff_profiles d
  on d.id = a.driver_id;

