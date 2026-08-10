-- ============================================================
-- TUROBUS TOUR MANIFEST / DISPATCH PHASE 2
-- Araç + Rehber + Şoför + Pickup + Capacity Guard
-- ============================================================

-- ------------------------------------------------------------
-- 1. ÇIKIŞA ARAÇ / REHBER / ŞOFÖR ATA
-- Aynı zamanda reservation-level operation_assignments ile
-- senkron tutar.
-- ------------------------------------------------------------

create or replace function
public.assign_tour_departure_resources(
  p_company_id uuid,
  p_operation_id uuid,
  p_vehicle_id uuid default null,
  p_guide_id uuid default null,
  p_driver_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.tour_departure_operations%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_staff public.staff_profiles%rowtype;
  v_guest_count integer := 0;
  v_assignment_count integer := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select *
  into v_operation
  from public.tour_departure_operations
  where id = p_operation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Departure operation not found';
  end if;

  -- Araç doğrulama
  if p_vehicle_id is not null then
    select *
    into v_vehicle
    from public.vehicles
    where id = p_vehicle_id
      and company_id = p_company_id
      and is_active = true;

    if not found then
      raise exception 'Vehicle not found or not available for company';
    end if;

    if v_vehicle.status in ('maintenance', 'inactive') then
      raise exception 'Vehicle is not operational';
    end if;

    select coalesce(sum(r.guests), 0)::integer
    into v_guest_count
    from public.reservations r
    where r.company_id = p_company_id
      and r.departure_id = v_operation.departure_id
      and coalesce(r.status, '') <> 'cancelled';

    if v_guest_count > v_vehicle.capacity then
      raise exception
        'Vehicle capacity exceeded. Guests: %, Capacity: %',
        v_guest_count,
        v_vehicle.capacity;
    end if;
  end if;

  -- Rehber doğrulama
  if p_guide_id is not null then
    select *
    into v_staff
    from public.staff_profiles
    where id = p_guide_id
      and company_id = p_company_id
      and is_active = true;

    if not found then
      raise exception 'Guide not found for company';
    end if;

    if v_staff.staff_role not in (
      'guide',
      'operation_manager',
      'assistant'
    ) then
      raise exception 'Selected staff cannot be assigned as guide';
    end if;
  end if;

  -- Şoför doğrulama
  if p_driver_id is not null then
    select *
    into v_staff
    from public.staff_profiles
    where id = p_driver_id
      and company_id = p_company_id
      and is_active = true;

    if not found then
      raise exception 'Driver not found for company';
    end if;

    if v_staff.staff_role not in (
      'driver',
      'operation_manager'
    ) then
      raise exception 'Selected staff cannot be assigned as driver';
    end if;
  end if;

  update public.tour_departure_operations
  set
    vehicle_id = p_vehicle_id,
    guide_id = p_guide_id,
    driver_id = p_driver_id,
    updated_at = now()
  where id = p_operation_id
    and company_id = p_company_id;

  -- Mevcut reservation-level görevleri güncelle
  update public.operation_assignments a
  set
    vehicle_id = p_vehicle_id,
    guide_id = p_guide_id,
    driver_id = p_driver_id,
    updated_at = now()
  from public.reservations r
  where a.reservation_id = r.id
    and a.company_id = p_company_id
    and r.company_id = p_company_id
    and r.departure_id = v_operation.departure_id;

  -- Görev kaydı olmayan rezervasyonlara oluştur
  insert into public.operation_assignments (
    company_id,
    reservation_id,
    vehicle_id,
    guide_id,
    driver_id,
    assignment_status,
    pickup_point,
    destination_name
  )
  select
    p_company_id,
    r.id,
    p_vehicle_id,
    p_guide_id,
    p_driver_id,
    'planned',
    m.pickup_point,
    v_operation.destination_name
  from public.reservations r
  left join public.tour_manifest_entries m
    on m.reservation_id = r.id
   and m.company_id = p_company_id
  where r.company_id = p_company_id
    and r.departure_id = v_operation.departure_id
    and not exists (
      select 1
      from public.operation_assignments existing
      where existing.company_id = p_company_id
        and existing.reservation_id = r.id
    );

  get diagnostics v_assignment_count = row_count;

  return jsonb_build_object(
    'success', true,
    'operation_id', p_operation_id,
    'departure_id', v_operation.departure_id,
    'vehicle_id', p_vehicle_id,
    'guide_id', p_guide_id,
    'driver_id', p_driver_id,
    'guest_count', v_guest_count,
    'new_assignments', v_assignment_count
  );
end;
$$;

revoke all on function
public.assign_tour_departure_resources(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
from public;

grant execute on function
public.assign_tour_departure_resources(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- 2. PICKUP SIRASI / NOKTASI / SAATİ
-- ------------------------------------------------------------

create or replace function
public.update_tour_manifest_pickup(
  p_company_id uuid,
  p_manifest_id uuid,
  p_pickup_order integer,
  p_pickup_point text default null,
  p_pickup_time time default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest public.tour_manifest_entries%rowtype;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  if p_pickup_order < 0 then
    raise exception 'Pickup order cannot be negative';
  end if;

  select *
  into v_manifest
  from public.tour_manifest_entries
  where id = p_manifest_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Manifest entry not found';
  end if;

  update public.tour_manifest_entries
  set
    pickup_order = p_pickup_order,
    pickup_point = nullif(trim(p_pickup_point), ''),
    pickup_time = p_pickup_time,
    updated_at = now()
  where id = p_manifest_id
    and company_id = p_company_id;

  -- Eski görev-atama ekranıyla pickup bilgisini de senkronla
  update public.operation_assignments
  set
    pickup_point = nullif(trim(p_pickup_point), ''),
    updated_at = now()
  where company_id = p_company_id
    and reservation_id = v_manifest.reservation_id;

  return jsonb_build_object(
    'success', true,
    'manifest_id', p_manifest_id,
    'pickup_order', p_pickup_order,
    'pickup_point', nullif(trim(p_pickup_point), ''),
    'pickup_time', p_pickup_time
  );
end;
$$;

revoke all on function
public.update_tour_manifest_pickup(
  uuid,
  uuid,
  integer,
  text,
  time
)
from public;

grant execute on function
public.update_tour_manifest_pickup(
  uuid,
  uuid,
  integer,
  text,
  time
)
to authenticated;


-- ------------------------------------------------------------
-- 3. OPERASYON DURUMU - KAPASİTE GÜVENLİ
-- Eski fonksiyonu güçlendiriyoruz.
-- ------------------------------------------------------------

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
declare
  v_operation public.tour_departure_operations%rowtype;
  v_vehicle_capacity integer;
  v_guest_count integer;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
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
    raise exception 'Invalid operation status';
  end if;

  select *
  into v_operation
  from public.tour_departure_operations
  where id = p_operation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Departure operation not found';
  end if;

  -- Tur çıkmadan önce fiziksel kapasite kontrolü
  if p_status = 'departed' then
    if v_operation.vehicle_id is null then
      raise exception 'Vehicle must be assigned before departure';
    end if;

    select capacity
    into v_vehicle_capacity
    from public.vehicles
    where id = v_operation.vehicle_id
      and company_id = p_company_id
      and is_active = true
      and status not in ('maintenance', 'inactive');

    if not found then
      raise exception 'Assigned vehicle is not operational';
    end if;

    select coalesce(sum(guests), 0)::integer
    into v_guest_count
    from public.reservations
    where company_id = p_company_id
      and departure_id = v_operation.departure_id
      and coalesce(status, '') <> 'cancelled';

    if v_guest_count > v_vehicle_capacity then
      raise exception
        'Vehicle capacity exceeded. Guests: %, Capacity: %',
        v_guest_count,
        v_vehicle_capacity;
    end if;
  end if;

  update public.tour_departure_operations
  set
    operation_status = p_status,

    actual_start_at =
      case
        when p_status = 'departed'
          then coalesce(actual_start_at, now())
        else actual_start_at
      end,

    completed_at =
      case
        when p_status = 'completed'
          then coalesce(completed_at, now())
        else completed_at
      end,

    updated_at = now()
  where id = p_operation_id
    and company_id = p_company_id;

  -- Reservation-level assignment statülerini de senkronla
  update public.operation_assignments a
  set
    assignment_status =
      case
        when p_status = 'planned' then 'planned'
        when p_status = 'ready' then 'ready'
        when p_status in (
          'pickup_started',
          'departed',
          'activity_started',
          'returning'
        ) then 'active'
        when p_status = 'completed' then 'completed'
        when p_status = 'cancelled' then 'cancelled'
        else a.assignment_status
      end,
    actual_start_at =
      case
        when p_status = 'departed'
          then coalesce(a.actual_start_at, now())
        else a.actual_start_at
      end,
    actual_end_at =
      case
        when p_status = 'completed'
          then coalesce(a.actual_end_at, now())
        else a.actual_end_at
      end,
    updated_at = now()
  from public.reservations r
  where a.reservation_id = r.id
    and a.company_id = p_company_id
    and r.company_id = p_company_id
    and r.departure_id = v_operation.departure_id;
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


-- ------------------------------------------------------------
-- 4. YARDIMCI INDEXLER
-- ------------------------------------------------------------

create index if not exists
tour_manifest_entries_departure_order_idx
on public.tour_manifest_entries(
  company_id,
  departure_id,
  pickup_order
);

create index if not exists
operation_assignments_company_reservation_idx
on public.operation_assignments(
  company_id,
  reservation_id
);

