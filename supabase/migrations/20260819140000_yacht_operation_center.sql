
-- ============================================================
-- TUROBUS YACHT OPERATION CENTER
-- Manifest + check-in + crew + services + timeline
-- ============================================================


-- ============================================================
-- BOOKING OPERATION FIELDS
-- ============================================================

alter table public.yacht_os_bookings
  add column if not exists meeting_point text;

alter table public.yacht_os_bookings
  add column if not exists meeting_time timestamptz;

alter table public.yacht_os_bookings
  add column if not exists check_in_status text
    not null default 'pending';

alter table public.yacht_os_bookings
  add column if not exists checked_in_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists no_show_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists actual_departure_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists actual_return_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists operation_note text;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'yacht_os_bookings_check_in_status_check'
  ) then

    alter table public.yacht_os_bookings
      add constraint
      yacht_os_bookings_check_in_status_check
      check (
        check_in_status in (
          'pending',
          'arrived',
          'checked_in',
          'boarded',
          'no_show'
        )
      );

  end if;

end $$;


-- ============================================================
-- PASSENGER MANIFEST
-- ============================================================

create table if not exists public.yacht_os_booking_guests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  full_name text not null,

  phone text,

  nationality text,

  identity_document text,

  birth_date date,

  is_lead_guest boolean not null
    default false,

  check_in_status text not null
    default 'pending'
    check (
      check_in_status in (
        'pending',
        'arrived',
        'checked_in',
        'boarded',
        'no_show'
      )
    ),

  checked_in_at timestamptz,

  note text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_booking_guests_booking_idx
on public.yacht_os_booking_guests (
  booking_id,
  check_in_status
);


-- ============================================================
-- CREW ASSIGNMENTS
-- ============================================================

create table if not exists public.yacht_os_booking_crew (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  full_name text not null,

  role text not null
    check (
      role in (
        'captain',
        'deckhand',
        'hostess',
        'chef',
        'guide',
        'photographer',
        'other'
      )
    ),

  phone text,

  status text not null
    default 'assigned'
    check (
      status in (
        'assigned',
        'confirmed',
        'on_board',
        'completed',
        'cancelled'
      )
    ),

  note text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_booking_crew_booking_idx
on public.yacht_os_booking_crew (
  booking_id,
  status
);


-- ============================================================
-- OPERATION SERVICES / PREPARATION ITEMS
-- ============================================================

create table if not exists public.yacht_os_booking_services (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  service_type text not null
    check (
      service_type in (
        'fuel',
        'catering',
        'decoration',
        'transfer',
        'cleaning',
        'ice',
        'beverage',
        'equipment',
        'photography',
        'activity',
        'other'
      )
    ),

  title text not null,

  supplier_name text,

  quantity numeric(10,2) not null
    default 1,

  cost_amount numeric(14,2) not null
    default 0,

  sale_amount numeric(14,2) not null
    default 0,

  currency text not null
    default 'TRY',

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'ordered',
        'ready',
        'delivered',
        'completed',
        'cancelled'
      )
    ),

  due_at timestamptz,

  note text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_booking_services_booking_idx
on public.yacht_os_booking_services (
  booking_id,
  status
);


-- ============================================================
-- OPERATION TIMELINE / AUDIT
-- ============================================================

