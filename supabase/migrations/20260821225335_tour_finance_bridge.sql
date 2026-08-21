-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 6 — TOUR FINANCE BRIDGE
--
-- Existing operation_expenses and sales are preserved.
-- No second expense engine is created.
--
-- We only connect existing expenses directly to:
--   tour
--   departure
--   tour cost group
-- ============================================================


alter table
  public.operation_expenses

add column if not exists
  tour_id uuid
  references public.tours(id)
  on delete set null,

add column if not exists
  departure_id uuid
  references public.tour_departures(id)
  on delete set null,

add column if not exists
  tour_cost_group text
  not null
  default 'other'
  check (
    tour_cost_group in (
      'flight',
      'bus',
      'hotel',
      'guide',
      'driver',
      'activity',
      'transfer',
      'food',
      'commission',
      'payment_fee',
      'refund',
      'other'
    )
  );


create index if not exists
  operation_expenses_company_tour_idx
on public.operation_expenses (
  company_id,
  tour_id
);


create index if not exists
  operation_expenses_company_departure_idx
on public.operation_expenses (
  company_id,
  departure_id
);


create index if not exists
  operation_expenses_tour_cost_group_idx
on public.operation_expenses (
  company_id,
  tour_id,
  tour_cost_group
);


-- ------------------------------------------------------------
-- LEGACY BRIDGE
--
-- Existing expenses linked to reservation are connected
-- to their reservation departure automatically.
-- No amount/status/category is changed.
-- ------------------------------------------------------------

update public.operation_expenses e
set
  departure_id =
    r.departure_id
from public.reservations r
where
  e.reservation_id =
    r.id

  and e.company_id =
    r.company_id

  and e.departure_id
    is null

  and r.departure_id
    is not null;


update public.operation_expenses e
set
  tour_id =
    d.tour_id
from public.tour_departures d
where
  e.departure_id =
    d.id

  and e.tour_id
    is null;


-- ------------------------------------------------------------
-- MAP EXISTING EXPENSE CATEGORIES TO TOUR COST GROUPS
--
-- Existing rows remain existing rows.
-- Only the reporting classification is populated.
-- ------------------------------------------------------------

update public.operation_expenses
set
  tour_cost_group =
    case expense_category

      when 'fuel'
        then 'bus'

      when 'vehicle_rental'
        then 'bus'

      when 'hotel'
        then 'hotel'

      when 'activity_supplier'
        then 'activity'

      when 'guide_fee'
        then 'guide'

      when 'driver_fee'
        then 'driver'

      when 'food'
        then 'food'

      when 'commission'
        then 'commission'

      when 'payment_fee'
        then 'payment_fee'

      when 'refund'
        then 'refund'

      else
        coalesce(
          tour_cost_group,
          'other'
        )

    end
where
  tour_cost_group =
    'other';


comment on column
public.operation_expenses.tour_id
is
'Tour OS finance bridge: direct tour link for existing operation expense';


comment on column
public.operation_expenses.departure_id
is
'Tour OS finance bridge: direct tour departure link for existing operation expense';


comment on column
public.operation_expenses.tour_cost_group
is
'Tour OS reporting classification; does not replace expense_category';
