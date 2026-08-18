begin;

-- =========================================================
-- TUROBUS ACTIVITY OS
-- FINAL CAPACITY / RESERVATION / AUDIT HARDENING
-- =========================================================


-- =========================================================
-- 1. SLOT UNIQUE GUARANTEE
-- =========================================================

create unique index if not exists
idx_activity_os_slot_unique_final
on public.package_activity_slots (
  company_id,
  activity_id,
  slot_date,
  start_time
);


-- =========================================================
-- 2. BOOKING AUDIT LOG
-- Kim neyi değiştirdi takip edilir.
-- =========================================================

create table if not exists public.activity_os_booking_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid
    references public.activity_os_bookings(id)
    on delete cascade,

  event_type text not null,

  old_status text,
  new_status text,

  old_quantity integer,
  new_quantity integer,

  old_slot_id uuid,
  new_slot_id uuid,

  user_id uuid,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);


create index if not exists idx_activity_os_booking_events_booking
on public.activity_os_booking_events(
  booking_id,
  created_at desc
);


alter table public.activity_os_booking_events
enable row level security;


drop policy if exists activity_os_booking_events_select
on public.activity_os_booking_events;

create policy activity_os_booking_events_select
on public.activity_os_booking_events
for select
to authenticated
using (
  public.is_company_member(company_id)
);


-- =========================================================
-- 3. GERÇEK SLOT REZERVASYON SAYISI
-- =========================================================

create or replace function public.activity_os_slot_reserved(
  p_slot_id uuid,
  p_exclude_booking_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(b.quantity),
    0
  )::integer
  from public.activity_os_bookings b
  where b.slot_id = p_slot_id
    and b.status not in (
      'cancelled',
      'no_show'
    )
    and (
      p_exclude_booking_id is null
      or b.id <> p_exclude_booking_id
    );
$$;


-- =========================================================
-- 4. SLOT COUNTER TEK MERKEZDEN SENKRONİZE
-- =========================================================

create or replace function public.activity_os_refresh_slot_capacity(
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity integer;
  v_reserved integer;
begin

  if p_slot_id is null then
    return jsonb_build_object(
      'ok', true
    );
  end if;


  select s.capacity
  into v_capacity
  from public.package_activity_slots s
  where s.id = p_slot_id
  for update;


  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'slot_not_found'
    );
  end if;


  v_reserved :=
    public.activity_os_slot_reserved(
      p_slot_id,
      null
    );


  update public.package_activity_slots
  set
    reserved_count =
      v_reserved,

    status =
      case
        when v_reserved >= v_capacity
          then 'full'

        when status = 'full'
          then 'open'

        else status
      end,

    updated_at =
      now()
  where id = p_slot_id;


  return jsonb_build_object(
    'ok', true,

    'capacity',
      v_capacity,

    'reserved_count',
      v_reserved,

    'remaining_count',
      greatest(
        v_capacity -
        v_reserved,
        0
      ),

    'occupancy_percent',
      case
        when v_capacity <= 0
          then 0
        else round(
          (
            v_reserved::numeric /
            v_capacity::numeric
          ) * 100,
          1
        )
      end
  );

end;
$$;


-- =========================================================
-- 5. OVERBOOKING GUARD
-- DB SEVİYESİNDE
-- =========================================================

create or replace function public.activity_os_capacity_guard_final()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_requires_slot boolean;
  v_reserved integer;
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
    raise exception
      'Aktivite bulunamadı.';
  end if;


  if new.status not in (
    'cancelled',
    'no_show'
  )
  and v_requires_slot
  and new.slot_id is null
  then
    raise exception
      'Bu aktivite için seans / slot seçmek zorunludur.';
  end if;


  if new.slot_id is null then
    return new;
  end if;


  -- Aynı slota aynı anda iki kullanıcı satış yaparsa
  -- ikisi birden kapasite aşamasın.
  perform pg_advisory_xact_lock(
    hashtext(
      'activity-capacity-' ||
      new.slot_id::text
    )
  );


  select
    s.id,
    s.company_id,
    s.activity_id,
    s.slot_date,
    s.start_time,
    s.capacity,
    s.status
  into v_slot
  from public.package_activity_slots s
  where s.id = new.slot_id
  for update;


  if not found then
    raise exception
      'Seçilen slot bulunamadı.';
  end if;


  if v_slot.company_id <>
     new.company_id
  then
    raise exception
      'Slot farklı şirkete ait.';
  end if;


  if v_slot.activity_id <>
     new.activity_id
  then
    raise exception
      'Slot seçilen aktiviteye ait değil.';
  end if;


  if new.status not in (
    'cancelled',
    'no_show'
  ) then

    v_reserved :=
      public.activity_os_slot_reserved(
        new.slot_id,
        case
          when tg_op = 'UPDATE'
            then new.id
          else null
        end
      );


    if (
      v_reserved +
      greatest(
        coalesce(
          new.quantity,
          1
        ),
        1
      )
    ) > v_slot.capacity
    then
      raise exception
        'Yetersiz kontenjan. Toplam kapasite: %, satılan: %, müsait: %, istenen: %',
        v_slot.capacity,
        v_reserved,
        greatest(
          v_slot.capacity -
          v_reserved,
          0
        ),
        new.quantity;
    end if;

  end if;


  new.service_date :=
    v_slot.slot_date;

  new.start_time :=
    v_slot.start_time;


  return new;

