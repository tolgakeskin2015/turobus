begin;

-- ============================================================
-- TUROBUS VILLA OS FINAL PROFESSIONAL CORE
-- Operations automation + settlements + invoice connector
-- + finance security hardening + management summary
-- ============================================================

-- ------------------------------------------------------------
-- ROLE HELPERS
-- ------------------------------------------------------------

create or replace function public.villa_user_can_manage_finance(
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
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role::text in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  );
$$;

create or replace function public.villa_user_can_manage_operations(
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
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role::text in (
        'super_admin',
        'company_owner',
        'operation_manager'
      )
  );
$$;

grant execute on function public.villa_user_can_manage_finance(uuid)
to authenticated;

grant execute on function public.villa_user_can_manage_operations(uuid)
to authenticated;


-- ------------------------------------------------------------
-- OPERATION TASK CENTER
-- ------------------------------------------------------------

create table if not exists public.villa_operation_tasks (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  villa_id uuid null
    references public.villas(id)
    on delete cascade,

  reservation_id uuid null
    references public.villa_reservations(id)
    on delete cascade,

  task_type text not null,

  title text not null,

  description text null,

  task_date date not null,

  due_at timestamptz null,

  priority text not null default 'normal',

  status text not null default 'pending',

  assigned_user_id uuid null,

  completed_by uuid null,

  completed_at timestamptz null,

  checklist jsonb not null default '[]'::jsonb,

  result_payload jsonb not null default '{}'::jsonb,

  created_by uuid null default auth.uid(),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint villa_operation_task_type_check
    check (
      task_type in (
        'prearrival',
        'checkin',
        'checkout',
        'cleaning_inspection',
        'deposit_refund',
        'invoice',
        'guest_contact',
        'maintenance',
        'custom'
      )
    ),

  constraint villa_operation_task_priority_check
    check (
      priority in (
        'low',
        'normal',
        'high',
        'critical'
      )
    ),

  constraint villa_operation_task_status_check
    check (
      status in (
        'pending',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
      )
    ),

  unique (
    company_id,
    reservation_id,
    task_type,
    task_date
  )
);

create index if not exists
idx_villa_operation_tasks_company_date
on public.villa_operation_tasks(
  company_id,
  task_date,
  status
);

create index if not exists
idx_villa_operation_tasks_reservation
on public.villa_operation_tasks(
  reservation_id
);


-- ------------------------------------------------------------
-- E-INVOICE / E-ARCHIVE CONNECTOR LAYER
-- ------------------------------------------------------------

create table if not exists public.villa_invoice_connectors (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  provider text not null,

  connection_name text not null,

  environment text not null default 'sandbox',

  secret_ref text null,

  public_settings jsonb not null default '{}'::jsonb,

  is_active boolean not null default true,

  last_healthcheck_at timestamptz null,

  last_healthcheck_status text null,

  last_error text null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint villa_invoice_connector_environment_check
    check (
      environment in (
        'sandbox',
        'production'
      )
    )
);

create table if not exists public.villa_invoice_jobs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  invoice_id uuid not null
    references public.villa_invoices(id)
    on delete cascade,

  connector_id uuid null
    references public.villa_invoice_connectors(id)
    on delete set null,

  job_type text not null default 'issue',

  status text not null default 'queued',

  attempt_count integer not null default 0,

  request_payload jsonb not null default '{}'::jsonb,

  response_payload jsonb not null default '{}'::jsonb,

  error_message text null,

  next_attempt_at timestamptz null,

  processed_at timestamptz null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint villa_invoice_job_type_check
    check (
      job_type in (
        'issue',
        'send',
        'cancel',
        'status_check'
      )
    ),

  constraint villa_invoice_job_status_check
    check (
      status in (
        'queued',
        'processing',
        'success',
        'failed',
        'cancelled'
      )
    )
);

create index if not exists
idx_villa_invoice_jobs_queue
on public.villa_invoice_jobs(
  company_id,
  status,
  created_at
);


-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.villa_operation_tasks
enable row level security;

alter table public.villa_invoice_connectors
enable row level security;

