
-- ============================================================
-- TUROBUS YACHT OS
-- FINANCE RECONCILIATION HARDENING — PHASE 3
--
-- Goals
-- - Provider payment idempotency
-- - Refund reservation concurrency
-- - Booking paid_amount reconciliation
-- - Duplicate finance-ledger prevention
-- - Finance mutation authority normalization
-- - Settlement authority + concurrency
-- - Settlement payment state machine
-- - Supplier payment idempotency protection
-- - Supplier payable snapshot consistency
--
-- Applied migrations remain untouched.
-- ============================================================


-- ============================================================
-- 1. FINANCE ENTRY SOURCE IDENTITY
--
-- Future payment/refund ledger rows carry their true source.
-- This prevents callback/retry from creating duplicate ledger
-- entries for the same financial event.
-- ============================================================

alter table public.yacht_os_finance_entries
  add column if not exists source_type text;

alter table public.yacht_os_finance_entries
  add column if not exists source_id uuid;


create unique index if not exists
  yacht_os_finance_source_entry_unique_idx
on public.yacht_os_finance_entries (
  source_type,
  source_id,
  entry_type
)
where source_id is not null;


create index if not exists
  yacht_os_finance_source_lookup_idx
on public.yacht_os_finance_entries (
  source_type,
  source_id
)
where source_id is not null;


-- ============================================================
-- 2. PROVIDER PAYMENT IDENTIFIERS
--
-- One iyzico/provider payment may belong to only one Turobus
-- payment row.
-- ============================================================

create unique index if not exists
  yacht_os_payment_provider_payment_unique_idx
on public.yacht_os_payments (
  provider,
  provider_payment_id
)
where
  provider is not null
  and provider_payment_id is not null
  and btrim(provider_payment_id) <> '';


create unique index if not exists
  yacht_os_payment_provider_transaction_unique_idx
on public.yacht_os_payments (
  provider,
  provider_transaction_id
)
where
  provider is not null
  and provider_transaction_id is not null
  and btrim(provider_transaction_id) <> '';


-- Actual database uniqueness in addition to Phase 2 trigger.
create unique index if not exists
  yacht_os_refund_provider_reference_unique_idx
on public.yacht_os_refunds (
  provider_reference
)
where
  provider_reference is not null
  and btrim(provider_reference) <> '';


-- ============================================================
-- 3. REFUND RESERVATION CONCURRENCY GUARD
--
-- "processing" refunds reserve refundable balance before the
-- provider request is completed.
--
-- This blocks two simultaneous refund requests from both
-- reserving the same payment balance.
-- ============================================================

create or replace function
public.yacht_os_validate_refund_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.yacht_os_payments%rowtype;

  v_reserved numeric(14,2);
begin

  select *
  into p
  from public.yacht_os_payments
  where id = new.payment_id
  for update;


  if p.id is null then
    raise exception
      'Refund payment not found';
  end if;


  if new.company_id <> p.company_id then
    raise exception
      'Refund company does not match payment company';
  end if;


  if new.booking_id <> p.booking_id then
    raise exception
      'Refund booking does not match payment booking';
  end if;


  if new.currency <> p.currency then
    raise exception
      'Refund currency does not match payment currency';
  end if;


  if new.amount <= 0 then
    raise exception
      'Refund amount must be positive';
  end if;


  if new.status in (
    'processing',
    'paid'
  ) then

    select
      coalesce(
        sum(r.amount),
        0
      )
    into v_reserved

    from public.yacht_os_refunds r

    where
      r.payment_id = p.id

      and r.status in (
        'processing',
        'paid'
      )

      and r.id <> new.id;


    if
      v_reserved +
      new.amount >
      p.amount + 0.01
    then
      raise exception
        'Refund reservation exceeds refundable payment balance';
    end if;

  end if;


  return new;

end;
$$;


revoke execute
on function
  public.yacht_os_validate_refund_reservation()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_refund_reservation_guard
on public.yacht_os_refunds;


create trigger
  yacht_os_refund_reservation_guard
before insert or update of
  payment_id,
  booking_id,
  company_id,
  amount,
  currency,
  status
on public.yacht_os_refunds
for each row
execute function
  public.yacht_os_validate_refund_reservation();


