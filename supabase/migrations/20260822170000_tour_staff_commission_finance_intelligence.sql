-- ============================================================
-- TUROBUS PACKAGE B — PHASE 20 + 21
--
-- 20 — Staff Sales / Commission / Performance
-- 21 — Finance / Profit Intelligence
--
-- Existing:
--   staff_profiles
--   sales
--   reservations
--   operation_expenses
-- remain source systems.
--
-- No second sales engine.
-- No second expense engine.
-- ============================================================


-- ============================================================
-- PHASE 20 — COMMISSION PLANS
-- ============================================================

create table if not exists
public.tour_staff_commission_plans (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  name text
    not null,

  basis text
    not null
    default 'gross_profit'
    check (
      basis in (
        'revenue',
        'gross_profit',
        'fixed'
      )
    ),

  rate_percent numeric(7,4)
    not null
    default 0
    check (
      rate_percent >= 0
      and
      rate_percent <= 100
    ),

  fixed_amount numeric(14,2)
    not null
    default 0
    check (
      fixed_amount >= 0
    ),

  min_sale_amount numeric(14,2)
    not null
    default 0
    check (
      min_sale_amount >= 0
    ),

  currency text
    not null
    default 'TRY',

  active boolean
    not null
    default true,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- ============================================================
-- STAFF SALE ATTRIBUTION / COMMISSION EARNING
-- ============================================================

create table if not exists
public.tour_staff_sales (
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
    not null
    references public.reservations(id)
    on delete cascade,

  sale_id uuid
    not null
    references public.sales(id)
    on delete cascade,

  staff_id uuid
    not null
    references public.staff_profiles(id)
    on delete restrict,

  commission_plan_id uuid
    references public.tour_staff_commission_plans(id)
    on delete set null,

  revenue_amount numeric(14,2)
    not null
    default 0,

  cost_amount numeric(14,2)
    not null
    default 0,

  gross_profit_amount numeric(14,2)
    not null
    default 0,

  commission_basis text
    not null
    default 'gross_profit',

  commission_rate_percent numeric(7,4)
    not null
    default 0,

  commission_amount numeric(14,2)
    not null
    default 0
    check (
      commission_amount >= 0
    ),

  status text
    not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'paid',
        'cancelled'
      )
    ),

  approved_by uuid,

  approved_at timestamptz,

  paid_by uuid,

  paid_at timestamptz,

  operation_expense_id uuid
    references public.operation_expenses(id)
    on delete set null,

  note text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    company_id,
    sale_id,
    staff_id
  )
);


create index if not exists
tour_staff_sales_staff_idx
on public.tour_staff_sales (
  company_id,
  staff_id,
  status,
  created_at desc
);


create index if not exists
tour_staff_sales_departure_idx
on public.tour_staff_sales (
  company_id,
  departure_id,
  created_at desc
);


-- ============================================================
-- PERFORMANCE SNAPSHOT
-- ============================================================

create table if not exists
public.tour_staff_performance_snapshots (
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

  staff_id uuid
    not null
    references public.staff_profiles(id)
    on delete cascade,

  sale_count integer
    not null
    default 0,

  revenue_amount numeric(14,2)
    not null
    default 0,

  gross_profit_amount numeric(14,2)
    not null
    default 0,

  approved_commission_amount numeric(14,2)
    not null
    default 0,

  paid_commission_amount numeric(14,2)
    not null
    default 0,

  average_sale_amount numeric(14,2)
    not null
    default 0,

  cancelled_sale_count integer
    not null
    default 0,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid,

  unique (
    company_id,
    tour_id,
    departure_id,
    staff_id
  )
);


-- ============================================================
-- PHASE 21 — FINANCE SNAPSHOT
-- ============================================================

