create table if not exists public.hotel_channel_connections (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  channel_code text not null
    check (
      channel_code in (
        'booking',
        'expedia',
        'hotelbeds',
        'airbnb',
        'ets',
        'jolly',
        'tatilliyoruz',
        'website',
        'custom'
      )
    ),

  connection_name text not null,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'active',
        'paused',
        'error',
        'disconnected'
      )
    ),

  external_hotel_id text,

  endpoint_url text,

  credentials jsonb not null
    default '{}'::jsonb,

  settings jsonb not null
    default '{}'::jsonb,

  sync_inventory boolean
    not null default true,

  sync_rates boolean
    not null default true,

  sync_restrictions boolean
    not null default true,

  import_reservations boolean
    not null default true,

  last_sync_at timestamptz,

  last_success_at timestamptz,

  last_error_at timestamptz,

  last_error_message text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique (
    company_id,
    hotel_id,
    channel_code
  )
);


create table if not exists public.hotel_channel_room_mappings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  connection_id uuid not null
    references public.hotel_channel_connections(id)
    on delete cascade,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete cascade,

  rate_plan_id uuid
    references public.hotel_rate_plans(id)
    on delete set null,

  external_room_id text not null,

  external_rate_plan_id text,

  is_active boolean
    not null default true,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique (
    connection_id,
    room_type_id,
    rate_plan_id
  )
);


create table if not exists public.hotel_channel_sync_queue (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  connection_id uuid not null
    references public.hotel_channel_connections(id)
    on delete cascade,

  operation_type text not null
    check (
      operation_type in (
        'inventory_update',
        'rate_update',
        'restriction_update',
        'reservation_import',
        'reservation_acknowledge',
        'full_sync',
        'connection_test'
      )
    ),

  entity_type text,

  entity_id uuid,

  payload jsonb not null
    default '{}'::jsonb,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),

  priority integer
    not null default 100,

  attempt_count integer
    not null default 0,

  max_attempts integer
    not null default 5,

  available_at timestamptz
    not null default now(),

  started_at timestamptz,

  completed_at timestamptz,

  error_message text,

  response_payload jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create table if not exists public.hotel_channel_sync_logs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  connection_id uuid not null
    references public.hotel_channel_connections(id)
    on delete cascade,

  queue_id uuid
    references public.hotel_channel_sync_queue(id)
    on delete set null,

  direction text not null
    check (
      direction in (
        'outbound',
        'inbound'
      )
    ),

  event_type text not null,

  status text not null
    check (
      status in (
        'success',
        'warning',
        'error'
      )
    ),

  request_payload jsonb,

  response_payload jsonb,

  message text,

  duration_ms integer,

  created_at timestamptz
    not null default now()
);


create index if not exists
hotel_channel_connections_company_idx
on public.hotel_channel_connections (
  company_id,
  hotel_id
);

create index if not exists
hotel_channel_sync_queue_status_idx
on public.hotel_channel_sync_queue (
  status,
  priority,
  available_at
);

create index if not exists
hotel_channel_sync_logs_connection_idx
on public.hotel_channel_sync_logs (
  connection_id,
  created_at desc
);


alter table public.hotel_channel_connections
enable row level security;

alter table public.hotel_channel_room_mappings
enable row level security;

alter table public.hotel_channel_sync_queue
enable row level security;

alter table public.hotel_channel_sync_logs
enable row level security;


grant select, insert, update, delete
on
  public.hotel_channel_connections,
  public.hotel_channel_room_mappings,
  public.hotel_channel_sync_queue,
  public.hotel_channel_sync_logs
to authenticated;


drop policy if exists
"Members manage channel connections"
on public.hotel_channel_connections;

create policy
"Members manage channel connections"
on public.hotel_channel_connections
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage channel mappings"
on public.hotel_channel_room_mappings;

create policy
"Members manage channel mappings"
on public.hotel_channel_room_mappings
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage channel queue"
on public.hotel_channel_sync_queue;

create policy
"Members manage channel queue"
on public.hotel_channel_sync_queue
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members read channel logs"
on public.hotel_channel_sync_logs;

create policy
"Members read channel logs"
on public.hotel_channel_sync_logs
for select
to authenticated
using (
  public.is_company_member(company_id)
);


