-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1D-A — REFUND FINANCE LEDGER
--
-- Safe finance/refund foundation.
--
-- Supports:
-- - approved refund limits
-- - full / partial refund ledger
-- - manual refund completion
-- - provider refund preparation
-- - idempotency
-- - immutable finance audit events
--
-- DOES NOT call an external payment provider.
-- DOES NOT mutate existing payment/sales records.
-- ============================================================


-- ------------------------------------------------------------
-- REFUND LEDGER
-- ------------------------------------------------------------

create table if not exists
  public.tour_change_refunds
(
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  case_id uuid
    not null
    references public.tour_change_cases(id)
    on delete cascade,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  refund_type text
    not null
    check (
      refund_type in (
        'full',
        'partial'
      )
    ),

  method text
    not null
    check (
      method in (
        'manual',
        'provider'
      )
    ),

  provider text,

  amount numeric(14,2)
    not null
    check (
      amount > 0
    ),

  currency text
    not null
    default 'TRY',

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'approved',
        'processing',
        'paid',
        'failed',
        'cancelled'
      )
    ),

  reason text,

  idempotency_key text
    not null,

  provider_reference text,

  external_payment_reference text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  requested_by uuid
    not null,

  approved_by uuid,

  completed_by uuid,

  requested_at timestamptz
    not null
    default now(),

  approved_at timestamptz,

  completed_at timestamptz,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    idempotency_key
  )
);


create index if not exists
  tour_change_refunds_case_idx

on public.tour_change_refunds (
  company_id,
  case_id,
  created_at desc
);


create index if not exists
  tour_change_refunds_reservation_idx

on public.tour_change_refunds (
  company_id,
  reservation_id,
  created_at desc
);


create index if not exists
  tour_change_refunds_status_idx

on public.tour_change_refunds (
  company_id,
  status,
  created_at desc
);


-- ------------------------------------------------------------
-- SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_change_refund_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select
      1
    from
      public.tour_change_cases c
    where
      c.id =
        new.case_id
      and
      c.company_id =
        new.company_id
      and
      c.tour_id =
        new.tour_id
      and
      (
        new.departure_id is null
        or
        c.departure_id is null
        or
        c.departure_id =
          new.departure_id
      )
      and
      (
        new.reservation_id is null
        or
        c.reservation_id is null
        or
        c.reservation_id =
          new.reservation_id
      )
  )
  then
    raise exception
      'Refund scope does not match change case';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_change_refunds_validate_scope
on public.tour_change_refunds;


create trigger
  tour_change_refunds_validate_scope

before insert or update of
  company_id,
  case_id,
  tour_id,
  departure_id,
  reservation_id

on public.tour_change_refunds

for each row

execute function
  public.validate_tour_change_refund_scope();


-- ------------------------------------------------------------
-- UPDATED AT
-- ------------------------------------------------------------

create or replace function
  public.touch_tour_change_refund_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at =
    now();

  return new;

end;
$$;


drop trigger if exists
  tour_change_refunds_touch_updated_at
on public.tour_change_refunds;


create trigger
  tour_change_refunds_touch_updated_at

before update
on public.tour_change_refunds

for each row

execute function
  public.touch_tour_change_refund_updated_at();


-- ------------------------------------------------------------
-- FINANCE AUTHORITY
-- ------------------------------------------------------------

create or replace function
  public.is_tour_refund_finance_authorized(
    p_company_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select
      1
    from
      public.company_members cm
    where
      cm.company_id =
        p_company_id
      and
      cm.user_id =
        auth.uid()
      and
      cm.is_active =
        true
      and
      cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  );
$$;


revoke all
on function
  public.is_tour_refund_finance_authorized(uuid)
from public;


grant execute
on function
  public.is_tour_refund_finance_authorized(uuid)
to authenticated;


-- ------------------------------------------------------------
-- APPROVE REFUND LIMIT ON CASE
-- ------------------------------------------------------------