create table if not exists
public.tour_finance_intelligence_snapshots (
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

  reservation_count integer
    not null
    default 0,

  passenger_count integer
    not null
    default 0,

  sales_revenue numeric(14,2)
    not null
    default 0,

  sales_declared_cost numeric(14,2)
    not null
    default 0,

  sales_declared_gross_profit numeric(14,2)
    not null
    default 0,

  operation_expense_total numeric(14,2)
    not null
    default 0,

  operation_expense_paid numeric(14,2)
    not null
    default 0,

  refund_paid_total numeric(14,2)
    not null
    default 0,

  incident_actual_loss_total numeric(14,2)
    not null
    default 0,

  approved_commission_total numeric(14,2)
    not null
    default 0,

  paid_commission_total numeric(14,2)
    not null
    default 0,

  outstanding_receivable numeric(14,2)
    not null
    default 0,

  outstanding_payable numeric(14,2)
    not null
    default 0,

  operational_net_result numeric(14,2)
    not null
    default 0,

  margin_percent numeric(9,4)
    not null
    default 0,

  finance_status text
    not null
    default 'healthy'
    check (
      finance_status in (
        'healthy',
        'watch',
        'loss',
        'critical'
      )
    ),

  findings jsonb
    not null
    default '[]'::jsonb,

  generated_at timestamptz
    not null
    default now(),

  generated_by uuid,

  unique (
    company_id,
    tour_id,
    departure_id
  )
);


-- ============================================================
-- UPDATED AT
-- ============================================================

create or replace function
public.touch_tour_package_b_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
tour_staff_commission_plans_touch
on public.tour_staff_commission_plans;

create trigger
tour_staff_commission_plans_touch
before update
on public.tour_staff_commission_plans
for each row
execute function
public.touch_tour_package_b_updated_at();


drop trigger if exists
tour_staff_sales_touch
on public.tour_staff_sales;

create trigger
tour_staff_sales_touch
before update
on public.tour_staff_sales
for each row
execute function
public.touch_tour_package_b_updated_at();


-- ============================================================
-- CREATE COMMISSION PLAN
-- ============================================================

