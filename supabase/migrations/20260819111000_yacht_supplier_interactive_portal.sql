
-- ============================================================
-- TUROBUS YACHT SUPPLIER INTERACTIVE PORTAL
-- Token secured write operations
-- ============================================================


-- ------------------------------------------------------------
-- AUDIT LOG
-- ------------------------------------------------------------

create table if not exists public.yacht_os_supplier_portal_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  supplier_id uuid not null
    references public.yacht_os_suppliers(id)
    on delete cascade,

  yacht_id uuid
    references public.yacht_os_yachts(id)
    on delete set null,

  booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  event_type text not null,

  old_value jsonb,
  new_value jsonb,

  created_at timestamptz not null default now()
);


create index if not exists
  yacht_supplier_portal_events_supplier_idx
on public.yacht_os_supplier_portal_events (
  supplier_id,
  created_at desc
);


alter table public.yacht_os_supplier_portal_events
enable row level security;


create policy yacht_supplier_portal_events_company_access
on public.yacht_os_supplier_portal_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.yacht_os_supplier_portal_events
to authenticated;


-- ============================================================
-- PORTAL READ — EXTENDED
-- ============================================================

create or replace function
public.get_public_yacht_supplier_portal(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supplier_row public.yacht_os_suppliers%rowtype;
  result jsonb;
begin
  select *
  into supplier_row
  from public.yacht_os_suppliers
  where portal_token = p_token
    and status <> 'passive'
  limit 1;

  if supplier_row.id is null then
    return null;
  end if;

  select jsonb_build_object(

    'supplier',
    jsonb_build_object(
      'id', supplier_row.id,
      'name', supplier_row.name,
      'contact_name', supplier_row.contact_name,
      'phone', supplier_row.phone,
      'email', supplier_row.email,
      'commission_rate', supplier_row.commission_rate,
      'current_balance', supplier_row.current_balance,
      'rating', supplier_row.rating,
      'status', supplier_row.status
    ),

    'summary',
    jsonb_build_object(

      'gross_sales',
      coalesce(
        (
          select sum(b.total_amount)
          from public.yacht_os_supplier_yachts sy
          join public.yacht_os_bookings b
            on b.yacht_id = sy.yacht_id
          where sy.supplier_id = supplier_row.id
            and b.status <> 'cancelled'
        ),
        0
      ),

      'supplier_payable',
      coalesce(
        (
          select sum(b.supplier_cost)
          from public.yacht_os_supplier_yachts sy
          join public.yacht_os_bookings b
            on b.yacht_id = sy.yacht_id
          where sy.supplier_id = supplier_row.id
            and b.status <> 'cancelled'
        ),
        0
      ),

      'paid_amount',
      coalesce(
        (
          select sum(p.amount)
          from public.yacht_os_supplier_payments p
          where p.supplier_id = supplier_row.id
        ),
        0
      ),

      'booking_count',
      (
        select count(*)
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_bookings b
          on b.yacht_id = sy.yacht_id
        where sy.supplier_id = supplier_row.id
          and b.status <> 'cancelled'
      ),

      'pending_bookings',
      (
        select count(*)
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_bookings b
          on b.yacht_id = sy.yacht_id
        where sy.supplier_id = supplier_row.id
          and b.status = 'pending'
      )
    ),

    'yachts',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', y.id,
            'name', y.name,
            'type', y.yacht_type,
            'city', y.city,
            'marina', y.marina,
            'status', y.status,
            'max_guests', y.max_guests,
            'cabins', y.cabins,
            'captain_name', y.captain_name,
            'base_daily_price', y.base_daily_price,
            'currency', y.currency
          )
          order by y.name
        )
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_yachts y
          on y.id = sy.yacht_id
        where sy.supplier_id = supplier_row.id
      ),
      '[]'::jsonb
    ),

    'bookings',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', b.id,
            'booking_code', b.booking_code,
            'guest_name', b.guest_name,
            'guest_phone', b.guest_phone,
            'guest_count', b.guest_count,
            'start_date', b.start_date,
            'end_date', b.end_date,
            'status', b.status,
            'payment_status', b.payment_status,
            'operation_status', b.operation_status,
            'total_amount', b.total_amount,
            'paid_amount', b.paid_amount,
            'supplier_cost', b.supplier_cost,
            'commission_amount', b.commission_amount,
            'currency', b.currency,
            'yacht_id', y.id,
            'yacht_name', y.name
          )
          order by b.start_date desc
        )
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_yachts y
          on y.id = sy.yacht_id
        join public.yacht_os_bookings b
          on b.yacht_id = y.id
        where sy.supplier_id = supplier_row.id
      ),
      '[]'::jsonb
    ),

    'availability',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'yacht_id', a.yacht_id,
            'day', a.day,
            'status', a.status,
            'price', a.price,
            'note', a.note,
            'booking_id', a.booking_id
          )
          order by a.day
        )
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_availability a
          on a.yacht_id = sy.yacht_id
        where sy.supplier_id = supplier_row.id
          and a.day >= current_date
          and a.day <= current_date + interval '60 days'
      ),
      '[]'::jsonb
    ),

    'settlements',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'settlement_code', s.settlement_code,
            'period_start', s.period_start,
            'period_end', s.period_end,
            'gross_sales', s.gross_sales,
            'supplier_payable', s.supplier_payable,
            'platform_commission', s.platform_commission,
            'adjustments', s.adjustments,
            'paid_amount', s.paid_amount,
            'status', s.status,
            'due_date', s.due_date,
            'paid_at', s.paid_at,
            'currency', s.currency
          )
          order by s.created_at desc
        )
        from public.yacht_os_settlements s
        where s.supplier_id = supplier_row.id
      ),
      '[]'::jsonb
    ),

    'payments',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'amount', p.amount,
            'currency', p.currency,
            'payment_method', p.payment_method,
            'reference_no', p.reference_no,
            'note', p.note,
            'paid_at', p.paid_at,
            'settlement_id', p.settlement_id
          )
          order by p.paid_at desc
        )
        from public.yacht_os_supplier_payments p
        where p.supplier_id = supplier_row.id
      ),
      '[]'::jsonb
    ),

    'events',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'yacht_id', e.yacht_id,
            'booking_id', e.booking_id,
            'created_at', e.created_at
          )
          order by e.created_at desc
        )
        from (
          select *
          from public.yacht_os_supplier_portal_events
          where supplier_id = supplier_row.id
          order by created_at desc
          limit 25
        ) e
      ),
      '[]'::jsonb
    )

  )
  into result;

  return result;
