begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-G
-- SUPPLIER PORTAL
-- =========================================================


create table if not exists
public.package_supplier_portal_access (

  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null,

  supplier_id uuid not null,

  portal_token uuid not null
    default gen_random_uuid(),

  is_active boolean not null
    default true,

  last_access_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique(
    company_id,
    supplier_id
  ),

  unique(
    portal_token
  )
);


create index if not exists
idx_package_supplier_portal_supplier
on public.package_supplier_portal_access(
  company_id,
  supplier_id
);


alter table
public.package_supplier_portal_access
enable row level security;


drop policy if exists
"Package supplier portal company members"
on public.package_supplier_portal_access;


create policy
"Package supplier portal company members"
on public.package_supplier_portal_access

for all
to authenticated

using (
  exists (
    select 1
    from public.company_members cm

    where cm.company_id =
      package_supplier_portal_access.company_id

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
      package_supplier_portal_access.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


-- =========================================================
-- CREATE / GET SUPPLIER PORTAL LINK
-- =========================================================

create or replace function
public.ensure_package_supplier_portal(
  p_supplier_id uuid
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_uid uuid :=
    auth.uid();

  v_supplier record;

  v_access
    public.package_supplier_portal_access%rowtype;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  select
    s.id,
    s.company_id,
    s.name,
    s.email,
    s.phone,
    s.is_active

  into v_supplier

  from public.suppliers s

  where s.id =
    p_supplier_id

  limit 1;


  if not found then
    raise exception
      'Tedarikçi bulunamadı.';
  end if;


  if not exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      v_supplier.company_id

      and cm.user_id =
        v_uid

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu tedarikçi için yetkiniz yok.';
  end if;


  insert into
    public.package_supplier_portal_access (
      company_id,
      supplier_id,
      is_active
    )

  values (
    v_supplier.company_id,
    v_supplier.id,
    true
  )

  on conflict (
    company_id,
    supplier_id
  )

  do update set

    is_active =
      true,

    updated_at =
      now()

  returning *
  into v_access;


  return jsonb_build_object(

    'supplier_id',
      v_supplier.id,

    'supplier_name',
      v_supplier.name,

    'portal_token',
      v_access.portal_token,

    'is_active',
      v_access.is_active
  );

end;
$$;


revoke all
on function
public.ensure_package_supplier_portal(uuid)
from public;


grant execute
on function
public.ensure_package_supplier_portal(uuid)
to authenticated;


-- =========================================================
-- ROTATE SUPPLIER PORTAL TOKEN
-- =========================================================

create or replace function
public.rotate_package_supplier_portal_token(
  p_supplier_id uuid
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_uid uuid :=
    auth.uid();

  v_supplier record;

  v_new_token uuid :=
    gen_random_uuid();

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  select
    id,
    company_id,
    name

  into v_supplier

  from public.suppliers

  where id =
    p_supplier_id

  limit 1;


  if not found then
    raise exception
      'Tedarikçi bulunamadı.';
  end if;


  if not exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      v_supplier.company_id

      and cm.user_id =
        v_uid

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Yetkiniz yok.';
  end if;


  update
    public.package_supplier_portal_access

  set
    portal_token =
      v_new_token,

    is_active =
      true,

    updated_at =
      now()

  where company_id =
      v_supplier.company_id

    and supplier_id =
      v_supplier.id;


  if not found then

    insert into
      public.package_supplier_portal_access (
        company_id,
        supplier_id,
        portal_token,
        is_active
      )

    values (
      v_supplier.company_id,
      v_supplier.id,
      v_new_token,
      true
    );

  end if;


  return jsonb_build_object(
    'success',
      true,

    'supplier_id',
      v_supplier.id,

    'supplier_name',
      v_supplier.name,

    'portal_token',
      v_new_token
  );

end;
$$;


revoke all
on function
public.rotate_package_supplier_portal_token(uuid)
from public;


grant execute
on function
public.rotate_package_supplier_portal_token(uuid)
to authenticated;


-- =========================================================
-- PUBLIC SUPPLIER PORTAL
-- Token-scoped supplier data only
-- =========================================================

create or replace function
public.get_package_supplier_portal_public(
  p_token uuid,
  p_date date default current_date
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_access
    public.package_supplier_portal_access%rowtype;

  v_supplier record;

  v_operations jsonb;

  v_total numeric :=
    0;

  v_paid numeric :=
    0;

  v_remaining numeric :=
    0;

begin

  select *
  into v_access

  from public.package_supplier_portal_access

  where portal_token =
      p_token

    and is_active =
      true

  limit 1;


  if not found then
    raise exception
      'Tedarikçi portal bağlantısı geçersiz.';
  end if;


  select
    s.id,
    s.name,
    s.legal_name,
    s.contact_name,
    s.phone,
    s.whatsapp_phone,
    s.email,
    s.iban

  into v_supplier

  from public.suppliers s

  where s.id =
      v_access.supplier_id

    and s.company_id =
      v_access.company_id

  limit 1;


  if not found then
    raise exception
      'Tedarikçi bulunamadı.';
  end if;


  update
    public.package_supplier_portal_access

  set
    last_access_at =
      now(),

    updated_at =
      now()

  where id =
    v_access.id;


  -- -------------------------------------------------------
  -- PACKAGE + EXTRA OPERATIONS
  -- -------------------------------------------------------

  select coalesce(
    jsonb_agg(
      operation
      order by
        operation->>'service_time',
        operation->>'customer_name'
    ),
    '[]'::jsonb
  )

  into v_operations

  from (

    -- PACKAGE ITEMS

    select jsonb_build_object(

      'source',
        'package',

      'item_id',
        bi.id,

      'booking_id',
        b.id,

      'booking_code',
        b.booking_code,

      'customer_name',
        b.customer_name,

      'customer_phone',
        b.customer_phone,

      'service_name',
        bi.name,

      'service_date',
        bi.service_date,

      'service_time',
        bi.service_time,

      'quantity',
        bi.quantity,

      'status',
        bi.supplier_status,

      'customer_status',
        bi.customer_status

    ) as operation

    from public.package_booking_items bi

    join public.package_bookings b
      on b.id =
        bi.booking_id

    where bi.company_id =
        v_access.company_id

      and bi.supplier_id =
        v_access.supplier_id

      and bi.service_date =
        p_date

      and bi.supplier_status <>
        'cancelled'


    union all


    -- EXTRA ITEMS

    select jsonb_build_object(

      'source',
        'extra',

      'item_id',
        ei.id,

      'order_id',
        eo.id,

      'booking_id',
        b.id,

      'booking_code',
        b.booking_code,

      'customer_name',
        b.customer_name,

      'customer_phone',
        b.customer_phone,

      'service_name',
        ei.name,

      'service_date',
        eo.service_date,

      'service_time',
        eo.service_time,

      'quantity',
        ei.quantity,

      'status',
        eo.operation_status,

      'customer_status',
        null

    ) as operation

    from public.package_extra_order_items ei

    join public.package_extra_orders eo
      on eo.id =
        ei.order_id

    join public.package_bookings b
      on b.id =
        eo.booking_id

    where ei.company_id =
        v_access.company_id

      and ei.supplier_id =
        v_access.supplier_id

      and eo.status =
        'paid'

      and eo.service_date =
        p_date

      and eo.operation_status <>
        'cancelled'

  ) operations;


  -- -------------------------------------------------------
  -- PAYABLE TOTALS
  -- -------------------------------------------------------

  select
    coalesce(
      sum(p.amount),
      0
    ),

    coalesce(
      sum(p.paid_amount),
      0
    )

  into
    v_total,
    v_paid

  from public.package_supplier_payables p

  where p.company_id =
      v_access.company_id

    and p.supplier_id =
      v_access.supplier_id

    and p.status <>
      'cancelled';


  v_remaining :=
    greatest(
      v_total -
      v_paid,
      0
    );


  return jsonb_build_object(

    'supplier',
      jsonb_build_object(

        'id',
          v_supplier.id,

        'name',
          v_supplier.name,

        'legal_name',
          v_supplier.legal_name,

        'contact_name',
          v_supplier.contact_name,

        'phone',
          v_supplier.phone,

        'whatsapp_phone',
          v_supplier.whatsapp_phone,

        'email',
          v_supplier.email,

        'iban',
          v_supplier.iban
      ),


    'date',
      p_date,


    'financial',
      jsonb_build_object(

        'total_payable',
          v_total,

        'paid_amount',
          v_paid,

        'remaining_amount',
          v_remaining
      ),


    'operations',
      v_operations

  );

end;
$$;


revoke all
on function
public.get_package_supplier_portal_public(
  uuid,
  date
)
from public;


grant execute
on function
public.get_package_supplier_portal_public(
  uuid,
  date
)
to anon, authenticated;


-- =========================================================
-- SUPPLIER UPDATE OPERATION STATUS
-- =========================================================

create or replace function
public.update_package_supplier_operation_public(
  p_token uuid,
  p_source text,
  p_item_id uuid,
  p_status text
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_access
    public.package_supplier_portal_access%rowtype;

  v_extra_order_id uuid;

begin

  select *
  into v_access

  from public.package_supplier_portal_access

  where portal_token =
      p_token

    and is_active =
      true

  limit 1;


  if not found then
    raise exception
      'Portal bağlantısı geçersiz.';
  end if;


  if p_source =
    'package'
  then

    if p_status not in (
      'requested',
      'confirmed',
      'completed'
    ) then
      raise exception
        'Geçersiz paket hizmet durumu.';
    end if;


    update
      public.package_booking_items

    set
      supplier_status =
        p_status,

      updated_at =
        now()

    where id =
        p_item_id

      and company_id =
        v_access.company_id

      and supplier_id =
        v_access.supplier_id

      and supplier_status <>
        'cancelled';


    if not found then
      raise exception
        'Hizmet bulunamadı.';
    end if;


  elsif p_source =
    'extra'
  then

    if p_status not in (
      'confirmed',
      'in_service',
      'completed'
    ) then
      raise exception
        'Geçersiz ekstra hizmet durumu.';
    end if;


    select
      ei.order_id

    into
      v_extra_order_id

    from public.package_extra_order_items ei

    where ei.id =
        p_item_id

      and ei.company_id =
        v_access.company_id

      and ei.supplier_id =
        v_access.supplier_id

    limit 1;


    if not found then
      raise exception
        'Ekstra hizmet bulunamadı.';
    end if;


    update
      public.package_extra_orders

    set
      operation_status =
        p_status,

      confirmed_at =
        case
          when p_status =
            'confirmed'
          then coalesce(
            confirmed_at,
            now()
          )
          else confirmed_at
        end,

      service_started_at =
        case
          when p_status =
            'in_service'
          then coalesce(
            service_started_at,
            now()
          )
          else service_started_at
        end,

      completed_at =
        case
          when p_status =
            'completed'
          then coalesce(
            completed_at,
            now()
          )
          else completed_at
        end,

      updated_at =
        now()

    where id =
        v_extra_order_id

      and company_id =
        v_access.company_id

      and status =
        'paid'

      and operation_status <>
        'cancelled';


    if not found then
      raise exception
        'Ekstra sipariş güncellenemedi.';
    end if;


  else

    raise exception
      'Geçersiz operasyon kaynağı.';

  end if;


  return jsonb_build_object(
    'success',
      true,

    'source',
      p_source,

    'item_id',
      p_item_id,

    'status',
      p_status
  );

end;
$$;


revoke all
on function
public.update_package_supplier_operation_public(
  uuid,
  text,
  uuid,
  text
)
from public;


grant execute
on function
public.update_package_supplier_operation_public(
  uuid,
  text,
  uuid,
  text
)
to anon, authenticated;


commit;