end;
$$;


drop trigger if exists trg_activity_os_capacity_guard_final
on public.activity_os_bookings;


create trigger trg_activity_os_capacity_guard_final
before insert or update of
  slot_id,
  activity_id,
  quantity,
  status
on public.activity_os_bookings
for each row
execute function public.activity_os_capacity_guard_final();


-- =========================================================
-- 6. AFTER INSERT/UPDATE/DELETE
-- COUNTER + AUDIT
-- =========================================================

create or replace function public.activity_os_booking_after_change_final()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_booking_id uuid;
begin

  if tg_op = 'DELETE' then

    v_company_id :=
      old.company_id;

    v_booking_id :=
      old.id;


    perform public.activity_os_refresh_slot_capacity(
      old.slot_id
    );


    insert into public.activity_os_booking_events(
      company_id,
      booking_id,
      event_type,
      old_status,
      old_quantity,
      old_slot_id,
      user_id
    )
    values (
      old.company_id,
      null,
      'deleted',
      old.status,
      old.quantity,
      old.slot_id,
      auth.uid()
    );


    return old;

  end if;


  if tg_op = 'INSERT' then

    perform public.activity_os_refresh_slot_capacity(
      new.slot_id
    );


    insert into public.activity_os_booking_events(
      company_id,
      booking_id,
      event_type,
      new_status,
      new_quantity,
      new_slot_id,
      user_id
    )
    values (
      new.company_id,
      new.id,
      'created',
      new.status,
      new.quantity,
      new.slot_id,
      auth.uid()
    );


    return new;

  end if;


  if old.slot_id is distinct from new.slot_id then

    perform public.activity_os_refresh_slot_capacity(
      old.slot_id
    );

  end if;


  perform public.activity_os_refresh_slot_capacity(
    new.slot_id
  );


  insert into public.activity_os_booking_events(
    company_id,
    booking_id,
    event_type,
    old_status,
    new_status,
    old_quantity,
    new_quantity,
    old_slot_id,
    new_slot_id,
    user_id
  )
  values (
    new.company_id,
    new.id,
    'updated',
    old.status,
    new.status,
    old.quantity,
    new.quantity,
    old.slot_id,
    new.slot_id,
    auth.uid()
  );


  return new;

end;
$$;


drop trigger if exists trg_activity_os_booking_after_change_final
on public.activity_os_bookings;


create trigger trg_activity_os_booking_after_change_final
after insert or update or delete
on public.activity_os_bookings
for each row
execute function public.activity_os_booking_after_change_final();


-- =========================================================
-- 7. TÜM MEVCUT SLOT COUNTERLARI ONAR
-- =========================================================

update public.package_activity_slots s
set
  reserved_count =
    public.activity_os_slot_reserved(
      s.id,
      null
    ),

  status =
    case
      when public.activity_os_slot_reserved(
        s.id,
        null
      ) >= s.capacity
        then 'full'

      when s.status = 'full'
        then 'open'

      else s.status
    end,

  updated_at =
    now();


