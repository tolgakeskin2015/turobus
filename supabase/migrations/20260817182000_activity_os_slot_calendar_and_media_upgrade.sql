begin;

alter table public.package_activities
  add column if not exists short_description text,
  add column if not exists meeting_point text,
  add column if not exists gallery_image_urls text[] not null default '{}',
  add column if not exists highlights text[] not null default '{}',
  add column if not exists included_items text[] not null default '{}',
  add column if not exists excluded_items text[] not null default '{}',
  add column if not exists important_notes text,
  add column if not exists min_age integer,
  add column if not exists max_age integer,
  add column if not exists min_weight numeric(10,2),
  add column if not exists max_weight numeric(10,2),
  add column if not exists difficulty_level text,
  add column if not exists cancellation_policy text,
  add column if not exists meeting_instructions text,
  add column if not exists preparation_notes text;

alter table public.package_activity_slots
  add column if not exists end_time time,
  add column if not exists notes text;

create or replace function public.activity_os_save_slot(
  p_company_id uuid,
  p_activity_id uuid,
  p_slot_date date,
  p_start_time time,
  p_end_time time,
  p_capacity integer,
  p_sale_price numeric,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
  v_existing record;
  v_reserved integer := 0;
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Activity OS permission required';
  end if;

  if p_capacity <= 0 then
    raise exception 'Capacity must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.package_activities a
    where a.id = p_activity_id
      and a.company_id = p_company_id
      and a.is_active = true
  ) then
    raise exception 'Activity not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(
      'activity-os-slot-' ||
      p_company_id::text || '-' ||
      p_activity_id::text || '-' ||
      p_slot_date::text || '-' ||
      p_start_time::text
    )
  );

  select *
  into v_existing
  from public.package_activity_slots s
  where s.company_id = p_company_id
    and s.activity_id = p_activity_id
    and s.slot_date = p_slot_date
    and s.start_time = p_start_time
  order by s.created_at asc
  limit 1
  for update;

  if found then

    select coalesce(
      sum(b.quantity) filter (
        where b.status not in ('cancelled','no_show')
      ),
      0
    )::integer
    into v_reserved
    from public.activity_os_bookings b
    where b.slot_id = v_existing.id;

    if p_capacity < v_reserved then
      raise exception
        'Capacity cannot be lower than current reservation count (%)',
        v_reserved;
    end if;

    update public.package_activity_slots
    set
      capacity = p_capacity,
      reserved_count = v_reserved,
      sale_price = greatest(coalesce(p_sale_price,0),0),
      end_time = p_end_time,
      notes = nullif(trim(coalesce(p_notes,'')),''),
      status = case
        when v_reserved >= p_capacity then 'full'
        else 'open'
      end,
      updated_at = now()
    where id = v_existing.id
    returning id into v_slot_id;

  else

    insert into public.package_activity_slots (
      company_id,
      activity_id,
      slot_date,
      start_time,
      end_time,
      capacity,
      reserved_count,
      sale_price,
      currency,
      status,
      notes
    )
    values (
      p_company_id,
      p_activity_id,
      p_slot_date,
      p_start_time,
      p_end_time,
      p_capacity,
      0,
      greatest(coalesce(p_sale_price,0),0),
      'TRY',
      'open',
      nullif(trim(coalesce(p_notes,'')),'')
    )
    returning id into v_slot_id;

  end if;

  return jsonb_build_object(
    'ok', true,
    'slot_id', v_slot_id
  );

end;
$$;

grant execute
on function public.activity_os_save_slot(
  uuid,
  uuid,
  date,
  time,
  time,
  integer,
  numeric,
  text
)
to authenticated;


create or replace function public.get_activity_os_calendar(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'activity_id', s.activity_id,
          'activity_name', a.name,
          'slot_date', s.slot_date,
          'start_time', s.start_time,
          'end_time', s.end_time,
          'capacity', s.capacity,
          'reserved_count', coalesce(x.reserved_count,0),
          'remaining_count',
            greatest(
              s.capacity - coalesce(x.reserved_count,0),
              0
            ),
          'occupancy_percent',
            case
              when s.capacity <= 0 then 0
              else round(
                (
                  coalesce(x.reserved_count,0)::numeric
                  /
                  s.capacity::numeric
                ) * 100,
                1
              )
            end,
          'sale_price', s.sale_price,
          'currency', s.currency,
          'status',
            case
              when coalesce(x.reserved_count,0) >= s.capacity
                then 'full'
              else s.status
            end,
          'notes', s.notes
        )
        order by
          s.slot_date,
          s.start_time
      )
      from public.package_activity_slots s
      join public.package_activities a
        on a.id = s.activity_id
      left join lateral (
        select
          coalesce(
            sum(b.quantity) filter (
              where b.status not in ('cancelled','no_show')
            ),
            0
          )::integer as reserved_count
        from public.activity_os_bookings b
        where b.slot_id = s.id
      ) x on true
      where s.company_id = p_company_id
        and s.slot_date between p_from and p_to
    ),
    '[]'::jsonb
  );

end;
$$;

grant execute
on function public.get_activity_os_calendar(
  uuid,
  date,
  date
)
to authenticated;


create or replace function public.activity_os_recalculate_slot(
  p_company_id uuid,
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved integer;
  v_capacity integer;
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Activity OS permission required';
  end if;

  select capacity
  into v_capacity
  from public.package_activity_slots
  where id = p_slot_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Slot not found';
  end if;

  select coalesce(
    sum(quantity) filter (
      where status not in ('cancelled','no_show')
    ),
    0
  )::integer
  into v_reserved
  from public.activity_os_bookings
  where slot_id = p_slot_id;

  update public.package_activity_slots
  set
    reserved_count = v_reserved,
    status = case
      when v_reserved >= v_capacity then 'full'
      else 'open'
    end,
    updated_at = now()
  where id = p_slot_id;

  return jsonb_build_object(
    'ok', true,
    'capacity', v_capacity,
    'reserved_count', v_reserved,
    'remaining_count',
      greatest(
        v_capacity - v_reserved,
        0
      )
  );

end;
$$;

grant execute
on function public.activity_os_recalculate_slot(
  uuid,
  uuid
)
to authenticated;


insert into storage.buckets (
  id,
  name,
  public
)
values (
  'activity-media',
  'activity-media',
  true
)
on conflict (id)
do update set
  public = true;


drop policy if exists activity_media_public_read
on storage.objects;

create policy activity_media_public_read
on storage.objects
for select
to public
using (
  bucket_id = 'activity-media'
);


drop policy if exists activity_media_authenticated_insert
on storage.objects;

create policy activity_media_authenticated_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'activity-media'
);


drop policy if exists activity_media_authenticated_update
on storage.objects;

create policy activity_media_authenticated_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'activity-media'
)
with check (
  bucket_id = 'activity-media'
);


drop policy if exists activity_media_authenticated_delete
on storage.objects;

create policy activity_media_authenticated_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'activity-media'
);

commit;