end;
$$;


-- ============================================================
-- CHANGE YACHT BASE PRICE
-- ============================================================

create or replace function
public.yacht_supplier_update_base_price(
  p_token uuid,
  p_yacht_id uuid,
  p_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supplier_row public.yacht_os_suppliers%rowtype;
  yacht_row public.yacht_os_yachts%rowtype;
begin

  if p_price < 0 then
    raise exception 'Invalid price';
  end if;

  select *
  into supplier_row
  from public.yacht_os_suppliers
  where portal_token = p_token
    and status = 'active'
  limit 1;

  if supplier_row.id is null then
    raise exception 'Invalid supplier portal';
  end if;

  if not exists (
    select 1
    from public.yacht_os_supplier_yachts sy
    where sy.supplier_id = supplier_row.id
      and sy.yacht_id = p_yacht_id
  ) then
    raise exception 'Yacht does not belong to supplier';
  end if;

  select *
  into yacht_row
  from public.yacht_os_yachts
  where id = p_yacht_id;

  update public.yacht_os_yachts
  set base_daily_price = p_price
  where id = p_yacht_id;

  insert into public.yacht_os_supplier_portal_events (
    company_id,
    supplier_id,
    yacht_id,
    event_type,
    old_value,
    new_value
  )
  values (
    supplier_row.company_id,
    supplier_row.id,
    p_yacht_id,
    'base_price_updated',
    jsonb_build_object(
      'price',
      yacht_row.base_daily_price
    ),
    jsonb_build_object(
      'price',
      p_price
    )
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


-- ============================================================
-- UPDATE AVAILABILITY / DAILY PRICE
-- ============================================================

create or replace function
public.yacht_supplier_update_availability(
  p_token uuid,
  p_yacht_id uuid,
  p_day date,
  p_status text,
  p_price numeric default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supplier_row public.yacht_os_suppliers%rowtype;
  existing_row public.yacht_os_availability%rowtype;
begin

  if p_day < current_date then
    raise exception 'Past date cannot be edited';
  end if;

  if p_status not in (
    'available',
    'option',
    'maintenance',
    'blocked'
  ) then
    raise exception 'Invalid availability status';
  end if;

  if p_price is not null and p_price < 0 then
    raise exception 'Invalid price';
  end if;

  select *
  into supplier_row
  from public.yacht_os_suppliers
  where portal_token = p_token
    and status = 'active'
  limit 1;

  if supplier_row.id is null then
    raise exception 'Invalid supplier portal';
  end if;

  if not exists (
    select 1
    from public.yacht_os_supplier_yachts sy
    where sy.supplier_id = supplier_row.id
      and sy.yacht_id = p_yacht_id
  ) then
    raise exception 'Yacht does not belong to supplier';
  end if;

  select *
  into existing_row
  from public.yacht_os_availability
  where yacht_id = p_yacht_id
    and day = p_day;

  if existing_row.booking_id is not null then
    raise exception 'Booked day cannot be changed by supplier';
  end if;

  insert into public.yacht_os_availability (
    company_id,
    yacht_id,
    day,
    status,
    price,
    note
  )
  values (
    supplier_row.company_id,
    p_yacht_id,
    p_day,
    p_status,
    p_price,
    nullif(trim(p_note), '')
  )
  on conflict (
    yacht_id,
    day
  )
  do update set
    status = excluded.status,
    price = excluded.price,
    note = excluded.note,
    updated_at = now();

  insert into public.yacht_os_supplier_portal_events (
    company_id,
    supplier_id,
    yacht_id,
    event_type,
    old_value,
    new_value
  )
  values (
    supplier_row.company_id,
    supplier_row.id,
    p_yacht_id,
    'availability_updated',
    jsonb_build_object(
      'day', p_day,
      'status', existing_row.status,
      'price', existing_row.price
    ),
    jsonb_build_object(
      'day', p_day,
      'status', p_status,
      'price', p_price
    )
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


-- ============================================================
-- ACCEPT / REJECT BOOKING
-- ============================================================

create or replace function
public.yacht_supplier_booking_decision(
  p_token uuid,
  p_booking_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supplier_row public.yacht_os_suppliers%rowtype;
  booking_row public.yacht_os_bookings%rowtype;
  next_status text;
begin

  if p_decision not in (
    'confirmed',
    'cancelled'
  ) then
    raise exception 'Invalid booking decision';
  end if;

  select *
  into supplier_row
  from public.yacht_os_suppliers
  where portal_token = p_token
    and status = 'active'
  limit 1;

  if supplier_row.id is null then
    raise exception 'Invalid supplier portal';
  end if;

  select b.*
  into booking_row
  from public.yacht_os_bookings b
  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
  where b.id = p_booking_id
    and sy.supplier_id = supplier_row.id
  limit 1;

  if booking_row.id is null then
    raise exception 'Booking not found';
  end if;

  if booking_row.status not in (
    'pending',
    'confirmed'
  ) then
    raise exception 'Booking status cannot be changed';
  end if;

  next_status := p_decision;

  update public.yacht_os_bookings
  set
    status = next_status,
    operation_status =
      case
        when next_status = 'confirmed'
        then 'preparing'
        else 'cancelled'
      end
  where id = p_booking_id;

  if next_status = 'cancelled' then
    update public.yacht_os_availability
    set
      status = 'available',
      booking_id = null
    where booking_id = p_booking_id;
  end if;

  insert into public.yacht_os_supplier_portal_events (
    company_id,
    supplier_id,
    yacht_id,
    booking_id,
    event_type,
    old_value,
    new_value
  )
  values (
    supplier_row.company_id,
    supplier_row.id,
    booking_row.yacht_id,
    booking_row.id,
    'booking_decision',
    jsonb_build_object(
      'status',
      booking_row.status
    ),
    jsonb_build_object(
      'status',
      next_status
    )
  );

  return jsonb_build_object(
    'ok', true,
    'status', next_status
  );
end;
$$;


-- ============================================================
-- SUPPLIER OPERATION STATUS
-- ============================================================

create or replace function
public.yacht_supplier_update_operation(
  p_token uuid,
  p_booking_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  supplier_row public.yacht_os_suppliers%rowtype;
  booking_row public.yacht_os_bookings%rowtype;
begin

  if p_status not in (
    'preparing',
    'ready',
    'guest_arrived',
    'departed',
    'cruising',
    'returning',
    'completed'
  ) then
    raise exception 'Invalid operation status';
  end if;

  select *
  into supplier_row
  from public.yacht_os_suppliers
  where portal_token = p_token
    and status = 'active'
  limit 1;

  if supplier_row.id is null then
    raise exception 'Invalid supplier portal';
  end if;

  select b.*
  into booking_row
  from public.yacht_os_bookings b
  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
  where b.id = p_booking_id
    and sy.supplier_id = supplier_row.id
  limit 1;

  if booking_row.id is null then
    raise exception 'Booking not found';
  end if;

  if booking_row.status <> 'confirmed' then
    raise exception 'Only confirmed booking operation can be updated';
  end if;

  update public.yacht_os_bookings
  set
    operation_status = p_status,
    status =
      case
        when p_status = 'completed'
        then 'completed'
        else status
      end
  where id = p_booking_id;

  insert into public.yacht_os_supplier_portal_events (
    company_id,
    supplier_id,
    yacht_id,
    booking_id,
    event_type,
    old_value,
    new_value
  )
  values (
    supplier_row.company_id,
    supplier_row.id,
    booking_row.yacht_id,
    booking_row.id,
    'operation_status_updated',
    jsonb_build_object(
      'status',
      booking_row.operation_status
    ),
    jsonb_build_object(
      'status',
      p_status
    )
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


grant execute
on function public.get_public_yacht_supplier_portal(uuid)
to anon, authenticated;

grant execute
on function public.yacht_supplier_update_base_price(uuid, uuid, numeric)
to anon, authenticated;

grant execute
on function public.yacht_supplier_update_availability(uuid, uuid, date, text, numeric, text)
to anon, authenticated;

grant execute
on function public.yacht_supplier_booking_decision(uuid, uuid, text)
to anon, authenticated;

grant execute
on function public.yacht_supplier_update_operation(uuid, uuid, text)
to anon, authenticated;