-- ============================================================
-- 4. BOOKING FINANCE RECONCILIATION
--
-- booking.paid_amount is no longer trusted as an incremental
-- counter.
--
-- SOURCE OF TRUTH:
--
-- paid payments
-- minus
-- paid refunds
--
-- Payment rows in refunded / partially_refunded state still
-- represent original collected cash; refunds are subtracted
-- separately.
-- ============================================================

create or replace function
public.yacht_os_reconcile_booking_finance(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;

  v_gross_collected numeric(14,2);
  v_refunded numeric(14,2);
  v_net_collected numeric(14,2);

  v_status text;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found for finance reconciliation';
  end if;


  select
    coalesce(
      sum(p.amount),
      0
    )
  into v_gross_collected
  from public.yacht_os_payments p
  where
    p.booking_id = b.id

    and p.status in (
      'paid',
      'partially_refunded',
      'refunded'
    );


  select
    coalesce(
      sum(r.amount),
      0
    )
  into v_refunded
  from public.yacht_os_refunds r
  where
    r.booking_id = b.id

    and r.status = 'paid';


  if
    v_refunded >
    v_gross_collected + 0.01
  then
    raise exception
      'Finance reconciliation failed: refunds exceed collected payments';
  end if;


  v_net_collected :=
    greatest(
      v_gross_collected -
      v_refunded,
      0
    );


  if
    v_net_collected >
    b.total_amount + 0.01
  then
    raise exception
      'Finance reconciliation failed: collected amount exceeds booking total';
  end if;


  v_status :=
    case

      when
        v_net_collected <= 0.01
        and v_refunded > 0
      then
        'refunded'

      when
        v_net_collected >=
        b.total_amount - 0.01
      then
        'paid'

      when
        v_net_collected > 0.01
      then
        'partial'

      else
        'pending'

    end;


  update public.yacht_os_bookings
  set
    paid_amount =
      least(
        v_net_collected,
        total_amount
      ),

    payment_status =
      v_status

  where id =
    b.id;


  return jsonb_build_object(
    'ok',
      true,

    'booking_id',
      b.id,

    'gross_collected',
      v_gross_collected,

    'refunded',
      v_refunded,

    'net_collected',
      v_net_collected,

    'payment_status',
      v_status
  );

end;
$$;


revoke execute
on function
  public.yacht_os_reconcile_booking_finance(uuid)
from public, anon, authenticated;


-- ============================================================
-- AUTOMATIC RECONCILIATION TRIGGER
-- ============================================================

create or replace function
public.yacht_os_sync_booking_finance_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin

  v_booking_id :=
    case
      when TG_OP = 'DELETE'
      then old.booking_id
      else new.booking_id
    end;


  if v_booking_id is not null then

    perform
      public.yacht_os_reconcile_booking_finance(
        v_booking_id
      );

  end if;


  return
    case
      when TG_OP = 'DELETE'
      then old
      else new
    end;

end;
$$;


revoke execute
on function
  public.yacht_os_sync_booking_finance_trigger()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_payment_booking_reconcile
on public.yacht_os_payments;


create trigger
  yacht_os_payment_booking_reconcile
after insert or update or delete
on public.yacht_os_payments
for each row
execute function
  public.yacht_os_sync_booking_finance_trigger();


drop trigger if exists
  yacht_os_refund_booking_reconcile
on public.yacht_os_refunds;


create trigger
  yacht_os_refund_booking_reconcile
after insert or update or delete
on public.yacht_os_refunds
for each row
execute function
  public.yacht_os_sync_booking_finance_trigger();


-- ============================================================
-- 5. MANUAL PAYMENT — RECONCILED IMPLEMENTATION
-- ============================================================

alter function
public.yacht_os_record_manual_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
rename to
yacht_os_record_manual_payment_phase1_20260819;


revoke execute
on function
public.yacht_os_record_manual_payment_phase1_20260819(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon, authenticated;


create function
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

  v_payment_id uuid;

  v_current_net numeric(14,2);

  v_result jsonb;
begin

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Payment amount must be positive';
  end if;


  if p_method not in (
    'cash',
    'bank_transfer',
    'credit_card',
    'other'
  ) then
    raise exception
      'Invalid payment method';
  end if;


  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    b.company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  if b.status = 'cancelled' then
    raise exception
      'Cancelled booking cannot receive payment';
  end if;


  perform
    public.yacht_os_reconcile_booking_finance(
      b.id
    );


  select paid_amount
  into v_current_net
  from public.yacht_os_bookings
  where id = b.id;


  if
    v_current_net +
    p_amount >
    b.total_amount + 0.01
  then
    raise exception
      'Payment exceeds outstanding balance';
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


  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,

    entry_type,

    amount,
    currency,

    paid_at,

    description,

    created_by,

    source_type,
    source_id
  )
  values (
    b.company_id,
    b.id,

    'payment',

    p_amount,
    b.currency,

    now(),

    'Manuel tahsilat',

    auth.uid(),

    'yacht_payment',
    v_payment_id
  )
  on conflict do nothing;


  v_result :=
    public.yacht_os_reconcile_booking_finance(
      b.id
    );


  return
    jsonb_build_object(
      'ok',
        true,

      'payment_id',
        v_payment_id,

      'paid_amount',
        v_result -> 'net_collected',

      'payment_status',
        v_result -> 'payment_status'
    );

end;
$$;


revoke execute
on function
public.yacht_os_record_manual_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon;


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
-- 6. IYZICO FINALIZE — CALLBACK IDEMPOTENCY
-- ============================================================

alter function
public.finalize_yacht_iyzico_payment(
  uuid,
  text,
  text,
  numeric,
  jsonb
)
rename to
finalize_yacht_iyzico_payment_legacy_20260819;


revoke execute
on function
public.finalize_yacht_iyzico_payment_legacy_20260819(
  uuid,
  text,
  text,
  numeric,
  jsonb
)
from public, anon, authenticated;


create function
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
  p public.yacht_os_payments%rowtype;
  b public.yacht_os_bookings%rowtype;

  v_result jsonb;
begin

  if not public.yacht_os_is_service_role() then
    raise exception
      'Service role required';
  end if;


  if nullif(
    trim(
      p_provider_payment_id
    ),
    ''
  ) is null then
    raise exception
      'Provider payment id required';
  end if;


  select *
  into p
  from public.yacht_os_payments
  where id = p_payment_id
  for update;


  if p.id is null then
    raise exception
      'Payment not found';
  end if;


  -- ----------------------------------------------------------
  -- Repeated callback for same already-finalized payment.
  -- ----------------------------------------------------------

  if p.status in (
    'paid',
    'partially_refunded',
    'refunded'
  ) then

    if
      p.provider_payment_id
        is distinct from
      p_provider_payment_id
    then
      raise exception
        'Payment already finalized with different provider payment id';
    end if;


    v_result :=
      public.yacht_os_reconcile_booking_finance(
        p.booking_id
      );


    return jsonb_build_object(
      'ok',
        true,

      'already_finalized',
        true,

      'booking_id',
        p.booking_id,

      'payment_id',
        p.id,

      'paid_amount',
        v_result -> 'net_collected'
    );

  end if;


  if p.status not in (
    'pending'
  ) then
    raise exception
      'Payment is not finalizable';
  end if;


  if
    abs(
      p.amount -
      p_paid_amount
    ) > 0.01
  then
    raise exception
      'Paid amount mismatch';
  end if;


  select *
  into b
  from public.yacht_os_bookings
  where id = p.booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if b.status = 'cancelled' then
    raise exception
      'Cancelled booking cannot receive payment';
  end if;


  perform
    public.yacht_os_reconcile_booking_finance(
      b.id
    );


  select *
  into b
  from public.yacht_os_bookings
  where id = b.id
  for update;


  if
    b.paid_amount +
    p_paid_amount >
    b.total_amount + 0.01
  then
    raise exception
      'Payment exceeds booking total';
  end if;


  update public.yacht_os_payments
  set
    provider =
      coalesce(
        nullif(
          provider,
          ''
        ),
        'iyzico'
      ),

    status =
      'paid',

    provider_payment_id =
      trim(
        p_provider_payment_id
      ),

    provider_transaction_id =
      nullif(
        trim(
          p_provider_transaction_id
        ),
        ''
      ),

    paid_at =
      coalesce(
        paid_at,
        now()
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      ) ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      )

  where id =
    p.id;


  if p.payment_link_id is not null then

    update public.yacht_os_payment_links
    set
      status =
        'paid',

      paid_at =
        coalesce(
          paid_at,
          now()
        )

    where id =
      p.payment_link_id;

  end if;


  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,

    entry_type,

    amount,
    currency,

    paid_at,

    description,

    source_type,
    source_id
  )
  values (
    b.company_id,
    b.id,

    'payment',

    p_paid_amount,
    b.currency,

    now(),

    'iyzico online tahsilat',

    'yacht_payment',
    p.id
  )
  on conflict do nothing;


  v_result :=
    public.yacht_os_reconcile_booking_finance(
      b.id
    );


  return jsonb_build_object(
    'ok',
      true,

    'payment_id',
      p.id,

    'booking_id',
      b.id,

    'paid_amount',
      v_result -> 'net_collected',

    'remaining',
      greatest(
        b.total_amount -
        (v_result ->> 'net_collected')::numeric,
        0
      )
  );

