
-- ============================================================
-- TUROBUS YACHT SALES COMMISSION ENGINE
--
-- Collection-first commission system.
--
-- Lead owner
--      ↓
-- Converted booking
--      ↓
-- Real collection
--      ↓
-- Commission earning
--      ↓
-- Manager approval
--      ↓
-- Accounting payment
--      ↓
-- Finance expense
--
-- No collection = no commission.
-- ============================================================


-- ============================================================
-- COMMISSION RULES
-- ============================================================

create table if not exists public.yacht_os_sales_commission_rules (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete cascade,

  name text not null,

  calculation_basis text not null
    default 'gross_profit'
    check (
      calculation_basis in (
        'revenue',
        'gross_profit'
      )
    ),

  rate_percent numeric(7,3) not null
    default 0
    check (
      rate_percent >= 0
      and rate_percent <= 100
    ),

  minimum_collection_percent numeric(7,2) not null
    default 100
    check (
      minimum_collection_percent >= 0
      and minimum_collection_percent <= 100
    ),

  applies_from date not null
    default current_date,

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'passive',
        'archived'
      )
    ),

  currency text not null
    default 'TRY',

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_sales_commission_rules_company_idx
on public.yacht_os_sales_commission_rules (
  company_id,
  status,
  applies_from desc
);


create index if not exists
  yacht_sales_commission_rules_user_idx
on public.yacht_os_sales_commission_rules (
  company_id,
  user_id,
  status
);


-- ============================================================
-- COMMISSION EARNINGS
-- ============================================================

create table if not exists public.yacht_os_sales_commission_earnings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  lead_id uuid
    references public.yacht_os_leads(id)
    on delete set null,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  rule_id uuid not null
    references public.yacht_os_sales_commission_rules(id)
    on delete restrict,

  calculation_basis text not null
    check (
      calculation_basis in (
        'revenue',
        'gross_profit'
      )
    ),

  booking_total numeric(14,2) not null
    default 0,

  collected_amount numeric(14,2) not null
    default 0,

  supplier_cost numeric(14,2) not null
    default 0,

  gross_profit numeric(14,2) not null
    default 0,

  collection_percent numeric(7,2) not null
    default 0,

  commission_base numeric(14,2) not null
    default 0,

  rate_percent numeric(7,3) not null
    default 0,

  commission_amount numeric(14,2) not null
    default 0
    check (
      commission_amount >= 0
    ),

  currency text not null
    default 'TRY',

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'paid',
        'cancelled'
      )
    ),

  approved_by uuid
    references auth.users(id)
    on delete set null,

  approved_at timestamptz,

  paid_by uuid
    references auth.users(id)
    on delete set null,

  paid_at timestamptz,

  finance_entry_id uuid
    references public.yacht_os_finance_entries(id)
    on delete set null,

  note text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create unique index if not exists
  yacht_sales_commission_booking_rule_unique_idx
on public.yacht_os_sales_commission_earnings (
  booking_id,
  user_id,
  rule_id
);


create index if not exists
  yacht_sales_commission_earnings_company_idx
on public.yacht_os_sales_commission_earnings (
  company_id,
  status,
  created_at desc
);


create index if not exists
  yacht_sales_commission_earnings_user_idx
