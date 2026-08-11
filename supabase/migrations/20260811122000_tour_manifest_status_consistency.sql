-- TUROBUS
-- Tour manifest status consistency
-- Phase 6B

create or replace function
public.sync_tour_checkin_to_manifest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest_status text;
begin
  v_manifest_status :=
    case
      when NEW.current_status = 'no_show'
        then 'no_show'

      when NEW.current_status = 'completed'
        then 'completed'

      when NEW.current_status in (
        'in_vehicle',
        'arrived',
        'activity_started',
        'activity_completed',
        'returning'
      )
        then 'in_vehicle'

      when NEW.current_status = 'transfer_waiting'
        then 'pickup_waiting'

      when coalesce(
        NEW.checked_in,
        false
      ) = true
        then 'checked_in'

      else 'waiting'
    end;

  update public.tour_manifest_entries
  set
    manifest_status =
      v_manifest_status,

    checked_in_at =
      case
        when coalesce(
          NEW.checked_in,
          false
        ) = true
        then coalesce(
          checked_in_at,
          NEW.checked_in_at,
          now()
        )
        else checked_in_at
      end,

    boarded_at =
      case
        when NEW.current_status in (
          'in_vehicle',
          'arrived',
          'activity_started',
          'activity_completed',
          'returning'
        )
        then coalesce(
          boarded_at,
          now()
        )
        else boarded_at
      end,

    no_show_at =
      case
        when NEW.current_status =
          'no_show'
        then coalesce(
          no_show_at,
          now()
        )
        else no_show_at
      end,

    updated_at = now()

  where reservation_id =
      NEW.reservation_id

    and company_id =
      NEW.company_id

    and manifest_status <>
      'cancelled';

  return NEW;
end;
$$;


drop trigger if exists
trg_sync_tour_checkin_to_manifest
on public.tour_checkins;

create trigger
trg_sync_tour_checkin_to_manifest
after insert or update of
  checked_in,
  checked_in_at,
  current_status
on public.tour_checkins
for each row
execute function
public.sync_tour_checkin_to_manifest();


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
      and company_id =
        p_company_id
  ) then
    raise exception
      'Departure does not belong to company';
  end if;

  insert into
    public.tour_departure_operations (
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
  do nothing;

  select id
  into v_operation_id
  from public.tour_departure_operations
  where company_id =
      p_company_id
    and departure_id =
      p_departure_id;

  if v_operation_id is null then
    raise exception
      'Departure operation could not be resolved';
  end if;

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
      and company_id =
        p_company_id
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
      when c.current_status =
        'no_show'
      then 'no_show'

      when c.current_status =
        'completed'
      then 'completed'

      when c.current_status in (
        'in_vehicle',
        'arrived',
        'activity_started',
        'activity_completed',
        'returning'
      )
      then 'in_vehicle'

      when c.current_status =
        'transfer_waiting'
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
    on c.reservation_id =
      r.id
   and c.company_id =
      r.company_id

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

    updated_at =
      now();

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
