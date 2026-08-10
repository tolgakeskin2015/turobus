create table if not exists public.hotel_invoices (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,
  hotel_id uuid not null,

  reservation_id uuid null,
  folio_id uuid null,

  invoice_no text not null,

  invoice_type text not null default 'sale'
    check (
      invoice_type in (
        'sale',
        'refund',
        'credit_note'
      )
    ),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'issued',
        'cancelled'
      )
    ),

  customer_type text not null default 'individual'
    check (
      customer_type in (
        'individual',
        'company'
      )
    ),

  customer_name text not null,
  tax_office text null,
  tax_number text null,
  identity_number text null,
  email text null,
  phone text null,
  address text null,

  currency text not null default 'TRY',

  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  grand_total numeric(14,2) not null default 0,

  notes text null,

  issued_at timestamptz null,
  cancelled_at timestamptz null,

  created_by uuid null,
  updated_by uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, hotel_id, invoice_no)
);

create table if not exists public.hotel_invoice_items (
  id uuid primary key default gen_random_uuid(),

  invoice_id uuid not null
    references public.hotel_invoices(id)
    on delete cascade,

  company_id uuid not null,
  hotel_id uuid not null,

  description text not null,

  quantity numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,

  tax_rate numeric(6,2) not null default 20,

  line_subtotal numeric(14,2) not null default 0,
  line_tax numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,

  created_at timestamptz not null default now()
);

create index if not exists
hotel_invoices_company_hotel_idx
on public.hotel_invoices(company_id, hotel_id);

create index if not exists
hotel_invoices_status_idx
on public.hotel_invoices(hotel_id, status);

create index if not exists
hotel_invoice_items_invoice_idx
on public.hotel_invoice_items(invoice_id);

create or replace function public.generate_hotel_invoice_no(
  p_company_id uuid,
  p_hotel_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text;
  v_sequence integer;
begin
  v_year := to_char(current_date, 'YYYY');

  select count(*) + 1
  into v_sequence
  from public.hotel_invoices
  where company_id = p_company_id
    and hotel_id = p_hotel_id
    and extract(year from created_at) =
        extract(year from current_date);

  return
    'INV-' ||
    v_year ||
    '-' ||
    lpad(v_sequence::text, 6, '0');
end;
$$;

create or replace function public.recalculate_hotel_invoice(
  p_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id
  into v_company_id
  from public.hotel_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fatura bulunamadı.';
  end if;

  if not public.is_company_member(v_company_id) then
    raise exception 'Yetkiniz yok.';
  end if;

  update public.hotel_invoices
  set
    subtotal = coalesce((
      select sum(line_subtotal)
      from public.hotel_invoice_items
      where invoice_id = p_invoice_id
    ), 0),

    tax_total = coalesce((
      select sum(line_tax)
      from public.hotel_invoice_items
      where invoice_id = p_invoice_id
    ), 0),

    grand_total = coalesce((
      select sum(line_total)
      from public.hotel_invoice_items
      where invoice_id = p_invoice_id
    ), 0),

    updated_at = now(),
    updated_by = auth.uid()

  where id = p_invoice_id;
end;
$$;

create or replace function public.create_hotel_invoice(
  p_company_id uuid,
  p_hotel_id uuid,
  p_customer_name text,
  p_customer_type text default 'individual',
  p_tax_office text default null,
  p_tax_number text default null,
  p_identity_number text default null,
  p_email text default null,
  p_phone text default null,
  p_address text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_invoice_no text;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Yetkiniz yok.';
  end if;

  v_invoice_no :=
    public.generate_hotel_invoice_no(
      p_company_id,
      p_hotel_id
    );

  insert into public.hotel_invoices (
    company_id,
    hotel_id,
    invoice_no,
    customer_name,
    customer_type,
    tax_office,
    tax_number,
    identity_number,
    email,
    phone,
    address,
    notes,
    created_by
  )
  values (
    p_company_id,
    p_hotel_id,
    v_invoice_no,
    p_customer_name,
    coalesce(p_customer_type, 'individual'),
    p_tax_office,
    p_tax_number,
    p_identity_number,
    p_email,
    p_phone,
    p_address,
    p_notes,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.add_hotel_invoice_item(
  p_invoice_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_tax_rate numeric default 20
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.hotel_invoices%rowtype;
  v_id uuid;
  v_subtotal numeric;
  v_tax numeric;
  v_total numeric;
begin
  select *
  into v_invoice
  from public.hotel_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fatura bulunamadı.';
  end if;

  if not public.is_company_member(v_invoice.company_id) then
    raise exception 'Yetkiniz yok.';
  end if;

  if v_invoice.status <> 'draft' then
    raise exception 'Sadece taslak faturaya kalem eklenebilir.';
  end if;

  v_subtotal :=
    coalesce(p_quantity, 1) *
    coalesce(p_unit_price, 0);

  v_tax :=
    v_subtotal *
    coalesce(p_tax_rate, 0) / 100;

  v_total := v_subtotal + v_tax;

  insert into public.hotel_invoice_items (
    invoice_id,
    company_id,
    hotel_id,
    description,
    quantity,
    unit_price,
    tax_rate,
    line_subtotal,
    line_tax,
    line_total
  )
  values (
    p_invoice_id,
    v_invoice.company_id,
    v_invoice.hotel_id,
    p_description,
    coalesce(p_quantity, 1),
    coalesce(p_unit_price, 0),
    coalesce(p_tax_rate, 0),
    v_subtotal,
    v_tax,
    v_total
  )
  returning id into v_id;

  perform public.recalculate_hotel_invoice(
    p_invoice_id
  );

  return v_id;
end;
$$;

create or replace function public.issue_hotel_invoice(
  p_invoice_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.hotel_invoices%rowtype;
begin
  select *
  into v_invoice
  from public.hotel_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Fatura bulunamadı.';
  end if;

  if not public.is_company_member(v_invoice.company_id) then
    raise exception 'Yetkiniz yok.';
  end if;

  if v_invoice.grand_total <= 0 then
    raise exception 'Fatura toplamı sıfır olamaz.';
  end if;

  update public.hotel_invoices
  set
    status = 'issued',
    issued_at = now(),
    updated_at = now(),
    updated_by = auth.uid()
  where id = p_invoice_id;
end;
$$;

alter table public.hotel_invoices
enable row level security;

alter table public.hotel_invoice_items
enable row level security;

drop policy if exists
"Members manage hotel invoices"
on public.hotel_invoices;

create policy
"Members manage hotel invoices"
on public.hotel_invoices
for all
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists
"Members manage hotel invoice items"
on public.hotel_invoice_items;

create policy
"Members manage hotel invoice items"
on public.hotel_invoice_items
for all
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

grant execute
on function public.generate_hotel_invoice_no(uuid, uuid)
to authenticated;

grant execute
on function public.recalculate_hotel_invoice(uuid)
to authenticated;

grant execute
on function public.create_hotel_invoice(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;

grant execute
on function public.add_hotel_invoice_item(
  uuid,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;

grant execute
on function public.issue_hotel_invoice(uuid)
to authenticated;