on public.yacht_os_sales_commission_earnings (
  company_id,
  user_id,
  status
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_sales_commission_rules_updated_at
on public.yacht_os_sales_commission_rules;

create trigger
  yacht_sales_commission_rules_updated_at
before update
on public.yacht_os_sales_commission_rules
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_sales_commission_earnings_updated_at
on public.yacht_os_sales_commission_earnings;

create trigger
  yacht_sales_commission_earnings_updated_at
before update
on public.yacht_os_sales_commission_earnings
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_sales_commission_rules
enable row level security;

alter table public.yacht_os_sales_commission_earnings
enable row level security;


create policy yacht_sales_commission_rules_company_select
on public.yacht_os_sales_commission_rules
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy yacht_sales_commission_earnings_company_select
on public.yacht_os_sales_commission_earnings
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on
  public.yacht_os_sales_commission_rules,
  public.yacht_os_sales_commission_earnings
to authenticated;


revoke insert, update, delete
on
  public.yacht_os_sales_commission_rules,
  public.yacht_os_sales_commission_earnings
from authenticated;


-- ============================================================
-- COMMISSION FINANCE AUTHORITY
-- ============================================================

create or replace function
public.yacht_os_has_commission_finance_authority(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where
      cm.company_id =
        p_company_id
      and cm.user_id =
        auth.uid()
      and cm.is_active =
        true
      and cm.role in (
        'super_admin',
        'company_owner',
        'accounting'
      )
  );
$$;


revoke execute
on function
  public.yacht_os_has_commission_finance_authority(uuid)
from public;

grant execute
on function
  public.yacht_os_has_commission_finance_authority(uuid)
to authenticated;


-- ============================================================
-- CREATE / UPDATE COMMISSION RULE
-- ============================================================

create or replace function
public.yacht_os_set_sales_commission_rule(
  p_company_id uuid,
  p_rule_id uuid,
  p_user_id uuid,
  p_name text,
  p_calculation_basis text,
  p_rate_percent numeric,
  p_minimum_collection_percent numeric,
  p_applies_from date,
  p_status text,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin

  if not public.yacht_os_has_sales_management_authority(
    p_company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


  if nullif(
    trim(
      p_name
    ),
    ''
  ) is null then
    raise exception
      'Commission rule name required';
  end if;


  if p_calculation_basis not in (
    'revenue',
    'gross_profit'
  ) then
    raise exception
      'Invalid calculation basis';
  end if;


  if
    p_rate_percent < 0
    or p_rate_percent > 100
  then
    raise exception
      'Invalid commission rate';
  end if;


  if
    p_minimum_collection_percent < 0
    or p_minimum_collection_percent > 100
  then
    raise exception
      'Invalid collection threshold';
  end if;


  if p_status not in (
    'active',
    'passive',
    'archived'
  ) then
    raise exception
      'Invalid rule status';
  end if;


  if p_user_id is not null then

    if not exists (
      select 1
      from public.company_members cm
      where
        cm.company_id =
          p_company_id
        and cm.user_id =
          p_user_id
        and cm.is_active =
          true
        and cm.role in (
          'sales',
          'operation_manager',
          'company_owner',
          'super_admin'
        )
    ) then
      raise exception
        'Commission user is not active in company';
    end if;

  end if;


  if p_rule_id is null then

    insert into public.yacht_os_sales_commission_rules (
      company_id,
      user_id,
      name,
      calculation_basis,
      rate_percent,
      minimum_collection_percent,
      applies_from,
      status,
      currency,
      note,
      created_by
    )
    values (
      p_company_id,
      p_user_id,
      trim(
        p_name
      ),
      p_calculation_basis,
      p_rate_percent,
      p_minimum_collection_percent,
      coalesce(
        p_applies_from,
        current_date
      ),
      p_status,
      coalesce(
        nullif(
          trim(
            p_currency
          ),
          ''
        ),
        'TRY'
      ),
      nullif(
        trim(
          p_note
        ),
        ''
      ),
      auth.uid()
    )
    returning id
    into v_id;

  else

    update public.yacht_os_sales_commission_rules
    set
      user_id =
        p_user_id,
      name =
        trim(
          p_name
        ),
      calculation_basis =
        p_calculation_basis,
      rate_percent =
        p_rate_percent,
      minimum_collection_percent =
        p_minimum_collection_percent,
      applies_from =
        coalesce(
          p_applies_from,
          applies_from
        ),
      status =
        p_status,
      currency =
        coalesce(
          nullif(
            trim(
              p_currency
            ),
            ''
          ),
          currency
        ),
      note =
        nullif(
          trim(
            p_note
          ),
          ''
        )
    where
      id =
        p_rule_id
      and company_id =
        p_company_id
    returning id
    into v_id;


    if v_id is null then
      raise exception
        'Commission rule not found';
    end if;

  end if;


  return jsonb_build_object(
    'ok',
      true,
    'rule_id',
      v_id
  );

end;
$$;


-- ============================================================
-- CALCULATE COMMISSIONS
-- ============================================================

create or replace function
public.yacht_os_calculate_sales_commissions(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
  b public.yacht_os_bookings%rowtype;
  r public.yacht_os_sales_commission_rules%rowtype;

  v_collection_percent numeric;
  v_profit numeric;
  v_collection_ratio numeric;
  v_base numeric;
  v_amount numeric;

  v_created integer := 0;
  v_updated integer := 0;
begin

  if not public.yacht_os_has_sales_management_authority(
    p_company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


  for l in
    select *
    from public.yacht_os_leads
    where
      company_id =
        p_company_id

      and assigned_to
        is not null

      and converted_booking_id
        is not null

      and stage =
        'won'
  loop

    select *
    into b
    from public.yacht_os_bookings
    where
      id =
        l.converted_booking_id

      and company_id =
        p_company_id;


    if
      b.id is null
      or b.status =
        'cancelled'
    then
      continue;
    end if;


    if coalesce(
      b.paid_amount,
      0
    ) <= 0 then
      continue;
    end if;


    -- User-specific rule wins.
    select *
    into r
    from public.yacht_os_sales_commission_rules
    where
      company_id =
        p_company_id

      and user_id =
        l.assigned_to

      and status =
        'active'

      and applies_from <=
        b.created_at::date

    order by
      applies_from desc,
      created_at desc

    limit 1;


    -- Otherwise company-wide rule.
    if r.id is null then

      select *
      into r
      from public.yacht_os_sales_commission_rules
      where
        company_id =
          p_company_id

        and user_id
          is null

        and status =
          'active'

        and applies_from <=
          b.created_at::date

      order by
        applies_from desc,
        created_at desc

      limit 1;

    end if;


    if r.id is null then
      continue;
    end if;


    v_collection_percent :=
      case
        when coalesce(
          b.total_amount,
          0
        ) <= 0
        then 0

        else least(
          100,
          round(
            (
              coalesce(
                b.paid_amount,
                0
              ) /
              b.total_amount
            ) * 100,
            2
          )
        )
      end;


    if
      v_collection_percent <
      r.minimum_collection_percent
    then
      continue;
    end if;


    v_collection_ratio :=
      case
        when coalesce(
          b.total_amount,
          0
        ) <= 0
        then 0

        else least(
          1,
          coalesce(
            b.paid_amount,
            0
          ) /
          b.total_amount
        )
      end;


    v_profit :=
      greatest(
        coalesce(
          b.total_amount,
          0
        ) -
        coalesce(
          b.supplier_cost,
          0
        ),
        0
      );


    v_base :=
      case
        when r.calculation_basis =
          'revenue'
        then
          least(
            coalesce(
              b.paid_amount,
              0
            ),
            coalesce(
              b.total_amount,
              0
            )
          )

        else
          v_profit *
          v_collection_ratio
      end;


    v_amount :=
      round(
        greatest(
          v_base,
          0
        ) *
        (
          r.rate_percent /
          100
        ),
        2
      );


    if exists (
      select 1
      from public.yacht_os_sales_commission_earnings e
      where
        e.booking_id =
          b.id
        and e.user_id =
          l.assigned_to
        and e.rule_id =
          r.id
    ) then

      update public.yacht_os_sales_commission_earnings
      set
        lead_id =
          l.id,

        booking_total =
          coalesce(
            b.total_amount,
            0
          ),

        collected_amount =
          coalesce(
            b.paid_amount,
            0
          ),

        supplier_cost =
          coalesce(
            b.supplier_cost,
            0
          ),

        gross_profit =
          v_profit,

        collection_percent =
          v_collection_percent,

        commission_base =
          v_base,

        rate_percent =
          r.rate_percent,

        commission_amount =
          v_amount,

        currency =
          b.currency

      where
        booking_id =
          b.id
        and user_id =
          l.assigned_to
        and rule_id =
          r.id
        and status =
          'pending';


      if found then
        v_updated :=
          v_updated + 1;
      end if;

    else

      insert into public.yacht_os_sales_commission_earnings (
        company_id,
        user_id,
        lead_id,
        booking_id,
        rule_id,

        calculation_basis,

        booking_total,
        collected_amount,
        supplier_cost,
        gross_profit,
        collection_percent,

        commission_base,
        rate_percent,
        commission_amount,

        currency,

        status
      )
      values (
        p_company_id,
        l.assigned_to,
        l.id,
        b.id,
        r.id,

        r.calculation_basis,

        coalesce(
          b.total_amount,
          0
        ),

        coalesce(
          b.paid_amount,
          0
        ),

        coalesce(
          b.supplier_cost,
          0
        ),

        v_profit,
        v_collection_percent,

        v_base,
        r.rate_percent,
        v_amount,

        b.currency,

        'pending'
      );


      v_created :=
        v_created + 1;

    end if;

  end loop;


  return jsonb_build_object(
    'ok',
      true,
    'created',
      v_created,
    'updated',
      v_updated
  );

end;
$$;


-- ============================================================
-- APPROVE COMMISSION
-- ============================================================

create or replace function
public.yacht_os_approve_sales_commission(
  p_earning_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.yacht_os_sales_commission_earnings%rowtype;
begin

  select *
  into e
  from public.yacht_os_sales_commission_earnings
  where id =
    p_earning_id
  for update;


  if e.id is null then
    raise exception
      'Commission earning not found';
  end if;


  if not public.yacht_os_has_sales_management_authority(
    e.company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


  if e.status <> 'pending' then
    raise exception
      'Only pending commission can be approved';
  end if;


  update public.yacht_os_sales_commission_earnings
  set
    status =
      'approved',
    approved_by =
      auth.uid(),
    approved_at =
      now()
  where id =
    e.id;


  return jsonb_build_object(
    'ok',
      true,
    'status',
      'approved'
  );

end;
$$;


-- ============================================================
-- PAY COMMISSION
-- Finance-authorized only.
-- Creates one expense ledger record.
-- ============================================================

create or replace function
public.yacht_os_pay_sales_commission(
  p_earning_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.yacht_os_sales_commission_earnings%rowtype;

  v_finance_id uuid;
begin

  select *
  into e
  from public.yacht_os_sales_commission_earnings
  where id =
    p_earning_id
  for update;


  if e.id is null then
    raise exception
      'Commission earning not found';
  end if;


  if not public.yacht_os_has_commission_finance_authority(
    e.company_id
  ) then
    raise exception
      'Commission finance authority required';
  end if;


  if e.status <> 'approved' then
    raise exception
      'Commission must be approved before payment';
  end if;


  if e.finance_entry_id is not null then
    raise exception
      'Commission already has finance entry';
  end if;


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
    e.company_id,
    e.booking_id,

    'expense',

    e.commission_amount,
    e.currency,

    now(),

    'Satış personeli prim / komisyon ödemesi',

    auth.uid()
  )
  returning id
  into v_finance_id;


  update public.yacht_os_sales_commission_earnings
  set
    status =
      'paid',

    paid_by =
      auth.uid(),

    paid_at =
      now(),

    finance_entry_id =
      v_finance_id

  where id =
    e.id;


  return jsonb_build_object(
    'ok',
      true,
    'status',
      'paid',
    'finance_entry_id',
      v_finance_id
  );

end;
$$;


-- ============================================================
-- CANCEL UNPAID COMMISSION
-- ============================================================

create or replace function
public.yacht_os_cancel_sales_commission(
  p_earning_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.yacht_os_sales_commission_earnings%rowtype;
begin

  select *
  into e
  from public.yacht_os_sales_commission_earnings
  where id =
    p_earning_id
  for update;


  if e.id is null then
    raise exception
      'Commission earning not found';
  end if;


  if not public.yacht_os_has_sales_management_authority(
    e.company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


  if e.status = 'paid' then
    raise exception
      'Paid commission cannot be cancelled';
  end if;


  update public.yacht_os_sales_commission_earnings
  set
    status =
      'cancelled',

    note =
      coalesce(
        nullif(
          trim(
            p_note
          ),
          ''
        ),
        note
      )

  where id =
    e.id;


  return jsonb_build_object(
    'ok',
      true,
    'status',
      'cancelled'
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
  public.yacht_os_set_sales_commission_rule(
    uuid,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    date,
    text,
    text,
    text
  )
from public;


revoke execute
on function
  public.yacht_os_calculate_sales_commissions(uuid)
from public;


revoke execute
on function
  public.yacht_os_approve_sales_commission(uuid)
from public;


revoke execute
on function
  public.yacht_os_pay_sales_commission(uuid)
from public;


revoke execute
on function
  public.yacht_os_cancel_sales_commission(uuid,text)
from public;


grant execute
on function
  public.yacht_os_set_sales_commission_rule(
    uuid,
    uuid,
    uuid,
    text,
    text,
    numeric,
    numeric,
    date,
    text,
    text,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_calculate_sales_commissions(uuid)
to authenticated;


grant execute
on function
  public.yacht_os_approve_sales_commission(uuid)
to authenticated;


grant execute
on function
  public.yacht_os_pay_sales_commission(uuid)
to authenticated;


grant execute
on function
  public.yacht_os_cancel_sales_commission(uuid,text)
to authenticated;
