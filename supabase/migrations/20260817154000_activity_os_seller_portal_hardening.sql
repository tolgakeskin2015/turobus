begin;

create or replace function public.get_my_activity_seller_portal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
  v_result jsonb;
begin
  select
    su.company_id,
    su.seller_id,
    s.name as seller_name,
    s.seller_type,
    s.commission_type,
    s.commission_value,
    s.can_sell_all_products,
    c.name as company_name,
    c.logo_url as company_logo
  into v_access
  from public.activity_os_seller_users su
  join public.activity_os_sellers s
    on s.id = su.seller_id
   and s.company_id = su.company_id
  join public.companies c
    on c.id = su.company_id
  where su.user_id = auth.uid()
    and su.is_active = true
    and s.is_active = true
  order by su.created_at desc
  limit 1;

  if not found then
    raise exception 'Seller portal access not found';
  end if;

  select jsonb_build_object(
    'seller',
      jsonb_build_object(
        'id', v_access.seller_id,
        'name', v_access.seller_name,
        'type', v_access.seller_type,
        'commission_type', v_access.commission_type,
        'commission_value', v_access.commission_value
      ),

    'company',
      jsonb_build_object(
        'id', v_access.company_id,
        'name', v_access.company_name,
        'logo_url', v_access.company_logo
      ),

    'products',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'name', a.name,
              'category', a.category,
              'city', a.city,
              'district', a.district,
              'cover_image_url', a.cover_image_url,
              'duration_minutes', a.duration_minutes,
              'currency', a.currency,
              'sale_price',
                coalesce(
                  sp.sale_price,
                  a.default_sale_price,
                  0
                )
            )
            order by a.name
          )
          from public.package_activities a
          left join public.activity_os_seller_products sp
            on sp.activity_id = a.id
           and sp.seller_id = v_access.seller_id
           and sp.company_id = v_access.company_id
           and sp.is_active = true
          where a.company_id = v_access.company_id
            and a.is_active = true
            and (
              v_access.can_sell_all_products = true
              or sp.id is not null
            )
        ),
        '[]'::jsonb
      ),

    'slots',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', sl.id,
              'activity_id', sl.activity_id,
              'slot_date', sl.slot_date,
              'start_time', sl.start_time,
              'capacity', sl.capacity,
              'reserved_count', sl.reserved_count,
              'available_capacity',
                greatest(
                  sl.capacity - sl.reserved_count,
                  0
                ),
              'status', sl.status,
              'sale_price',
                coalesce(
                  sp.sale_price,
                  sl.sale_price,
                  a.default_sale_price,
                  0
                ),
              'currency',
                coalesce(
                  sl.currency,
                  a.currency,
                  'TRY'
                )
            )
            order by sl.slot_date, sl.start_time
          )
          from public.package_activity_slots sl
          join public.package_activities a
            on a.id = sl.activity_id
           and a.company_id = v_access.company_id
          left join public.activity_os_seller_products sp
            on sp.activity_id = a.id
           and sp.seller_id = v_access.seller_id
           and sp.company_id = v_access.company_id
           and sp.is_active = true
          where sl.company_id = v_access.company_id
            and sl.slot_date >= current_date
            and sl.status = 'open'
            and sl.reserved_count < sl.capacity
            and a.is_active = true
            and (
              v_access.can_sell_all_products = true
              or sp.id is not null
            )
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
              'activity_id', b.activity_id,
              'activity_name', a.name,
              'customer_name', b.customer_name,
              'customer_phone', b.customer_phone,
              'service_date', b.service_date,
              'start_time', b.start_time,
              'quantity', b.quantity,
              'sale_total', b.sale_total,
              'paid_total', b.paid_total,
              'payment_status', b.payment_status,
              'status', b.status,
              'hotel_name', b.hotel_name,
              'guest_token', b.guest_token
            )
            order by b.service_date desc, b.created_at desc
          )
          from public.activity_os_bookings b
          join public.package_activities a
            on a.id = b.activity_id
          where b.company_id = v_access.company_id
            and b.seller_id = v_access.seller_id
        ),
        '[]'::jsonb
      ),

    'summary',
      jsonb_build_object(
        'booking_count',
          (
            select count(*)
            from public.activity_os_bookings b
            where b.company_id = v_access.company_id
              and b.seller_id = v_access.seller_id
              and b.status <> 'cancelled'
          ),

        'guest_count',
          coalesce(
            (
              select sum(b.quantity)
              from public.activity_os_bookings b
              where b.company_id = v_access.company_id
                and b.seller_id = v_access.seller_id
                and b.status <> 'cancelled'
            ),
            0
          ),

        'sales_total',
          coalesce(
            (
              select sum(b.sale_total)
              from public.activity_os_bookings b
              where b.company_id = v_access.company_id
                and b.seller_id = v_access.seller_id
                and b.status <> 'cancelled'
            ),
            0
          ),

        'commission_total',
          coalesce(
            (
              select sum(f.seller_commission)
              from public.activity_os_booking_finance f
              join public.activity_os_bookings b
                on b.id = f.booking_id
              where b.company_id = v_access.company_id
                and b.seller_id = v_access.seller_id
                and b.status <> 'cancelled'
            ),
            0
          )
      )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_my_activity_seller_portal()
from public;

grant execute on function public.get_my_activity_seller_portal()
to authenticated;


