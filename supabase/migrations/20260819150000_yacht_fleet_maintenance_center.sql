
-- ============================================================
-- TUROBUS YACHT FLEET MAINTENANCE & DOCUMENT CENTER
--
-- - Maintenance planning
-- - Availability auto blocking
-- - Booking / option collision protection
-- - Engine hour tracking
-- - Maintenance expenses -> finance ledger
-- - Yacht document expiry management
-- ============================================================


-- ============================================================
-- YACHT LIFECYCLE FIELDS
-- ============================================================

alter table public.yacht_os_yachts
  add column if not exists engine_hours numeric(12,1)
    not null default 0
    check (engine_hours >= 0);

alter table public.yacht_os_yachts
  add column if not exists last_maintenance_date date;

alter table public.yacht_os_yachts
  add column if not exists next_maintenance_date date;


-- ============================================================
-- MAINTENANCE JOBS
-- ============================================================

create table if not exists public.yacht_os_maintenance_jobs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  maintenance_type text not null
    check (
      maintenance_type in (
        'periodic',
        'engine',
        'electrical',
        'mechanical',
        'hull',
        'cleaning',
        'safety',
        'electronics',
        'repair',
        'inspection',
        'other'
      )
    ),

  title text not null,

  description text,

  planned_start date not null,
  planned_end date not null,

  started_at timestamptz,
  completed_at timestamptz,

  priority text not null
    default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  status text not null
    default 'planned'
    check (
      status in (
        'planned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  service_provider text,

  engine_hours_at_service numeric(12,1)
    check (
      engine_hours_at_service is null
      or engine_hours_at_service >= 0
    ),

  next_service_engine_hours numeric(12,1)
    check (
      next_service_engine_hours is null
      or next_service_engine_hours >= 0
    ),

  estimated_cost numeric(14,2) not null
    default 0
    check (estimated_cost >= 0),

  actual_cost numeric(14,2) not null
    default 0
    check (actual_cost >= 0),

  currency text not null
    default 'TRY',

  next_maintenance_date date,

  finance_entry_id uuid
    references public.yacht_os_finance_entries(id)
    on delete set null,

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint yacht_os_maintenance_dates_check
    check (
      planned_end >= planned_start
    )
);


create index if not exists
  yacht_os_maintenance_company_idx
on public.yacht_os_maintenance_jobs (
  company_id,
  status,
  planned_start
);


create index if not exists
  yacht_os_maintenance_yacht_idx
on public.yacht_os_maintenance_jobs (
  yacht_id,
  planned_start,
  planned_end
);


-- ============================================================
-- YACHT DOCUMENTS
-- ============================================================

create table if not exists public.yacht_os_yacht_documents (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  document_type text not null
    check (
      document_type in (
        'registration',
        'insurance',
        'survey',
        'license',
        'permit',
        'safety_certificate',
        'maintenance_certificate',
        'captain_document',
        'marina_contract',
        'other'
      )
    ),

  title text not null,

  document_no text,

  issuer text,

  issue_date date,
  expiry_date date,

  file_url text,

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'renewal_pending',
        'expired',
        'archived'
      )
    ),

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_os_yacht_documents_expiry_idx
on public.yacht_os_yacht_documents (
  company_id,
  expiry_date,
  status
);


create index if not exists
  yacht_os_yacht_documents_yacht_idx
on public.yacht_os_yacht_documents (
  yacht_id,
  document_type
);


-- ============================================================
-- AVAILABILITY MAINTENANCE OWNERSHIP
-- ============================================================

alter table public.yacht_os_availability
  add column if not exists maintenance_id uuid
    references public.yacht_os_maintenance_jobs(id)
    on delete set null;


create index if not exists
  yacht_os_availability_maintenance_idx
