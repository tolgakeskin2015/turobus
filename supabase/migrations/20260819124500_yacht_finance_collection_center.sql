
-- ============================================================
-- TUROBUS YACHT FINANCE & COLLECTION CENTER
-- ============================================================


-- ------------------------------------------------------------
-- PAYMENT LINKS
-- ------------------------------------------------------------

create table if not exists public.yacht_os_payment_links (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  public_token uuid not null
    default gen_random_uuid(),

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null
    default 'TRY',

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'paid',
        'expired',
        'cancelled'
      )
    ),

  valid_until timestamptz,

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  paid_at timestamptz,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  unique (public_token)
);


create index if not exists
  yacht_payment_links_company_idx
on public.yacht_os_payment_links (
  company_id,
  booking_id,
  status,
  created_at desc
);


-- ------------------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------------------

create table if not exists public.yacht_os_payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  payment_link_id uuid
    references public.yacht_os_payment_links(id)
    on delete set null,

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null
    default 'TRY',

  payment_method text not null
    default 'cash'
    check (
      payment_method in (
        'cash',
        'bank_transfer',
        'credit_card',
        'iyzico',
        'other'
      )
    ),

  provider text,
  provider_reference text,
  provider_payment_id text,
  provider_transaction_id text,

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'paid',
        'failed',
        'cancelled',
        'partially_refunded',
        'refunded'
      )
    ),

  reference_no text,
  note text,

  metadata jsonb not null
    default '{}'::jsonb,

  paid_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_os_payments_company_idx
on public.yacht_os_payments (
  company_id,
  booking_id,
  status,
  created_at desc
);


-- ------------------------------------------------------------
-- REFUND LEDGER
-- ------------------------------------------------------------

