-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-008 — OPERATION TASK HISTORY / SCOPE HARDENING
--
-- Goals:
--   * preserve historical operational tasks
--   * prevent cross-company / cross-tour / cross-departure links
--   * prevent cross-company staff assignment
--   * prohibit physical delete for authenticated app users
--
-- No backfill.
-- No fake data.
-- ============================================================


-- ============================================================
-- 1. PREFLIGHT — STOP ON EXISTING INCONSISTENT LIVE DATA
-- ============================================================

do $$
begin

  if exists (
    select 1
    from public.tour_operation_tasks task
    left join public.tours tour
      on tour.id = task.tour_id
    where
      tour.id is null
      or
      tour.company_id <> task.company_id
  ) then
    raise exception
      'TUR008_PREFLIGHT_TASK_TOUR_SCOPE_MISMATCH';
  end if;


  if exists (
    select 1
    from public.tour_operation_tasks task
    join public.tour_departures departure
      on departure.id = task.departure_id
    where
      task.departure_id is not null
      and (
        departure.company_id <> task.company_id
        or
        departure.tour_id <> task.tour_id
      )
  ) then
    raise exception
      'TUR008_PREFLIGHT_TASK_DEPARTURE_SCOPE_MISMATCH';
  end if;


  if exists (
    select 1
    from public.tour_operation_tasks task
    left join public.staff_profiles staff
      on staff.id = task.assignee_staff_id
    where
      task.assignee_staff_id is not null
      and (
        staff.id is null
        or
        staff.company_id <> task.company_id
      )
  ) then
    raise exception
      'TUR008_PREFLIGHT_TASK_ASSIGNEE_SCOPE_MISMATCH';
  end if;

end;
$$;


-- ============================================================
-- 2. HISTORICAL FK PRESERVATION
--
-- Operational task history must not disappear when a tour or
-- departure is deleted. Existing rows therefore use RESTRICT.
-- ============================================================

alter table
  public.tour_operation_tasks
drop constraint if exists
  tour_operation_tasks_tour_id_fkey;

alter table
  public.tour_operation_tasks
add constraint
  tour_operation_tasks_tour_id_fkey
foreign key (
  tour_id
)
references public.tours(id)
on delete restrict;


alter table
  public.tour_operation_tasks
drop constraint if exists
  tour_operation_tasks_departure_id_fkey;

alter table
  public.tour_operation_tasks
add constraint
  tour_operation_tasks_departure_id_fkey
foreign key (
  departure_id
)
references public.tour_departures(id)
on delete restrict;


-- ============================================================
-- 3. CANONICAL SCOPE VALIDATOR
-- ============================================================

create or replace function
public.validate_tour_operation_task_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select 1
    from public.tours tour
    where
      tour.id = new.tour_id
      and
      tour.company_id = new.company_id
  ) then
    raise exception
      'TASK_TOUR_SCOPE_MISMATCH';
  end if;


  if
    new.departure_id
      is not null
  then

    if not exists (
      select 1
      from public.tour_departures departure
      where
        departure.id =
          new.departure_id
        and
        departure.company_id =
          new.company_id
        and
        departure.tour_id =
          new.tour_id
    ) then
      raise exception
        'TASK_DEPARTURE_SCOPE_MISMATCH';
    end if;

  end if;


  if
    new.assignee_staff_id
      is not null
  then

    if not exists (
      select 1
      from public.staff_profiles staff
      where
        staff.id =
          new.assignee_staff_id
        and
        staff.company_id =
          new.company_id
    ) then
      raise exception
        'TASK_ASSIGNEE_COMPANY_MISMATCH';
    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  trg_validate_tour_operation_task_scope
on public.tour_operation_tasks;


create trigger
  trg_validate_tour_operation_task_scope
before insert or update of
  company_id,
  tour_id,
  departure_id,
  assignee_staff_id
on public.tour_operation_tasks
for each row
execute function
  public.validate_tour_operation_task_scope();


revoke all
on function
  public.validate_tour_operation_task_scope()
from public;


-- ============================================================
-- 4. NO PHYSICAL DELETE FROM AUTHENTICATED APP
--
-- Task lifecycle already has status = cancelled.
-- Historical rows remain available for audit/readiness/incident.
-- ============================================================

drop policy if exists
  tour_operation_tasks_delete_company
on public.tour_operation_tasks;


revoke delete
on public.tour_operation_tasks
from authenticated;


comment on table
public.tour_operation_tasks
is
'Tour OS operational tasks linked to real tours, departures and staff. Historical task rows are preserved; normal app lifecycle uses completed/cancelled rather than physical delete.';