alter table public.villa_invoice_jobs
enable row level security;


drop policy if exists
villa_operation_tasks_read
on public.villa_operation_tasks;

create policy villa_operation_tasks_read
on public.villa_operation_tasks
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists
villa_operation_tasks_manage
on public.villa_operation_tasks;

create policy villa_operation_tasks_manage
on public.villa_operation_tasks
for all
to authenticated
using (
  public.villa_user_can_manage_operations(company_id)
)
with check (
  public.villa_user_can_manage_operations(company_id)
);


drop policy if exists
villa_invoice_connectors_finance
on public.villa_invoice_connectors;

create policy villa_invoice_connectors_finance
on public.villa_invoice_connectors
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_invoice_jobs_finance
on public.villa_invoice_jobs;

create policy villa_invoice_jobs_finance
on public.villa_invoice_jobs
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


-- ------------------------------------------------------------
-- HARDEN FINANCE RLS
-- Sales users must not see internal finance/cost/payable data.
-- ------------------------------------------------------------

drop policy if exists
villa_finance_ledger_company
on public.villa_finance_ledger;

drop policy if exists
villa_finance_ledger_finance
on public.villa_finance_ledger;

create policy villa_finance_ledger_finance
on public.villa_finance_ledger
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_security_deposits_company
on public.villa_security_deposits;

drop policy if exists
villa_security_deposits_finance
on public.villa_security_deposits;

create policy villa_security_deposits_finance
on public.villa_security_deposits
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_settlements_company
on public.villa_settlements;

drop policy if exists
villa_settlements_finance
on public.villa_settlements;

create policy villa_settlements_finance
on public.villa_settlements
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_day_closes_company
on public.villa_day_closes;

drop policy if exists
villa_day_closes_finance
on public.villa_day_closes;

create policy villa_day_closes_finance
on public.villa_day_closes
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_cash_accounts_company_access
on public.villa_cash_accounts;

drop policy if exists
villa_cash_accounts_finance
on public.villa_cash_accounts;

create policy villa_cash_accounts_finance
on public.villa_cash_accounts
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_cash_movements_company_access
on public.villa_cash_movements;

drop policy if exists
villa_cash_movements_finance
on public.villa_cash_movements;

create policy villa_cash_movements_finance
on public.villa_cash_movements
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


drop policy if exists
villa_expenses_company_access
on public.villa_expenses;

drop policy if exists
villa_expenses_finance
on public.villa_expenses;

create policy villa_expenses_finance
on public.villa_expenses
for all
to authenticated
using (
  public.villa_user_can_manage_finance(company_id)
)
with check (
  public.villa_user_can_manage_finance(company_id)
);


-- ------------------------------------------------------------
-- AUDIT HELPER
-- ------------------------------------------------------------

