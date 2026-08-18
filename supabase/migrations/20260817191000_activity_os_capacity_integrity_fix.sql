begin;

-- =========================================================
-- 1. ESKİ SLOTSUZ REZERVASYONLARI MÜMKÜNSE OTOMATİK BAĞLA
-- Aynı firma + aktivite + gün için tek uygun slot varsa bağlanır.
-- =========================================================

with candidates as (
  select
    b.id as booking_id,
    min(s.id::text)::uuid as slot_id,
    count(*) as slot_count
  from public.activity_os_bookings b
  join public.package_activity_slots s
    on s.company_id = b.company_id
   and s.activity_id = b.activity_id
   and s.slot_date = b.service_date
   and (
     b.start_time is null
     or s.start_time = b.start_time
   )
  where b.slot_id is null
    and b.status not in ('cancelled','no_show')
  group by b.id
)
update public.activity_os_bookings b
set
  slot_id = c.slot_id,
  start_time = coalesce(
    b.start_time,
    s.start_time
  ),
  updated_at = now()
from candidates c
join public.package_activity_slots s
  on s.id = c.slot_id
where b.id = c.booking_id
  and c.slot_count = 1;


-- =========================================================
-- 2. SLOT KAPASİTE KONTROLÜ
-- Slotsuz rezervasyonu engeller.
-- Fazla rezervasyonu DB seviyesinde engeller.
-- =========================================================

create or replace function public.activity_os_booking_capacity_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requires_slot boolean;
  v_slot record;
  v_existing_reserved integer := 0;
begin

  select coalesce(
    a.requires_slot,
    true
  )
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
    raise exception
      'Bu aktivite için tarih ve saat slotu seçmek zorunludur.';
  end if;


  if new.slot_id is null then
    return new;
  end if;


  select
    s.id,
    s.company_id,
    s.activity_id,
    s.capacity,
    s.status,
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
    raise exception 'Slot seçilen aktiviteye ait değil';
  end if;


  if new.status not in ('cancelled','no_show') then

    select coalesce(
      sum(b.quantity),
      0
    )::integer
    into v_existing_reserved
    from public.activity_os_bookings b
    where b.slot_id = new.slot_id
      and b.status not in ('cancelled','no_show')
      and (
        tg_op = 'INSERT'
        or b.id <> new.id
      );


    if (
      v_existing_reserved +
      greatest(
        coalesce(new.quantity,1),
        1
      )
    ) > v_slot.capacity
    then
      raise exception
        'Yetersiz kapasite. Kapasite: %, dolu: %, istenen: %',
        v_slot.capacity,
        v_existing_reserved,
        new.quantity;
    end if;

  end if;


  -- Rezervasyon tarihi/saatini slotla senkron tut.
  new.service_date :=
    v_slot.slot_date;

  new.start_time :=
    v_slot.start_time;


  return new;

end;
$$;


drop trigger if exists trg_activity_os_booking_capacity_guard
on public.activity_os_bookings;

create trigger trg_activity_os_booking_capacity_guard
before insert or update of
  slot_id,
  quantity,
  status,
  activity_id
on public.activity_os_bookings
for each row
execute function public.activity_os_booking_capacity_guard();


-- =========================================================
-- 3. SLOT COUNTER OTOMASYONU
-- Her rezervasyon değişiminde reserved_count gerçek veriden hesaplanır.
-- =========================================================

create or replace function public.activity_os_sync_slot_counter(
  p_slot_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved integer := 0;
  v_capacity integer := 0;
begin

  if p_slot_id is null then
    return;
  end if;


  select s.capacity
  into v_capacity
  from public.package_activity_slots s
  where s.id = p_slot_id
  for update;


  if not found then
    return;
  end if;


  select coalesce(
    sum(b.quantity),
    0
  )::integer
  into v_reserved
  from public.activity_os_bookings b
  where b.slot_id = p_slot_id
    and b.status not in (
      'cancelled',
      'no_show'
    );


  update public.package_activity_slots
  set
    reserved_count =
      v_reserved,

    status =
      case
        when v_reserved >=
          v_capacity
          then 'full'

        when status = 'full'
          then 'open'

        else status
      end,

    updated_at =
      now()
  where id = p_slot_id;

end;
$$;


create or replace function public.activity_os_booking_sync_slot_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if tg_op = 'DELETE' then

    perform public.activity_os_sync_slot_counter(
      old.slot_id
    );

    return old;

  end if;


  if tg_op = 'UPDATE'
     and old.slot_id is distinct from new.slot_id
  then

    perform public.activity_os_sync_slot_counter(
      old.slot_id
    );

  end if;


  perform public.activity_os_sync_slot_counter(
    new.slot_id
  );


  return new;

end;
$$;


drop trigger if exists trg_activity_os_booking_sync_slot
on public.activity_os_bookings;

create trigger trg_activity_os_booking_sync_slot
after insert or update or delete
on public.activity_os_bookings
for each row
execute function public.activity_os_booking_sync_slot_trigger();


-- =========================================================
-- 4. MEVCUT TÜM SLOT COUNTERLARINI ŞİMDİ DÜZELT
-- =========================================================

update public.package_activity_slots s
set
  reserved_count =
    coalesce(
      (
        select sum(b.quantity)
        from public.activity_os_bookings b
        where b.slot_id = s.id
          and b.status not in (
            'cancelled',
            'no_show'
          )
      ),
      0
    ),

  status =
    case
      when coalesce(
        (
          select sum(b.quantity)
          from public.activity_os_bookings b
          where b.slot_id = s.id
            and b.status not in (
              'cancelled',
              'no_show'
            )
        ),
        0
      ) >= s.capacity
        then 'full'

      when s.status = 'full'
        then 'open'

      else s.status
    end,

  updated_at = now();


-- =========================================================
-- 5. TAKVİM RPC
-- Her zaman gerçek booking toplamından hesaplar.
-- =========================================================

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

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id',
            s.id,

          'activity_id',
            s.activity_id,

          'activity_name',
            a.name,

          'slot_date',
            s.slot_date,

          'start_time',
            s.start_time,

          'end_time',
            s.end_time,

          'capacity',
            s.capacity,

          'reserved_count',
            coalesce(
              x.reserved_count,
              0
            ),

          'remaining_count',
            greatest(
              s.capacity -
              coalesce(
                x.reserved_count,
                0
              ),
              0
            ),

          'occupancy_percent',
            case
              when s.capacity <= 0
                then 0
              else round(
                (
                  coalesce(
                    x.reserved_count,
                    0
                  )::numeric
                  /
                  s.capacity::numeric
                )
                * 100,
                1
              )
            end,

          'sale_price',
            s.sale_price,

          'currency',
            s.currency,

          'status',
            case
              when coalesce(
                x.reserved_count,
                0
              ) >= s.capacity
                then 'full'
              else s.status
            end,

          'notes',
            s.notes
        )
        order by
          s.slot_date,
          s.start_time,
          a.name
      )

      from public.package_activity_slots s

      join public.package_activities a
        on a.id = s.activity_id

      left join lateral (
        select
          coalesce(
            sum(b.quantity),
            0
          )::integer
          as reserved_count

        from public.activity_os_bookings b

        where b.slot_id = s.id
          and b.status not in (
            'cancelled',
            'no_show'
          )

      ) x
      on true

      where s.company_id =
        p_company_id

        and s.slot_date
          between p_from
          and p_to
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


commit;
