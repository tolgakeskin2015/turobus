begin;

-- =========================================================
-- ACTIVITY OS SLOT REPAIR + CRUD
-- =========================================================

-- ---------------------------------------------------------
-- 1. ESKİ SLOTSUZ REZERVASYONLARI TEK UYGUN SLOT VARSA BAĞLA
-- ---------------------------------------------------------

with possible as (
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
  group by b.id
)
update public.activity_os_bookings b
set
  slot_id = p.slot_id,
  start_time = s.start_time,
  service_date = s.slot_date,
  updated_at = now()
from possible p
join public.package_activity_slots s
  on s.id = p.slot_id
where b.id = p.booking_id
  and p.slot_count = 1;


-- ---------------------------------------------------------
-- 2. AYNI AKTİVİTE + TARİH + SAAT DUPLICATE SLOTLARI BİRLEŞTİR
-- ---------------------------------------------------------

create temporary table tmp_activity_slot_merge (
  old_id uuid primary key,
  keep_id uuid not null
) on commit drop;


insert into tmp_activity_slot_merge(
  old_id,
  keep_id
)
select
  id,
  keep_id
from (
  select
    s.id,
    first_value(s.id) over (
      partition by
        s.company_id,
        s.activity_id,
        s.slot_date,
        s.start_time
      order by
        s.created_at,
        s.id
    ) as keep_id,

    row_number() over (
      partition by
        s.company_id,
        s.activity_id,
        s.slot_date,
        s.start_time
      order by
        s.created_at,
        s.id
    ) as rn

  from public.package_activity_slots s
) x
where rn > 1;


-- Rezervasyonları ana slota taşı.
update public.activity_os_bookings b
set
  slot_id = m.keep_id,
  updated_at = now()
from tmp_activity_slot_merge m
where b.slot_id = m.old_id;


-- Network assignment varsa ana slota taşı.
update public.activity_network_assignments a
set
  slot_id = m.keep_id,
  updated_at = now()
from tmp_activity_slot_merge m
where a.slot_id = m.old_id;


-- Operasyon görevlerini ana slota taşı.
update public.activity_os_operation_tasks t
set
  slot_id = m.keep_id,
  updated_at = now()
from tmp_activity_slot_merge m
where t.slot_id = m.old_id;


-- Aynı personel ana slotta zaten varsa duplicate staff linkini sil.
delete from public.activity_network_slot_staff ss
using tmp_activity_slot_merge m
where ss.slot_id = m.old_id
  and exists (
    select 1
    from public.activity_network_slot_staff keep_ss
    where keep_ss.slot_id = m.keep_id
      and keep_ss.staff_id = ss.staff_id
  );


update public.activity_network_slot_staff ss
set slot_id = m.keep_id
from tmp_activity_slot_merge m
where ss.slot_id = m.old_id;


-- Network inventory duplicate satırlarını temizle.
delete from public.turobus_network_inventory_units iu
using tmp_activity_slot_merge m
where iu.source_system = 'activity_os'
  and iu.source_ref_id = m.old_id;


-- Ana slot kapasitesini koru.
-- Birleşen rezervasyon sayısı kapasiteyi geçmişse rezervasyon kadar büyüt.
with grouped as (
  select
    m.keep_id,
    greatest(
      max(s.capacity),
      coalesce(
        (
          select sum(b.quantity)
          from public.activity_os_bookings b
          where b.slot_id = m.keep_id
            and b.status not in ('cancelled','no_show')
        ),
        0
      )
    )::integer as final_capacity
  from tmp_activity_slot_merge m
  join public.package_activity_slots s
    on s.id = m.old_id
    or s.id = m.keep_id
  group by m.keep_id
)
update public.package_activity_slots s
set
  capacity = g.final_capacity,
  updated_at = now()
from grouped g
where s.id = g.keep_id;


-- Duplicate slotları sil.
delete from public.package_activity_slots s
using tmp_activity_slot_merge m
where s.id = m.old_id;


-- Bundan sonra aynı slot tekrar oluşamasın.
create unique index if not exists
idx_activity_os_unique_slot
on public.package_activity_slots(
  company_id,
  activity_id,
  slot_date,
  start_time
);