create or replace function
public.enqueue_hotel_channel_sync(
  p_company_id uuid,
  p_hotel_id uuid,
  p_connection_id uuid,
  p_operation_type text,
  p_payload jsonb default '{}'::jsonb,
  p_priority integer default 100
)
returns public.hotel_channel_sync_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection
    public.hotel_channel_connections;

  v_queue
    public.hotel_channel_sync_queue;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_connection
  from public.hotel_channel_connections
  where id = p_connection_id
    and company_id = p_company_id
    and hotel_id = p_hotel_id;

  if not found then
    raise exception
      'Kanal bağlantısı bulunamadı.';
  end if;

  if p_operation_type not in (
    'inventory_update',
    'rate_update',
    'restriction_update',
    'reservation_import',
    'reservation_acknowledge',
    'full_sync',
    'connection_test'
  ) then
    raise exception
      'Geçersiz senkronizasyon işlemi.';
  end if;

  insert into public.hotel_channel_sync_queue (
    company_id,
    hotel_id,
    connection_id,
    operation_type,
    payload,
    priority,
    status,
    created_by
  )
  values (
    p_company_id,
    p_hotel_id,
    p_connection_id,
    p_operation_type,
    coalesce(
      p_payload,
      '{}'::jsonb
    ),
    p_priority,
    'pending',
    auth.uid()
  )
  returning *
  into v_queue;

  return v_queue;
end;
$$;


create or replace function
public.simulate_hotel_channel_queue_item(
  p_company_id uuid,
  p_queue_id uuid
)
returns public.hotel_channel_sync_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue
    public.hotel_channel_sync_queue;

  v_connection
    public.hotel_channel_connections;

  v_started_at timestamptz;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_queue
  from public.hotel_channel_sync_queue
  where id = p_queue_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Senkronizasyon kuyruğu bulunamadı.';
  end if;

  select *
  into v_connection
  from public.hotel_channel_connections
  where id = v_queue.connection_id;

  v_started_at := clock_timestamp();

  update public.hotel_channel_sync_queue
  set
    status = 'processing',
    attempt_count =
      attempt_count + 1,
    started_at = now(),
    error_message = null,
    updated_at = now()
  where id = v_queue.id;

  if v_connection.status not in (
    'active',
    'draft'
  ) then
    update public.hotel_channel_sync_queue
    set
      status = 'failed',
      completed_at = now(),
      error_message =
        'Kanal bağlantısı aktif değil.',
      updated_at = now()
    where id = v_queue.id
    returning *
    into v_queue;

    insert into public.hotel_channel_sync_logs (
      company_id,
      hotel_id,
      connection_id,
      queue_id,
      direction,
      event_type,
      status,
      request_payload,
      message,
      duration_ms
    )
    values (
      v_queue.company_id,
      v_queue.hotel_id,
      v_queue.connection_id,
      v_queue.id,
      'outbound',
      v_queue.operation_type,
      'error',
      v_queue.payload,
      v_queue.error_message,
      extract(
        epoch from (
          clock_timestamp() -
          v_started_at
        )
      ) * 1000
    );

    return v_queue;
  end if;

  update public.hotel_channel_sync_queue
  set
    status = 'completed',
    completed_at = now(),
    response_payload =
      jsonb_build_object(
        'simulation', true,
        'channel',
        v_connection.channel_code,
        'operation',
        operation_type,
        'message',
        'Senkronizasyon simülasyonu başarıyla tamamlandı.'
      ),
    updated_at = now()
  where id = v_queue.id
  returning *
  into v_queue;

  update public.hotel_channel_connections
  set
    last_sync_at = now(),
    last_success_at = now(),
    last_error_message = null,
    updated_at = now()
  where id = v_queue.connection_id;

  insert into public.hotel_channel_sync_logs (
    company_id,
    hotel_id,
    connection_id,
    queue_id,
    direction,
    event_type,
    status,
    request_payload,
    response_payload,
    message,
    duration_ms
  )
  values (
    v_queue.company_id,
    v_queue.hotel_id,
    v_queue.connection_id,
    v_queue.id,
    'outbound',
    v_queue.operation_type,
    'success',
    v_queue.payload,
    v_queue.response_payload,
    'Simülasyon işlemi başarıyla tamamlandı.',
    extract(
      epoch from (
        clock_timestamp() -
        v_started_at
      )
    ) * 1000
  );

  return v_queue;
end;
$$;


grant execute
on function public.enqueue_hotel_channel_sync(
  uuid,
  uuid,
  uuid,
  text,
  jsonb,
  integer
)
to authenticated;

grant execute
on function public.simulate_hotel_channel_queue_item(
  uuid,
  uuid
)
to authenticated;
