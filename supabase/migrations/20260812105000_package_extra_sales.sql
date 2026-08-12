begin;

-- =========================================================
-- PACKAGE OS
-- Extra sales / upsell core
-- =========================================================

create table if not exists public.package_extra_orders (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete restrict,

  public_token uuid not null
    default gen_random_uuid(),

  currency text not null
    default 'TRY',

  total_cost numeric(14,2) not null
    default 0,

  sale_price numeric(14,2) not null
    default 0,

  gross_profit numeric(14,2) not null
    default 0,

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'paid',
        'cancelled',
        'expired'
      )
    ),

  payment_provider text,
  payment_reference text,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique(public_token)
);


create index if not exists
  idx_package_extra_orders_booking
on public.package_extra_orders(
  company_id,
  booking_id,
  status
);


create table if not exists public.package_extra_order_items (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  order_id uuid not null
    references public.package_extra_orders(id)
    on delete cascade,

  activity_id uuid not null
    references public.package_activities(id)
    on delete restrict,

  supplier_id uuid,

  name text not null,

  quantity numeric(10,2) not null
    default 1
    check (quantity > 0),

  unit_cost numeric(14,2) not null
    default 0,

  total_cost numeric(14,2) not null
    default 0,

  unit_sale_price numeric(14,2) not null
    default 0,

  total_sale_price numeric(14,2) not null
    default 0,

  currency text not null
    default 'TRY',

  requires_slot boolean not null
    default false,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now()
);


create index if not exists
  idx_package_extra_order_items_order
on public.package_extra_order_items(
  order_id
);


alter table public.package_extra_orders
  enable row level security;

alter table public.package_extra_order_items
  enable row level security;


drop policy if exists
  "Package extra company members"
on public.package_extra_orders;


create policy
  "Package extra company members"
on public.package_extra_orders
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_extra_orders.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_extra_orders.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


drop policy if exists
  "Package extra items company members"
on public.package_extra_order_items;


create policy
  "Package extra items company members"
on public.package_extra_order_items
for all
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_extra_order_items.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_extra_order_items.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


-- =========================================================
-- PUBLIC EXTRA CATALOG
-- Internal costs are NOT returned.
-- Excludes activities already in package.
-- =========================================================

create or replace function public.get_package_extras_public(
  p_booking_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_extras jsonb;
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token =
    p_booking_token

    and status in (
      'pending',
      'confirmed',
      'in_service'
    )
  limit 1;

  if not found then
    raise exception
      'Seyahat bulunamadı.';
  end if;


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', a.id,

        'name', a.name,

        'category',
          a.category,

        'city',
          a.city,

        'district',
          a.district,

        'description',
          a.description,

        'cover_image_url',
          a.cover_image_url,

        'video_url',
          a.video_url,

        'pricing_unit',
          a.pricing_unit,

        'sale_price',
          coalesce(
            a.default_sale_price,
            0
          ),

        'currency',
          a.currency,

        'duration_minutes',
          a.duration_minutes,

        'requires_slot',
          a.requires_slot

      )
      order by a.name
    ),
    '[]'::jsonb
  )
  into v_extras

  from public.package_activities a

  where a.company_id =
      v_booking.company_id

    and a.is_active = true

    and coalesce(
      a.default_sale_price,
      0
    ) > 0

    and not exists (
      select 1
      from public.package_booking_items bi

      where bi.booking_id =
          v_booking.id

        and bi.item_type =
          'activity'

        and bi.reference_id =
          a.id

        and bi.customer_status <>
          'cancelled'
    );


  return jsonb_build_object(
    'booking_code',
      v_booking.booking_code,

    'destination',
      v_booking.destination,

    'currency',
      v_booking.currency,

    'extras',
      v_extras
  );
end;
$$;


revoke all
on function public.get_package_extras_public(uuid)
from public;


grant execute
on function public.get_package_extras_public(uuid)
to anon, authenticated;