end;
$$;


revoke execute
on function
public.finalize_yacht_iyzico_payment(
  uuid,
  text,
  text,
  numeric,
  jsonb
)
from public, anon, authenticated;


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


-- ============================================================
-- 7. PROVIDER REFUND — RECONCILED / IDEMPOTENT
-- ============================================================

alter function
public.yacht_os_apply_provider_refund(
  uuid,
  text,
  jsonb
)
rename to
yacht_os_apply_provider_refund_legacy_20260819;


revoke execute
on function
public.yacht_os_apply_provider_refund_legacy_20260819(
  uuid,
  text,
  jsonb
)
from public, anon, authenticated;


create function
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

  v_refunded_total numeric(14,2);

  v_payment_status text;

  v_result jsonb;
begin

  if not public.yacht_os_is_service_role() then
    raise exception
      'Service role required';
  end if;


  if nullif(
    trim(
      p_provider_reference
    ),
    ''
  ) is null then
    raise exception
      'Provider refund reference required';
  end if;


  select *
  into r
  from public.yacht_os_refunds
  where id = p_refund_id
  for update;


  if r.id is null then
    raise exception
      'Refund not found';
  end if;


  -- Idempotent provider retry.
  if r.status = 'paid' then

    if
      r.provider_reference
        is distinct from
      trim(
        p_provider_reference
      )
    then
      raise exception
        'Refund already finalized with different provider reference';
    end if;


    v_result :=
      public.yacht_os_reconcile_booking_finance(
        r.booking_id
      );


    return jsonb_build_object(
      'ok',
        true,

      'already_applied',
        true,

      'refund_id',
        r.id,

      'booking_id',
        r.booking_id,

      'booking_paid_amount',
        v_result -> 'net_collected'
    );

  end if;


  if r.status <> 'processing' then
    raise exception
      'Only processing refund can be finalized';
  end if;


  select *
  into p
  from public.yacht_os_payments
  where id = r.payment_id
  for update;


  if p.id is null then
    raise exception
      'Payment not found';
  end if;


  if p.booking_id <> r.booking_id then
    raise exception
      'Refund payment booking mismatch';
  end if;


  if p.company_id <> r.company_id then
    raise exception
      'Refund payment company mismatch';
  end if;


  if p.status not in (
    'paid',
    'partially_refunded'
  ) then
    raise exception
      'Payment cannot receive provider refund';
  end if;


  select
    coalesce(
      sum(x.amount),
      0
    )
  into v_refunded_total

  from public.yacht_os_refunds x

  where
    x.payment_id = p.id

    and x.status = 'paid'

    and x.id <> r.id;


  if
    v_refunded_total +
    r.amount >
    p.amount + 0.01
  then
    raise exception
      'Refund exceeds payment amount';
  end if;


  update public.yacht_os_refunds
  set
    status =
      'paid',

    provider_reference =
      trim(
        p_provider_reference
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      ) ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      )

  where id =
    r.id;


  v_refunded_total :=
    v_refunded_total +
    r.amount;


  v_payment_status :=
    case
      when
        v_refunded_total >=
        p.amount - 0.01
      then
        'refunded'
      else
        'partially_refunded'
    end;


  update public.yacht_os_payments
  set status =
    v_payment_status
  where id =
    p.id;


  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,

    entry_type,

    amount,
    currency,

    paid_at,

    description,

    source_type,
    source_id
  )
  values (
    r.company_id,
    r.booking_id,

    'refund',

    r.amount,
    r.currency,

    now(),

    'Online ödeme iadesi',

    'yacht_refund',
    r.id
  )
  on conflict do nothing;


  v_result :=
    public.yacht_os_reconcile_booking_finance(
      r.booking_id
    );


  return jsonb_build_object(
    'ok',
      true,

    'refund_id',
      r.id,

    'booking_id',
      r.booking_id,

    'refund_amount',
      r.amount,

    'booking_paid_amount',
      v_result -> 'net_collected',

    'payment_status',
      v_payment_status,

    'booking_payment_status',
      v_result -> 'payment_status'
  );

