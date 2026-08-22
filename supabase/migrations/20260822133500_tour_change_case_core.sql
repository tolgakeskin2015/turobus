-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1A — CHANGE CASE CORE
--
-- Cancellation / refund / passenger / departure / transport
-- change workflow foundation.
--
-- This migration does NOT:
-- - cancel reservations
-- - refund payments
-- - mutate passengers
-- - move departures
-- - change transport records
--
-- It only creates the controlled case + item + audit layer.
-- ============================================================


-- ------------------------------------------------------------
-- MAIN CASE
-- ------------------------------------------------------------

create table if not exists
  public.tour_change_cases
(
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
    on delete set null,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  case_number text
    not null,

  case_type text
    not null
    check (
      case_type in (
        'full_cancellation',
        'partial_cancellation',
        'full_refund',
        'partial_refund',
        'passenger_change',
        'departure_change',
        'flight_change',
        'bus_change',
        'transport_change',
        'other'
      )
    ),

  status text
    not null
    default 'draft'
    check (
      status in (
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'processing',
        'completed',
        'cancelled'
      )
    ),

  priority text
    not null
    default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  currency text
    not null
    default 'TRY',

  requested_refund_amount numeric(14,2)
    not null
    default 0
    check (
      requested_refund_amount >= 0
    ),

  approved_refund_amount numeric(14,2)
    not null
    default 0
    check (
      approved_refund_amount >= 0
    ),

  supplier_cancellation_cost numeric(14,2)
    not null
    default 0
    check (
      supplier_cancellation_cost >= 0
    ),

  customer_penalty_amount numeric(14,2)
    not null
    default 0
    check (
      customer_penalty_amount >= 0
    ),

  company_loss_amount numeric(14,2)
    not null
    default 0
    check (
      company_loss_amount >= 0
    ),

  reason text,

  customer_note text,

  internal_note text,

  original_snapshot jsonb
    not null
    default '{}'::jsonb,

  requested_changes jsonb
    not null
    default '{}'::jsonb,

  result_snapshot jsonb
    not null
    default '{}'::jsonb,

  idempotency_key text,

  requested_by uuid,

  reviewed_by uuid,

  approved_by uuid,

  completed_by uuid,

  requested_at timestamptz
    not null
    default now(),

  reviewed_at timestamptz,

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
    case_number
  )
);


-- ------------------------------------------------------------
-- CASE ITEMS
--
-- Allows partial cancellation/refund/change:
-- passenger, flight, bus, supplier service, document etc.
-- ------------------------------------------------------------

create table if not exists
  public.tour_change_case_items
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

  item_type text
    not null
    check (
      item_type in (
        'reservation',
        'passenger',
        'flight',
        'bus_operation',
        'bus_seat',
        'supplier_commitment',
        'expense',
        'document',
        'payment',
        'other'
      )
    ),

  source_id uuid,

  action_type text
    not null
    check (
      action_type in (
        'cancel',
        'refund',
        'change',
        'move',
        'replace',
        'release',
        'retain'
      )
    ),

  status text
    not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'processing',
        'completed',
        'failed',
        'cancelled'
      )
    ),

  amount numeric(14,2)
    not null
    default 0,

  currency text
    not null
    default 'TRY',

  before_snapshot jsonb
    not null
    default '{}'::jsonb,

  requested_snapshot jsonb
    not null
    default '{}'::jsonb,

  after_snapshot jsonb
    not null
    default '{}'::jsonb,

  note text,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- ------------------------------------------------------------
-- IMMUTABLE AUDIT EVENTS
-- ------------------------------------------------------------

create table if not exists
  public.tour_change_case_events
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

  event_type text
    not null
    check (
      event_type in (
        'case_created',
        'case_updated',
        'submitted_for_review',
        'approved',
        'rejected',
        'processing_started',
        'item_processed',
        'refund_requested',
        'refund_completed',
        'reservation_cancelled',
        'passenger_changed',
        'departure_changed',
        'transport_changed',
        'supplier_cost_recorded',
        'document_created',
        'message_created',
        'completed',
        'case_cancelled',
        'note'
      )
    ),

  actor_id uuid,

  note text,

  payload jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

create index if not exists
  tour_change_cases_company_status_idx
on public.tour_change_cases (
  company_id,
  status,
  created_at desc
);


create index if not exists
  tour_change_cases_tour_idx
on public.tour_change_cases (
  company_id,
  tour_id,
  created_at desc
);


create index if not exists
  tour_change_cases_departure_idx
on public.tour_change_cases (
  company_id,
  departure_id,
  created_at desc
);


create index if not exists
  tour_change_cases_reservation_idx
on public.tour_change_cases (
  company_id,
  reservation_id,
  created_at desc
);


create index if not exists
  tour_change_case_items_case_idx
on public.tour_change_case_items (
  company_id,
  case_id,
  created_at
);


create index if not exists
  tour_change_case_events_case_idx
on public.tour_change_case_events (
  company_id,
  case_id,
  created_at
);


create unique index if not exists
  tour_change_cases_idempotency_idx

on public.tour_change_cases (
  company_id,
  idempotency_key
)

where
  idempotency_key is not null;


