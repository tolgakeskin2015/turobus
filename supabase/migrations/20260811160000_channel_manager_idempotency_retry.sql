do $$
begin
  if exists (
    select 1
    from public.hotel_channel_reservation_inbox
    where event_fingerprint is not null
    group by connection_id, event_fingerprint
    having count(*) > 1
  ) then
    raise exception
      'Duplicate channel reservation inbox fingerprint records exist.';
  end if;
end;
$$;

create unique index if not exists
hotel_channel_inbox_connection_fingerprint_uidx
on public.hotel_channel_reservation_inbox (
  connection_id,
  event_fingerprint
)
where event_fingerprint is not null;


do $$
begin
  if exists (
    select 1
    from public.hotel_channel_room_mappings
    where is_active = true
    group by
      connection_id,
      external_room_id,
      coalesce(external_rate_plan_id, '')
    having count(*) > 1
  ) then
    raise exception
      'Duplicate active OTA room/rate mappings exist.';
  end if;
end;
$$;

create unique index if not exists
hotel_channel_active_external_mapping_uidx
on public.hotel_channel_room_mappings (
  connection_id,
  external_room_id,
  coalesce(external_rate_plan_id, '')
)
where is_active = true;


do $$
begin
  if exists (
    select 1
    from public.hotel_reservations
    where reservation_no is not null
      and lower(coalesce(source, '')) in (
        'booking',
        'expedia',
        'hotelbeds',
        'airbnb'
      )
    group by company_id, reservation_no
    having count(*) > 1
  ) then
    raise exception
      'Duplicate OTA PMS reservation numbers exist.';
  end if;
end;
$$;

create unique index if not exists
hotel_reservations_ota_reservation_no_uidx
on public.hotel_reservations (
  company_id,
  reservation_no
)
where reservation_no is not null
  and lower(coalesce(source, '')) in (
    'booking',
    'expedia',
    'hotelbeds',
    'airbnb'
  );


create index if not exists
hotel_channel_sync_queue_worker_idx
on public.hotel_channel_sync_queue (
  status,
  available_at,
  priority,
  created_at
);

create index if not exists
hotel_channel_inbox_worker_idx
on public.hotel_channel_reservation_inbox (
  processing_status,
  received_at
);


create or replace function
public.claim_hotel_channel_queue_item()
returns public.hotel_channel_sync_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.hotel_channel_sync_queue;
begin
  select q.*
  into v_item
  from public.hotel_channel_sync_queue q
  where q.status = 'pending'
    and q.available_at <= now()
  order by
    q.priority asc,
    q.created_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.hotel_channel_sync_queue
  set
    status = 'processing',
    attempt_count = coalesce(attempt_count, 0) + 1,
    started_at = now(),
    completed_at = null,
    error_message = null,
    updated_at = now()
  where id = v_item.id
  returning *
  into v_item;

  return v_item;
end;
$$;

revoke all
on function public.claim_hotel_channel_queue_item()
from public;

revoke execute
on function public.claim_hotel_channel_queue_item()
from anon;

revoke execute
on function public.claim_hotel_channel_queue_item()
from authenticated;

grant execute
on function public.claim_hotel_channel_queue_item()
to service_role;


create or replace function
public.claim_hotel_channel_inbox_item()
returns public.hotel_channel_reservation_inbox
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.hotel_channel_reservation_inbox;
begin
  select i.*
  into v_item
  from public.hotel_channel_reservation_inbox i
  where i.processing_status = 'ready'
  order by i.received_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.hotel_channel_reservation_inbox
  set
    processing_status = 'processing',
    error_message = null,
    updated_at = now()
  where id = v_item.id
  returning *
  into v_item;

  return v_item;
end;
$$;

revoke all
on function public.claim_hotel_channel_inbox_item()
from public;

revoke execute
on function public.claim_hotel_channel_inbox_item()
from anon;

revoke execute
on function public.claim_hotel_channel_inbox_item()
from authenticated;

grant execute
on function public.claim_hotel_channel_inbox_item()
to service_role;