create or replace function public.activity_seller_create_booking(
  p_activity_id uuid,
  p_slot_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_quantity integer,
  p_hotel_name text,
  p_room_no text,
  p_pickup_location text,
  p_special_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
  v_activity record;
  v_slot record;
  v_sale_price numeric(14,2);
  v_total numeric(14,2);
begin
  select
    su.company_id,
    su.seller_id,
    s.seller_type,
    s.can_sell_all_products
  into v_access
  from public.activity_os_seller_users su
  join public.activity_os_sellers s
    on s.id = su.seller_id
   and s.company_id = su.company_id
  where su.user_id = auth.uid()
    and su.is_active = true
    and s.is_active = true
  order by su.created_at desc
  limit 1;

  if not found then
    raise exception 'Seller portal access required';
  end if;

  select *
  into v_activity
  from public.package_activities
  where id = p_activity_id
    and company_id = v_access.company_id
    and is_active = true;

  if not found then
    raise exception 'Activity not available';
  end if;

  if
    v_access.can_sell_all_products = false
    and not exists (
      select 1
      from public.activity_os_seller_products sp
      where sp.company_id = v_access.company_id
        and sp.seller_id = v_access.seller_id
        and sp.activity_id = p_activity_id
        and sp.is_active = true
    )
  then
    raise exception 'Seller is not authorized for this activity';
  end if;

  select *
  into v_slot
  from public.package_activity_slots
  where id = p_slot_id
    and company_id = v_access.company_id
    and activity_id = p_activity_id
    and slot_date >= current_date
    and status = 'open';

  if not found then
    raise exception 'Slot not available';
  end if;

  select coalesce(
    (
      select sp.sale_price
      from public.activity_os_seller_products sp
      where sp.company_id = v_access.company_id
        and sp.seller_id = v_access.seller_id
        and sp.activity_id = p_activity_id
        and sp.is_active = true
      limit 1
    ),
    v_slot.sale_price,
    v_activity.default_sale_price,
    0
  )
  into v_sale_price;

  v_total :=
    greatest(coalesce(p_quantity,1),1)
    *
    greatest(coalesce(v_sale_price,0),0);

  return public.activity_os_create_booking(
    v_access.company_id,
    p_activity_id,
    p_slot_id,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_phone,'')),''),
    nullif(trim(coalesce(p_customer_email,'')),''),
    greatest(coalesce(p_quantity,1),1),

    case
      when v_access.seller_type = 'hotel'
        then 'hotel'
      when v_access.seller_type = 'agency'
        then 'agency'
      else 'external_seller'
    end,

    v_access.seller_id,
    v_total,
    0,
    'partner_account',
    nullif(trim(coalesce(p_hotel_name,'')),''),
    nullif(trim(coalesce(p_room_no,'')),''),
    nullif(trim(coalesce(p_pickup_location,'')),'') is not null,
    nullif(trim(coalesce(p_pickup_location,'')),''),
    nullif(trim(coalesce(p_special_notes,'')),'')
  );
end;
$$;

revoke all
on function public.activity_seller_create_booking(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.activity_seller_create_booking(
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
)
to authenticated;


create table if not exists public.activity_os_seller_payouts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  seller_id uuid not null
    references public.activity_os_sellers(id)
    on delete cascade,

  amount numeric(14,2) not null
    check (amount >= 0),

  currency text not null default 'TRY',

  payout_date date not null default current_date,

  payment_method text,
  reference_no text,
  note text,

  created_by uuid,

  created_at timestamptz not null default now()
);

alter table public.activity_os_seller_payouts
enable row level security;

drop policy if exists activity_os_seller_payouts_finance
on public.activity_os_seller_payouts;

create policy activity_os_seller_payouts_finance
on public.activity_os_seller_payouts
for all
to authenticated
using (
  public.activity_os_can_view_finance(company_id)
)
with check (
  public.activity_os_can_view_finance(company_id)
);


create or replace function public.get_my_activity_seller_payouts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
begin
  select
    su.company_id,
    su.seller_id
  into v_access
  from public.activity_os_seller_users su
  join public.activity_os_sellers s
    on s.id = su.seller_id
   and s.company_id = su.company_id
  where su.user_id = auth.uid()
    and su.is_active = true
    and s.is_active = true
  order by su.created_at desc
  limit 1;

  if not found then
    raise exception 'Seller portal access required';
  end if;

  return jsonb_build_object(
    'earned',
      coalesce(
        (
          select sum(f.seller_commission)
          from public.activity_os_booking_finance f
          join public.activity_os_bookings b
            on b.id = f.booking_id
          where b.company_id = v_access.company_id
            and b.seller_id = v_access.seller_id
            and b.status <> 'cancelled'
        ),
        0
      ),

    'paid',
      coalesce(
        (
          select sum(p.amount)
          from public.activity_os_seller_payouts p
          where p.company_id = v_access.company_id
            and p.seller_id = v_access.seller_id
        ),
        0
      ),

    'payouts',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'amount', p.amount,
              'currency', p.currency,
              'payout_date', p.payout_date,
              'payment_method', p.payment_method,
              'reference_no', p.reference_no,
              'note', p.note
            )
            order by p.payout_date desc
          )
          from public.activity_os_seller_payouts p
          where p.company_id = v_access.company_id
            and p.seller_id = v_access.seller_id
        ),
        '[]'::jsonb
      )
  );
end;
$$;

revoke all on function public.get_my_activity_seller_payouts()
from public;

grant execute on function public.get_my_activity_seller_payouts()
to authenticated;

commit;