create table if not exists public.yacht_os_operation_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  event_type text not null,

  event_label text not null,

  old_value jsonb,

  new_value jsonb,

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  yacht_operation_events_booking_idx
on public.yacht_os_operation_events (
  booking_id,
  created_at desc
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_booking_guests_updated_at
on public.yacht_os_booking_guests;

create trigger
  yacht_booking_guests_updated_at
before update
on public.yacht_os_booking_guests
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_booking_crew_updated_at
on public.yacht_os_booking_crew;

create trigger
  yacht_booking_crew_updated_at
before update
on public.yacht_os_booking_crew
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_booking_services_updated_at
on public.yacht_os_booking_services;

create trigger
  yacht_booking_services_updated_at
before update
on public.yacht_os_booking_services
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_booking_guests
enable row level security;

alter table public.yacht_os_booking_crew
enable row level security;

alter table public.yacht_os_booking_services
enable row level security;

alter table public.yacht_os_operation_events
enable row level security;


create policy yacht_booking_guests_company_access
on public.yacht_os_booking_guests
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


create policy yacht_booking_crew_company_access
on public.yacht_os_booking_crew
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


create policy yacht_booking_services_company_access
on public.yacht_os_booking_services
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


create policy yacht_operation_events_company_access
on public.yacht_os_operation_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select, insert, update, delete
on
  public.yacht_os_booking_guests,
  public.yacht_os_booking_crew,
  public.yacht_os_booking_services
to authenticated;


grant select
on public.yacht_os_operation_events
to authenticated;


-- ============================================================
-- BOOKING OPERATION ACTION
-- ============================================================

create or replace function
public.yacht_os_operation_action(
  p_booking_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;

  v_old_operation text;
  v_old_checkin text;

  v_new_operation text;
  v_new_checkin text;

  v_label text;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  v_old_operation :=
    b.operation_status;

  v_old_checkin :=
    b.check_in_status;

  v_new_operation :=
    b.operation_status;

  v_new_checkin :=
    b.check_in_status;


  if p_action = 'guest_arrived' then

    v_new_checkin :=
      'arrived';

    v_new_operation :=
      'guest_arrived';

    v_label :=
      'Misafir buluşma noktasına geldi';


  elsif p_action = 'check_in' then

    v_new_checkin :=
      'checked_in';

    v_new_operation :=
      'guest_arrived';

    v_label :=
      'Check-in tamamlandı';


  elsif p_action = 'boarded' then

    v_new_checkin :=
      'boarded';

    v_new_operation :=
      'ready';

    v_label :=
      'Misafirler tekneye alındı';


  elsif p_action = 'depart' then

    if b.check_in_status not in (
      'checked_in',
      'boarded'
    ) then
      raise exception
        'Departure requires completed check-in';
    end if;

    v_new_operation :=
      'departed';

    v_label :=
      'Tekne hareket etti';


  elsif p_action = 'cruising' then

    v_new_operation :=
      'cruising';

    v_label :=
      'Seyir başladı';


  elsif p_action = 'returning' then

    v_new_operation :=
      'returning';

    v_label :=
      'Dönüş başladı';


  elsif p_action = 'complete' then

    v_new_operation :=
      'completed';

    v_label :=
      'Operasyon tamamlandı';


  elsif p_action = 'no_show' then

    v_new_checkin :=
      'no_show';

    v_label :=
      'Misafir no-show olarak işaretlendi';


  else

    raise exception
      'Invalid operation action';

  end if;


  update public.yacht_os_bookings
  set

    check_in_status =
      v_new_checkin,

    operation_status =
      v_new_operation,

    checked_in_at =
      case
        when p_action = 'check_in'
        then coalesce(
          checked_in_at,
          now()
        )
        else checked_in_at
      end,

    no_show_at =
      case
        when p_action = 'no_show'
        then coalesce(
          no_show_at,
          now()
        )
        else no_show_at
      end,

    actual_departure_at =
      case
        when p_action = 'depart'
        then coalesce(
          actual_departure_at,
          now()
        )
        else actual_departure_at
      end,

    actual_return_at =
      case
        when p_action = 'complete'
        then coalesce(
          actual_return_at,
          now()
        )
        else actual_return_at
      end,

    operation_note =
      case
        when nullif(
          trim(
            p_note
          ),
          ''
        ) is not null
        then nullif(
          trim(
            p_note
          ),
          ''
        )
        else operation_note
      end

  where id =
    b.id;


  insert into public.yacht_os_operation_events (
    company_id,
    booking_id,
    yacht_id,

    event_type,
    event_label,

    old_value,
    new_value,

    note,

    created_by
  )
  values (
    b.company_id,
    b.id,
    b.yacht_id,

    p_action,
    v_label,

    jsonb_build_object(
      'operation_status',
        v_old_operation,

      'check_in_status',
        v_old_checkin
    ),

    jsonb_build_object(
      'operation_status',
        v_new_operation,

      'check_in_status',
        v_new_checkin
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'booking_id',
      b.id,

    'operation_status',
      v_new_operation,

    'check_in_status',
      v_new_checkin
  );

end;
$$;


grant execute
on function
  public.yacht_os_operation_action(
    uuid,
    text,
    text
  )
to authenticated;


-- ============================================================
-- BOOKING OPERATION PLAN
-- ============================================================

create or replace function
public.yacht_os_update_operation_plan(
  p_booking_id uuid,
  p_meeting_point text default null,
  p_meeting_time timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_bookings
  set
    meeting_point =
      nullif(
        trim(
          p_meeting_point
        ),
        ''
      ),

    meeting_time =
      p_meeting_time,

    operation_note =
      nullif(
        trim(
          p_note
        ),
        ''
      )

  where id =
    b.id;


  insert into public.yacht_os_operation_events (
    company_id,
    booking_id,
    yacht_id,
    event_type,
    event_label,
    new_value,
    note,
    created_by
  )
  values (
    b.company_id,
    b.id,
    b.yacht_id,

    'operation_plan_updated',

    'Operasyon planı güncellendi',

    jsonb_build_object(
      'meeting_point',
        p_meeting_point,

      'meeting_time',
        p_meeting_time
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


grant execute
on function
  public.yacht_os_update_operation_plan(
    uuid,
    text,
    timestamptz,
    text
  )
to authenticated;
