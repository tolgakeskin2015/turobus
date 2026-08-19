
-- ============================================================
-- TUROBUS YACHT FINANCE CONTROL TOWER
-- Collection planning + refund engine + finance intelligence
-- ============================================================


-- ------------------------------------------------------------
-- COLLECTION PLAN ON BOOKING
-- ------------------------------------------------------------

alter table public.yacht_os_bookings
  add column if not exists collection_due_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists deposit_target numeric(14,2)
    not null default 0;

alter table public.yacht_os_bookings
  add column if not exists collection_priority text
    not null default 'normal';

alter table public.yacht_os_bookings
  add column if not exists collection_note text;


do $$
begin

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'yacht_os_bookings_collection_priority_check'
  ) then

    alter table public.yacht_os_bookings
      add constraint
      yacht_os_bookings_collection_priority_check
      check (
        collection_priority in (
          'low',
          'normal',
          'high',
          'critical'
        )
      );

  end if;

end $$;


-- ============================================================
-- COLLECTION PLAN UPDATE
-- ============================================================

create or replace function
public.yacht_os_update_collection_plan(
  p_booking_id uuid,
  p_due_at timestamptz default null,
  p_deposit_target numeric default 0,
  p_priority text default 'normal',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
begin

  if p_priority not in (
    'low',
    'normal',
    'high',
    'critical'
  ) then
    raise exception 'Invalid collection priority';
  end if;


  if p_deposit_target < 0 then
    raise exception 'Deposit target cannot be negative';
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


  if
    p_deposit_target >
    b.total_amount + 0.01
  then
    raise exception 'Deposit target cannot exceed booking total';
  end if;


  update public.yacht_os_bookings
  set
    collection_due_at =
      p_due_at,

    deposit_target =
      p_deposit_target,

    collection_priority =
      p_priority,

    collection_note =
      nullif(
        trim(p_note),
        ''
      )

  where id =
    b.id;


  return jsonb_build_object(
    'ok', true
  );
end;
$$;


grant execute
on function
  public.yacht_os_update_collection_plan(
    uuid,
    timestamptz,
    numeric,
    text,
    text
  )
to authenticated;


-- ============================================================
-- APPLY ONLINE PROVIDER REFUND
-- Called only by service role after iyzico success
-- ============================================================

create or replace function
public.yacht_os_apply_provider_refund(
  p_refund_id uuid,
  p_provider_reference text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.yacht_os_refunds%rowtype;
  p public.yacht_os_payments%rowtype;
  b public.yacht_os_bookings%rowtype;

  refunded_total numeric;
  booking_refunded_total numeric;

  next_booking_paid numeric;
  next_payment_status text;
  next_booking_status text;
begin

  select *
  into r
  from public.yacht_os_refunds
  where id = p_refund_id
  for update;


  if r.id is null then
    raise exception 'Refund not found';
  end if;


  if r.status = 'paid' then

    return jsonb_build_object(
      'ok', true,
      'already_applied', true
    );

  end if;


  select *
  into p
  from public.yacht_os_payments
  where id = r.payment_id
  for update;


  if p.id is null then
    raise exception 'Payment not found';
  end if;


  select *
  into b
  from public.yacht_os_bookings
  where id = r.booking_id
  for update;


  if b.id is null then
    raise exception 'Booking not found';
  end if;


  if r.amount <= 0 then
    raise exception 'Invalid refund amount';
  end if;


  select
    coalesce(
      sum(amount),
      0
    )
  into refunded_total
  from public.yacht_os_refunds
  where payment_id = p.id
    and status = 'paid'
    and id <> r.id;


  if
    refunded_total +
    r.amount >
    p.amount + 0.01
  then
    raise exception 'Refund exceeds payment amount';
  end if;


  update public.yacht_os_refunds
  set
    status =
      'paid',

    provider_reference =
      p_provider_reference,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      ) ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      ),

    updated_at =
      now()

  where id =
    r.id;


  refunded_total :=
    refunded_total +
    r.amount;


  next_payment_status :=
    case
      when refunded_total >= p.amount - 0.01
      then 'refunded'
      else 'partially_refunded'
    end;


  update public.yacht_os_payments
  set
    status =
      next_payment_status,

    updated_at =
      now()

  where id =
    p.id;


  select
    coalesce(
      sum(amount),
      0
    )
  into booking_refunded_total
  from public.yacht_os_refunds
  where booking_id = b.id
    and status = 'paid';


  next_booking_paid :=
    greatest(
      b.paid_amount -
      r.amount,
      0
    );


  next_booking_status :=
    case
      when next_booking_paid <= 0.01
           and booking_refunded_total > 0
      then 'refunded'

      when next_booking_paid >= b.total_amount - 0.01
      then 'paid'

      when next_booking_paid > 0
      then 'partial'

      else 'pending'
    end;


  update public.yacht_os_bookings
  set
    paid_amount =
      next_booking_paid,

    payment_status =
      next_booking_status

  where id =
    b.id;


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
    'refund',
    r.amount,
    r.currency,
    now(),
    'Online ödeme iadesi'
  );


  return jsonb_build_object(
    'ok', true,

    'refund_id',
      r.id,

    'booking_id',
      b.id,

    'refund_amount',
      r.amount,

    'booking_paid_amount',
      next_booking_paid,

    'payment_status',
      next_payment_status,

    'booking_payment_status',
      next_booking_status
  );