-- ------------------------------------------------------------
-- COMPANY / TOUR / DEPARTURE / RESERVATION SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_change_case_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select
      1
    from
      public.tours t
    where
      t.id = new.tour_id
      and
      t.company_id = new.company_id
  )
  then
    raise exception
      'Change case tour does not belong to company';
  end if;


  if
    new.departure_id is not null
    and
    not exists (
      select
        1
      from
        public.tour_departures d
      where
        d.id = new.departure_id
        and
        d.company_id = new.company_id
        and
        d.tour_id = new.tour_id
    )
  then
    raise exception
      'Change case departure does not belong to company/tour';
  end if;


  if
    new.reservation_id is not null
    and
    not exists (
      select
        1
      from
        public.reservations r
      where
        r.id = new.reservation_id
        and
        r.company_id = new.company_id
        and
        (
          r.tour_id is null
          or
          r.tour_id = new.tour_id
        )
        and
        (
          new.departure_id is null
          or
          r.departure_id is null
          or
          r.departure_id = new.departure_id
        )
    )
  then
    raise exception
      'Change case reservation does not belong to company/tour/departure';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_change_cases_validate_scope
on public.tour_change_cases;


create trigger
  tour_change_cases_validate_scope

before insert or update of
  company_id,
  tour_id,
  departure_id,
  reservation_id

on public.tour_change_cases

for each row

execute function
  public.validate_tour_change_case_scope();


-- ------------------------------------------------------------
-- ITEM COMPANY SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_change_case_item_scope()
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
      c.id = new.case_id
      and
      c.company_id = new.company_id
  )
  then
    raise exception
      'Change case item company scope mismatch';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_change_case_items_validate_scope
on public.tour_change_case_items;


create trigger
  tour_change_case_items_validate_scope

before insert or update of
  company_id,
  case_id

on public.tour_change_case_items

for each row

execute function
  public.validate_tour_change_case_item_scope();


-- ------------------------------------------------------------
-- EVENT COMPANY SCOPE GUARD
-- ------------------------------------------------------------

create or replace function
  public.validate_tour_change_case_event_scope()
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
      c.id = new.case_id
      and
      c.company_id = new.company_id
  )
  then
    raise exception
      'Change case event company scope mismatch';
  end if;


  return new;

end;
$$;


drop trigger if exists
  tour_change_case_events_validate_scope
on public.tour_change_case_events;


create trigger
  tour_change_case_events_validate_scope

before insert or update of
  company_id,
  case_id

on public.tour_change_case_events

for each row

execute function
  public.validate_tour_change_case_event_scope();


-- ------------------------------------------------------------
-- UPDATED_AT
-- ------------------------------------------------------------

create or replace function
  public.touch_tour_change_case_updated_at()
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
  tour_change_cases_touch_updated_at
on public.tour_change_cases;


create trigger
  tour_change_cases_touch_updated_at

before update
on public.tour_change_cases

for each row

execute function
  public.touch_tour_change_case_updated_at();


drop trigger if exists
  tour_change_case_items_touch_updated_at
on public.tour_change_case_items;


create trigger
  tour_change_case_items_touch_updated_at

before update
on public.tour_change_case_items

for each row

execute function
  public.touch_tour_change_case_updated_at();


-- ------------------------------------------------------------
-- AUDIT EVENTS ARE APPEND-ONLY
-- ------------------------------------------------------------

create or replace function
  public.prevent_tour_change_case_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  raise exception
    'Tour change case events are immutable';

end;
$$;


drop trigger if exists
  tour_change_case_events_no_update
on public.tour_change_case_events;


create trigger
  tour_change_case_events_no_update

before update
on public.tour_change_case_events

for each row

execute function
  public.prevent_tour_change_case_event_mutation();


drop trigger if exists
  tour_change_case_events_no_delete
on public.tour_change_case_events;


create trigger
  tour_change_case_events_no_delete

before delete
on public.tour_change_case_events

for each row

execute function
  public.prevent_tour_change_case_event_mutation();


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table
  public.tour_change_cases
enable row level security;


alter table
  public.tour_change_case_items
enable row level security;


alter table
  public.tour_change_case_events
enable row level security;


drop policy if exists
  tour_change_cases_company_member
on public.tour_change_cases;


create policy
  tour_change_cases_company_member

on public.tour_change_cases

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


drop policy if exists
  tour_change_case_items_company_member
on public.tour_change_case_items;


create policy
  tour_change_case_items_company_member

on public.tour_change_case_items

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


drop policy if exists
  tour_change_case_events_select
on public.tour_change_case_events;


create policy
  tour_change_case_events_select

on public.tour_change_case_events

for select

to authenticated

using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_change_case_events_insert
on public.tour_change_case_events;


create policy
  tour_change_case_events_insert

on public.tour_change_case_events

for insert

to authenticated

with check (
  public.is_active_company_member(
    company_id
  )
);


-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

comment on table
  public.tour_change_cases
is
  'Controlled Tour OS cancellation, refund and operational change cases.';


comment on table
  public.tour_change_case_items
is
  'Individual affected records or services within a Tour OS change case.';


comment on table
  public.tour_change_case_events
is
  'Append-only audit timeline for Tour OS cancellation/refund/change cases.';

