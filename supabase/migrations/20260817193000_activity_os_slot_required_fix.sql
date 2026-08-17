begin;

create or replace function public.activity_os_booking_slot_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires_slot boolean;
  v_slot record;
  v_reserved integer := 0;
begin

  select coalesce(a.requires_slot, true)
  into v_requires_slot
  from public.package_activities a
  where a.id = new.activity_id
    and a.company_id = new.company_id;

  if not found then
    raise exception 'Aktivite bulunamadı';
  end if;

  if v_requires_slot
     and new.status not in ('cancelled','no_show')
     and new.slot_id is null
  then
    raise exception 'Bu aktivite için slot seçmek zorunludur';
  end if;

  if new.slot_id is null then
    return new;
  end if;

  select
    s.id,
    s.company_id,
    s.activity_id,
    s.capacity,
    s.slot_date,
    s.start_time
  into v_slot
  from public.package_activity_slots s
  where s.id = new.slot_id
  for update;

  if not found then
    raise exception 'Slot bulunamadı';
  end if;

  if v_slot.company_id <> new.company_id then
    raise exception 'Slot başka firmaya ait';
  end if;

  if v_slot.activity_id <> new.activity_id then
    raise exception 'Slot bu aktiviteye ait değil';
  end if;

  select coalesce(sum(b.quantity),0)::integer
  into v_reserved
  from public.activity_os_bookings b
  where b.slot_id = new.slot_id
    and b.status not in ('cancelled','no_show')
    and (
      tg_op = 'INSERT'
      or b.id <> new.id
    );

  if new.status not in ('cancelled','no_show')
     and v_reserved + new.quantity > v_slot.capacity
  then
    raise exception
      'Yetersiz kapasite. Kapasite %, mevcut %, istenen %',
      v_slot.capacity,
      v_reserved,
      new.quantity;
  end if;

  new.service_date = v_slot.slot_date;
  new.start_time = v_slot.start_time;

  return new;
end;
$$;

drop trigger if exists trg_activity_os_booking_slot_guard
on public.activity_os_bookings;

create trigger trg_activity_os_booking_slot_guard
before insert or update of slot_id,quantity,status,activity_id
on public.activity_os_bookings
for each row
execute function public.activity_os_booking_slot_guard();


create or replace function public.activity_os_sync_slot_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_id uuid;
begin

  if tg_op = 'DELETE' then
    v_slot_id := old.slot_id;
  else
    v_slot_id := new.slot_id;
  end if;

  if v_slot_id is not null then
    update public.package_activity_slots s
    set
      reserved_count = coalesce(
        (
          select sum(b.quantity)
          from public.activity_os_bookings b
          where b.slot_id = s.id
            and b.status not in ('cancelled','no_show')
        ),
        0
      ),
      status = case
        when coalesce(
          (
            select sum(b.quantity)
            from public.activity_os_bookings b
            where b.slot_id = s.id
              and b.status not in ('cancelled','no_show')
          ),
          0
        ) >= s.capacity
        then 'full'
        else 'open'
      end,
      updated_at = now()
    where s.id = v_slot_id;
  end if;

  if tg_op = 'UPDATE'
     and old.slot_id is distinct from new.slot_id
     and old.slot_id is not null
  then
    update public.package_activity_slots s
    set
      reserved_count = coalesce(
        (
          select sum(b.quantity)
          from public.activity_os_bookings b
          where b.slot_id = s.id
            and b.status not in ('cancelled','no_show')
        ),
        0
      ),
      status = case
        when coalesce(
          (
            select sum(b.quantity)
            from public.activity_os_bookings b
            where b.slot_id = s.id
              and b.status not in ('cancelled','no_show')
          ),
          0
        ) >= s.capacity
        then 'full'
        else 'open'
      end,
      updated_at = now()
    where s.id = old.slot_id;
  end if;

  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_activity_os_sync_slot_count
on public.activity_os_bookings;

create trigger trg_activity_os_sync_slot_count
after insert or update or delete
on public.activity_os_bookings
for each row
execute function public.activity_os_sync_slot_count();


update public.package_activity_slots s
set
  reserved_count = coalesce(
    (
      select sum(b.quantity)
      from public.activity_os_bookings b
      where b.slot_id = s.id
        and b.status not in ('cancelled','no_show')
    ),
    0
  ),
  status = case
    when coalesce(
      (
        select sum(b.quantity)
        from public.activity_os_bookings b
        where b.slot_id = s.id
          and b.status not in ('cancelled','no_show')
      ),
      0
    ) >= s.capacity
    then 'full'
    else 'open'
  end;

commit;
