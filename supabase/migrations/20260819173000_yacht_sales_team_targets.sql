
-- ============================================================
-- TUROBUS YACHT SALES TEAM & TARGET CENTER
--
-- Existing yacht_os_leads.assigned_to is reused.
--
-- - Sales member monthly targets
-- - Lead ownership
-- - Management controlled assignments
-- - Revenue / booking / lead targets
-- ============================================================


create table if not exists public.yacht_os_sales_targets (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  period_month date not null,

  lead_target integer not null
    default 0
    check (lead_target >= 0),

  quote_target integer not null
    default 0
    check (quote_target >= 0),

  booking_target integer not null
    default 0
    check (booking_target >= 0),

  revenue_target numeric(14,2) not null
    default 0
    check (revenue_target >= 0),

  gross_profit_target numeric(14,2) not null
    default 0
    check (gross_profit_target >= 0),

  currency text not null
    default 'TRY',

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'archived'
      )
    ),

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint yacht_os_sales_target_month_check
    check (
      period_month =
      date_trunc(
        'month',
        period_month
      )::date
    )
);


create unique index if not exists
  yacht_os_sales_targets_unique_idx
on public.yacht_os_sales_targets (
  company_id,
  user_id,
  period_month
);


create index if not exists
  yacht_os_sales_targets_company_idx
on public.yacht_os_sales_targets (
  company_id,
  period_month,
  status
);


drop trigger if exists
  yacht_os_sales_targets_updated_at
on public.yacht_os_sales_targets;

create trigger
  yacht_os_sales_targets_updated_at
before update
on public.yacht_os_sales_targets
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_sales_targets
enable row level security;


create policy yacht_os_sales_targets_company_select
on public.yacht_os_sales_targets
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.yacht_os_sales_targets
to authenticated;


revoke insert, update, delete
on public.yacht_os_sales_targets
from authenticated;


-- ============================================================
-- SALES MANAGEMENT AUTHORITY
-- ============================================================

create or replace function
public.yacht_os_has_sales_management_authority(
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
        'operation_manager'
      )
  );
$$;


revoke execute
on function
  public.yacht_os_has_sales_management_authority(uuid)
from public;


grant execute
on function
  public.yacht_os_has_sales_management_authority(uuid)
to authenticated;


-- ============================================================
-- ASSIGN LEAD
-- ============================================================

create or replace function
public.yacht_os_assign_lead(
  p_lead_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
  v_name text;
begin

  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if not public.yacht_os_has_sales_management_authority(
    l.company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


  if p_user_id is not null then

    select cm.full_name
    into v_name
    from public.company_members cm
    where
      cm.company_id =
        l.company_id

      and cm.user_id =
        p_user_id

      and cm.is_active =
        true

      and cm.role in (
        'sales',
        'operation_manager',
        'company_owner',
        'super_admin'
      );


    if not found then
      raise exception
        'Sales member is not active in company';
    end if;

  end if;


  update public.yacht_os_leads
  set assigned_to =
    p_user_id
  where id =
    l.id;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,
    activity_type,
    title,
    note,
    metadata,
    created_by
  )
  values (
    l.company_id,
    l.id,
    'note',
    'Lead satış personeline atandı',
    case
      when p_user_id is null
      then 'Lead ataması kaldırıldı.'
      else
        'Yeni satış sorumlusu: ' ||
        coalesce(
          v_name,
          p_user_id::text
        )
    end,
    jsonb_build_object(
      'old_assigned_to',
        l.assigned_to,
      'new_assigned_to',
        p_user_id
    ),
    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,
    'assigned_to',
      p_user_id
  );

end;
$$;


-- ============================================================
-- SET MONTHLY TARGET
-- ============================================================

create or replace function
public.yacht_os_set_sales_target(
  p_company_id uuid,
  p_user_id uuid,
  p_period_month date,
  p_lead_target integer,
  p_quote_target integer,
  p_booking_target integer,
  p_revenue_target numeric,
  p_gross_profit_target numeric,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date;
  v_id uuid;
begin

  if not public.yacht_os_has_sales_management_authority(
    p_company_id
  ) then
    raise exception
      'Sales management authority required';
  end if;


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
      'Target user is not an active sales member';
  end if;


  if
    p_lead_target < 0
    or p_quote_target < 0
    or p_booking_target < 0
    or p_revenue_target < 0
    or p_gross_profit_target < 0
  then
    raise exception
      'Targets cannot be negative';
  end if;


  v_month :=
    date_trunc(
      'month',
      coalesce(
        p_period_month,
        current_date
      )
    )::date;


  insert into public.yacht_os_sales_targets (
    company_id,
    user_id,
    period_month,
    lead_target,
    quote_target,
    booking_target,
    revenue_target,
    gross_profit_target,
    currency,
    status,
    note,
    created_by
  )
  values (
    p_company_id,
    p_user_id,
    v_month,
    p_lead_target,
    p_quote_target,
    p_booking_target,
    p_revenue_target,
    p_gross_profit_target,
    coalesce(
      nullif(
        trim(
          p_currency
        ),
        ''
      ),
      'TRY'
    ),
    'active',
    nullif(
      trim(
        p_note
      ),
      ''
    ),
    auth.uid()
  )

  on conflict (
    company_id,
    user_id,
    period_month
  )

  do update
  set
    lead_target =
      excluded.lead_target,
    quote_target =
      excluded.quote_target,
    booking_target =
      excluded.booking_target,
    revenue_target =
      excluded.revenue_target,
    gross_profit_target =
      excluded.gross_profit_target,
    currency =
      excluded.currency,
    status =
      'active',
    note =
      excluded.note,
    updated_at =
      now()

  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,
    'target_id',
      v_id,
    'period_month',
      v_month
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
  public.yacht_os_assign_lead(uuid,uuid)
from public;


revoke execute
on function
  public.yacht_os_set_sales_target(
    uuid,
    uuid,
    date,
    integer,
    integer,
    integer,
    numeric,
    numeric,
    text,
    text
  )
from public;


grant execute
on function
  public.yacht_os_assign_lead(uuid,uuid)
to authenticated;


grant execute
on function
  public.yacht_os_set_sales_target(
    uuid,
    uuid,
    date,
    integer,
    integer,
    integer,
    numeric,
    numeric,
    text,
    text
  )
to authenticated;
