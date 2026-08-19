
-- ============================================================
-- TUROBUS YACHT PARTNER CONTROL TOWER
-- Price approvals + SLA + alerts
-- ============================================================


-- ------------------------------------------------------------
-- BOOKING RESPONSE TRACKING
-- ------------------------------------------------------------

alter table public.yacht_os_bookings
  add column if not exists supplier_decision_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists supplier_decision text
  check (
    supplier_decision is null
    or supplier_decision in (
      'confirmed',
      'rejected'
    )
  );


-- ------------------------------------------------------------
-- PARTNER CHANGE REQUESTS
-- ------------------------------------------------------------

create table if not exists public.yacht_os_partner_change_requests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  supplier_id uuid not null
    references public.yacht_os_suppliers(id)
    on delete cascade,

  yacht_id uuid
    references public.yacht_os_yachts(id)
    on delete cascade,

  booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  request_type text not null
    check (
      request_type in (
        'base_price',
        'availability',
        'booking_decision',
        'operation'
      )
    ),

  old_value jsonb,
  proposed_value jsonb not null,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'auto_applied',
        'cancelled'
      )
    ),

  risk_level text not null default 'normal'
    check (
      risk_level in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  supplier_note text,
  review_note text,

  reviewed_by uuid
    references auth.users(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
  yacht_partner_change_requests_company_idx
on public.yacht_os_partner_change_requests (
  company_id,
  status,
  created_at desc
);


create index if not exists
  yacht_partner_change_requests_supplier_idx
on public.yacht_os_partner_change_requests (
  supplier_id,
  request_type,
  status
);


drop trigger if exists
  yacht_partner_change_requests_updated_at
on public.yacht_os_partner_change_requests;

create trigger
  yacht_partner_change_requests_updated_at
before update
on public.yacht_os_partner_change_requests
for each row
execute function
  public.yacht_os_set_updated_at();


alter table public.yacht_os_partner_change_requests
enable row level security;


create policy yacht_partner_change_requests_company_access
on public.yacht_os_partner_change_requests
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


grant select, insert, update, delete
on public.yacht_os_partner_change_requests
to authenticated;


-- ============================================================
-- SUPPLIER BASE PRICE CHANGE NOW BECOMES APPROVAL REQUEST
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
  delta_percent numeric;
  risk text;
  request_id uuid;
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

  if yacht_row.id is null then
    raise exception 'Yacht not found';
  end if;

  if yacht_row.base_daily_price > 0 then
    delta_percent :=
      abs(
        (
          p_price -
          yacht_row.base_daily_price
        )
        /
        yacht_row.base_daily_price
      ) * 100;
  else
    delta_percent := 100;
  end if;

  risk :=
    case
      when delta_percent >= 30 then 'critical'
      when delta_percent >= 15 then 'high'
      when delta_percent >= 5 then 'normal'
      else 'low'
    end;

  insert into public.yacht_os_partner_change_requests (
    company_id,
    supplier_id,
    yacht_id,
    request_type,
    old_value,
    proposed_value,
    risk_level,
    status
  )
  values (
    supplier_row.company_id,
    supplier_row.id,
    p_yacht_id,
    'base_price',
    jsonb_build_object(
      'price',
      yacht_row.base_daily_price
    ),
    jsonb_build_object(
      'price',
      p_price,
      'delta_percent',
      round(delta_percent, 2)
    ),
    risk,
    'pending'
  )
  returning id
  into request_id;

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
    'base_price_change_requested',
    jsonb_build_object(
      'price',
      yacht_row.base_daily_price
    ),
    jsonb_build_object(
      'price',
      p_price,
      'request_id',
      request_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'pending_approval', true,
    'request_id', request_id
  );
end;
$$;


-- ============================================================
-- SUPPLIER BOOKING DECISION WITH SLA TIMESTAMP
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
  decision_label text;
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

  decision_label :=
    case
      when p_decision = 'confirmed'
      then 'confirmed'
      else 'rejected'
    end;

  update public.yacht_os_bookings
  set
    status = next_status,
    supplier_decision_at = now(),
    supplier_decision = decision_label,
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
      next_status,
      'decision_at',
      now()
    )
  );

  return jsonb_build_object(
    'ok', true,
    'status', next_status
  );
end;
$$;


-- ============================================================
-- ADMIN APPROVE PRICE REQUEST
-- ============================================================

create or replace function
public.approve_yacht_partner_change_request(
  p_request_id uuid,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.yacht_os_partner_change_requests%rowtype;
  next_price numeric;
begin

  select *
  into request_row
  from public.yacht_os_partner_change_requests
  where id = p_request_id
  limit 1;

  if request_row.id is null then
    raise exception 'Request not found';
  end if;

  if not public.is_active_company_member(
    request_row.company_id
  ) then
    raise exception 'Access denied';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Request already processed';
  end if;

  if request_row.request_type = 'base_price' then
    next_price :=
      nullif(
        request_row.proposed_value ->> 'price',
        ''
      )::numeric;

    update public.yacht_os_yachts
    set base_daily_price = next_price
    where id = request_row.yacht_id;
  end if;

  update public.yacht_os_partner_change_requests
  set
    status = 'approved',
    review_note = nullif(trim(p_review_note), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = request_row.id;

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
    request_row.company_id,
    request_row.supplier_id,
    request_row.yacht_id,
    request_row.booking_id,
    'change_request_approved',
    request_row.old_value,
    request_row.proposed_value
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


-- ============================================================
-- ADMIN REJECT PRICE REQUEST
-- ============================================================

create or replace function
public.reject_yacht_partner_change_request(
  p_request_id uuid,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.yacht_os_partner_change_requests%rowtype;
begin

  select *
  into request_row
  from public.yacht_os_partner_change_requests
  where id = p_request_id
  limit 1;

  if request_row.id is null then
    raise exception 'Request not found';
  end if;

  if not public.is_active_company_member(
    request_row.company_id
  ) then
    raise exception 'Access denied';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Request already processed';
  end if;

  update public.yacht_os_partner_change_requests
  set
    status = 'rejected',
    review_note = nullif(trim(p_review_note), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = request_row.id;

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
    request_row.company_id,
    request_row.supplier_id,
    request_row.yacht_id,
    request_row.booking_id,
    'change_request_rejected',
    request_row.old_value,
    request_row.proposed_value
  );

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


grant execute
on function public.approve_yacht_partner_change_request(uuid, text)
to authenticated;

grant execute
on function public.reject_yacht_partner_change_request(uuid, text)
to authenticated;
