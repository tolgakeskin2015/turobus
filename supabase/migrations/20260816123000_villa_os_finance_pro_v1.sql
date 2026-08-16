-- Villa OS Finance Pro V1
-- Advanced ledger, deposits, owner/partner settlements, day close and audit-ready finance core.

create table if not exists public.villa_finance_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  villa_id uuid null references public.villas(id) on delete set null,
  reservation_id uuid null references public.villa_reservations(id) on delete set null,
  owner_id uuid null references public.villa_owners(id) on delete set null,
  partner_company_id uuid null,
  entry_type text not null check (entry_type in ('sale','collection','expense','owner_payable','owner_payment','partner_payable','partner_payment','deposit_in','deposit_refund','commission','adjustment')),
  direction text not null check (direction in ('debit','credit')),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  status text not null default 'posted' check (status in ('draft','posted','void')),
  reference_type text null,
  reference_id uuid null,
  description text null,
  occurred_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_villa_finance_ledger_company_date on public.villa_finance_ledger(company_id, occurred_at desc);
create index if not exists idx_villa_finance_ledger_reservation on public.villa_finance_ledger(reservation_id);
create index if not exists idx_villa_finance_ledger_owner on public.villa_finance_ledger(owner_id);

create table if not exists public.villa_security_deposits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  villa_id uuid not null references public.villas(id) on delete cascade,
  reservation_id uuid not null references public.villa_reservations(id) on delete cascade,
  guest_name text null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'TRY',
  status text not null default 'expected' check (status in ('expected','received','partially_refunded','refunded','withheld','cancelled')),
  received_at timestamptz null,
  refunded_amount numeric(14,2) not null default 0 check (refunded_amount >= 0),
  refund_at timestamptz null,
  withheld_amount numeric(14,2) not null default 0 check (withheld_amount >= 0),
  withholding_reason text null,
  note text null,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reservation_id)
);

create table if not exists public.villa_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  settlement_type text not null check (settlement_type in ('owner','partner')),
  owner_id uuid null references public.villa_owners(id) on delete set null,
  partner_company_id uuid null,
  period_start date not null,
  period_end date not null,
  currency text not null default 'TRY',
  gross_amount numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  payable_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','approved','partially_paid','paid','cancelled')),
  due_date date null,
  approved_at timestamptz null,
  paid_at timestamptz null,
  note text null,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  check ((settlement_type='owner' and owner_id is not null) or (settlement_type='partner' and partner_company_id is not null))
);

create table if not exists public.villa_settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.villa_settlements(id) on delete cascade,
  reservation_id uuid null references public.villa_reservations(id) on delete set null,
  villa_id uuid null references public.villas(id) on delete set null,
  item_type text not null default 'reservation' check (item_type in ('reservation','expense','commission','adjustment')),
  description text null,
  gross_amount numeric(14,2) not null default 0,
  deduction_amount numeric(14,2) not null default 0,
  net_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.villa_day_closes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  close_date date not null,
  currency text not null default 'TRY',
  opening_balance numeric(14,2) not null default 0,
  cash_in numeric(14,2) not null default 0,
  cash_out numeric(14,2) not null default 0,
  expected_closing numeric(14,2) not null default 0,
  actual_closing numeric(14,2) not null default 0,
  difference numeric(14,2) not null default 0,
  status text not null default 'closed' check (status in ('closed','reopened')),
  note text null,
  closed_by uuid null default auth.uid(),
  closed_at timestamptz not null default now(),
  unique(company_id, close_date, currency)
);

alter table public.villa_finance_ledger enable row level security;
alter table public.villa_security_deposits enable row level security;
alter table public.villa_settlements enable row level security;
alter table public.villa_settlement_items enable row level security;
alter table public.villa_day_closes enable row level security;

-- Company members may read/write their own operational finance rows. More granular role hardening can be layered later.
do $$ begin
  create policy villa_finance_ledger_company on public.villa_finance_ledger for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy villa_security_deposits_company on public.villa_security_deposits for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy villa_settlements_company on public.villa_settlements for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy villa_settlement_items_company on public.villa_settlement_items for all using (exists(select 1 from public.villa_settlements s where s.id=settlement_id and public.is_company_member(s.company_id))) with check (exists(select 1 from public.villa_settlements s where s.id=settlement_id and public.is_company_member(s.company_id)));
exception when duplicate_object then null; end $$;
do $$ begin
  create policy villa_day_closes_company on public.villa_day_closes for all using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
exception when duplicate_object then null; end $$;

