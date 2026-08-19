
-- ============================================================
-- TUROBUS YACHT SETTLEMENT HARDENING
--
-- Goals:
-- - Server-side settlement calculations
-- - Period-scoped booking selection
-- - Settlement booking ledger
-- - Duplicate active-settlement protection
-- - Atomic supplier payments
-- - Overpayment prevention
-- - Controlled settlement status workflow
-- ============================================================


-- ============================================================
-- CREATE SETTLEMENT ATOMICALLY
-- ============================================================

create or replace function
public.yacht_os_create_settlement_atomic(
  p_supplier_id uuid,
  p_period_start date,
  p_period_end date,
  p_due_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.yacht_os_suppliers%rowtype;

  v_settlement_id uuid;
  v_code text;

  v_gross numeric(14,2);
  v_payable numeric(14,2);
  v_commission numeric(14,2);

  v_currency text;
  v_currency_count integer;
  v_booking_count integer;

  v_duplicate_count integer;
begin

  if p_period_start is null
     or p_period_end is null
     or p_period_end < p_period_start
  then
    raise exception 'Invalid settlement period';
  end if;


  select *
  into v_supplier
  from public.yacht_os_suppliers
  where id = p_supplier_id;


  if v_supplier.id is null then
    raise exception 'Supplier not found';
  end if;


  if not public.is_active_company_member(
    v_supplier.company_id
  ) then
    raise exception 'Access denied';
  end if;


  -- ----------------------------------------------------------
  -- Detect bookings that are already included in a
  -- non-cancelled settlement.
  -- ----------------------------------------------------------

  select count(*)
  into v_duplicate_count
  from public.yacht_os_bookings b

  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
   and sy.supplier_id = p_supplier_id

  where
    b.company_id = v_supplier.company_id

    and b.start_date >= p_period_start
    and b.start_date <= p_period_end

    and b.status in (
      'confirmed',
      'completed'
    )

    and exists (
      select 1
      from public.yacht_os_settlement_bookings sb

      join public.yacht_os_settlements s
        on s.id = sb.settlement_id

      where
        sb.booking_id = b.id
        and s.status <> 'cancelled'
    );


  if v_duplicate_count > 0 then
    raise exception
      'Period contains % booking(s) already included in an active settlement',
      v_duplicate_count;
  end if;


  -- ----------------------------------------------------------
  -- Validate single currency
  -- ----------------------------------------------------------

  select
    count(distinct b.currency),
    min(b.currency)
  into
    v_currency_count,
    v_currency

  from public.yacht_os_bookings b

  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
   and sy.supplier_id = p_supplier_id

  where
    b.company_id = v_supplier.company_id

    and b.start_date >= p_period_start
    and b.start_date <= p_period_end

    and b.status in (
      'confirmed',
      'completed'
    );


  if v_currency_count = 0 then
    raise exception
      'No eligible bookings found for settlement period';
  end if;


  if v_currency_count > 1 then
    raise exception
      'Multiple currencies cannot be included in one settlement';
  end if;


  -- ----------------------------------------------------------
  -- Calculate totals from real bookings
  -- ----------------------------------------------------------

  select
    count(*),

    coalesce(
      sum(b.total_amount),
      0
    ),

    coalesce(
      sum(b.supplier_cost),
      0
    ),

    coalesce(
      sum(b.commission_amount),
      0
    )

  into
    v_booking_count,
    v_gross,
    v_payable,
    v_commission

  from public.yacht_os_bookings b

  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
   and sy.supplier_id = p_supplier_id

  where
    b.company_id = v_supplier.company_id

    and b.start_date >= p_period_start
    and b.start_date <= p_period_end

    and b.status in (
      'confirmed',
      'completed'
    );


  if v_booking_count <= 0 then
    raise exception
      'No eligible bookings found';
  end if;


  v_code :=
    'MUT-' ||
    to_char(
      clock_timestamp(),
      'YYMMDDHH24MISS'
    ) ||
    '-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        4
      )
    );


  -- ----------------------------------------------------------
  -- Settlement header
  -- ----------------------------------------------------------

  insert into public.yacht_os_settlements (
    company_id,
    supplier_id,
    settlement_code,

    period_start,
    period_end,

    gross_sales,
    supplier_payable,
    platform_commission,

    adjustments,
    paid_amount,

    currency,

    status,

    due_date,
    note,

    created_by
  )
  values (
    v_supplier.company_id,
    p_supplier_id,
    v_code,

    p_period_start,
    p_period_end,

    v_gross,
    v_payable,
    v_commission,

    0,
    0,

    coalesce(
      v_currency,
      'TRY'
    ),

    'draft',

    p_due_date,

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_settlement_id;


  -- ----------------------------------------------------------
  -- Immutable booking snapshot for this settlement
  -- ----------------------------------------------------------

  insert into public.yacht_os_settlement_bookings (
    settlement_id,
    booking_id,
    supplier_payable,
    platform_commission
  )

  select
    v_settlement_id,
    b.id,
    coalesce(
      b.supplier_cost,
      0
    ),
    coalesce(
      b.commission_amount,
      0
    )

  from public.yacht_os_bookings b

  join public.yacht_os_supplier_yachts sy
    on sy.yacht_id = b.yacht_id
   and sy.supplier_id = p_supplier_id

  where
    b.company_id =
      v_supplier.company_id

    and b.start_date >=
      p_period_start

    and b.start_date <=
      p_period_end

    and b.status in (
      'confirmed',
      'completed'
    );


  return jsonb_build_object(
    'ok',
      true,

    'settlement_id',
      v_settlement_id,

    'settlement_code',
      v_code,

    'booking_count',
      v_booking_count,

    'gross_sales',
      v_gross,

    'supplier_payable',
      v_payable,

    'platform_commission',
      v_commission,

    'currency',
      v_currency
  );

end;
$$;


-- ============================================================
-- CONTROLLED SETTLEMENT STATUS
-- ============================================================

create or replace function
public.yacht_os_update_settlement_status_atomic(
  p_settlement_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.yacht_os_settlements%rowtype;
begin

  select *
  into s
  from public.yacht_os_settlements
  where id = p_settlement_id
  for update;


  if s.id is null then
    raise exception
      'Settlement not found';
  end if;


  if not public.is_active_company_member(
    s.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if p_status not in (
    'draft',
    'waiting_approval',
    'approved',
    'partially_paid',
    'paid',
    'cancelled'
  ) then
    raise exception
      'Invalid settlement status';
  end if;


  if s.status = 'paid'
     and p_status <> 'paid'
  then
    raise exception
      'Paid settlement cannot be reopened';
  end if;


  if s.status = 'partially_paid'
     and p_status in (
       'draft',
       'waiting_approval',
       'approved',
       'cancelled'
     )
  then
    raise exception
      'Partially paid settlement cannot move backwards';
  end if;


  if p_status = 'cancelled'
     and s.paid_amount > 0
  then
    raise exception
      'Settlement with payments cannot be cancelled';
  end if;


  if p_status = 'paid'
     and s.paid_amount <
       greatest(
         s.supplier_payable +
         s.adjustments,
         0
       ) - 0.01
  then
    raise exception
      'Settlement cannot be marked paid before full payment';
  end if;


  update public.yacht_os_settlements
  set
    status =
      p_status,

    approved_at =
      case
        when p_status = 'approved'
        then coalesce(
          approved_at,
          now()
        )
        else approved_at
      end,

    paid_at =
      case
        when p_status = 'paid'
        then coalesce(
          paid_at,
          now()
        )

        when p_status <> 'paid'
        then null

        else paid_at
      end

  where id =
    s.id;


  return jsonb_build_object(
    'ok',
      true,

    'status',
      p_status
  );

end;
$$;


-- ============================================================
-- ATOMIC SUPPLIER PAYMENT
-- ============================================================

create or replace function
public.yacht_os_record_supplier_payment_atomic(
  p_settlement_id uuid,
  p_amount numeric,
  p_payment_method text default 'bank_transfer',
  p_reference_no text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.yacht_os_settlements%rowtype;

  v_payment_id uuid;

  v_target numeric(14,2);
  v_remaining numeric(14,2);
  v_next_paid numeric(14,2);

  v_next_status text;
begin

  if p_amount is null
     or p_amount <= 0
  then
    raise exception
      'Payment amount must be positive';
  end if;


  if p_payment_method not in (
    'bank_transfer',
    'cash',
    'credit_card',
    'other'
  ) then
    raise exception
      'Invalid supplier payment method';
  end if;


  select *
  into s
  from public.yacht_os_settlements
  where id = p_settlement_id
  for update;


  if s.id is null then
    raise exception
      'Settlement not found';
  end if;


  if not public.is_active_company_member(
    s.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if s.status not in (
    'approved',
    'partially_paid'
  ) then
    raise exception
      'Settlement must be approved before payment';
  end if;


  v_target :=
    greatest(
      s.supplier_payable +
      s.adjustments,
      0
    );


  v_remaining :=
    greatest(
      v_target -
      s.paid_amount,
      0
    );


  if v_remaining <= 0.01 then
    raise exception
      'Settlement has no remaining payable balance';
  end if;


  if p_amount >
     v_remaining + 0.01
  then
    raise exception
      'Payment exceeds settlement remaining balance';
  end if;


  v_next_paid :=
    s.paid_amount +
    p_amount;


  v_next_status :=
    case
      when v_next_paid >=
        v_target - 0.01
      then 'paid'
      else 'partially_paid'
    end;


  insert into public.yacht_os_supplier_payments (
    company_id,
    supplier_id,
    settlement_id,

    amount,
    currency,

    payment_method,

    reference_no,
    note,

    paid_at,
    created_by
  )
  values (
    s.company_id,
    s.supplier_id,
    s.id,

    p_amount,
    s.currency,

    p_payment_method,

    nullif(
      trim(
        p_reference_no
      ),
      ''
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    now(),
    auth.uid()
  )
  returning id
  into v_payment_id;


  update public.yacht_os_settlements
  set
    paid_amount =
      v_next_paid,

    status =
      v_next_status,

    paid_at =
      case
        when v_next_status = 'paid'
        then now()
        else null
      end

  where id =
    s.id;


  return jsonb_build_object(
    'ok',
      true,

    'payment_id',
      v_payment_id,

    'settlement_id',
      s.id,

    'paid_amount',
      v_next_paid,

    'remaining',
      greatest(
        v_target -
        v_next_paid,
        0
      ),

    'status',
      v_next_status
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
--
-- Reads remain available.
-- Financial mutations are forced through transactional RPCs.
-- ============================================================

revoke insert, update, delete
on public.yacht_os_settlement_bookings
from authenticated;

revoke insert, update, delete
on public.yacht_os_supplier_payments
from authenticated;

revoke insert, update, delete
on public.yacht_os_settlements
from authenticated;


grant select
on
  public.yacht_os_settlements,
  public.yacht_os_settlement_bookings,
  public.yacht_os_supplier_payments
to authenticated;


grant execute
on function
  public.yacht_os_create_settlement_atomic(
    uuid,
    date,
    date,
    date,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_update_settlement_status_atomic(
    uuid,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_record_supplier_payment_atomic(
    uuid,
    numeric,
    text,
    text,
    text
  )
to authenticated;