-- =========================================================
-- 8. FINAL CALENDAR RPC
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
            x.reserved_count,

          'remaining_count',
            greatest(
              s.capacity -
              x.reserved_count,
              0
            ),

          'occupancy_percent',
            case
              when s.capacity <= 0
                then 0
              else round(
                (
                  x.reserved_count::numeric /
                  s.capacity::numeric
                ) * 100,
                1
              )
            end,

          'sale_price',
            s.sale_price,

          'currency',
            s.currency,

          'status',
            case
              when x.reserved_count >=
                s.capacity
                then 'full'
              else s.status
            end,

          'notes',
            s.notes,

          'is_sellable',
            (
              s.status <> 'closed'
              and x.reserved_count <
                  s.capacity
            )
        )
        order by
          s.slot_date,
          s.start_time,
          a.name
      )

      from public.package_activity_slots s

      join public.package_activities a
        on a.id = s.activity_id

      cross join lateral (
        select
          public.activity_os_slot_reserved(
            s.id,
            null
          ) as reserved_count
      ) x

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


-- =========================================================
-- 9. PROFESSIONAL QUICK BOOKING RPC
-- UI DAHİL HER SATIŞ İÇİN TEK GÜVENLİ NOKTA
-- =========================================================

create or replace function public.activity_os_quick_booking(
  p_company_id uuid,
  p_slot_id uuid,

  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,

  p_quantity integer,

  p_source_channel text,

  p_seller_id uuid,

  p_sale_total numeric,
  p_paid_total numeric,

  p_payment_method text,

  p_hotel_name text,
  p_pickup_location text,

  p_special_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot record;
  v_activity record;
  v_remaining integer;
  v_result jsonb;
begin

  if not public.activity_os_can_sell(
    p_company_id
  )
  and not exists (
    select 1
    from public.activity_os_seller_users su
    where su.company_id =
      p_company_id
      and su.seller_id =
        p_seller_id
      and su.user_id =
        auth.uid()
      and su.is_active =
        true
  )
  then
    raise exception
      'Satış yetkisi gerekli.';
  end if;


  if p_slot_id is null then
    raise exception
      'Slot seçmek zorunludur.';
  end if;


  if coalesce(
    p_quantity,
    0
  ) <= 0
  then
    raise exception
      'Kişi sayısı en az 1 olmalıdır.';
  end if;


  perform pg_advisory_xact_lock(
    hashtext(
      'activity-capacity-' ||
      p_slot_id::text
    )
  );


  select *
  into v_slot
  from public.package_activity_slots
  where id = p_slot_id
    and company_id =
      p_company_id
  for update;


  if not found then
    raise exception
      'Slot bulunamadı.';
  end if;


  select *
  into v_activity
  from public.package_activities
  where id =
    v_slot.activity_id
    and company_id =
      p_company_id;


  v_remaining :=
    greatest(
      v_slot.capacity -
      public.activity_os_slot_reserved(
        p_slot_id,
        null
      ),
      0
    );


  if p_quantity >
     v_remaining
  then
    raise exception
      'Bu seans için yalnızca % kişilik kontenjan kaldı.',
      v_remaining;
  end if;


  select public.activity_os_create_booking(
    p_company_id,
    v_slot.activity_id,
    p_slot_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_quantity,
    p_source_channel,
    p_seller_id,
    p_sale_total,
    p_paid_total,
    p_payment_method,
    p_hotel_name,
    null,
    (
      nullif(
        trim(
          coalesce(
            p_pickup_location,
            ''
          )
        ),
        ''
      ) is not null
    ),
    p_pickup_location,
    p_special_notes
  )
  into v_result;


  perform public.activity_os_refresh_slot_capacity(
    p_slot_id
  );


  return v_result ||
    jsonb_build_object(
      'capacity',
        v_slot.capacity,

      'reserved_count',
        public.activity_os_slot_reserved(
          p_slot_id,
          null
        ),

      'remaining_count',
        greatest(
          v_slot.capacity -
          public.activity_os_slot_reserved(
            p_slot_id,
            null
          ),
          0
        )
    );

end;
$$;


grant execute
on function public.activity_os_quick_booking(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text
)
to authenticated;


-- =========================================================
-- 10. REALTIME
-- =========================================================

do $$
begin

  if not exists (
    select 1
    from pg_publication_tables
    where pubname =
      'supabase_realtime'
      and schemaname =
        'public'
      and tablename =
        'activity_os_bookings'
  ) then

    alter publication supabase_realtime
    add table public.activity_os_bookings;

  end if;


  if not exists (
    select 1
    from pg_publication_tables
    where pubname =
      'supabase_realtime'
      and schemaname =
        'public'
      and tablename =
        'package_activity_slots'
  ) then

    alter publication supabase_realtime
    add table public.package_activity_slots;

  end if;

end $$;


commit;
