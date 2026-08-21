-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 11 — TOUR SUPPLIER & CURRENT OPERATIONS
--
-- Existing systems preserved:
--   suppliers
--   operation_expenses
--   tour_operation_tasks
--
-- This is NOT a second supplier ledger.
--
-- This table stores operational commitment / confirmation:
--   supplier
--   service
--   tour / departure
--   contract amount
--   currency
--   confirmation
--   payment due date
--   voucher / confirmation reference
--   optional real operation_expense bridge
-- ============================================================


create table if not exists
public.tour_supplier_commitments (

  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  supplier_id uuid
    not null
    references public.suppliers(id)
    on delete restrict,

  operation_expense_id uuid
    references public.operation_expenses(id)
    on delete set null,

  service_type text
    not null
    default 'other'
    check (
      service_type in (
        'flight',
        'hotel',
        'bus',
        'transfer',
        'activity',
        'restaurant',
        'guide',
        'boat',
        'spa',
        'photography',
        'insurance',
        'other'
      )
    ),

  service_title text
    not null,

  confirmation_status text
    not null
    default 'pending'
    check (
      confirmation_status in (
        'pending',
        'requested',
        'confirmed',
        'rejected',
        'cancelled'
      )
    ),

  operational_status text
    not null
    default 'pending'
    check (
      operational_status in (
        'pending',
        'ready',
        'in_service',
        'completed',
        'issue',
        'cancelled'
      )
    ),

  contract_amount numeric(14,2),

  currency text
    check (
      currency is null
      or currency ~ '^[A-Z]{3}$'
    ),

  payment_due_at timestamptz,

  confirmation_reference text,

  voucher_reference text,

  supplier_confirmation_note text,

  internal_note text,

  confirmed_at timestamptz,

  completed_at timestamptz,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
  tour_supplier_commitments_company_tour_idx
on public.tour_supplier_commitments (
  company_id,
  tour_id
);


create index if not exists
  tour_supplier_commitments_departure_idx
on public.tour_supplier_commitments (
  company_id,
  departure_id
);


create index if not exists
  tour_supplier_commitments_supplier_idx
on public.tour_supplier_commitments (
  company_id,
  supplier_id
);


create index if not exists
  tour_supplier_commitments_confirmation_idx
on public.tour_supplier_commitments (
  company_id,
  confirmation_status
);


create index if not exists
  tour_supplier_commitments_due_idx
on public.tour_supplier_commitments (
  company_id,
  payment_due_at
);


alter table
public.tour_supplier_commitments
enable row level security;


drop policy if exists
  tour_supplier_commitments_select_company
on public.tour_supplier_commitments;

create policy
  tour_supplier_commitments_select_company
on public.tour_supplier_commitments
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_supplier_commitments_insert_company
on public.tour_supplier_commitments;

create policy
  tour_supplier_commitments_insert_company
on public.tour_supplier_commitments
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_supplier_commitments_update_company
on public.tour_supplier_commitments;

create policy
  tour_supplier_commitments_update_company
on public.tour_supplier_commitments
for update
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


drop policy if exists
  tour_supplier_commitments_delete_company
on public.tour_supplier_commitments;

create policy
  tour_supplier_commitments_delete_company
on public.tour_supplier_commitments
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create or replace function
public.touch_tour_supplier_commitments()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at =
    now();

  new.updated_by =
    coalesce(
      auth.uid(),
      new.updated_by
    );

  if
    new.confirmation_status =
      'confirmed'
    and
    old.confirmation_status <>
      'confirmed'
    and
    new.confirmed_at
      is null
  then

    new.confirmed_at =
      now();

  end if;

  if
    new.operational_status =
      'completed'
    and
    old.operational_status <>
      'completed'
    and
    new.completed_at
      is null
  then

    new.completed_at =
      now();

  end if;

  if
    new.operational_status <>
      'completed'
  then

    new.completed_at =
      null;

  end if;

  return new;

end;
$$;


drop trigger if exists
  trg_touch_tour_supplier_commitments
on public.tour_supplier_commitments;


create trigger
  trg_touch_tour_supplier_commitments
before update
on public.tour_supplier_commitments
for each row
execute function
public.touch_tour_supplier_commitments();


revoke all
on function
public.touch_tour_supplier_commitments()
from public;


revoke all
on public.tour_supplier_commitments
from anon;


grant
  select,
  insert,
  update,
  delete
on public.tour_supplier_commitments
to authenticated;


comment on table
public.tour_supplier_commitments
is
'Tour OS supplier operational commitment layer; real payable remains operation_expenses.';

