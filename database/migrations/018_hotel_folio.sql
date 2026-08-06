create table if not exists public.hotel_folios (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  reservation_id uuid not null
    references public.hotel_reservations(id)
    on delete cascade,

  folio_no text not null,

  status text not null default 'open'
    check (
      status in (
        'open',
        'closed',
        'void'
      )
    ),

  currency text not null default 'TRY',

  opening_balance numeric(14,2)
    not null default 0,

  charge_total numeric(14,2)
    not null default 0,

  payment_total numeric(14,2)
    not null default 0,

  refund_total numeric(14,2)
    not null default 0,

  balance numeric(14,2)
    not null default 0,

  notes text,

  closed_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique(company_id, reservation_id),
  unique(company_id, folio_no)
);


create table if not exists public.hotel_folio_charges (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  folio_id uuid not null
    references public.hotel_folios(id)
    on delete cascade,

  reservation_id uuid not null
    references public.hotel_reservations(id)
    on delete cascade,

  charge_date date not null
    default current_date,

  category text not null
    check (
      category in (
        'accommodation',
        'restaurant',
        'bar',
        'minibar',
        'spa',
        'transfer',
        'tour',
        'laundry',
        'room_service',
        'late_checkout',
        'early_checkin',
        'tax',
        'discount',
        'other'
      )
    ),

  description text not null,

  quantity numeric(12,3)
    not null default 1
    check (quantity > 0),

  unit_price numeric(14,2)
    not null default 0,

  tax_rate numeric(7,4)
    not null default 0
    check (tax_rate >= 0),

  discount_amount numeric(14,2)
    not null default 0
    check (discount_amount >= 0),

  net_amount numeric(14,2)
    not null default 0,

  tax_amount numeric(14,2)
    not null default 0,

  total_amount numeric(14,2)
    not null default 0,

  currency text not null default 'TRY',

  status text not null default 'posted'
    check (
      status in (
        'draft',
        'posted',
        'void'
      )
    ),

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create table if not exists public.hotel_folio_payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  folio_id uuid not null
    references public.hotel_folios(id)
    on delete cascade,

  reservation_id uuid not null
    references public.hotel_reservations(id)
    on delete cascade,

  payment_date timestamptz
    not null default now(),

  payment_type text not null
    check (
      payment_type in (
        'cash',
        'credit_card',
        'debit_card',
        'bank_transfer',
        'online',
        'agency',
        'voucher',
        'other'
      )
    ),

  transaction_type text not null
    default 'payment'
    check (
      transaction_type in (
        'payment',
        'refund'
      )
    ),

  amount numeric(14,2)
    not null
    check (amount > 0),

  currency text not null default 'TRY',

  exchange_rate numeric(14,6)
    not null default 1
    check (exchange_rate > 0),

  base_amount numeric(14,2)
    not null default 0,

  reference_no text,

  provider text,

  installment_count integer
    not null default 1
    check (installment_count >= 1),

  status text not null default 'completed'
    check (
      status in (
        'pending',
        'completed',
        'cancelled'
      )
    ),

  notes text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create index if not exists
hotel_folios_reservation_idx
on public.hotel_folios (
  company_id,
  reservation_id
);

create index if not exists
hotel_folio_charges_folio_idx
on public.hotel_folio_charges (
  company_id,
  folio_id,
  charge_date
);

create index if not exists
hotel_folio_payments_folio_idx
on public.hotel_folio_payments (
  company_id,
  folio_id,
  payment_date
);


create or replace function
public.calculate_hotel_folio_charge()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.net_amount :=
    round(
      (
        new.quantity *
        new.unit_price
      ) -
      new.discount_amount,
      2
    );

  if new.net_amount < 0 then
    new.net_amount := 0;
  end if;

  new.tax_amount :=
    round(
      new.net_amount *
      (
        new.tax_rate / 100
      ),
      2
    );

  new.total_amount :=
    round(
      new.net_amount +
      new.tax_amount,
      2
    );

  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
calculate_hotel_folio_charge_trigger
on public.hotel_folio_charges;

create trigger
calculate_hotel_folio_charge_trigger
before insert or update
on public.hotel_folio_charges
for each row
execute function
public.calculate_hotel_folio_charge();


create or replace function
public.calculate_hotel_folio_payment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.base_amount :=
    round(
      new.amount *
      new.exchange_rate,
      2
    );

  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
calculate_hotel_folio_payment_trigger
on public.hotel_folio_payments;

create trigger
calculate_hotel_folio_payment_trigger
before insert or update
on public.hotel_folio_payments
for each row
execute function
public.calculate_hotel_folio_payment();


create or replace function
public.refresh_hotel_folio_totals(
  p_folio_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio public.hotel_folios;
  v_charge_total numeric(14,2);
  v_payment_total numeric(14,2);
  v_refund_total numeric(14,2);
  v_balance numeric(14,2);
begin
  select *
  into v_folio
  from public.hotel_folios
  where id = p_folio_id
  for update;

  if not found then
    return;
  end if;

  if not public.is_company_member(
    v_folio.company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select coalesce(
    sum(total_amount),
    0
  )
  into v_charge_total
  from public.hotel_folio_charges
  where folio_id = p_folio_id
    and status = 'posted';

  select coalesce(
    sum(base_amount),
    0
  )
  into v_payment_total
  from public.hotel_folio_payments
  where folio_id = p_folio_id
    and status = 'completed'
    and transaction_type = 'payment';

  select coalesce(
    sum(base_amount),
    0
  )
  into v_refund_total
  from public.hotel_folio_payments
  where folio_id = p_folio_id
    and status = 'completed'
    and transaction_type = 'refund';

  v_balance :=
    round(
      v_folio.opening_balance +
      v_charge_total -
      v_payment_total +
      v_refund_total,
      2
    );

  update public.hotel_folios
  set
    charge_total = v_charge_total,
    payment_total = v_payment_total,
    refund_total = v_refund_total,
    balance = v_balance,
    updated_at = now()
  where id = p_folio_id;

  update public.hotel_reservations
  set
    balance = greatest(
      v_balance,
      0
    ),
    updated_at = now()
  where id = v_folio.reservation_id
    and company_id =
      v_folio.company_id;
end;
$$;


create or replace function
public.hotel_folio_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_folio_id uuid;
begin
  v_folio_id :=
    coalesce(
      new.folio_id,
      old.folio_id
    );

  perform
    public.refresh_hotel_folio_totals(
      v_folio_id
    );

  return coalesce(new, old);
end;
$$;


drop trigger if exists
hotel_folio_charge_refresh_trigger
on public.hotel_folio_charges;

create trigger
hotel_folio_charge_refresh_trigger
after insert or update or delete
on public.hotel_folio_charges
for each row
execute function
public.hotel_folio_after_change();


drop trigger if exists
hotel_folio_payment_refresh_trigger
on public.hotel_folio_payments;

create trigger
hotel_folio_payment_refresh_trigger
after insert or update or delete
on public.hotel_folio_payments
for each row
execute function
public.hotel_folio_after_change();


create or replace function
public.get_or_create_hotel_folio(
  p_company_id uuid,
  p_reservation_id uuid
)
returns public.hotel_folios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation
    public.hotel_reservations;

  v_folio
    public.hotel_folios;

  v_folio_no text;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_folio
  from public.hotel_folios
  where company_id = p_company_id
    and reservation_id =
      p_reservation_id;

  if found then
    return v_folio;
  end if;

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id;

  if not found then
    raise exception
      'Rezervasyon bulunamadı.';
  end if;

  v_folio_no :=
    'FOL-' ||
    to_char(
      now(),
      'YYYYMMDD'
    ) ||
    '-' ||
    upper(
      substring(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        8
      )
    );

  insert into public.hotel_folios (
    company_id,
    hotel_id,
    reservation_id,
    folio_no,
    currency,
    opening_balance,
    balance,
    created_by
  )
  values (
    v_reservation.company_id,
    v_reservation.hotel_id,
    v_reservation.id,
    v_folio_no,
    v_reservation.currency,
    v_reservation.total_price,
    v_reservation.total_price,
    auth.uid()
  )
  returning *
  into v_folio;

  return v_folio;
end;
$$;


alter table public.hotel_folios
enable row level security;

alter table public.hotel_folio_charges
enable row level security;

alter table public.hotel_folio_payments
enable row level security;


grant select, insert, update, delete
on
  public.hotel_folios,
  public.hotel_folio_charges,
  public.hotel_folio_payments
to authenticated;


drop policy if exists
"Members manage hotel folios"
on public.hotel_folios;

create policy
"Members manage hotel folios"
on public.hotel_folios
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage hotel folio charges"
on public.hotel_folio_charges;

create policy
"Members manage hotel folio charges"
on public.hotel_folio_charges
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage hotel folio payments"
on public.hotel_folio_payments;

create policy
"Members manage hotel folio payments"
on public.hotel_folio_payments
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


grant execute
on function
public.get_or_create_hotel_folio(
  uuid,
  uuid
)
to authenticated;

grant execute
on function
public.refresh_hotel_folio_totals(
  uuid
)
to authenticated;
