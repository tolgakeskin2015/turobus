
alter table public.yacht_os_suppliers
  add column if not exists portal_token uuid
  not null default gen_random_uuid();

create unique index if not exists
  yacht_os_suppliers_portal_token_idx
on public.yacht_os_suppliers(portal_token);


alter table public.yacht_os_bookings
  add column if not exists tracking_token uuid
  not null default gen_random_uuid();

alter table public.yacht_os_bookings
  add column if not exists voucher_token uuid
  not null default gen_random_uuid();

alter table public.yacht_os_bookings
  add column if not exists operation_status text
  not null default 'preparing'
  check (
    operation_status in (
      'preparing',
      'ready',
      'guest_arrived',
      'departed',
      'cruising',
      'returning',
      'completed',
      'cancelled'
    )
  );

create unique index if not exists
  yacht_os_bookings_tracking_token_idx
on public.yacht_os_bookings(tracking_token);

create unique index if not exists
  yacht_os_bookings_voucher_token_idx
on public.yacht_os_bookings(voucher_token);


-- ============================================================
-- PUBLIC CUSTOMER TRACKING
-- ============================================================

create or replace function
public.get_public_yacht_tracking(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'booking_code', b.booking_code,
    'guest_name', b.guest_name,
    'guest_count', b.guest_count,
    'start_date', b.start_date,
    'end_date', b.end_date,
    'departure_time', b.departure_time,
    'return_time', b.return_time,
    'status', b.status,
    'payment_status', b.payment_status,
    'operation_status', b.operation_status,
    'yacht', jsonb_build_object(
      'name', y.name,
      'type', y.yacht_type,
      'city', y.city,
      'marina', y.marina,
      'departure_point', y.departure_point,
      'captain_name', y.captain_name,
      'cover_url', y.cover_url
    )
  )
  into result
  from public.yacht_os_bookings b
  join public.yacht_os_yachts y
    on y.id = b.yacht_id
  where b.tracking_token = p_token
  limit 1;

  return result;
end;
$$;


-- ============================================================
-- PUBLIC VOUCHER
-- ============================================================

create or replace function
public.get_public_yacht_voucher(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'booking_code', b.booking_code,
    'guest_name', b.guest_name,
    'guest_count', b.guest_count,
    'start_date', b.start_date,
    'end_date', b.end_date,
    'departure_time', b.departure_time,
    'return_time', b.return_time,
    'source', b.source,
    'status', b.status,
    'payment_status', b.payment_status,
    'total_amount', b.total_amount,
    'paid_amount', b.paid_amount,
    'currency', b.currency,
    'yacht', jsonb_build_object(
      'name', y.name,
      'type', y.yacht_type,
      'city', y.city,
      'marina', y.marina,
      'departure_point', y.departure_point,
      'max_guests', y.max_guests,
      'captain_name', y.captain_name,
      'captain_included', y.captain_included,
      'fuel_included', y.fuel_included,
      'meals_included', y.meals_included
    )
  )
  into result
  from public.yacht_os_bookings b
  join public.yacht_os_yachts y
    on y.id = b.yacht_id
  where b.voucher_token = p_token
  limit 1;

  return result;
end;
$$;


-- ============================================================
-- PUBLIC SUPPLIER PORTAL
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
            'guest_count', b.guest_count,
            'start_date', b.start_date,
            'end_date', b.end_date,
            'status', b.status,
            'operation_status', b.operation_status,
            'total_amount', b.total_amount,
            'supplier_cost', b.supplier_cost,
            'currency', b.currency,
            'yacht_name', y.name
          )
          order by b.start_date
        )
        from public.yacht_os_supplier_yachts sy
        join public.yacht_os_yachts y
          on y.id = sy.yacht_id
        join public.yacht_os_bookings b
          on b.yacht_id = y.id
        where sy.supplier_id = supplier_row.id
          and b.status <> 'cancelled'
      ),
      '[]'::jsonb
    )
  )
  into result;

  return result;
end;
$$;


grant execute
on function
  public.get_public_yacht_tracking(uuid)
to anon, authenticated;

grant execute
on function
  public.get_public_yacht_voucher(uuid)
to anon, authenticated;

grant execute
on function
  public.get_public_yacht_supplier_portal(uuid)
to anon, authenticated;