create or replace function
  public.approve_tour_change_case_refund(
    p_case_id uuid,
    p_approved_amount numeric,
    p_note text default null
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
  v_already_paid numeric(14,2);
begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id =
      p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_case.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    coalesce(
      p_approved_amount,
      0
    ) < 0
  then
    raise exception
      'Approved refund cannot be negative';
  end if;


  select
    coalesce(
      sum(
        r.amount
      ),
      0
    )
  into
    v_already_paid
  from
    public.tour_change_refunds r
  where
    r.case_id =
      v_case.id
    and
    r.company_id =
      v_case.company_id
    and
    r.status =
      'paid';


  if
    p_approved_amount <
      v_already_paid
  then
    raise exception
      'Approved refund cannot be lower than already paid refunds';
  end if;


  update
    public.tour_change_cases
  set
    approved_refund_amount =
      p_approved_amount
  where
    id =
      v_case.id;


  insert into
    public.tour_change_case_events
  (
    company_id,
    case_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_case.company_id,
    v_case.id,
    'refund_requested',
    v_actor,
    nullif(
      btrim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    jsonb_build_object(
      'requested_refund_amount',
      v_case.requested_refund_amount,
      'approved_refund_amount',
      p_approved_amount,
      'already_paid',
      v_already_paid
    )
  );

end;
$$;


revoke all
on function
  public.approve_tour_change_case_refund(
    uuid,
    numeric,
    text
  )
from public;


grant execute
on function
  public.approve_tour_change_case_refund(
    uuid,
    numeric,
    text
  )
to authenticated;


-- ------------------------------------------------------------
-- CREATE REFUND REQUEST
-- ------------------------------------------------------------

create or replace function
  public.create_tour_change_refund(
    p_case_id uuid,
    p_amount numeric,
    p_method text,
    p_provider text default null,
    p_reason text default null,
    p_idempotency_key text default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
  v_refund_id uuid;
  v_paid numeric(14,2);
  v_open numeric(14,2);
  v_remaining numeric(14,2);
  v_idempotency text;
begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id =
      p_case_id
  for update;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_case.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    coalesce(
      p_amount,
      0
    ) <= 0
  then
    raise exception
      'Refund amount must be greater than zero';
  end if;


  if
    p_method not in (
      'manual',
      'provider'
    )
  then
    raise exception
      'Invalid refund method';
  end if;


  if
    p_method =
      'provider'
    and
    nullif(
      btrim(
        coalesce(
          p_provider,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Provider is required for provider refund';
  end if;


  if
    v_case.approved_refund_amount <=
      0
  then
    raise exception
      'Refund amount has not been approved';
  end if;


  select
    coalesce(
      sum(
        r.amount
      ),
      0
    )
  into
    v_paid
  from
    public.tour_change_refunds r
  where
    r.case_id =
      v_case.id
    and
    r.company_id =
      v_case.company_id
    and
    r.status =
      'paid';


  select
    coalesce(
      sum(
        r.amount
      ),
      0
    )
  into
    v_open
  from
    public.tour_change_refunds r
  where
    r.case_id =
      v_case.id
    and
    r.company_id =
      v_case.company_id
    and
    r.status in (
      'draft',
      'approved',
      'processing'
    );


  v_remaining :=
    greatest(
      v_case.approved_refund_amount -
      v_paid -
      v_open,
      0
    );


  if
    p_amount >
      v_remaining + 0.01
  then
    raise exception
      'Refund exceeds approved remaining amount';
  end if;


  v_idempotency :=
    coalesce(
      nullif(
        btrim(
          coalesce(
            p_idempotency_key,
            ''
          )
        ),
        ''
      ),
      'REF-' ||
      v_case.id::text ||
      '-' ||
      replace(
        gen_random_uuid()::text,
        '-',
        ''
      )
    );


  select
    id
  into
    v_refund_id
  from
    public.tour_change_refunds
  where
    company_id =
      v_case.company_id
    and
    idempotency_key =
      v_idempotency;


  if found then
    return
      v_refund_id;
  end if;


  insert into
    public.tour_change_refunds
  (
    company_id,
    case_id,
    tour_id,
    departure_id,
    reservation_id,
    refund_type,
    method,
    provider,
    amount,
    currency,
    status,
    reason,
    idempotency_key,
    requested_by,
    requested_at
  )
  values
  (
    v_case.company_id,
    v_case.id,
    v_case.tour_id,
    v_case.departure_id,
    v_case.reservation_id,
    case
      when
        p_amount >=
        v_case.approved_refund_amount -
        v_paid -
        0.01
      then
        'full'
      else
        'partial'
    end,
    p_method,
    nullif(
      btrim(
        coalesce(
          p_provider,
          ''
        )
      ),
      ''
    ),
    p_amount,
    v_case.currency,
    'approved',
    nullif(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    ),
    v_idempotency,
    v_actor,
    now()
  )
  returning
    id
  into
    v_refund_id;


  update
    public.tour_change_refunds
  set
    approved_by =
      v_actor,
    approved_at =
      now()
  where
    id =
      v_refund_id;


  insert into
    public.tour_change_case_events
  (
    company_id,
    case_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_case.company_id,
    v_case.id,
    'refund_requested',
    v_actor,
    'İade finans defterine oluşturuldu.',
    jsonb_build_object(
      'refund_id',
      v_refund_id,
      'amount',
      p_amount,
      'method',
      p_method,
      'provider',
      p_provider,
      'idempotency_key',
      v_idempotency
    )
  );


  return
    v_refund_id;

end;
$$;


revoke all
on function
  public.create_tour_change_refund(
    uuid,
    numeric,
    text,
    text,
    text,
    text
  )
from public;


grant execute
on function
  public.create_tour_change_refund(
    uuid,
    numeric,
    text,
    text,
    text,
    text
  )
to authenticated;


-- ------------------------------------------------------------
-- COMPLETE MANUAL REFUND
-- ------------------------------------------------------------

create or replace function
  public.complete_manual_tour_change_refund(
    p_refund_id uuid,
    p_reference text default null,
    p_note text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.tour_change_refunds%rowtype;
  v_case public.tour_change_cases%rowtype;
  v_actor uuid;
  v_total_paid numeric(14,2);
begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_refund
  from
    public.tour_change_refunds
  where
    id =
      p_refund_id
  for update;


  if not found then
    raise exception
      'Refund not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_refund.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_refund.status =
      'paid'
  then

    return
      jsonb_build_object(
        'refund_id',
        v_refund.id,
        'status',
        'paid',
        'amount',
        v_refund.amount
      );

  end if;


  if
    v_refund.method <>
      'manual'
  then
    raise exception
      'Only manual refunds can be completed by this function';
  end if;


  if
    v_refund.status not in (
      'approved',
      'processing'
    )
  then
    raise exception
      'Refund is not ready for completion';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id =
      v_refund.case_id
  for update;


  update
    public.tour_change_refunds
  set
    status =
      'paid',
    provider_reference =
      nullif(
        btrim(
          coalesce(
            p_reference,
            ''
          )
        ),
        ''
      ),
    completed_by =
      v_actor,
    completed_at =
      now(),
    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      ) ||
      jsonb_build_object(
        'completion_method',
        'manual',
        'completion_note',
        p_note,
        'completed_at',
        now()
      )
  where
    id =
      v_refund.id;


  select
    coalesce(
      sum(
        r.amount
      ),
      0
    )
  into
    v_total_paid
  from
    public.tour_change_refunds r
  where
    r.case_id =
      v_case.id
    and
    r.company_id =
      v_case.company_id
    and
    r.status =
      'paid';


  update
    public.tour_change_cases
  set
    result_snapshot =
      coalesce(
        result_snapshot,
        '{}'::jsonb
      ) ||
      jsonb_build_object(
        'refund_paid_total',
        v_total_paid,
        'refund_last_completed_at',
        now()
      )
  where
    id =
      v_case.id;


  insert into
    public.tour_change_case_events
  (
    company_id,
    case_id,
    event_type,
    actor_id,
    note,
    payload
  )
  values
  (
    v_case.company_id,
    v_case.id,
    'refund_completed',
    v_actor,
    nullif(
      btrim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    jsonb_build_object(
      'refund_id',
      v_refund.id,
      'amount',
      v_refund.amount,
      'method',
      'manual',
      'reference',
      p_reference,
      'total_paid',
      v_total_paid,
      'approved_refund_amount',
      v_case.approved_refund_amount
    )
  );


  return
    jsonb_build_object(
      'refund_id',
      v_refund.id,
      'status',
      'paid',
      'amount',
      v_refund.amount,
      'total_paid',
      v_total_paid,
      'remaining',
      greatest(
        v_case.approved_refund_amount -
        v_total_paid,
        0
      )
    );

end;
$$;


revoke all
on function
  public.complete_manual_tour_change_refund(
    uuid,
    text,
    text
  )
from public;


grant execute
on function
  public.complete_manual_tour_change_refund(
    uuid,
    text,
    text
  )
to authenticated;


-- ------------------------------------------------------------
-- MARK PROVIDER REFUND PROCESSING
--
-- This DOES NOT call provider.
-- It only locks ledger state for external adapter.
-- ------------------------------------------------------------

create or replace function
  public.start_provider_tour_change_refund(
    p_refund_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.tour_change_refunds%rowtype;
  v_actor uuid;
begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_refund
  from
    public.tour_change_refunds
  where
    id =
      p_refund_id
  for update;


  if not found then
    raise exception
      'Refund not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_refund.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_refund.method <>
      'provider'
  then
    raise exception
      'Refund is not a provider refund';
  end if;


  if
    v_refund.status =
      'processing'
  then
    return;
  end if;


  if
    v_refund.status <>
      'approved'
  then
    raise exception
      'Provider refund is not approved';
  end if;


  update
    public.tour_change_refunds
  set
    status =
      'processing'
  where
    id =
      v_refund.id;

end;
$$;


revoke all
on function
  public.start_provider_tour_change_refund(uuid)
from public;


grant execute
on function
  public.start_provider_tour_change_refund(uuid)
to authenticated;


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table
  public.tour_change_refunds
enable row level security;


drop policy if exists
  tour_change_refunds_company_member_select
on public.tour_change_refunds;


create policy
  tour_change_refunds_company_member_select

on public.tour_change_refunds

for select

to authenticated

using (
  public.is_active_company_member(
    company_id
  )
);


-- Direct INSERT/UPDATE/DELETE intentionally not granted via RLS.
-- Financial mutations are RPC controlled.


-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

comment on table
  public.tour_change_refunds
is
  'Tour OS refund finance ledger. Manual and provider-prepared refunds with idempotency and audit history.';


comment on function
  public.complete_manual_tour_change_refund(
    uuid,
    text,
    text
  )
is
  'Marks an approved manual refund as paid and writes immutable financial audit event.';

