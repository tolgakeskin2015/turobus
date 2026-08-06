create table if not exists public.hotel_housekeeping_tasks (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_id uuid not null
    references public.hotel_rooms(id)
    on delete cascade,

  reservation_id uuid
    references public.hotel_reservations(id)
    on delete set null,

  task_type text not null default 'checkout_cleaning'
    check (
      task_type in (
        'checkout_cleaning',
        'stayover_cleaning',
        'deep_cleaning',
        'inspection',
        'linen_change',
        'minibar_check',
        'other'
      )
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'inspected',
        'cancelled'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'urgent'
      )
    ),

  assigned_staff_name text,

  task_date date not null default current_date,

  notes text,

  started_at timestamptz,

  completed_at timestamptz,

  inspected_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists
hotel_housekeeping_tasks_company_idx
on public.hotel_housekeeping_tasks (
  company_id,
  hotel_id,
  task_date
);

create index if not exists
hotel_housekeeping_tasks_room_idx
on public.hotel_housekeeping_tasks (
  room_id,
  status
);

create unique index if not exists
hotel_housekeeping_open_room_task_unique
on public.hotel_housekeeping_tasks (
  company_id,
  room_id
)
where status in (
  'pending',
  'assigned',
  'in_progress',
  'completed'
);


create or replace function
public.sync_dirty_rooms_to_housekeeping(
  p_company_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created_count integer := 0;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  insert into public.hotel_housekeeping_tasks (
    company_id,
    hotel_id,
    room_id,
    task_type,
    status,
    priority,
    task_date,
    notes,
    created_by
  )
  select
    room.company_id,
    room.hotel_id,
    room.id,
    'checkout_cleaning',
    'pending',
    'high',
    current_date,
    'Kirli oda için otomatik oluşturulan temizlik görevi.',
    auth.uid()
  from public.hotel_rooms room
  where room.company_id = p_company_id
    and room.is_active = true
    and room.housekeeping_status = 'dirty'
    and not exists (
      select 1
      from public.hotel_housekeeping_tasks task
      where task.company_id = room.company_id
        and task.room_id = room.id
        and task.status in (
          'pending',
          'assigned',
          'in_progress',
          'completed'
        )
    );

  get diagnostics
    v_created_count = row_count;

  return v_created_count;
end;
$$;


create or replace function
public.update_housekeeping_task_status(
  p_company_id uuid,
  p_task_id uuid,
  p_status text
)
returns public.hotel_housekeeping_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.hotel_housekeeping_tasks;
begin
  if p_status not in (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'inspected',
    'cancelled'
  ) then
    raise exception
      'Geçersiz housekeeping görev durumu.';
  end if;

  select *
  into v_task
  from public.hotel_housekeeping_tasks
  where id = p_task_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Housekeeping görevi bulunamadı.';
  end if;

  if not public.is_company_member(
    v_task.company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  update public.hotel_housekeeping_tasks
  set
    status = p_status,

    started_at =
      case
        when p_status = 'in_progress'
          and started_at is null
        then now()
        else started_at
      end,

    completed_at =
      case
        when p_status = 'completed'
        then now()
        when p_status in (
          'pending',
          'assigned',
          'in_progress'
        )
        then null
        else completed_at
      end,

    inspected_at =
      case
        when p_status = 'inspected'
        then now()
        when p_status <> 'inspected'
        then inspected_at
      end,

    updated_at = now()

  where id = v_task.id
  returning *
  into v_task;

  if p_status = 'in_progress' then
    update public.hotel_rooms
    set
      housekeeping_status = 'cleaning',
      updated_at = now()
    where id = v_task.room_id
      and company_id = v_task.company_id;
  end if;

  if p_status = 'completed' then
    update public.hotel_rooms
    set
      housekeeping_status = 'clean',
      updated_at = now()
    where id = v_task.room_id
      and company_id = v_task.company_id;
  end if;

  if p_status = 'inspected' then
    update public.hotel_rooms
    set
      housekeeping_status = 'inspected',
      updated_at = now()
    where id = v_task.room_id
      and company_id = v_task.company_id;
  end if;

  return v_task;
end;
$$;


alter table public.hotel_housekeeping_tasks
enable row level security;

grant select, insert, update, delete
on public.hotel_housekeeping_tasks
to authenticated;

drop policy if exists
"Members manage housekeeping tasks"
on public.hotel_housekeeping_tasks;

create policy
"Members manage housekeeping tasks"
on public.hotel_housekeeping_tasks
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

grant execute
on function
public.sync_dirty_rooms_to_housekeeping(uuid)
to authenticated;

grant execute
on function
public.update_housekeeping_task_status(
  uuid,
  uuid,
  text
)
to authenticated;
