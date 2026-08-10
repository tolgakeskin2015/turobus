-- ============================================================
-- TUROBUS HOTEL PMS
-- 045 - CASHIER & SHIFT ENGINE
-- ============================================================

create table if not exists public.hotel_cashier_shifts (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  shift_no text not null,

  business_date date not null
    default current_date,

  status text not null default 'open'
    check (status in ('open', 'closed')),

  currency text not null default 'TRY',

  opening_cash numeric(14,2)
    not null default 0,

  expected_cash numeric(14,2)
    not null default 0,

  counted_cash numeric(14,2),

  cash_difference numeric(14,2),

  opened_by uuid
    references auth.users(id)
    on delete set null,

  opened_at timestamptz
    not null default now(),

  closed_by uuid
    references auth.users(id)
    on delete set null,

  closed_at timestamptz,

  notes text,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique(company_id, hotel_id, shift_no)
);


create table if not exists public.hotel_cashier_movements (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  shift_id uuid not null
    references public.hotel_cashier_shifts(id)
    on delete cascade,

  movement_type text not null
    check (
      movement_type in (
        'cash_in',
        'cash_out',
        'payment',
        'refund',
        'adjustment'
      )
    ),

  amount numeric(14,2)
    not null
    check (amount > 0),

  currency text not null default 'TRY',

  description text,

  reference_type text,

  reference_id uuid,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now()
);


create index if not exists
  idx_cashier_shifts_company_hotel
on public.hotel_cashier_shifts(
  company_id,
  hotel_id,
  business_date
);


create index if not exists
  idx_cashier_shifts_status
on public.hotel_cashier_shifts(
  company_id,
  hotel_id,
  status
);


create index if not exists
  idx_cashier_movements_shift
on public.hotel_cashier_movements(
  shift_id,
  created_at
);


-- Aynı otelde aynı anda bir kullanıcı için değil,
-- operasyonel olarak tek açık ana kasa vardiyası.
create unique index if not exists
  idx_cashier_single_open_shift
on public.hotel_cashier_shifts(
  company_id,
  hotel_id
)
where status = 'open';


-- ============================================================
-- SHIFT NUMBER
-- ============================================================

create or replace function public.generate_hotel_cashier_shift_no(
  p_company_id uuid,
  p_hotel_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) + 1
  into v_count
  from public.hotel_cashier_shifts
  where company_id = p_company_id
    and hotel_id = p_hotel_id
    and business_date = current_date;

  return
    'CS-' ||
    to_char(current_date, 'YYYYMMDD') ||
    '-' ||
    lpad(v_count::text, 3, '0');
end;
$$;


-- ============================================================
-- OPEN SHIFT
-- ============================================================

create or replace function public.open_hotel_cashier_shift(
  p_company_id uuid,
  p_hotel_id uuid,
  p_opening_cash numeric default 0,
  p_currency text default 'TRY',
  p_notes text default null
)
returns public.hotel_cashier_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.hotel_cashier_shifts;
  v_shift_no text;
begin

  if exists (
    select 1
    from public.hotel_cashier_shifts
    where company_id = p_company_id
      and hotel_id = p_hotel_id
      and status = 'open'
  ) then
    raise exception
      'Bu otelde zaten açık bir kasa vardiyası var.';
  end if;

  v_shift_no :=
    public.generate_hotel_cashier_shift_no(
      p_company_id,
      p_hotel_id
    );

  insert into public.hotel_cashier_shifts (
    company_id,
    hotel_id,
    shift_no,
    business_date,
    status,
    currency,
    opening_cash,
    expected_cash,
    opened_by,
    notes
  )
  values (
    p_company_id,
    p_hotel_id,
    v_shift_no,
    current_date,
    'open',
    upper(p_currency),
    p_opening_cash,
    p_opening_cash,
    auth.uid(),
    p_notes
  )
  returning *
  into v_shift;

  return v_shift;
end;
$$;


-- ============================================================
-- ADD CASH MOVEMENT
-- ============================================================