create table if not exists public.yacht_os_refunds (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  payment_id uuid not null
    references public.yacht_os_payments(id)
    on delete cascade,

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null
    default 'TRY',

  provider text,

  provider_reference text,

  status text not null
    default 'paid'
    check (
      status in (
        'processing',
        'paid',
        'failed',
        'cancelled'
      )
    ),

  reason text,

  metadata jsonb not null
    default '{}'::jsonb,

  requested_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_os_refunds_payment_idx
on public.yacht_os_refunds (
  payment_id,
  status,
  created_at desc
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_payment_links_updated_at
on public.yacht_os_payment_links;

create trigger
  yacht_os_payment_links_updated_at
before update
on public.yacht_os_payment_links
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_payments_updated_at
on public.yacht_os_payments;

create trigger
  yacht_os_payments_updated_at
before update
on public.yacht_os_payments
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_os_refunds_updated_at
on public.yacht_os_refunds;

create trigger
  yacht_os_refunds_updated_at
before update
on public.yacht_os_refunds
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_payment_links
enable row level security;

alter table public.yacht_os_payments
enable row level security;

alter table public.yacht_os_refunds
enable row level security;


create policy yacht_payment_links_company_access
on public.yacht_os_payment_links
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


create policy yacht_payments_company_access
on public.yacht_os_payments
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


create policy yacht_refunds_company_access
on public.yacht_os_refunds
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
on
  public.yacht_os_payment_links,
  public.yacht_os_payments,
  public.yacht_os_refunds
to authenticated;


-- ============================================================
-- INTERNAL MANUAL PAYMENT
-- Atomically updates booking + finance ledger
-- ============================================================

create or replace function
public.yacht_os_record_manual_payment(
  p_booking_id uuid,
  p_amount numeric,
  p_method text,
  p_reference_no text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
  payment_id uuid;
  next_paid numeric;
begin

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  if p_method not in (
    'cash',
    'bank_transfer',
    'credit_card',
    'other'
  ) then
    raise exception 'Invalid payment method';
  end if;

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;

  if b.id is null then
    raise exception 'Booking not found';
  end if;

  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception 'Access denied';
  end if;

  if b.status = 'cancelled' then
    raise exception 'Cancelled booking cannot receive payment';
  end if;

  if
    b.paid_amount + p_amount >
    b.total_amount + 0.01
  then
    raise exception 'Payment exceeds outstanding balance';
  end if;

  insert into public.yacht_os_payments (
    company_id,
    booking_id,
    amount,
    currency,
    payment_method,
    status,
    reference_no,
    note,
    paid_at,
    created_by
  )
  values (
    b.company_id,
    b.id,
    p_amount,
    b.currency,
    p_method,
    'paid',
    nullif(trim(p_reference_no), ''),
    nullif(trim(p_note), ''),
    now(),
    auth.uid()
  )
  returning id
  into payment_id;

  next_paid :=
    b.paid_amount +
    p_amount;

  update public.yacht_os_bookings
  set
    paid_amount = next_paid,

    payment_status =
      case
        when next_paid >= total_amount
        then 'paid'
        when next_paid > 0
        then 'partial'
        else 'pending'
      end

  where id = b.id;

  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,
    entry_type,
    amount,
    currency,
    paid_at,
    description,
    created_by
  )
  values (
    b.company_id,
    b.id,
    'payment',
    p_amount,
    b.currency,
    now(),
    'Manuel tahsilat',
    auth.uid()
  );

  return jsonb_build_object(
    'ok', true,
    'payment_id', payment_id,
    'paid_amount', next_paid,
    'remaining',
      greatest(
        b.total_amount - next_paid,
        0
      )
  );
end;
$$;


grant execute
on function
  public.yacht_os_record_manual_payment(
    uuid,
    numeric,
    text,
    text,
    text
  )
to authenticated;


-- ============================================================
-- CREATE PAYMENT LINK
-- ============================================================

create or replace function
public.yacht_os_create_payment_link(
  p_booking_id uuid,
  p_amount numeric,
  p_valid_until timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
  link_row public.yacht_os_payment_links%rowtype;
  remaining numeric;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id;

  if b.id is null then
    raise exception 'Booking not found';
  end if;

  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception 'Access denied';
  end if;

  remaining :=
    greatest(
      b.total_amount -
      b.paid_amount,
      0
    );

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_amount > remaining + 0.01 then
    raise exception 'Payment link amount exceeds outstanding balance';
  end if;

  insert into public.yacht_os_payment_links (
    company_id,
    booking_id,
    amount,
    currency,
    valid_until,
    note,
    created_by
  )
  values (
    b.company_id,
    b.id,
    p_amount,
    b.currency,
    p_valid_until,
    nullif(trim(p_note), ''),
    auth.uid()
  )
  returning *
  into link_row;

  return jsonb_build_object(
    'ok', true,
    'id', link_row.id,
    'token', link_row.public_token,
    'amount', link_row.amount
  );
end;
$$;


grant execute
on function
  public.yacht_os_create_payment_link(
    uuid,
    numeric,
    timestamptz,
    text
  )
to authenticated;


-- ============================================================
-- PUBLIC PAYMENT LINK VIEW
-- ============================================================

create or replace function
public.get_public_yacht_payment_link(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.yacht_os_payment_links%rowtype;
  b public.yacht_os_bookings%rowtype;
  result jsonb;
begin

  select *
  into link_row
  from public.yacht_os_payment_links
  where public_token = p_token
  limit 1;

  if link_row.id is null then
    return null;
  end if;

  if
    link_row.status = 'active'
    and link_row.valid_until is not null
    and link_row.valid_until < now()
  then
    update public.yacht_os_payment_links
    set status = 'expired'
    where id = link_row.id;

    link_row.status :=
      'expired';
  end if;

  select *
  into b
  from public.yacht_os_bookings
  where id = link_row.booking_id;

  select jsonb_build_object(

    'payment_link_id',
      link_row.id,

    'status',
      link_row.status,

    'amount',
      link_row.amount,

    'currency',
      link_row.currency,

    'valid_until',
      link_row.valid_until,

    'note',
      link_row.note,

    'booking_code',
      b.booking_code,

    'guest_name',
      b.guest_name,

    'guest_phone',
      b.guest_phone,

    'guest_email',
      b.guest_email,

    'start_date',
      b.start_date,

    'end_date',
      b.end_date,

    'total_amount',
      b.total_amount,

    'paid_amount',
      b.paid_amount,

    'remaining_amount',
      greatest(
        b.total_amount -
        b.paid_amount,
        0
      ),

    'yacht',
      (
        select jsonb_build_object(
          'name', y.name,
          'type', y.yacht_type,
          'city', y.city,
          'marina', y.marina,
          'departure_point',
            y.departure_point
        )
        from public.yacht_os_yachts y
        where y.id = b.yacht_id
      )

  )
  into result;

  return result;
end;
$$;


grant execute
on function
  public.get_public_yacht_payment_link(uuid)
to anon, authenticated;


-- ============================================================
-- SERVER-SIDE PAYABLE CHECK
-- ============================================================

create or replace function
public.check_yacht_payment_link_payable(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.yacht_os_payment_links%rowtype;
  b public.yacht_os_bookings%rowtype;
begin

  select *
  into link_row
  from public.yacht_os_payment_links
  where public_token = p_token
  for update;

  if link_row.id is null then
    raise exception 'Payment link not found';
  end if;

  if link_row.status <> 'active' then
    raise exception 'Payment link is not active';
  end if;

  if
    link_row.valid_until is not null
    and link_row.valid_until < now()
  then
    update public.yacht_os_payment_links
    set status = 'expired'
    where id = link_row.id;

    raise exception 'Payment link expired';
  end if;

  select *
  into b
  from public.yacht_os_bookings
  where id = link_row.booking_id;

  if b.id is null then
    raise exception 'Booking not found';
  end if;

  if b.status = 'cancelled' then
    raise exception 'Booking cancelled';
  end if;

  if
    link_row.amount >
    (
      b.total_amount -
      b.paid_amount
    ) + 0.01
  then
    raise exception 'Payment amount exceeds current balance';
  end if;

  return jsonb_build_object(
    'ok', true,

    'link_id',
      link_row.id,

    'booking_id',
      b.id,

    'company_id',
      b.company_id,

    'booking_code',
      b.booking_code,

    'customer_name',
      b.guest_name,

    'customer_phone',
      b.guest_phone,

    'customer_email',
      b.guest_email,

    'amount',
      link_row.amount,

    'currency',
      link_row.currency
  );
end;
$$;


grant execute
on function
  public.check_yacht_payment_link_payable(uuid)
to anon, authenticated;


-- ============================================================
-- FINALIZE IYZICO PAYMENT
-- ============================================================

create or replace function
public.finalize_yacht_iyzico_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_transaction_id text,
  p_paid_amount numeric,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.yacht_os_payments%rowtype;
  b public.yacht_os_bookings%rowtype;
  next_paid numeric;
begin

  select *
  into payment_row
  from public.yacht_os_payments
  where id = p_payment_id
  for update;

  if payment_row.id is null then
    raise exception 'Payment not found';
  end if;

  if payment_row.status = 'paid' then
    return jsonb_build_object(
      'ok', true,
      'already_finalized', true
    );
  end if;

  if
    abs(
      payment_row.amount -
      p_paid_amount
    ) > 0.01
  then
    raise exception 'Paid amount mismatch';
  end if;

  select *
  into b
  from public.yacht_os_bookings
  where id = payment_row.booking_id
  for update;

  if b.id is null then
    raise exception 'Booking not found';
  end if;

  next_paid :=
    b.paid_amount +
    p_paid_amount;

  if
    next_paid >
    b.total_amount + 0.01
  then
    raise exception 'Payment exceeds booking total';
  end if;

  update public.yacht_os_payments
  set
    status = 'paid',
    provider_payment_id =
      p_provider_payment_id,
    provider_transaction_id =
      p_provider_transaction_id,
    paid_at = now(),
    metadata =
      coalesce(metadata, '{}'::jsonb) ||
      coalesce(p_metadata, '{}'::jsonb)
  where id = payment_row.id;

  update public.yacht_os_bookings
  set
    paid_amount =
      next_paid,

    payment_status =
      case
        when next_paid >= total_amount
        then 'paid'
        when next_paid > 0
        then 'partial'
        else 'pending'
      end

  where id = b.id;

  if
    payment_row.payment_link_id
    is not null
  then
    update public.yacht_os_payment_links
    set
      status = 'paid',
      paid_at = now()
    where id =
      payment_row.payment_link_id;
  end if;

  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,
    entry_type,
    amount,
    currency,
    paid_at,
    description
  )
  values (
    b.company_id,
    b.id,
    'payment',
    p_paid_amount,
    b.currency,
    now(),
    'iyzico online tahsilat'
  );

  return jsonb_build_object(
    'ok', true,
    'booking_id', b.id,
    'paid_amount', next_paid,
    'remaining',
      greatest(
        b.total_amount -
        next_paid,
        0
      )
  );
end;
$$;


grant execute
on function
  public.finalize_yacht_iyzico_payment(
    uuid,
    text,
    text,
    numeric,
    jsonb
  )
to service_role;