create or replace function public.villa_write_audit(
  p_company_id uuid,
  p_villa_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;

  insert into public.villa_audit_logs(
    company_id,
    villa_id,
    user_id,
    action,
    entity_type,
    entity_id,
    payload
  )
  values(
    p_company_id,
    p_villa_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;

end;
$$;

grant execute on function public.villa_write_audit(
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
)
to authenticated;


-- ------------------------------------------------------------
-- DAILY AUTOMATION
-- Generates operation tasks idempotently.
-- ------------------------------------------------------------

create or replace function public.generate_villa_daily_tasks(
  p_company_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created integer := 0;
  v_rows integer := 0;
begin

  if not public.villa_user_can_manage_operations(
    p_company_id
  ) then
    raise exception 'Villa operasyon yetkisi bulunamadı';
  end if;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'prearrival',
    'Misafir Ön Hazırlığı',
    r.guest_name || ' için giriş öncesi villa kontrolü',
    p_date,
    'normal'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_in = p_date
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'checkin',
    'Check-in Kontrolü',
    r.guest_name || ' giriş işlemlerini tamamla',
    p_date,
    'high'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_in = p_date
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'checkout',
    'Check-out Kontrolü',
    r.guest_name || ' çıkış işlemlerini tamamla',
    p_date,
    'high'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_out = p_date
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'cleaning_inspection',
    'Çıkış Temizlik ve Kalite Kontrolü',
    'Temizlik sonrası fotoğraf ve kalite kontrolünü tamamla',
    p_date,
    'high'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_out = p_date
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'deposit_refund',
    'Depozito Kontrolü / İadesi',
    'Hasar kontrolü sonrası depozito iade veya kesinti işlemini tamamla',
    p_date,
    'normal'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_out = p_date
    and r.security_deposit > 0
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  insert into public.villa_operation_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_type,
    title,
    description,
    task_date,
    priority
  )
  select
    r.company_id,
    r.villa_id,
    r.id,
    'invoice',
    'Fatura Kontrolü',
    'Rezervasyon faturası oluşturulmalı veya gönderilmeli',
    p_date,
    'normal'
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.check_out = p_date
    and r.invoice_status <> 'sent'
    and r.status not in ('cancelled')
  on conflict (
    company_id,
    reservation_id,
    task_type,
    task_date
  ) do nothing;

  get diagnostics v_rows = row_count;
  v_created := v_created + v_rows;


  perform public.villa_write_audit(
    p_company_id,
    null,
    'generate',
    'daily_operation_tasks',
    p_date::text,
    jsonb_build_object(
      'created_count',
      v_created,
      'date',
      p_date
    )
  );


  return jsonb_build_object(
    'success',
    true,
    'date',
    p_date,
    'created',
    v_created
  );

end;
$$;

grant execute on function public.generate_villa_daily_tasks(
  uuid,
  date
)
to authenticated;


-- ------------------------------------------------------------
-- OWNER SETTLEMENT GENERATOR
-- Idempotent for same owner / period / currency.
-- ------------------------------------------------------------

create or replace function public.generate_villa_owner_settlement(
  p_company_id uuid,
  p_owner_id uuid,
  p_period_start date,
  p_period_end date,
  p_currency text default 'TRY'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement_id uuid;

  v_gross numeric := 0;
  v_deductions numeric := 0;
  v_payable numeric := 0;

  v_existing uuid;
begin

  if not public.villa_user_can_manage_finance(
    p_company_id
  ) then
    raise exception 'Villa finans yetkisi bulunamadı';
  end if;

  if p_period_end < p_period_start then
    raise exception 'Bitiş tarihi başlangıçtan küçük olamaz';
  end if;

  if not exists (
    select 1
    from public.villa_owners o
    where o.id = p_owner_id
      and o.company_id = p_company_id
      and o.is_active = true
  ) then
    raise exception 'Villa sahibi bulunamadı';
  end if;


  select s.id
  into v_existing
  from public.villa_settlements s
  where s.company_id = p_company_id
    and s.settlement_type = 'owner'
    and s.owner_id = p_owner_id
    and s.period_start = p_period_start
    and s.period_end = p_period_end
    and s.currency = p_currency
    and s.status <> 'cancelled'
  order by s.created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;


  insert into public.villa_settlements(
    company_id,
    settlement_type,
    owner_id,
    period_start,
    period_end,
    currency,
    status,
    due_date,
    note
  )
  values(
    p_company_id,
    'owner',
    p_owner_id,
    p_period_start,
    p_period_end,
    coalesce(p_currency, 'TRY'),
    'draft',
    p_period_end + 7,
    'Villa OS otomatik malik hakedişi'
  )
  returning id into v_settlement_id;


  -- Reservation based items:
  insert into public.villa_settlement_items(
    settlement_id,
    reservation_id,
    villa_id,
    item_type,
    description,
    gross_amount,
    deduction_amount,
    net_amount
  )
  select
    v_settlement_id,
    r.id,
    r.villa_id,
    'reservation',
    r.reservation_code || ' · ' || r.guest_name,

    r.grand_total,

    case
      when ov.settlement_type = 'net_amount'
      then coalesce((
        select sum(e.amount)
        from public.villa_expenses e
        where e.company_id = p_company_id
          and e.reservation_id = r.id
          and e.payment_status <> 'cancelled'
      ), 0)
      else 0
    end,

    case

      when ov.settlement_type = 'percentage'
      then round(
        r.grand_total *
        ov.settlement_value / 100,
        2
      )

      when ov.settlement_type = 'net_amount'
      then greatest(
        0,
        r.grand_total -
        coalesce((
          select sum(e.amount)
          from public.villa_expenses e
          where e.company_id = p_company_id
            and e.reservation_id = r.id
            and e.payment_status <> 'cancelled'
        ), 0)
      )

      else 0

    end

  from public.villa_reservations r

  join public.villa_owner_villas ov
    on ov.villa_id = r.villa_id
   and ov.owner_id = p_owner_id
   and ov.company_id = p_company_id
   and ov.is_active = true

  where r.company_id = p_company_id
    and r.currency = p_currency
    and r.check_out between
      p_period_start and p_period_end
    and r.status not in (
      'cancelled'
    )
    and ov.settlement_type in (
      'percentage',
      'net_amount'
    );


  -- Fixed monthly villa items:
  insert into public.villa_settlement_items(
    settlement_id,
    villa_id,
    item_type,
    description,
    gross_amount,
    deduction_amount,
    net_amount
  )
  select
    v_settlement_id,
    ov.villa_id,
    'adjustment',
    'Sabit dönem malik hakedişi',
    ov.settlement_value,
    0,
    ov.settlement_value

  from public.villa_owner_villas ov

  where ov.company_id = p_company_id
    and ov.owner_id = p_owner_id
    and ov.is_active = true
    and ov.settlement_type = 'fixed_monthly';


  select
    coalesce(sum(gross_amount), 0),
    coalesce(sum(deduction_amount), 0),
    coalesce(sum(net_amount), 0)

  into
    v_gross,
    v_deductions,
    v_payable

  from public.villa_settlement_items

  where settlement_id =
    v_settlement_id;


  update public.villa_settlements

  set
    gross_amount = v_gross,
    deductions = v_deductions,
    payable_amount = v_payable,
    updated_at = now()

  where id =
    v_settlement_id;


  perform public.villa_write_audit(
    p_company_id,
    null,
    'generate',
    'owner_settlement',
    v_settlement_id::text,
    jsonb_build_object(
      'owner_id',
      p_owner_id,
      'period_start',
      p_period_start,
      'period_end',
      p_period_end,
      'payable_amount',
      v_payable
    )
  );


  return v_settlement_id;

end;
$$;

grant execute on function public.generate_villa_owner_settlement(
  uuid,
  uuid,
  date,
  date,
  text
)
to authenticated;


-- ------------------------------------------------------------
-- INVOICE QUEUE
-- Provider-specific sending happens later through connector adapter.
-- ------------------------------------------------------------

create or replace function public.queue_villa_invoice(
  p_company_id uuid,
  p_reservation_id uuid,
  p_connector_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_job_id uuid;
  v_reservation public.villa_reservations%rowtype;
begin

  if not public.villa_user_can_manage_finance(
    p_company_id
  ) then
    raise exception 'Villa finans yetkisi bulunamadı';
  end if;


  select *
  into v_reservation
  from public.villa_reservations
  where id = p_reservation_id
    and company_id = p_company_id;

  if v_reservation.id is null then
    raise exception 'Rezervasyon bulunamadı';
  end if;


  select i.id
  into v_invoice_id
  from public.villa_invoices i
  where i.company_id = p_company_id
    and i.reservation_id = p_reservation_id
    and i.invoice_status <> 'cancelled'
  order by i.created_at desc
  limit 1;


  if v_invoice_id is null then

    insert into public.villa_invoices(
      company_id,
      reservation_id,
      invoice_status,
      invoice_type,
      total_amount,
      currency,
      request_payload
    )
    values(
      p_company_id,
      p_reservation_id,
      'queued',
      'e_archive',
      v_reservation.grand_total,
      v_reservation.currency,
      jsonb_build_object(
        'reservation_code',
        v_reservation.reservation_code,
        'guest_name',
        v_reservation.guest_name,
        'guest_email',
        v_reservation.guest_email,
        'guest_phone',
        v_reservation.guest_phone
      )
    )
    returning id into v_invoice_id;

  else

    update public.villa_invoices
    set
      invoice_status = 'queued',
      updated_at = now()
    where id = v_invoice_id;

  end if;


  select j.id
  into v_job_id
  from public.villa_invoice_jobs j
  where j.invoice_id = v_invoice_id
    and j.status in (
      'queued',
      'processing'
    )
  order by j.created_at desc
  limit 1;


  if v_job_id is null then

    insert into public.villa_invoice_jobs(
      company_id,
      invoice_id,
      connector_id,
      job_type,
      status,
      request_payload
    )
    values(
      p_company_id,
      v_invoice_id,
      p_connector_id,
      'issue',
      'queued',
      jsonb_build_object(
        'reservation_id',
        p_reservation_id,
        'reservation_code',
        v_reservation.reservation_code
      )
    )
    returning id into v_job_id;

  end if;


  update public.villa_reservations
  set
    invoice_status = 'queued',
    updated_at = now()
  where id = p_reservation_id;


  perform public.villa_write_audit(
    p_company_id,
    v_reservation.villa_id,
    'queue',
    'invoice_job',
    v_job_id::text,
    jsonb_build_object(
      'invoice_id',
      v_invoice_id,
      'reservation_id',
      p_reservation_id
    )
  );


  return v_job_id;

end;
$$;

grant execute on function public.queue_villa_invoice(
  uuid,
  uuid,
  uuid
)
to authenticated;


-- ------------------------------------------------------------
-- PROFESSIONAL CONTROL SUMMARY
-- ------------------------------------------------------------

create or replace function public.get_villa_professional_summary(
  p_company_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;


  return jsonb_build_object(

    'active_villas',
    coalesce((
      select count(*)
      from public.villas
      where company_id = p_company_id
        and is_active = true
    ), 0),

    'today_checkins',
    coalesce((
      select count(*)
      from public.villa_reservations
      where company_id = p_company_id
        and check_in = p_date
        and status <> 'cancelled'
    ), 0),

    'today_checkouts',
    coalesce((
      select count(*)
      from public.villa_reservations
      where company_id = p_company_id
        and check_out = p_date
        and status <> 'cancelled'
    ), 0),

    'open_tasks',
    coalesce((
      select count(*)
      from public.villa_operation_tasks
      where company_id = p_company_id
        and status not in (
          'completed',
          'cancelled'
        )
    ), 0),

    'critical_tasks',
    coalesce((
      select count(*)
      from public.villa_operation_tasks
      where company_id = p_company_id
        and status not in (
          'completed',
          'cancelled'
        )
        and priority = 'critical'
    ), 0),

    'open_cleaning',
    coalesce((
      select count(*)
      from public.villa_cleaning_tasks
      where company_id = p_company_id
        and status not in (
          'completed',
          'inspected'
        )
    ), 0),

    'open_maintenance',
    coalesce((
      select count(*)
      from public.villa_maintenance_tasks
      where company_id = p_company_id
        and status not in (
          'completed',
          'cancelled'
        )
    ), 0),

    'pending_invoices',
    coalesce((
      select count(*)
      from public.villa_invoices
      where company_id = p_company_id
        and invoice_status in (
          'pending',
          'queued',
          'failed'
        )
    ), 0),

    'held_deposits',
    coalesce((
      select sum(
        amount -
        refunded_amount -
        withheld_amount
      )
      from public.villa_security_deposits
      where company_id = p_company_id
        and status in (
          'received',
          'partially_refunded'
        )
    ), 0),

    'open_owner_settlements',
    coalesce((
      select count(*)
      from public.villa_settlements
      where company_id = p_company_id
        and settlement_type = 'owner'
        and status not in (
          'paid',
          'cancelled'
        )
    ), 0)

  );

end;
$$;

grant execute on function public.get_villa_professional_summary(
  uuid,
  date
)
to authenticated;

commit;
