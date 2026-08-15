begin;

create table if not exists public.villa_owners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  tax_number text,
  iban text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.villa_owner_villas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_id uuid not null references public.villa_owners(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  settlement_type text not null default 'net_amount',
  settlement_value numeric(14,2) not null default 0,
  payout_day integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, villa_id),
  constraint villa_owner_settlement_type_check check (settlement_type in ('net_amount','percentage','fixed_monthly')),
  constraint villa_owner_payout_day_check check (payout_day is null or payout_day between 1 and 31)
);

create table if not exists public.villa_cash_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  account_type text not null default 'cash',
  currency text not null default 'TRY',
  opening_balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_cash_account_type_check check (account_type in ('cash','bank','pos','virtual_pos'))
);

create table if not exists public.villa_cash_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  account_id uuid references public.villa_cash_accounts(id) on delete set null,
  villa_id uuid references public.villas(id) on delete set null,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  movement_type text not null,
  category text not null default 'other',
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  occurred_at timestamptz not null default now(),
  reference text,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint villa_cash_movement_type_check check (movement_type in ('in','out')),
  constraint villa_cash_amount_check check (amount >= 0)
);

create table if not exists public.villa_expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid references public.villas(id) on delete set null,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  category text not null default 'other',
  description text not null,
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  expense_date date not null default current_date,
  supplier_name text,
  invoice_no text,
  payment_status text not null default 'unpaid',
  paid_at timestamptz,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_expense_payment_check check (payment_status in ('unpaid','partial','paid','cancelled')),
  constraint villa_expense_amount_check check (amount >= 0)
);

create table if not exists public.villa_maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  reservation_id uuid references public.villa_reservations(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'normal',
  status text not null default 'open',
  assigned_user_id uuid,
  estimated_cost numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,
  opened_at timestamptz not null default now(),
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_maintenance_priority_check check (priority in ('low','normal','high','critical')),
  constraint villa_maintenance_status_check check (status in ('open','assigned','in_progress','waiting_part','completed','cancelled'))
);

create table if not exists public.villa_audit_logs (
  id bigserial primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid references public.villas(id) on delete set null,
  user_id uuid default auth.uid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_villa_cash_movements_company_date on public.villa_cash_movements(company_id, occurred_at desc);
create index if not exists idx_villa_expenses_company_date on public.villa_expenses(company_id, expense_date desc);
create index if not exists idx_villa_maintenance_company_status on public.villa_maintenance_tasks(company_id, status, due_at);
create index if not exists idx_villa_owner_villas_villa on public.villa_owner_villas(villa_id);

alter table public.villa_owners enable row level security;
alter table public.villa_owner_villas enable row level security;
alter table public.villa_cash_accounts enable row level security;
alter table public.villa_cash_movements enable row level security;
alter table public.villa_expenses enable row level security;
alter table public.villa_maintenance_tasks enable row level security;
alter table public.villa_audit_logs enable row level security;

drop policy if exists villa_owners_company_access on public.villa_owners;
create policy villa_owners_company_access on public.villa_owners for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_owner_villas_company_access on public.villa_owner_villas;
create policy villa_owner_villas_company_access on public.villa_owner_villas for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_cash_accounts_company_access on public.villa_cash_accounts;
create policy villa_cash_accounts_company_access on public.villa_cash_accounts for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_cash_movements_company_access on public.villa_cash_movements;
create policy villa_cash_movements_company_access on public.villa_cash_movements for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_expenses_company_access on public.villa_expenses;
create policy villa_expenses_company_access on public.villa_expenses for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_maintenance_company_access on public.villa_maintenance_tasks;
create policy villa_maintenance_company_access on public.villa_maintenance_tasks for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
drop policy if exists villa_audit_company_access on public.villa_audit_logs;
create policy villa_audit_company_access on public.villa_audit_logs for select to authenticated using (public.is_company_member(company_id));

create or replace function public.get_villa_erp_finance_summary(
  p_company_id uuid,
  p_start date default (date_trunc('month', current_date)::date),
  p_end date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sales numeric := 0;
  v_paid numeric := 0;
  v_balance numeric := 0;
  v_expense numeric := 0;
  v_cash_in numeric := 0;
  v_cash_out numeric := 0;
  v_open_cleaning integer := 0;
  v_open_maintenance integer := 0;
  v_pending_invoices integer := 0;
  v_reservations integer := 0;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Firma yetkisi bulunamadı'; end if;

  select coalesce(sum(grand_total),0), coalesce(sum(paid_total),0), coalesce(sum(balance),0), count(*)
    into v_sales, v_paid, v_balance, v_reservations
  from public.villa_reservations
  where company_id = p_company_id and status <> 'cancelled'
    and check_in >= p_start and check_in < (p_end + 1);

  select coalesce(sum(amount),0) into v_expense from public.villa_expenses
  where company_id = p_company_id and payment_status <> 'cancelled' and expense_date between p_start and p_end;

  select coalesce(sum(case when movement_type='in' then amount else 0 end),0),
         coalesce(sum(case when movement_type='out' then amount else 0 end),0)
    into v_cash_in, v_cash_out
  from public.villa_cash_movements
  where company_id = p_company_id and occurred_at::date between p_start and p_end;

  select count(*) into v_open_cleaning from public.villa_cleaning_tasks
  where company_id = p_company_id and status not in ('completed','inspected');

  select count(*) into v_open_maintenance from public.villa_maintenance_tasks
  where company_id = p_company_id and status not in ('completed','cancelled');

  select count(*) into v_pending_invoices from public.villa_invoices
  where company_id = p_company_id and invoice_status in ('pending','queued','failed');

  return jsonb_build_object(
    'sales', v_sales,
    'paid', v_paid,
    'balance', v_balance,
    'expenses', v_expense,
    'net', v_paid - v_expense,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'cash_net', v_cash_in - v_cash_out,
    'reservations', v_reservations,
    'open_cleaning', v_open_cleaning,
    'open_maintenance', v_open_maintenance,
    'pending_invoices', v_pending_invoices
  );
end;
$$;

grant execute on function public.get_villa_erp_finance_summary(uuid,date,date) to authenticated;

create or replace function public.record_villa_cash_movement(
  p_company_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_category text default 'other',
  p_account_id uuid default null,
  p_villa_id uuid default null,
  p_reservation_id uuid default null,
  p_reference text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Firma yetkisi bulunamadı'; end if;
  if p_movement_type not in ('in','out') then raise exception 'Geçersiz hareket tipi'; end if;
  if coalesce(p_amount,0) <= 0 then raise exception 'Tutar sıfırdan büyük olmalı'; end if;
  insert into public.villa_cash_movements(company_id,account_id,villa_id,reservation_id,movement_type,category,amount,reference,note)
  values(p_company_id,p_account_id,p_villa_id,p_reservation_id,p_movement_type,coalesce(nullif(trim(p_category),''),'other'),p_amount,nullif(trim(coalesce(p_reference,'')),''),nullif(trim(coalesce(p_note,'')),'')) returning id into v_id;
  insert into public.villa_audit_logs(company_id,villa_id,action,entity_type,entity_id,payload)
  values(p_company_id,p_villa_id,'create','cash_movement',v_id::text,jsonb_build_object('movement_type',p_movement_type,'amount',p_amount,'category',p_category));
  return v_id;
end;
$$;

grant execute on function public.record_villa_cash_movement(uuid,text,numeric,text,uuid,uuid,uuid,text,text) to authenticated;

commit;