create or replace function public.add_hotel_cashier_movement(
  p_shift_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_description text default null,
  p_reference_type text default null,
  p_reference_id uuid default null
)
returns public.hotel_cashier_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.hotel_cashier_shifts;
  v_movement public.hotel_cashier_movements;
  v_delta numeric(14,2);
begin

  select *
  into v_shift
  from public.hotel_cashier_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Kasa vardiyası bulunamadı.';
  end if;

  if v_shift.status <> 'open' then
    raise exception
      'Kapalı kasa vardiyasına hareket eklenemez.';
  end if;

  if p_amount <= 0 then
    raise exception
      'Tutar sıfırdan büyük olmalıdır.';
  end if;

  if p_movement_type not in (
    'cash_in',
    'cash_out',
    'payment',
    'refund',
    'adjustment'
  ) then
    raise exception
      'Geçersiz kasa hareket tipi.';
  end if;

  v_delta :=
    case
      when p_movement_type in (
        'cash_in',
        'payment'
      )
        then p_amount

      when p_movement_type in (
        'cash_out',
        'refund'
      )
        then -p_amount

      else 0
    end;

  insert into public.hotel_cashier_movements (
    company_id,
    hotel_id,
    shift_id,
    movement_type,
    amount,
    currency,
    description,
    reference_type,
    reference_id,
    created_by
  )
  values (
    v_shift.company_id,
    v_shift.hotel_id,
    v_shift.id,
    p_movement_type,
    p_amount,
    v_shift.currency,
    p_description,
    p_reference_type,
    p_reference_id,
    auth.uid()
  )
  returning *
  into v_movement;

  update public.hotel_cashier_shifts
  set
    expected_cash =
      expected_cash + v_delta,
    updated_at = now()
  where id = v_shift.id;

  return v_movement;
end;
$$;


-- ============================================================
-- CLOSE SHIFT
-- ============================================================

create or replace function public.close_hotel_cashier_shift(
  p_shift_id uuid,
  p_counted_cash numeric,
  p_notes text default null
)
returns public.hotel_cashier_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.hotel_cashier_shifts;
begin

  select *
  into v_shift
  from public.hotel_cashier_shifts
  where id = p_shift_id
  for update;

  if not found then
    raise exception 'Kasa vardiyası bulunamadı.';
  end if;

  if v_shift.status <> 'open' then
    raise exception
      'Kasa vardiyası zaten kapalı.';
  end if;

  update public.hotel_cashier_shifts
  set
    status = 'closed',
    counted_cash = p_counted_cash,
    cash_difference =
      p_counted_cash - expected_cash,
    closed_by = auth.uid(),
    closed_at = now(),
    notes =
      coalesce(p_notes, notes),
    updated_at = now()
  where id = p_shift_id
  returning *
  into v_shift;

  return v_shift;
end;
$$;


-- ============================================================
-- RLS
-- ============================================================

alter table public.hotel_cashier_shifts
enable row level security;

alter table public.hotel_cashier_movements
enable row level security;


drop policy if exists
  "hotel_cashier_shifts_company_access"
on public.hotel_cashier_shifts;

create policy
  "hotel_cashier_shifts_company_access"
on public.hotel_cashier_shifts
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
  "hotel_cashier_movements_company_access"
on public.hotel_cashier_movements;

create policy
  "hotel_cashier_movements_company_access"
on public.hotel_cashier_movements
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- ============================================================
-- PERMISSIONS
-- ============================================================

grant select, insert, update
on public.hotel_cashier_shifts
to authenticated;

grant select, insert
on public.hotel_cashier_movements
to authenticated;

grant execute
on function public.generate_hotel_cashier_shift_no(uuid, uuid)
to authenticated;

grant execute
on function public.open_hotel_cashier_shift(
  uuid,
  uuid,
  numeric,
  text,
  text
)
to authenticated;

grant execute
on function public.add_hotel_cashier_movement(
  uuid,
  text,
  numeric,
  text,
  text,
  uuid
)
to authenticated;

grant execute
on function public.close_hotel_cashier_shift(
  uuid,
  numeric,
  text
)
to authenticated;

-- ============================================================
-- END
-- ============================================================