create or replace function
public.create_tour_staff_commission_plan(
  p_company_id uuid,
  p_name text,
  p_basis text,
  p_rate_percent numeric default 0,
  p_fixed_amount numeric default 0,
  p_min_sale_amount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_active_company_member(
      p_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if p_basis not in (
    'revenue',
    'gross_profit',
    'fixed'
  )
  then
    raise exception
      'Invalid commission basis';
  end if;


  if coalesce(
    p_rate_percent,
    0
  ) < 0
  or coalesce(
    p_rate_percent,
    0
  ) > 100
  then
    raise exception
      'Invalid commission rate';
  end if;


  insert into
  public.tour_staff_commission_plans (
    company_id,
    name,
    basis,
    rate_percent,
    fixed_amount,
    min_sale_amount,
    created_by,
    updated_by
  )
  values (
    p_company_id,
    btrim(p_name),
    p_basis,
    coalesce(
      p_rate_percent,
      0
    ),
    coalesce(
      p_fixed_amount,
      0
    ),
    coalesce(
      p_min_sale_amount,
      0
    ),
    v_actor,
    v_actor
  )
  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- ASSIGN SALE TO STAFF
-- ============================================================

create or replace function
public.assign_tour_sale_to_staff(
  p_reservation_id uuid,
  p_staff_id uuid,
  p_plan_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_reservation
    public.reservations%rowtype;

  v_sale
    public.sales%rowtype;

  v_staff
    public.staff_profiles%rowtype;

  v_plan
    public.tour_staff_commission_plans%rowtype;

  v_commission numeric(14,2);

  v_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_reservation
  from public.reservations
  where id =
    p_reservation_id;


  if not found then
    raise exception
      'Reservation not found';
  end if;


  if not
    public.is_active_company_member(
      v_reservation.company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select *
  into v_staff
  from public.staff_profiles
  where
    id = p_staff_id
    and
    company_id =
      v_reservation.company_id
    and
    is_active = true;


  if not found then
    raise exception
      'Active staff not found';
  end if;


  select *
  into v_plan
  from public.tour_staff_commission_plans
  where
    id = p_plan_id
    and
    company_id =
      v_reservation.company_id
    and
    active = true;


  if not found then
    raise exception
      'Commission plan not found';
  end if;


  select *
  into v_sale
  from public.sales
  where
    reservation_id =
      v_reservation.id
    and
    company_id =
      v_reservation.company_id
    and
    payment_status <>
      'cancelled'
  order by created_at desc
  limit 1;


  if not found then
    raise exception
      'Active sale not found for reservation';
  end if;


  if coalesce(
    v_sale.grand_total,
    0
  ) <
    v_plan.min_sale_amount
  then
    raise exception
      'Sale is below commission plan minimum';
  end if;


  v_commission :=
    case

      when v_plan.basis =
        'revenue'
      then
        round(
          coalesce(
            v_sale.grand_total,
            0
          )
          *
          v_plan.rate_percent
          /
          100,
          2
        )

      when v_plan.basis =
        'gross_profit'
      then
        round(
          greatest(
            coalesce(
              v_sale.company_gross_profit,
              0
            ),
            0
          )
          *
          v_plan.rate_percent
          /
          100,
          2
        )

      else
        v_plan.fixed_amount

    end;


  insert into
  public.tour_staff_sales (
    company_id,
    tour_id,
    departure_id,
    reservation_id,
    sale_id,
    staff_id,
    commission_plan_id,

    revenue_amount,
    cost_amount,
    gross_profit_amount,

    commission_basis,
    commission_rate_percent,
    commission_amount,

    created_by
  )
  values (
    v_reservation.company_id,
    v_reservation.tour_id,
    v_reservation.departure_id,
    v_reservation.id,
    v_sale.id,
    v_staff.id,
    v_plan.id,

    coalesce(
      v_sale.grand_total,
      0
    ),

    coalesce(
      v_sale.total_cost,
      0
    ),

    coalesce(
      v_sale.company_gross_profit,
      0
    ),

    v_plan.basis,
    v_plan.rate_percent,
    v_commission,

    v_actor
  )
  on conflict (
    company_id,
    sale_id,
    staff_id
  )
  do update
  set
    commission_plan_id =
      excluded.commission_plan_id,

    revenue_amount =
      excluded.revenue_amount,

    cost_amount =
      excluded.cost_amount,

    gross_profit_amount =
      excluded.gross_profit_amount,

    commission_basis =
      excluded.commission_basis,

    commission_rate_percent =
      excluded.commission_rate_percent,

    commission_amount =
      excluded.commission_amount,

    status =
      case
        when public.tour_staff_sales.status =
          'paid'
        then
          public.tour_staff_sales.status
        else
          'pending'
      end

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- APPROVE COMMISSION
-- ============================================================

create or replace function
public.approve_tour_staff_commission(
  p_staff_sale_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_row
    public.tour_staff_sales%rowtype;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_row
  from public.tour_staff_sales
  where id =
    p_staff_sale_id
  for update;


  if not found then
    raise exception
      'Staff sale not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_row.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if v_row.status =
    'paid'
  then
    return;
  end if;


  if v_row.status =
    'cancelled'
  then
    raise exception
      'Cancelled commission cannot be approved';
  end if;


  update
  public.tour_staff_sales
  set
    status =
      'approved',

    approved_by =
      v_actor,

    approved_at =
      now()

  where id =
    v_row.id;

end;
$$;


-- ============================================================
-- PAY COMMISSION
-- EXISTING OPERATION_EXPENSES IS THE FINANCE LEDGER
-- ============================================================

create or replace function
public.pay_tour_staff_commission(
  p_staff_sale_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_row
    public.tour_staff_sales%rowtype;

  v_staff
    public.staff_profiles%rowtype;

  v_expense_id uuid;
begin

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select *
  into v_row
  from public.tour_staff_sales
  where id =
    p_staff_sale_id
  for update;


  if not found then
    raise exception
      'Commission row not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_row.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if v_row.status =
    'paid'
    and
    v_row.operation_expense_id
      is not null
  then
    return
      v_row.operation_expense_id;
  end if;


  if v_row.status <>
    'approved'
  then
    raise exception
      'Commission must be approved first';
  end if;


  select *
  into v_staff
  from public.staff_profiles
  where id =
    v_row.staff_id;


  insert into
  public.operation_expenses (
    company_id,
    reservation_id,
    tour_id,
    departure_id,

    expense_category,
    tour_cost_group,

    description,

    quantity,
    unit_cost,
    total_amount,

    tax_rate,
    tax_amount,

    payment_status,
    payment_method,
    paid_amount,

    expense_date,

    notes
  )
  values (
    v_row.company_id,
    v_row.reservation_id,
    v_row.tour_id,
    v_row.departure_id,

    'commission',
    'commission',

    'Personel satış primi · ' ||
    coalesce(
      v_staff.full_name,
      v_row.staff_id::text
    ),

    1,
    v_row.commission_amount,
    v_row.commission_amount,

    0,
    0,

    'paid',
    'company_account',
    v_row.commission_amount,

    current_date,

    nullif(
      btrim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    )
  )
  returning id
  into v_expense_id;


  update
  public.tour_staff_sales
  set
    status =
      'paid',

    paid_by =
      v_actor,

    paid_at =
      now(),

    operation_expense_id =
      v_expense_id

  where id =
    v_row.id;


  return
    v_expense_id;

end;
$$;


-- ============================================================
-- GENERATE STAFF PERFORMANCE SNAPSHOTS
-- ============================================================

create or replace function
public.generate_tour_staff_performance(
  p_tour_id uuid,
  p_departure_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;

  v_count integer := 0;

  rec record;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id =
    p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  for rec in

    select
      s.staff_id,

      count(*)::integer
        as sale_count,

      coalesce(
        sum(
          s.revenue_amount
        ),
        0
      )
        as revenue_amount,

      coalesce(
        sum(
          s.gross_profit_amount
        ),
        0
      )
        as gross_profit_amount,

      coalesce(
        sum(
          case
            when s.status in (
              'approved',
              'paid'
            )
            then
              s.commission_amount
            else
              0
          end
        ),
        0
      )
        as approved_commission,

      coalesce(
        sum(
          case
            when s.status =
              'paid'
            then
              s.commission_amount
            else
              0
          end
        ),
        0
      )
        as paid_commission

    from
      public.tour_staff_sales s

    where
      s.company_id =
        v_company_id

      and
      s.tour_id =
        p_tour_id

      and
      (
        p_departure_id
          is null
        or
        s.departure_id =
          p_departure_id
      )

      and
      s.status <>
        'cancelled'

    group by
      s.staff_id

  loop

    insert into
    public.tour_staff_performance_snapshots (
      company_id,
      tour_id,
      departure_id,
      staff_id,

      sale_count,

      revenue_amount,

      gross_profit_amount,

      approved_commission_amount,

      paid_commission_amount,

      average_sale_amount,

      generated_by
    )
    values (
      v_company_id,
      p_tour_id,
      p_departure_id,
      rec.staff_id,

      rec.sale_count,

      rec.revenue_amount,

      rec.gross_profit_amount,

      rec.approved_commission,

      rec.paid_commission,

      case
        when rec.sale_count >
          0
        then
          rec.revenue_amount
          /
          rec.sale_count
        else
          0
      end,

      v_actor
    )
    on conflict (
      company_id,
      tour_id,
      departure_id,
      staff_id
    )
    do update
    set
      sale_count =
        excluded.sale_count,

      revenue_amount =
        excluded.revenue_amount,

      gross_profit_amount =
        excluded.gross_profit_amount,

      approved_commission_amount =
        excluded.approved_commission_amount,

      paid_commission_amount =
        excluded.paid_commission_amount,

      average_sale_amount =
        excluded.average_sale_amount,

      generated_at =
        now(),

      generated_by =
        v_actor;


    v_count :=
      v_count + 1;

  end loop;


  return v_count;

end;
$$;


-- ============================================================
-- FINANCE SNAPSHOT
-- ============================================================

create or replace function
public.generate_tour_finance_intelligence(
  p_tour_id uuid,
  p_departure_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;

  v_company_id uuid;

  v_reservation_count integer := 0;

  v_passenger_count integer := 0;

  v_revenue numeric(14,2) := 0;

  v_declared_cost numeric(14,2) := 0;

  v_declared_profit numeric(14,2) := 0;

  v_expense_total numeric(14,2) := 0;

  v_expense_paid numeric(14,2) := 0;

  v_refunds numeric(14,2) := 0;

  v_incident_loss numeric(14,2) := 0;

  v_approved_commissions numeric(14,2) := 0;

  v_paid_commissions numeric(14,2) := 0;

  v_receivable numeric(14,2) := 0;

  v_payable numeric(14,2) := 0;

  v_net numeric(14,2) := 0;

  v_margin numeric(9,4) := 0;

  v_status text;

  v_findings jsonb :=
    '[]'::jsonb;

  v_id uuid;
begin

  v_actor := auth.uid();


  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  select company_id
  into v_company_id
  from public.tours
  where id =
    p_tour_id;


  if not found then
    raise exception
      'Tour not found';
  end if;


  if not
    public.is_active_company_member(
      v_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  select
    count(*)::integer,

    coalesce(
      sum(
        r.guests
      ),
      0
    )::integer

  into
    v_reservation_count,
    v_passenger_count

  from
    public.reservations r

  where
    r.company_id =
      v_company_id

    and
    r.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      r.departure_id =
        p_departure_id
    )

    and
    r.status <>
      'cancelled';


  select
    coalesce(
      sum(
        s.grand_total
      ),
      0
    ),

    coalesce(
      sum(
        s.total_cost
      ),
      0
    ),

    coalesce(
      sum(
        s.company_gross_profit
      ),
      0
    )

  into
    v_revenue,
    v_declared_cost,
    v_declared_profit

  from
    public.sales s

  join
    public.reservations r
      on
        r.id =
          s.reservation_id
        and
        r.company_id =
          s.company_id

  where
    s.company_id =
      v_company_id

    and
    r.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      r.departure_id =
        p_departure_id
    )

    and
    r.status <>
      'cancelled'

    and
    s.payment_status <>
      'cancelled';


  select
    coalesce(
      sum(
        e.total_amount
      ),
      0
    ),

    coalesce(
      sum(
        e.paid_amount
      ),
      0
    )

  into
    v_expense_total,
    v_expense_paid

  from
    public.operation_expenses e

  where
    e.company_id =
      v_company_id

    and
    e.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      e.departure_id =
        p_departure_id
    )

    and
    e.payment_status <>
      'cancelled';


  select
    coalesce(
      sum(
        f.amount
      ),
      0
    )

  into
    v_refunds

  from
    public.tour_change_refunds f

  where
    f.company_id =
      v_company_id

    and
    f.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      f.departure_id =
        p_departure_id
    )

    and
    f.status =
      'paid';


  select
    coalesce(
      sum(
        i.actual_loss_amount
      ),
      0
    )

  into
    v_incident_loss

  from
    public.tour_operation_incidents i

  where
    i.company_id =
      v_company_id

    and
    i.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      i.departure_id =
        p_departure_id
    )

    and
    i.status <>
      'cancelled';


  select
    coalesce(
      sum(
        case
          when s.status in (
            'approved',
            'paid'
          )
          then
            s.commission_amount
          else
            0
        end
      ),
      0
    ),

    coalesce(
      sum(
        case
          when s.status =
            'paid'
          then
            s.commission_amount
          else
            0
        end
      ),
      0
    )

  into
    v_approved_commissions,
    v_paid_commissions

  from
    public.tour_staff_sales s

  where
    s.company_id =
      v_company_id

    and
    s.tour_id =
      p_tour_id

    and
    (
      p_departure_id
        is null
      or
      s.departure_id =
        p_departure_id
    )

    and
    s.status <>
      'cancelled';


  /*
   * Paid commissions are already real operation_expenses.
   * Therefore we DO NOT subtract paid commission a second time.
   *
   * Refunds may also have separate refund expense rows in some flows.
   * To avoid fabricating certainty, snapshot exposes both values.
   * operational_net_result uses real operation_expense ledger
   * and incident loss only.
   */

  v_net :=
    v_revenue
    -
    v_expense_total
    -
    v_incident_loss;


  v_receivable :=
    greatest(
      v_revenue
      -
      coalesce(
        (
          select
            sum(
              case
                when s.payment_status =
                  'paid'
                then
                  s.grand_total
                else
                  0
              end
            )
          from
            public.sales s
          join
            public.reservations r
              on
                r.id =
                  s.reservation_id
                and
                r.company_id =
                  s.company_id
          where
            s.company_id =
              v_company_id
            and
            r.tour_id =
              p_tour_id
            and
            (
              p_departure_id is null
              or
              r.departure_id =
                p_departure_id
            )
            and
            r.status <>
              'cancelled'
            and
            s.payment_status <>
              'cancelled'
        ),
        0
      ),
      0
    );


  v_payable :=
    greatest(
      v_expense_total
      -
      v_expense_paid,
      0
    );


  v_margin :=
    case
      when v_revenue >
        0
      then
        round(
          (
            v_net
            /
            v_revenue
          )
          *
          100,
          4
        )
      else
        0
    end;


  v_status :=
    case

      when v_net < 0
        and
        abs(v_net) >
          (
            v_revenue *
            0.10
          )
      then
        'critical'

      when v_net < 0
      then
        'loss'

      when v_margin <
        10
      then
        'watch'

      else
        'healthy'

    end;


  if v_net < 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'negative_result',
          'message',
          'Tur operasyon sonucu negatif.',
          'amount',
          v_net
        )
      );

  end if;


  if v_payable > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'outstanding_payable',
          'message',
          'Ödenmemiş operasyon gideri mevcut.',
          'amount',
          v_payable
        )
      );

  end if;


  if v_receivable > 0 then

    v_findings :=
      v_findings ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
          'outstanding_receivable',
          'message',
          'Tahsil edilmemiş satış tutarı mevcut.',
          'amount',
          v_receivable
        )
      );

  end if;


  insert into
  public.tour_finance_intelligence_snapshots (
    company_id,
    tour_id,
    departure_id,

    reservation_count,
    passenger_count,

    sales_revenue,
    sales_declared_cost,
    sales_declared_gross_profit,

    operation_expense_total,
    operation_expense_paid,

    refund_paid_total,
    incident_actual_loss_total,

    approved_commission_total,
    paid_commission_total,

    outstanding_receivable,
    outstanding_payable,

    operational_net_result,
    margin_percent,

    finance_status,
    findings,

    generated_by
  )
  values (
    v_company_id,
    p_tour_id,
    p_departure_id,

    v_reservation_count,
    v_passenger_count,

    v_revenue,
    v_declared_cost,
    v_declared_profit,

    v_expense_total,
    v_expense_paid,

    v_refunds,
    v_incident_loss,

    v_approved_commissions,
    v_paid_commissions,

    v_receivable,
    v_payable,

    v_net,
    v_margin,

    v_status,
    v_findings,

    v_actor
  )
  on conflict (
    company_id,
    tour_id,
    departure_id
  )
  do update
  set
    reservation_count =
      excluded.reservation_count,

    passenger_count =
      excluded.passenger_count,

    sales_revenue =
      excluded.sales_revenue,

    sales_declared_cost =
      excluded.sales_declared_cost,

    sales_declared_gross_profit =
      excluded.sales_declared_gross_profit,

    operation_expense_total =
      excluded.operation_expense_total,

    operation_expense_paid =
      excluded.operation_expense_paid,

    refund_paid_total =
      excluded.refund_paid_total,

    incident_actual_loss_total =
      excluded.incident_actual_loss_total,

    approved_commission_total =
      excluded.approved_commission_total,

    paid_commission_total =
      excluded.paid_commission_total,

    outstanding_receivable =
      excluded.outstanding_receivable,

    outstanding_payable =
      excluded.outstanding_payable,

    operational_net_result =
      excluded.operational_net_result,

    margin_percent =
      excluded.margin_percent,

    finance_status =
      excluded.finance_status,

    findings =
      excluded.findings,

    generated_at =
      now(),

    generated_by =
      v_actor

  returning id
  into v_id;


  return v_id;

