alter table public.hotel_channel_room_mappings
add column if not exists external_room_name text;

alter table public.hotel_channel_room_mappings
add column if not exists external_rate_plan_name text;

alter table public.hotel_channel_room_mappings
add column if not exists occupancy_code text;

alter table public.hotel_channel_room_mappings
add column if not exists pricing_model text
not null default 'per_room'
check (
  pricing_model in (
    'per_room',
    'per_person',
    'occupancy_based'
  )
);

alter table public.hotel_channel_room_mappings
add column if not exists currency text
not null default 'TRY';

alter table public.hotel_channel_room_mappings
add column if not exists markup_percent numeric(8,4)
not null default 0;

alter table public.hotel_channel_room_mappings
add column if not exists commission_percent numeric(8,4)
not null default 0;

alter table public.hotel_channel_room_mappings
add column if not exists last_sync_at timestamptz;

alter table public.hotel_channel_room_mappings
add column if not exists last_error_message text;


create or replace function
public.validate_hotel_channel_mapping(
  p_company_id uuid,
  p_connection_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection
    public.hotel_channel_connections;

  v_total_room_types integer := 0;
  v_active_mappings integer := 0;
  v_missing_room_types integer := 0;
  v_missing_rate_plans integer := 0;

  v_ready boolean := false;
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
    and company_id = p_company_id;

  if not found then
    raise exception
      'Kanal bağlantısı bulunamadı.';
  end if;

  select count(*)
  into v_total_room_types
  from public.hotel_room_types room_type
  where room_type.company_id =
      p_company_id
    and room_type.hotel_id =
      v_connection.hotel_id
    and coalesce(
      room_type.is_active,
      true
    ) = true;

  select count(*)
  into v_active_mappings
  from public.hotel_channel_room_mappings mapping
  where mapping.company_id =
      p_company_id
    and mapping.connection_id =
      p_connection_id
    and mapping.is_active = true;

  select count(*)
  into v_missing_room_types
  from public.hotel_room_types room_type
  where room_type.company_id =
      p_company_id
    and room_type.hotel_id =
      v_connection.hotel_id
    and coalesce(
      room_type.is_active,
      true
    ) = true
    and not exists (
      select 1
      from public.hotel_channel_room_mappings mapping
      where mapping.company_id =
          p_company_id
        and mapping.connection_id =
          p_connection_id
        and mapping.room_type_id =
          room_type.id
        and mapping.is_active = true
    );

  select count(*)
  into v_missing_rate_plans
  from public.hotel_channel_room_mappings mapping
  where mapping.company_id =
      p_company_id
    and mapping.connection_id =
      p_connection_id
    and mapping.is_active = true
    and (
      mapping.rate_plan_id is null
      or mapping.external_rate_plan_id is null
      or trim(
        mapping.external_rate_plan_id
      ) = ''
    );

  v_ready :=
    v_total_room_types > 0
    and v_missing_room_types = 0
    and v_missing_rate_plans = 0;

  return jsonb_build_object(
    'ready',
    v_ready,

    'connection_id',
    p_connection_id,

    'channel_code',
    v_connection.channel_code,

    'total_room_types',
    v_total_room_types,

    'active_mappings',
    v_active_mappings,

    'missing_room_types',
    v_missing_room_types,

    'missing_rate_plans',
    v_missing_rate_plans,

    'message',
    case
      when v_total_room_types = 0
      then
        'Otel için aktif oda tipi bulunmuyor.'

      when v_missing_room_types > 0
      then
        v_missing_room_types ||
        ' oda tipi henüz kanalla eşleştirilmemiş.'

      when v_missing_rate_plans > 0
      then
        v_missing_rate_plans ||
        ' eşleşmede fiyat planı bilgisi eksik.'

      else
        'Kanal eşleştirmeleri senkronizasyona hazır.'
    end
  );
end;
$$;


create or replace function
public.enqueue_validated_channel_full_sync(
  p_company_id uuid,
  p_connection_id uuid
)
returns public.hotel_channel_sync_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_connection
    public.hotel_channel_connections;

  v_validation jsonb;

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
    and company_id = p_company_id;

  if not found then
    raise exception
      'Kanal bağlantısı bulunamadı.';
  end if;

  v_validation :=
    public.validate_hotel_channel_mapping(
      p_company_id,
      p_connection_id
    );

  if not coalesce(
    (
      v_validation ->> 'ready'
    )::boolean,
    false
  ) then
    raise exception
      '%',
      v_validation ->> 'message';
  end if;

  select *
  into v_queue
  from public.enqueue_hotel_channel_sync(
    p_company_id,
    v_connection.hotel_id,
    p_connection_id,
    'full_sync',
    jsonb_build_object(
      'validation',
      v_validation,

      'requested_at',
      now(),

      'mapping_count',
      v_validation ->
        'active_mappings'
    ),
    50
  );

  return v_queue;
end;
$$;


grant execute
on function public.validate_hotel_channel_mapping(
  uuid,
  uuid
)
to authenticated;

grant execute
on function public.enqueue_validated_channel_full_sync(
  uuid,
  uuid
)
to authenticated;