end;
$$;


revoke execute
on function
public.yacht_os_apply_provider_refund(
  uuid,
  text,
  jsonb
)
from public, anon, authenticated;


grant execute
on function
public.yacht_os_apply_provider_refund(
  uuid,
  text,
  jsonb
)
to service_role;


-- ============================================================
-- 8. MANUAL REFUND — RECONCILED
-- ============================================================

alter function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
rename to
yacht_os_record_manual_refund_phase1_20260819;


revoke execute
on function
public.yacht_os_record_manual_refund_phase1_20260819(
  uuid,
  numeric,
  text
)
from public, anon, authenticated;


create function
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

  v_refunded_before numeric(14,2);

  v_refund_id uuid;

  v_payment_status text;

  v_result jsonb;
begin

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Refund amount must be positive';
  end if;


  select *
  into p
  from public.yacht_os_payments
  where id = p_payment_id
  for update;


  if p.id is null then
    raise exception
      'Payment not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    p.company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  if p.provider = 'iyzico' then
    raise exception
      'Online iyzico payment must use provider refund';
  end if;


  if p.status not in (
    'paid',
    'partially_refunded'
  ) then
    raise exception
      'Payment cannot be refunded';
  end if;


  select
    coalesce(
      sum(r.amount),
      0
    )
  into v_refunded_before

  from public.yacht_os_refunds r

  where
    r.payment_id = p.id

    and r.status in (
      'processing',
      'paid'
    );


  if
    v_refunded_before +
    p_amount >
    p.amount + 0.01
  then
    raise exception
      'Refund exceeds refundable amount';
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
      trim(
        p_reason
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_refund_id;


  select
    coalesce(
      sum(r.amount),
      0
    )
  into v_refunded_before

  from public.yacht_os_refunds r

  where
    r.payment_id = p.id

    and r.status = 'paid';


  v_payment_status :=
    case
      when
        v_refunded_before >=
        p.amount - 0.01
      then
        'refunded'
      else
        'partially_refunded'
    end;


  update public.yacht_os_payments
  set status =
    v_payment_status
  where id =
    p.id;


  insert into public.yacht_os_finance_entries (
    company_id,
    booking_id,

    entry_type,

    amount,
    currency,

    paid_at,

    description,

    created_by,

    source_type,
    source_id
  )
  values (
    p.company_id,
    p.booking_id,

    'refund',

    p_amount,
    p.currency,

    now(),

    'Manuel ödeme iadesi',

    auth.uid(),

    'yacht_refund',
    v_refund_id
  )
  on conflict do nothing;


  v_result :=
    public.yacht_os_reconcile_booking_finance(
      p.booking_id
    );


  return jsonb_build_object(
    'ok',
      true,

    'refund_id',
      v_refund_id,

    'booking_paid_amount',
      v_result -> 'net_collected',

    'booking_payment_status',
      v_result -> 'payment_status'
  );

end;
$$;


revoke execute
on function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
to authenticated;


-- ============================================================
-- 9. FORCE AUTHENTICATED FINANCE MUTATIONS THROUGH RPC
--
-- API provider routes use service_role and remain unaffected.
-- ============================================================

revoke insert, update, delete
on
  public.yacht_os_payments,
  public.yacht_os_refunds,
  public.yacht_os_payment_links
from authenticated;


grant select
on
  public.yacht_os_payments,
  public.yacht_os_refunds,
  public.yacht_os_payment_links
to authenticated;


-- ============================================================
-- 10. SETTLEMENT CONSISTENCY ASSERTION
-- ============================================================

create or replace function
public.yacht_os_assert_settlement_consistency(
  p_settlement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.yacht_os_settlements%rowtype;

  v_booking_count integer;

  v_snapshot_payable numeric(14,2);
  v_snapshot_commission numeric(14,2);

  v_target numeric(14,2);
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


  select
    count(*),

    coalesce(
      sum(sb.supplier_payable),
      0
    ),

    coalesce(
      sum(sb.platform_commission),
      0
    )

  into
    v_booking_count,
    v_snapshot_payable,
    v_snapshot_commission

  from public.yacht_os_settlement_bookings sb

  where sb.settlement_id =
    s.id;


  if v_booking_count <= 0 then
    raise exception
      'Settlement has no booking snapshot';
  end if;


  if
    abs(
      v_snapshot_payable -
      s.supplier_payable
    ) > 0.01
  then
    raise exception
      'Settlement supplier payable does not match booking snapshot';
  end if;


  if
    abs(
      v_snapshot_commission -
      s.platform_commission
    ) > 0.01
  then
    raise exception
      'Settlement commission does not match booking snapshot';
  end if;


  v_target :=
    greatest(
      s.supplier_payable +
      s.adjustments,
      0
    );


  if
    s.paid_amount >
    v_target + 0.01
  then
    raise exception
      'Settlement paid amount exceeds target payable';
  end if;


  return jsonb_build_object(
    'ok',
      true,

    'booking_count',
      v_booking_count,

    'snapshot_payable',
      v_snapshot_payable,

    'snapshot_commission',
      v_snapshot_commission,

    'target_payable',
      v_target
  );

end;
$$;


revoke execute
on function
  public.yacht_os_assert_settlement_consistency(uuid)
from public, anon, authenticated;


-- ============================================================
-- 11. SUPPLIER PAYMENT LEDGER IMMUTABILITY
-- ============================================================

create or replace function
public.yacht_os_supplier_payment_immutable_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  raise exception
    'Supplier payment ledger is immutable';

end;
$$;


revoke execute
on function
  public.yacht_os_supplier_payment_immutable_guard()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_supplier_payment_immutable
on public.yacht_os_supplier_payments;


create trigger
  yacht_os_supplier_payment_immutable
before update or delete
on public.yacht_os_supplier_payments
for each row
execute function
  public.yacht_os_supplier_payment_immutable_guard();


create unique index if not exists
  yacht_os_supplier_payment_reference_unique_idx
on public.yacht_os_supplier_payments (
  settlement_id,
  reference_no
)
where
  settlement_id is not null
  and reference_no is not null
  and btrim(reference_no) <> '';


-- ============================================================
-- 12. RECONCILE SETTLEMENT PAYMENT STATE
-- ============================================================

create or replace function
public.yacht_os_reconcile_settlement_payment_state(
  p_settlement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.yacht_os_settlements%rowtype;

  v_paid numeric(14,2);
  v_target numeric(14,2);

  v_status text;
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


  perform
    public.yacht_os_assert_settlement_consistency(
      s.id
    );


  select
    coalesce(
      sum(sp.amount),
      0
    )
  into v_paid

  from public.yacht_os_supplier_payments sp

  where sp.settlement_id =
    s.id;


  v_target :=
    greatest(
      s.supplier_payable +
      s.adjustments,
      0
    );


  if
    v_paid >
    v_target + 0.01
  then
    raise exception
      'Supplier payments exceed settlement payable';
  end if;


  if
    v_paid > 0
    and s.status not in (
      'approved',
      'partially_paid',
      'paid'
    )
  then
    raise exception
      'Supplier payment exists for non-approved settlement';
  end if;


  v_status :=
    case

      when
        v_paid >=
        v_target - 0.01
        and v_target > 0
      then
        'paid'

      when
        v_paid > 0
      then
        'partially_paid'

      else
        s.status

    end;


  update public.yacht_os_settlements
  set
    paid_amount =
      v_paid,

    status =
      v_status,

    paid_at =
      case
        when v_status = 'paid'
        then coalesce(
          paid_at,
          now()
        )
        else null
      end

  where id =
    s.id;


  return jsonb_build_object(
    'ok',
      true,

    'settlement_id',
      s.id,

    'paid_amount',
      v_paid,

    'target_payable',
      v_target,

    'status',
      v_status
  );

end;
$$;


revoke execute
on function
  public.yacht_os_reconcile_settlement_payment_state(uuid)
from public, anon, authenticated;


create or replace function
public.yacht_os_sync_settlement_payment_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  perform
    public.yacht_os_reconcile_settlement_payment_state(
      new.settlement_id
    );


  return new;

end;
$$;


revoke execute
on function
  public.yacht_os_sync_settlement_payment_trigger()
from public, anon, authenticated;


drop trigger if exists
  yacht_os_supplier_payment_reconcile
on public.yacht_os_supplier_payments;


create trigger
  yacht_os_supplier_payment_reconcile
after insert
on public.yacht_os_supplier_payments
for each row
when (new.settlement_id is not null)
execute function
  public.yacht_os_sync_settlement_payment_trigger();


-- ============================================================
-- 13. SETTLEMENT CREATE — AUTHORITY + CONCURRENCY
-- ============================================================

alter function
public.yacht_os_create_settlement_atomic(
  uuid,
  date,
  date,
  date,
  text
)
rename to
yacht_os_create_settlement_atomic_legacy_20260819;


revoke execute
on function
public.yacht_os_create_settlement_atomic_legacy_20260819(
  uuid,
  date,
  date,
  date,
  text
)
from public, anon, authenticated;


create function
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
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_suppliers
  where id = p_supplier_id;


  if v_company_id is null then
    raise exception
      'Supplier not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    v_company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  perform pg_advisory_xact_lock(
    hashtextextended(
      p_supplier_id::text ||
      ':' ||
      coalesce(
        p_period_start::text,
        ''
      ) ||
      ':' ||
      coalesce(
        p_period_end::text,
        ''
      ),
      0
    )
  );


  return
    public.yacht_os_create_settlement_atomic_legacy_20260819(
      p_supplier_id,
      p_period_start,
      p_period_end,
      p_due_date,
      p_note
    );

end;
$$;


revoke execute
on function
public.yacht_os_create_settlement_atomic(
  uuid,
  date,
  date,
  date,
  text
)
from public, anon;


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


-- ============================================================
-- 14. STRICT SETTLEMENT STATUS STATE MACHINE
--
-- draft -> waiting_approval / cancelled
-- waiting_approval -> draft / approved / cancelled
-- approved -> cancelled only when unpaid
--
-- partially_paid + paid transitions are driven only by
-- supplier-payment RPC/reconciliation.
-- ============================================================

alter function
public.yacht_os_update_settlement_status_atomic(
  uuid,
  text
)
rename to
yacht_os_update_settlement_status_atomic_legacy_20260819;


revoke execute
on function
public.yacht_os_update_settlement_status_atomic_legacy_20260819(
  uuid,
  text
)
from public, anon, authenticated;


create function
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

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_settlement_id::text,
      0
    )
  );


  select *
  into s
  from public.yacht_os_settlements
  where id = p_settlement_id
  for update;


  if s.id is null then
    raise exception
      'Settlement not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    s.company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  perform
    public.yacht_os_assert_settlement_consistency(
      s.id
    );


  if p_status = s.status then
    return jsonb_build_object(
      'ok',
        true,
      'status',
        s.status,
      'already_in_status',
        true
    );
  end if;


  if s.status = 'draft' then

    if p_status not in (
      'waiting_approval',
      'cancelled'
    ) then
      raise exception
        'Invalid settlement transition: draft -> %',
        p_status;
    end if;


  elsif s.status = 'waiting_approval' then

    if p_status not in (
      'draft',
      'approved',
      'cancelled'
    ) then
      raise exception
        'Invalid settlement transition: waiting_approval -> %',
        p_status;
    end if;


  elsif s.status = 'approved' then

    if
      p_status <> 'cancelled'
      or s.paid_amount > 0.01
    then
      raise exception
        'Approved settlement can only be cancelled before payment';
    end if;


  elsif s.status = 'partially_paid' then

    raise exception
      'Partially paid settlement state is controlled by supplier payments';


  elsif s.status in (
    'paid',
    'cancelled'
  ) then

    raise exception
      'Terminal settlement cannot change status';


  else

    raise exception
      'Invalid current settlement status';

  end if;


  return
    public.yacht_os_update_settlement_status_atomic_legacy_20260819(
      s.id,
      p_status
    );