end;
$$;


-- ============================================================
-- SECURITY
-- ============================================================

revoke all
on function
public.create_tour_staff_commission_plan(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function
public.create_tour_staff_commission_plan(
  uuid,
  text,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;


revoke all
on function
public.assign_tour_sale_to_staff(
  uuid,
  uuid,
  uuid
)
from public;

grant execute
on function
public.assign_tour_sale_to_staff(
  uuid,
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.approve_tour_staff_commission(uuid)
from public;

grant execute
on function
public.approve_tour_staff_commission(uuid)
to authenticated;


revoke all
on function
public.pay_tour_staff_commission(
  uuid,
  text
)
from public;

grant execute
on function
public.pay_tour_staff_commission(
  uuid,
  text
)
to authenticated;


revoke all
on function
public.generate_tour_staff_performance(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_staff_performance(
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.generate_tour_finance_intelligence(
  uuid,
  uuid
)
from public;

grant execute
on function
public.generate_tour_finance_intelligence(
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_staff_commission_plans
enable row level security;

alter table
public.tour_staff_sales
enable row level security;

alter table
public.tour_staff_performance_snapshots
enable row level security;

alter table
public.tour_finance_intelligence_snapshots
enable row level security;


create policy
tour_staff_commission_plans_select
on public.tour_staff_commission_plans
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_staff_sales_select
on public.tour_staff_sales
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_staff_performance_snapshots_select
on public.tour_staff_performance_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_finance_intelligence_snapshots_select
on public.tour_finance_intelligence_snapshots
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


comment on table
public.tour_staff_sales
is
  'Tour sales attribution and commission layer over existing sales records.';


comment on table
public.tour_finance_intelligence_snapshots
is
  'Tour management finance snapshot based on existing sales and operation expense ledgers.';