end;
$$;


grant execute
on function
  public.yacht_os_apply_provider_refund(
    uuid,
    text,
    jsonb
  )
to service_role;


-- ============================================================
-- MANUAL REFUND
-- Cash / transfer / physical card / other
-- ============================================================

create or replace function
public.yacht_os_record_manual_refund(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.yacht_os_payments%rowtype;
  b public.yacht_os_bookings%rowtype;

  refunded_before numeric;

  next_booking_paid numeric;
  next_payment_status text;
  next_booking_status text;

  refund_id uuid;
begin

  if p_amount <= 0 then
    raise exception 'Refund amount must be positive';
  end if;


  select *
  into p
  from public.yacht_os_payments
  where id = p_payment_id
  for update;


  if p.id is null then
    raise exception 'Payment not found';
  end if;


  if not public.is_active_company_member(
    p.company_id
  ) then
    raise exception 'Access denied';
  end if;


  if p.provider = 'iyzico' then
    raise exception 'Online iyzico payment must use provider refund';
  end if;


  if p.status not in (
    'paid',
    'partially_refunded'
  ) then
    raise exception 'Payment cannot be refunded';
  end if;


  select *
  into b
  from public.yacht_os_bookings
  where id = p.booking_id
  for update;


  if b.id is null then
    raise exception 'Booking not found';
  end if;


  select
    coalesce(
      sum(amount),
      0
    )
  into refunded_before
  from public.yacht_os_refunds
  where payment_id = p.id
    and status = 'paid';


  if
    refunded_before +
    p_amount >
    p.amount + 0.01
  then
    raise exception 'Refund exceeds refundable amount';
  end if;


  insert into public.yacht_os_refunds (
    company_id,
    booking_id,
    payment_id,
    amount,
    currency,
    provider,
    status,
    reason,
    requested_by
  )
  values (
    p.company_id,
    p.booking_id,
    p.id,
    p_amount,
    p.currency,
    'manual',
    'paid',
    nullif(
      trim(p_reason),
      ''
    ),
    auth.uid()
  )
  returning id
  into refund_id;


  refunded_before :=
    refunded_before +
    p_amount;


  next_payment_status :=
    case
      when refunded_before >= p.amount - 0.01
      then 'refunded'
      else 'partially_refunded'
    end;


  update public.yacht_os_payments
  set
    status =
      next_payment_status
  where id =
    p.id;


  next_booking_paid :=
    greatest(
      b.paid_amount -
      p_amount,
      0
    );


  next_booking_status :=
    case
      when next_booking_paid <= 0.01
      then 'refunded'

      when next_booking_paid >= b.total_amount - 0.01
      then 'paid'

      when next_booking_paid > 0
      then 'partial'

      else 'pending'
    end;


  update public.yacht_os_bookings
  set
    paid_amount =
      next_booking_paid,

    payment_status =
      next_booking_status

  where id =
    b.id;


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
    'refund',
    p_amount,
    p.currency,
    now(),
    'Manuel ödeme iadesi',
    auth.uid()
  );


  return jsonb_build_object(
    'ok', true,
    'refund_id', refund_id,
    'booking_paid_amount', next_booking_paid
  );

end;
$$;


grant execute
on function
  public.yacht_os_record_manual_refund(
    uuid,
    numeric,
    text
  )
to authenticated;