-- =========================================================
-- CREATE EXTRA ORDER
-- Prices are ALWAYS taken from server/database.
-- Client cannot send price/cost.
-- =========================================================

create or replace function public.create_package_extra_order_public(
  p_booking_token uuid,
  p_activity_id uuid,
  p_quantity numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.package_bookings%rowtype;
  v_activity public.package_activities%rowtype;

  v_order public.package_extra_orders%rowtype;

  v_quantity numeric(10,2);

  v_unit_cost numeric(14,2);
  v_unit_sale numeric(14,2);

  v_total_cost numeric(14,2);
  v_total_sale numeric(14,2);

  v_profit numeric(14,2);
begin
  select *
  into v_booking
  from public.package_bookings
  where public_token =
      p_booking_token
  for update;


  if not found then
    raise exception
      'Seyahat bulunamadı.';
  end if;


  if v_booking.status not in (
    'pending',
    'confirmed',
    'in_service'
  ) then
    raise exception
      'Bu rezervasyona ekstra hizmet eklenemez.';
  end if;


  select *
  into v_activity
  from public.package_activities
  where id =
      p_activity_id

    and company_id =
      v_booking.company_id

    and is_active =
      true;


  if not found then
    raise exception
      'Aktivite bulunamadı.';
  end if;


  if exists (
    select 1

    from public.package_booking_items bi

    where bi.booking_id =
        v_booking.id

      and bi.item_type =
        'activity'

      and bi.reference_id =
        v_activity.id

      and bi.customer_status <>
        'cancelled'
  ) then
    raise exception
      'Bu aktivite zaten paketinizde bulunuyor.';
  end if;


  v_quantity :=
    greatest(
      coalesce(
        p_quantity,
        1
      ),
      1
    );


  if v_quantity > 20 then
    raise exception
      'Ekstra hizmet adedi çok yüksek.';
  end if;


  v_unit_cost :=
    coalesce(
      v_activity.default_cost,
      0
    );


  v_unit_sale :=
    coalesce(
      v_activity.default_sale_price,
      0
    );


  if v_unit_sale <= 0 then
    raise exception
      'Bu aktivite online ekstra satışa açık değil.';
  end if;


  v_total_cost :=
    round(
      v_unit_cost *
      v_quantity,
      2
    );


  v_total_sale :=
    round(
      v_unit_sale *
      v_quantity,
      2
    );


  v_profit :=
    v_total_sale -
    v_total_cost;


  insert into public.package_extra_orders (
    company_id,
    booking_id,
    currency,
    total_cost,
    sale_price,
    gross_profit,
    status,
    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,
    v_activity.currency,
    v_total_cost,
    v_total_sale,
    v_profit,
    'pending',
    jsonb_build_object(
      'source',
        'customer_travel_wallet'
    )
  )
  returning *
  into v_order;


  insert into public.package_extra_order_items (
    company_id,
    order_id,
    activity_id,
    supplier_id,
    name,
    quantity,
    unit_cost,
    total_cost,
    unit_sale_price,
    total_sale_price,
    currency,
    requires_slot,
    metadata
  )
  values (
    v_booking.company_id,
    v_order.id,
    v_activity.id,
    v_activity.supplier_id,
    v_activity.name,
    v_quantity,
    v_unit_cost,
    v_total_cost,
    v_unit_sale,
    v_total_sale,
    v_activity.currency,
    v_activity.requires_slot,
    '{}'::jsonb
  );


  return jsonb_build_object(
    'success',
      true,

    'order_id',
      v_order.id,

    'order_token',
      v_order.public_token,

    'activity_name',
      v_activity.name,

    'quantity',
      v_quantity,

    'sale_price',
      v_total_sale,

    'currency',
      v_activity.currency,

    'status',
      v_order.status
  );
end;
$$;


revoke all
on function public.create_package_extra_order_public(
  uuid,
  uuid,
  numeric
)
from public;


grant execute
on function public.create_package_extra_order_public(
  uuid,
  uuid,
  numeric
)
to anon, authenticated;


commit;
