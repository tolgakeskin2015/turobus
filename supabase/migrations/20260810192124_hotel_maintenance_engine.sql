-- TUROBUS HOTEL PMS
-- HOTEL MAINTENANCE ENGINE

create table if not exists public.hotel_maintenance_requests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  hotel_id uuid not null,
  room_id uuid null,

  request_no text not null,

  title text not null,
  description text null,

  category text not null default 'general'
    check (
      category in (
        'general',
        'electrical',
        'plumbing',
        'air_conditioning',
        'furniture',
        'bathroom',
        'housekeeping',
        'technical',
        'safety',
        'other'
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

  status text not null default 'open'
    check (
      status in (
        'open',
        'assigned',
        'in_progress',
        'waiting_parts',
        'completed',
        'cancelled'
      )
    ),

  assigned_to uuid null,

  estimated_cost numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,

  scheduled_at timestamptz null,
  started_at timestamptz null,
  completed_at timestamptz null,

  reported_by uuid null,
  created_by uuid null,
  updated_by uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, hotel_id, request_no)
);

create index if not exists
hotel_maintenance_company_hotel_idx
on public.hotel_maintenance_requests (
  company_id,
  hotel_id
);

create index if not exists
hotel_maintenance_status_idx
on public.hotel_maintenance_requests (
  hotel_id,
  status
);

create index if not exists
hotel_maintenance_room_idx
on public.hotel_maintenance_requests (
  room_id
);

create table if not exists public.hotel_maintenance_logs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  hotel_id uuid not null,
  maintenance_id uuid not null
    references public.hotel_maintenance_requests(id)
    on delete cascade,

  action text not null,
  old_status text null,
  new_status text null,
  notes text null,

  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists
hotel_maintenance_logs_request_idx
on public.hotel_maintenance_logs (
  maintenance_id,
  created_at desc
);

create or replace function public.generate_hotel_maintenance_request_no(
  p_company_id uuid,
  p_hotel_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date text;
  v_sequence integer;
begin
  v_date := to_char(current_date, 'YYYYMMDD');

  select count(*) + 1
  into v_sequence
  from public.hotel_maintenance_requests
  where company_id = p_company_id
    and hotel_id = p_hotel_id
    and created_at::date = current_date;

  return
    'MR-' ||
    v_date ||
    '-' ||
    lpad(v_sequence::text, 3, '0');
end;
$$;

create or replace function public.create_hotel_maintenance_request(
  p_company_id uuid,
  p_hotel_id uuid,
  p_room_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_priority text,
  p_estimated_cost numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_request_no text;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Bu firma için yetkiniz yok.';
  end if;

  v_request_no :=
    public.generate_hotel_maintenance_request_no(
      p_company_id,
      p_hotel_id
    );

  insert into public.hotel_maintenance_requests (
    company_id,
    hotel_id,
    room_id,
    request_no,
    title,
    description,
    category,
    priority,
    estimated_cost,
    reported_by,
    created_by
  )
  values (
    p_company_id,
    p_hotel_id,
    p_room_id,
    v_request_no,
    p_title,
    p_description,
    coalesce(p_category, 'general'),
    coalesce(p_priority, 'normal'),
    coalesce(p_estimated_cost, 0),
    auth.uid(),
    auth.uid()
  )
  returning id into v_id;

  insert into public.hotel_maintenance_logs (
    company_id,
    hotel_id,
    maintenance_id,
    action,
    new_status,
    notes,
    created_by
  )
  values (
    p_company_id,
    p_hotel_id,
    v_id,
    'created',
    'open',
    'Bakım kaydı oluşturuldu.',
    auth.uid()
  );

  return v_id;
end;
$$;

create or replace function public.update_hotel_maintenance_status(
  p_maintenance_id uuid,
  p_status text,
  p_notes text default null,
  p_actual_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.hotel_maintenance_requests%rowtype;
  v_old_status text;
begin
  select *
  into v_request
  from public.hotel_maintenance_requests
  where id = p_maintenance_id;

  if not found then
    raise exception 'Bakım kaydı bulunamadı.';
  end if;

  if not public.is_company_member(v_request.company_id) then
    raise exception 'Bu kayıt için yetkiniz yok.';
  end if;

  v_old_status := v_request.status;

  update public.hotel_maintenance_requests
  set
    status = p_status,
    actual_cost =
      coalesce(
        p_actual_cost,
        actual_cost
      ),
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
        else completed_at
      end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_maintenance_id;

  insert into public.hotel_maintenance_logs (
    company_id,
    hotel_id,
    maintenance_id,
    action,
    old_status,
    new_status,
    notes,
    created_by
  )
  values (
    v_request.company_id,
    v_request.hotel_id,
    p_maintenance_id,
    'status_change',
    v_old_status,
    p_status,
    p_notes,
    auth.uid()
  );
end;
$$;

alter table public.hotel_maintenance_requests
enable row level security;

alter table public.hotel_maintenance_logs
enable row level security;

drop policy if exists
"Members manage hotel maintenance requests"
on public.hotel_maintenance_requests;

create policy
"Members manage hotel maintenance requests"
on public.hotel_maintenance_requests
for all
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists
"Members manage hotel maintenance logs"
on public.hotel_maintenance_logs;

create policy
"Members manage hotel maintenance logs"
on public.hotel_maintenance_logs
for all
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

grant execute
on function public.generate_hotel_maintenance_request_no(
  uuid,
  uuid
)
to authenticated;

grant execute
on function public.create_hotel_maintenance_request(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  numeric
)
to authenticated;

grant execute
on function public.update_hotel_maintenance_status(
  uuid,
  text,
  text,
  numeric
)
to authenticated;
