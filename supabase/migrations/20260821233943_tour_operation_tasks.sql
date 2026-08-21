-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 10 — TOUR TASK & PERSONNEL OPERATIONS
--
-- Existing:
--   operation_assignments
--   staff_profiles
--   vehicles
--   reservations
-- are preserved.
--
-- This table represents real operational work items
-- for one tour / one departure.
-- ============================================================

create table if not exists
public.tour_operation_tasks (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  operation_assignment_id uuid
    references public.operation_assignments(id)
    on delete set null,

  assignee_staff_id uuid
    references public.staff_profiles(id)
    on delete set null,

  title text
    not null,

  description text,

  task_type text
    not null
    default 'operation'
    check (
      task_type in (
        'operation',
        'flight',
        'bus',
        'passenger',
        'rooming',
        'manifest',
        'finance',
        'supplier',
        'guide',
        'driver',
        'document',
        'other'
      )
    ),

  priority text
    not null
    default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  status text
    not null
    default 'pending'
    check (
      status in (
        'pending',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  due_at timestamptz,

  started_at timestamptz,

  completed_at timestamptz,

  completion_note text,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
  tour_operation_tasks_company_tour_idx
on public.tour_operation_tasks (
  company_id,
  tour_id
);


create index if not exists
  tour_operation_tasks_company_departure_idx
on public.tour_operation_tasks (
  company_id,
  departure_id
);


create index if not exists
  tour_operation_tasks_assignee_idx
on public.tour_operation_tasks (
  company_id,
  assignee_staff_id
);


create index if not exists
  tour_operation_tasks_due_status_idx
on public.tour_operation_tasks (
  company_id,
  status,
  due_at
);


alter table
  public.tour_operation_tasks
enable row level security;


drop policy if exists
  tour_operation_tasks_select_company
on public.tour_operation_tasks;

create policy
  tour_operation_tasks_select_company
on public.tour_operation_tasks
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_tasks_insert_company
on public.tour_operation_tasks;

create policy
  tour_operation_tasks_insert_company
on public.tour_operation_tasks
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_tasks_update_company
on public.tour_operation_tasks;

create policy
  tour_operation_tasks_update_company
on public.tour_operation_tasks
for update
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_tasks_delete_company
on public.tour_operation_tasks;

create policy
  tour_operation_tasks_delete_company
on public.tour_operation_tasks
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create or replace function
public.touch_tour_operation_tasks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at =
    now();

  new.updated_by =
    coalesce(
      auth.uid(),
      new.updated_by
    );

  if
    new.status =
      'in_progress'
    and old.status <>
      'in_progress'
    and new.started_at
      is null
  then

    new.started_at =
      now();

  end if;

  if
    new.status =
      'completed'
    and old.status <>
      'completed'
    and new.completed_at
      is null
  then

    new.completed_at =
      now();

  end if;

  if
    new.status <>
      'completed'
  then

    new.completed_at =
      null;

  end if;

  return new;

end;
$$;


drop trigger if exists
  trg_touch_tour_operation_tasks
on public.tour_operation_tasks;


create trigger
  trg_touch_tour_operation_tasks
before update
on public.tour_operation_tasks
for each row
execute function
public.touch_tour_operation_tasks_updated_at();


revoke all on function
public.touch_tour_operation_tasks_updated_at()
from public;


revoke all
on public.tour_operation_tasks
from anon;


grant
  select,
  insert,
  update,
  delete
on public.tour_operation_tasks
to authenticated;


comment on table
public.tour_operation_tasks
is
'Tour OS operational tasks linked to real tours, departures and staff.';