end;
$$;


revoke execute
on function
public.yacht_os_update_settlement_status_atomic(
  uuid,
  text
)
from public, anon;


grant execute
on function
public.yacht_os_update_settlement_status_atomic(
  uuid,
  text
)
to authenticated;


-- ============================================================
-- 15. SUPPLIER PAYMENT — AUTHORITY / IDEMPOTENCY / LOCK
-- ============================================================

alter function
public.yacht_os_record_supplier_payment_atomic(
  uuid,
  numeric,
  text,
  text,
  text
)
rename to
yacht_os_record_supplier_payment_atomic_legacy_20260819;


revoke execute
on function
public.yacht_os_record_supplier_payment_atomic_legacy_20260819(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon, authenticated;


create function
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

  v_existing public.yacht_os_supplier_payments%rowtype;

  v_result jsonb;
begin

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Payment amount must be positive';
  end if;


  perform pg_advisory_xact_lock(
    hashtextextended(
      p_settlement_id::text,
      0
    )
  );


  select *
  into s
  from public.yacht_os_settlements
  where id = p_settlement_id
  for update;


  if s.id is null then
    raise exception
      'Settlement not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    s.company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  perform
    public.yacht_os_assert_settlement_consistency(
      s.id
    );


  if s.status not in (
    'approved',
    'partially_paid'
  ) then
    raise exception
      'Settlement must be approved before payment';
  end if;


  -- ----------------------------------------------------------
  -- Request retry protection.
  --
  -- Same user + same settlement + same amount + same method +
  -- same reference within a short interval is treated as a
  -- retry rather than a second real payment.
  -- ----------------------------------------------------------

  select *
  into v_existing

  from public.yacht_os_supplier_payments sp

  where
    sp.settlement_id =
      s.id

    and sp.amount =
      p_amount

    and sp.payment_method =
      p_payment_method

    and coalesce(
      nullif(
        trim(
          sp.reference_no
        ),
        ''
      ),
      ''
    ) =
    coalesce(
      nullif(
        trim(
          p_reference_no
        ),
        ''
      ),
      ''
    )

    and sp.created_by =
      auth.uid()

    and sp.created_at >
      now() - interval '10 seconds'

  order by
    sp.created_at desc

  limit 1;


  if v_existing.id is not null then

    perform
      public.yacht_os_reconcile_settlement_payment_state(
        s.id
      );


    return jsonb_build_object(
      'ok',
        true,

      'already_recorded',
        true,

      'payment_id',
        v_existing.id,

      'settlement_id',
        s.id
    );

  end if;


  v_result :=
    public.yacht_os_record_supplier_payment_atomic_legacy_20260819(
      s.id,
      p_amount,
      p_payment_method,
      p_reference_no,
      p_note
    );


  perform
    public.yacht_os_reconcile_settlement_payment_state(
      s.id
    );


  return v_result;

end;
$$;


revoke execute
on function
public.yacht_os_record_supplier_payment_atomic(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon;


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


-- ============================================================
-- 16. SETTLEMENT DIRECT MUTATIONS REMAIN BLOCKED
-- ============================================================

revoke insert, update, delete
on
  public.yacht_os_settlements,
  public.yacht_os_settlement_bookings,
  public.yacht_os_supplier_payments
from authenticated;


grant select
on
  public.yacht_os_settlements,
  public.yacht_os_settlement_bookings,
  public.yacht_os_supplier_payments
to authenticated;


-- ============================================================
-- 17. RECONCILE EXISTING BOOKING PAYMENT STATES
--
-- Safe deterministic backfill from payment/refund ledgers.
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select distinct booking_id
    from (
      select booking_id
      from public.yacht_os_payments

      union

      select booking_id
      from public.yacht_os_refunds
    ) x

    where booking_id is not null

  loop

    perform
      public.yacht_os_reconcile_booking_finance(
        r.booking_id
      );

  end loop;

end;
$$;


-- ============================================================
-- 18. RECONCILE EXISTING SETTLEMENT PAYMENT STATES
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select distinct settlement_id
    from public.yacht_os_supplier_payments
    where settlement_id is not null

  loop

    perform
      public.yacht_os_reconcile_settlement_payment_state(
        r.settlement_id
      );

  end loop;

end;
$$;


-- ============================================================
-- 19. FINAL SECURITY ACL
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n
      on n.oid =
        p.pronamespace
    where
      n.nspname =
        'public'

      and p.prosecdef =
        true

      and (
        p.proname like
          'yacht_os_%'

        or p.proname like
          'finalize_yacht_%'

        or p.proname like
          'check_yacht_%'
      )

  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;