create or replace function public.record_villa_finance_entry(
  p_company_id uuid,
  p_entry_type text,
  p_direction text,
  p_amount numeric,
  p_currency text default 'TRY',
  p_villa_id uuid default null,
  p_reservation_id uuid default null,
  p_owner_id uuid default null,
  p_partner_company_id uuid default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_description text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Yetkisiz firma erişimi'; end if;
  if p_amount < 0 then raise exception 'Tutar negatif olamaz'; end if;
  insert into public.villa_finance_ledger(company_id,villa_id,reservation_id,owner_id,partner_company_id,entry_type,direction,amount,currency,reference_type,reference_id,description)
  values(p_company_id,p_villa_id,p_reservation_id,p_owner_id,p_partner_company_id,p_entry_type,p_direction,p_amount,coalesce(p_currency,'TRY'),p_reference_type,p_reference_id,p_description)
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.record_villa_finance_entry(uuid,text,text,numeric,text,uuid,uuid,uuid,uuid,text,uuid,text) to authenticated;

create or replace function public.close_villa_finance_day(
  p_company_id uuid,
  p_close_date date,
  p_actual_closing numeric,
  p_currency text default 'TRY',
  p_note text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_opening numeric:=0; v_in numeric:=0; v_out numeric:=0; v_expected numeric:=0; v_id uuid;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Yetkisiz firma erişimi'; end if;

  select coalesce(actual_closing,0) into v_opening
  from public.villa_day_closes
  where company_id=p_company_id and currency=p_currency and close_date<p_close_date and status='closed'
  order by close_date desc limit 1;

  select coalesce(sum(case when movement_type='in' then amount else 0 end),0),
         coalesce(sum(case when movement_type='out' then amount else 0 end),0)
  into v_in,v_out
  from public.villa_cash_movements
  where company_id=p_company_id and currency=p_currency and occurred_at::date=p_close_date;

  v_expected:=coalesce(v_opening,0)+v_in-v_out;

  insert into public.villa_day_closes(company_id,close_date,currency,opening_balance,cash_in,cash_out,expected_closing,actual_closing,difference,note)
  values(p_company_id,p_close_date,p_currency,coalesce(v_opening,0),v_in,v_out,v_expected,p_actual_closing,p_actual_closing-v_expected,p_note)
  on conflict(company_id,close_date,currency) do update set
    opening_balance=excluded.opening_balance,cash_in=excluded.cash_in,cash_out=excluded.cash_out,
    expected_closing=excluded.expected_closing,actual_closing=excluded.actual_closing,difference=excluded.difference,
    note=excluded.note,status='closed',closed_by=auth.uid(),closed_at=now()
  returning id into v_id;
  return v_id;
end $$;

grant execute on function public.close_villa_finance_day(uuid,date,numeric,text,text) to authenticated;

create or replace function public.get_villa_finance_pro_summary(p_company_id uuid, p_start date, p_end date)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.is_company_member(p_company_id) then raise exception 'Yetkisiz firma erişimi'; end if;
  select jsonb_build_object(
    'sales',coalesce((select sum(grand_total) from public.villa_reservations where company_id=p_company_id and check_in between p_start and p_end and status not in ('cancelled','canceled')),0),
    'collected',coalesce((select sum(paid_total) from public.villa_reservations where company_id=p_company_id and check_in between p_start and p_end and status not in ('cancelled','canceled')),0),
    'receivable',coalesce((select sum(balance) from public.villa_reservations where company_id=p_company_id and check_in between p_start and p_end and status not in ('cancelled','canceled')),0),
    'expenses',coalesce((select sum(amount) from public.villa_expenses where company_id=p_company_id and expense_date between p_start and p_end),0),
    'deposits_held',coalesce((select sum(amount-refunded_amount) from public.villa_security_deposits where company_id=p_company_id and status in ('received','partially_refunded','withheld')),0),
    'owner_payables',coalesce((select sum(payable_amount-paid_amount) from public.villa_settlements where company_id=p_company_id and settlement_type='owner' and status not in ('paid','cancelled')),0),
    'partner_payables',coalesce((select sum(payable_amount-paid_amount) from public.villa_settlements where company_id=p_company_id and settlement_type='partner' and status not in ('paid','cancelled')),0),
    'open_settlements',coalesce((select count(*) from public.villa_settlements where company_id=p_company_id and status not in ('paid','cancelled')),0),
    'unclosed_days',greatest(0,(p_end-p_start+1)-coalesce((select count(*) from public.villa_day_closes where company_id=p_company_id and close_date between p_start and p_end and status='closed'),0)),
    'ledger_count',coalesce((select count(*) from public.villa_finance_ledger where company_id=p_company_id and occurred_at::date between p_start and p_end and status='posted'),0)
  ) into v_result;
  return v_result;
end $$;

grant execute on function public.get_villa_finance_pro_summary(uuid,date,date) to authenticated;