-- ---------------------------------------------------------
-- 3. TÜM KAPASİTELERİ GERÇEK REZERVASYONDAN YENİDEN HESAPLA
-- ---------------------------------------------------------

update public.package_activity_slots s
set
  reserved_count = coalesce(
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

  status = case
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
    else 'open'
  end,

  updated_at = now();


-- ---------------------------------------------------------
-- 4. TAKVİM HER ZAMAN CANLI REZERVASYONDAN OKUSUN
-- ---------------------------------------------------------

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

          'reserved_count',
            coalesce(x.reserved_count,0),

          'remaining_count',
            greatest(
              s.capacity -
              coalesce(x.reserved_count,0),
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
          )::integer as reserved_count
        from public.activity_os_bookings b
        where (
          b.slot_id = s.id
          or (
            b.slot_id is null
            and b.company_id = s.company_id
            and b.activity_id = s.activity_id
            and b.service_date = s.slot_date
            and b.start_time = s.start_time
          )
        )
        and b.status not in (
          'cancelled',
          'no_show'
        )
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


-- ---------------------------------------------------------
-- 5. SLOT UPDATE
-- ---------------------------------------------------------

create or replace function public.activity_os_update_slot(
  p_company_id uuid,
  p_slot_id uuid,
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
  v_reserved integer := 0;
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Activity OS permission required';
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

  if p_capacity < v_reserved then
    raise exception
      'Kapasite mevcut rezervasyon sayısından küçük olamaz. Mevcut rezervasyon: %',
      v_reserved;
  end if;

  update public.package_activity_slots
  set
    slot_date = p_slot_date,
    start_time = p_start_time,
    end_time = p_end_time,
    capacity = p_capacity,
    reserved_count = v_reserved,
    sale_price = greatest(
      coalesce(p_sale_price,0),
      0
    ),
    notes = nullif(
      trim(
        coalesce(p_notes,'')
      ),
      ''
    ),
    status = case
      when v_reserved >= p_capacity
        then 'full'
      else 'open'
    end,
    updated_at = now()
  where id = p_slot_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Slot bulunamadı';
  end if;

  return jsonb_build_object(
    'ok',true,
    'slot_id',p_slot_id,
    'reserved_count',v_reserved,
    'remaining_count',
      greatest(
        p_capacity-v_reserved,
        0
      )
  );

end;
$$;


grant execute
on function public.activity_os_update_slot(
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


-- ---------------------------------------------------------
-- 6. SLOT DELETE
-- ---------------------------------------------------------

create or replace function public.activity_os_delete_slot(
  p_company_id uuid,
  p_slot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_count integer;
begin

  if not public.activity_os_can_manage(p_company_id) then
    raise exception 'Management permission required';
  end if;

  select count(*)
  into v_booking_count
  from public.activity_os_bookings
  where company_id = p_company_id
    and slot_id = p_slot_id;

  if v_booking_count > 0 then
    raise exception
      'Bu slota bağlı rezervasyon var. Önce rezervasyonu silin veya iptal edin.';
  end if;

  delete from public.turobus_network_inventory_units
  where owner_company_id = p_company_id
    and source_system = 'activity_os'
    and source_ref_id = p_slot_id;

  delete from public.package_activity_slots
  where id = p_slot_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Slot bulunamadı';
  end if;

  return jsonb_build_object(
    'ok',true
  );

end;
$$;


grant execute
on function public.activity_os_delete_slot(
  uuid,
  uuid
)
to authenticated;


-- ---------------------------------------------------------
-- 7. REZERVASYON DELETE
-- ---------------------------------------------------------

create or replace function public.activity_os_delete_booking(
  p_company_id uuid,
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Sales permission required';
  end if;

  select customer_id
  into v_customer_id
  from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Rezervasyon bulunamadı';
  end if;

  delete from public.activity_os_bookings
  where id = p_booking_id
    and company_id = p_company_id;

  if v_customer_id is not null then
    update public.activity_os_customers c
    set
      total_bookings = coalesce(
        (
          select count(*)
          from public.activity_os_bookings b
          where b.customer_id = c.id
        ),
        0
      ),

      total_spend = coalesce(
        (
          select sum(b.sale_total)
          from public.activity_os_bookings b
          where b.customer_id = c.id
            and b.status <> 'cancelled'
        ),
        0
      ),

      updated_at = now()
    where c.id = v_customer_id;
  end if;

  return jsonb_build_object(
    'ok',true
  );

end;
$$;


grant execute
on function public.activity_os_delete_booking(
  uuid,
  uuid
)
to authenticated;


-- ---------------------------------------------------------
-- 8. REZERVASYON UPDATE
-- ---------------------------------------------------------

create or replace function public.activity_os_update_booking(
  p_company_id uuid,
  p_booking_id uuid,
  p_slot_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_quantity integer,
  p_sale_total numeric,
  p_paid_total numeric,
  p_hotel_name text,
  p_pickup_location text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.activity_os_can_sell(p_company_id) then
    raise exception 'Sales permission required';
  end if;

  update public.activity_os_bookings
  set
    slot_id = p_slot_id,
    customer_name = trim(p_customer_name),
    customer_phone =
      nullif(
        trim(
          coalesce(
            p_customer_phone,
            ''
          )
        ),
        ''
      ),
    customer_email =
      nullif(
        trim(
          coalesce(
            p_customer_email,
            ''
          )
        ),
        ''
      ),
    quantity =
      greatest(
        p_quantity,
        1
      ),
    sale_total =
      greatest(
        coalesce(
          p_sale_total,
          0
        ),
        0
      ),
    paid_total =
      greatest(
        coalesce(
          p_paid_total,
          0
        ),
        0
      ),
    payment_status =
      case
        when coalesce(
          p_paid_total,
          0
        ) <= 0
          then 'unpaid'
        when coalesce(
          p_paid_total,
          0
        ) >= coalesce(
          p_sale_total,
          0
        )
          then 'paid'
        else 'partial'
      end,
    hotel_name =
      nullif(
        trim(
          coalesce(
            p_hotel_name,
            ''
          )
        ),
        ''
      ),
    pickup_required =
      nullif(
        trim(
          coalesce(
            p_pickup_location,
            ''
          )
        ),
        ''
      ) is not null,
    pickup_location =
      nullif(
        trim(
          coalesce(
            p_pickup_location,
            ''
          )
        ),
        ''
      ),
    status = p_status,
    updated_at = now()
  where id = p_booking_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Rezervasyon bulunamadı';
  end if;

  update public.activity_os_booking_finance f
  set
    gross_sale =
      greatest(
        coalesce(
          p_sale_total,
          0
        ),
        0
      ),
    updated_at = now()
  where f.booking_id = p_booking_id
    and f.company_id = p_company_id;

  return jsonb_build_object(
    'ok',true
  );

end;
$$;


grant execute
on function public.activity_os_update_booking(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  numeric,
  numeric,
  text,
  text,
  text
)
to authenticated;


-- ---------------------------------------------------------
-- 9. ACTIVITY DELETE
-- ---------------------------------------------------------

create or replace function public.activity_os_delete_activity(
  p_company_id uuid,
  p_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_count integer;
begin

  if not public.activity_os_can_manage(p_company_id) then
    raise exception 'Management permission required';
  end if;

  select count(*)
  into v_booking_count
  from public.activity_os_bookings
  where company_id = p_company_id
    and activity_id = p_activity_id;

  if v_booking_count > 0 then
    raise exception
      'Bu aktiviteye ait rezervasyon var. Önce rezervasyonları silin.';
  end if;

  delete from public.turobus_network_inventory_units
  where owner_company_id = p_company_id
    and source_system = 'activity_os'
    and parent_source_ref_id = p_activity_id;

  delete from public.turobus_network_resources
  where owner_company_id = p_company_id
    and source_system = 'activity_os'
    and source_id = p_activity_id;

  delete from public.package_activity_slots
  where company_id = p_company_id
    and activity_id = p_activity_id;

  delete from public.package_activities
  where company_id = p_company_id
    and id = p_activity_id;

  if not found then
    raise exception 'Aktivite bulunamadı';
  end if;

  return jsonb_build_object(
    'ok',true
  );

end;
$$;


grant execute
on function public.activity_os_delete_activity(
  uuid,
  uuid
)
to authenticated;

commit;