on public.yacht_os_availability (
  maintenance_id
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_maintenance_jobs_updated_at
on public.yacht_os_maintenance_jobs;

create trigger
  yacht_os_maintenance_jobs_updated_at
before update
on public.yacht_os_maintenance_jobs
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_yacht_documents_updated_at
on public.yacht_os_yacht_documents;

create trigger
  yacht_os_yacht_documents_updated_at
before update
on public.yacht_os_yacht_documents
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_maintenance_jobs
enable row level security;

alter table public.yacht_os_yacht_documents
enable row level security;


create policy yacht_os_maintenance_company_access
on public.yacht_os_maintenance_jobs
for all
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


create policy yacht_os_documents_company_access
on public.yacht_os_yacht_documents
for all
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


grant select
on
  public.yacht_os_maintenance_jobs,
  public.yacht_os_yacht_documents
to authenticated;


grant insert, update, delete
on public.yacht_os_yacht_documents
to authenticated;


-- Maintenance writes go through RPCs.
revoke insert, update, delete
on public.yacht_os_maintenance_jobs
from authenticated;


-- ============================================================
-- SCHEDULE MAINTENANCE ATOMICALLY
-- ============================================================

create or replace function
public.yacht_os_schedule_maintenance(
  p_yacht_id uuid,
  p_maintenance_type text,
  p_title text,
  p_description text,
  p_planned_start date,
  p_planned_end date,
  p_priority text default 'medium',
  p_service_provider text default null,
  p_estimated_cost numeric default 0,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  y public.yacht_os_yachts%rowtype;

  v_job_id uuid;

  v_conflict_count integer;
begin

  if p_planned_start is null
     or p_planned_end is null
     or p_planned_end < p_planned_start
  then
    raise exception
      'Invalid maintenance dates';
  end if;


  if nullif(
    trim(
      p_title
    ),
    ''
  ) is null then
    raise exception
      'Maintenance title is required';
  end if;


  if p_estimated_cost < 0 then
    raise exception
      'Estimated cost cannot be negative';
  end if;


  if p_priority not in (
    'low',
    'medium',
    'high',
    'critical'
  ) then
    raise exception
      'Invalid priority';
  end if;


  if p_maintenance_type not in (
    'periodic',
    'engine',
    'electrical',
    'mechanical',
    'hull',
    'cleaning',
    'safety',
    'electronics',
    'repair',
    'inspection',
    'other'
  ) then
    raise exception
      'Invalid maintenance type';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id
  for update;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  -- ----------------------------------------------------------
  -- Do not overwrite booked / option / blocked / maintenance.
  -- Missing rows and explicit available rows are safe.
  -- ----------------------------------------------------------

  select count(*)
  into v_conflict_count

  from generate_series(
    p_planned_start,
    p_planned_end,
    interval '1 day'
  ) d(day)

  join public.yacht_os_availability a
    on a.yacht_id = y.id
   and a.day = d.day::date

  where
    a.status <> 'available'
    or a.booking_id is not null
    or a.maintenance_id is not null;


  if v_conflict_count > 0 then
    raise exception
      'Maintenance period conflicts with % unavailable day(s)',
      v_conflict_count;
  end if;


  insert into public.yacht_os_maintenance_jobs (
    company_id,
    yacht_id,

    maintenance_type,
    title,
    description,

    planned_start,
    planned_end,

    priority,
    status,

    service_provider,

    estimated_cost,
    currency,

    note,

    created_by
  )
  values (
    y.company_id,
    y.id,

    p_maintenance_type,
    trim(
      p_title
    ),
    nullif(
      trim(
        p_description
      ),
      ''
    ),

    p_planned_start,
    p_planned_end,

    p_priority,
    'planned',

    nullif(
      trim(
        p_service_provider
      ),
      ''
    ),

    p_estimated_cost,
    coalesce(
      nullif(
        trim(
          p_currency
        ),
        ''
      ),
      'TRY'
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_job_id;


  insert into public.yacht_os_availability as availability (
    company_id,
    yacht_id,
    day,
    status,
    maintenance_id,
    note
  )

  select
    y.company_id,
    y.id,
    d.day::date,
    'maintenance',
    v_job_id,
    'Bakım: ' ||
      trim(
        p_title
      )

  from generate_series(
    p_planned_start,
    p_planned_end,
    interval '1 day'
  ) d(day)

  on conflict (
    yacht_id,
    day
  )
  do update
  set
    status =
      'maintenance',

    maintenance_id =
      excluded.maintenance_id,

    booking_id =
      null,

    note =
      excluded.note

  where
    availability.status =
      'available'

    and availability.booking_id
      is null

    and availability.maintenance_id
      is null;


  if current_date between
     p_planned_start
     and p_planned_end
  then

    update public.yacht_os_yachts
    set status =
      'maintenance'
    where id =
      y.id
      and status <> 'passive';

  end if;


  return jsonb_build_object(
    'ok',
      true,

    'maintenance_id',
      v_job_id,

    'yacht_id',
      y.id,

    'planned_start',
      p_planned_start,

    'planned_end',
      p_planned_end
  );

end;
$$;


-- ============================================================
-- MAINTENANCE STATUS / COMPLETION
-- ============================================================

create or replace function
public.yacht_os_update_maintenance_status(
  p_maintenance_id uuid,
  p_status text,
  p_actual_cost numeric default null,
  p_engine_hours numeric default null,
  p_next_service_engine_hours numeric default null,
  p_next_maintenance_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.yacht_os_maintenance_jobs%rowtype;
  y public.yacht_os_yachts%rowtype;

  v_actual_cost numeric;
  v_finance_id uuid;

  v_other_active integer;
begin

  if p_status not in (
    'planned',
    'in_progress',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Invalid maintenance status';
  end if;


  if p_actual_cost is not null
     and p_actual_cost < 0
  then
    raise exception
      'Actual cost cannot be negative';
  end if;


  if p_engine_hours is not null
     and p_engine_hours < 0
  then
    raise exception
      'Engine hours cannot be negative';
  end if;


  select *
  into m
  from public.yacht_os_maintenance_jobs
  where id = p_maintenance_id
  for update;


  if m.id is null then
    raise exception
      'Maintenance not found';
  end if;


  if not public.is_active_company_member(
    m.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = m.yacht_id
  for update;


  if m.status = 'completed'
     and p_status <> 'completed'
  then
    raise exception
      'Completed maintenance cannot be reopened';
  end if;


  v_actual_cost :=
    coalesce(
      p_actual_cost,
      m.actual_cost,
      0
    );


  update public.yacht_os_maintenance_jobs
  set
    status =
      p_status,

    started_at =
      case
        when p_status = 'in_progress'
        then coalesce(
          started_at,
          now()
        )
        else started_at
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

    actual_cost =
      v_actual_cost,

    engine_hours_at_service =
      coalesce(
        p_engine_hours,
        engine_hours_at_service
      ),

    next_service_engine_hours =
      coalesce(
        p_next_service_engine_hours,
        next_service_engine_hours
      ),

    next_maintenance_date =
      coalesce(
        p_next_maintenance_date,
        next_maintenance_date
      ),

    note =
      coalesce(
        nullif(
          trim(
            p_note
          ),
          ''
        ),
        note
      )

  where id =
    m.id;


  if p_status = 'in_progress' then

    update public.yacht_os_yachts
    set
      status =
        'maintenance',

      engine_hours =
        coalesce(
          p_engine_hours,
          engine_hours
        )

    where id =
      y.id
      and status <> 'passive';

  end if;


  if p_status in (
    'completed',
    'cancelled'
  ) then

    update public.yacht_os_availability
    set
      status =
        'available',

      maintenance_id =
        null,

      note =
        null

    where maintenance_id =
      m.id
      and booking_id is null;


    select count(*)
    into v_other_active

    from public.yacht_os_maintenance_jobs other_job

    where
      other_job.yacht_id =
        y.id

      and other_job.id <>
        m.id

      and other_job.status in (
        'planned',
        'in_progress'
      )

      and current_date between
        other_job.planned_start
        and other_job.planned_end;


    if
      y.status = 'maintenance'
      and v_other_active = 0
    then

      update public.yacht_os_yachts
      set status =
        'available'
      where id =
        y.id;

    end if;

  end if;


  if p_status = 'completed' then

    update public.yacht_os_yachts
    set
      engine_hours =
        coalesce(
          p_engine_hours,
          engine_hours
        ),

      last_maintenance_date =
        current_date,

      next_maintenance_date =
        coalesce(
          p_next_maintenance_date,
          next_maintenance_date
        )

    where id =
      y.id;


    -- --------------------------------------------------------
    -- Record actual maintenance cost once.
    -- --------------------------------------------------------

    if
      v_actual_cost > 0
      and m.finance_entry_id is null
    then

      insert into public.yacht_os_finance_entries (
        company_id,
        entry_type,
        amount,
        currency,
        paid_at,
        description,
        created_by
      )
      values (
        m.company_id,
        'expense',
        v_actual_cost,
        m.currency,
        now(),
        'Yat bakım gideri: ' ||
          m.title,
        auth.uid()
      )
      returning id
      into v_finance_id;


      update public.yacht_os_maintenance_jobs
      set finance_entry_id =
        v_finance_id
      where id =
        m.id;

    end if;

  end if;


  return jsonb_build_object(
    'ok',
      true,

    'maintenance_id',
      m.id,

    'status',
      p_status,

    'actual_cost',
      v_actual_cost
  );

end;
$$;


-- ============================================================
-- UPDATE ENGINE HOURS
-- ============================================================

create or replace function
public.yacht_os_update_engine_hours(
  p_yacht_id uuid,
  p_engine_hours numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  y public.yacht_os_yachts%rowtype;
begin

  if p_engine_hours < 0 then
    raise exception
      'Engine hours cannot be negative';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id
  for update;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if p_engine_hours < y.engine_hours then
    raise exception
      'Engine hours cannot decrease';
  end if;


  update public.yacht_os_yachts
  set engine_hours =
    p_engine_hours
  where id =
    y.id;


  return jsonb_build_object(
    'ok',
      true,

    'engine_hours',
      p_engine_hours
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
  public.yacht_os_schedule_maintenance(
    uuid,
    text,
    text,
    text,
    date,
    date,
    text,
    text,
    numeric,
    text,
    text
  )
from public;


revoke execute
on function
  public.yacht_os_update_maintenance_status(
    uuid,
    text,
    numeric,
    numeric,
    numeric,
    date,
    text
  )
from public;


revoke execute
on function
  public.yacht_os_update_engine_hours(
    uuid,
    numeric
  )
from public;


grant execute
on function
  public.yacht_os_schedule_maintenance(
    uuid,
    text,
    text,
    text,
    date,
    date,
    text,
    text,
    numeric,
    text,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_update_maintenance_status(
    uuid,
    text,
    numeric,
    numeric,
    numeric,
    date,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_update_engine_hours(
    uuid,
    numeric
  )
to authenticated;
