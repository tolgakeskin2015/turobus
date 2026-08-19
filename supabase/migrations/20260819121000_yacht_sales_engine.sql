
-- ============================================================
-- TUROBUS YACHT SALES ENGINE
-- Quote + profitability + public approval + conversion
-- ============================================================

create table if not exists public.yacht_os_quotes (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete restrict,

  supplier_id uuid
    references public.yacht_os_suppliers(id)
    on delete set null,

  quote_code text not null,

  customer_name text not null,
  customer_phone text,
  customer_email text,

  start_date date not null,
  end_date date not null,

  guest_count integer not null default 2
    check (guest_count > 0),

  currency text not null default 'TRY',

  supplier_cost numeric(14,2) not null default 0,
  extra_cost numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,

  yacht_sale_price numeric(14,2) not null default 0,
  extras_sale_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,

  commission_amount numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  margin_percent numeric(8,2) not null default 0,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'sent',
        'viewed',
        'accepted',
        'rejected',
        'expired',
        'converted',
        'cancelled'
      )
    ),

  public_token uuid not null default gen_random_uuid(),

  valid_until timestamptz,
  option_expires_at timestamptz,

  customer_note text,
  internal_note text,

  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,

  converted_booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint yacht_os_quote_dates
    check (end_date >= start_date),

  constraint yacht_os_quote_code_company_unique
    unique (company_id, quote_code),

  constraint yacht_os_quote_public_token_unique
    unique (public_token)
);


create index if not exists
  yacht_os_quotes_company_status_idx
on public.yacht_os_quotes (
  company_id,
  status,
  created_at desc
);


create index if not exists
  yacht_os_quotes_customer_idx
on public.yacht_os_quotes (
  company_id,
  customer_name
);


create table if not exists public.yacht_os_quote_items (
  id uuid primary key default gen_random_uuid(),

  quote_id uuid not null
    references public.yacht_os_quotes(id)
    on delete cascade,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  item_type text not null
    check (
      item_type in (
        'yacht',
        'transfer',
        'catering',
        'crew',
        'activity',
        'decoration',
        'photography',
        'other'
      )
    ),

  title text not null,
  description text,

  quantity numeric(10,2) not null default 1
    check (quantity > 0),

  unit_cost numeric(14,2) not null default 0,
  unit_sale numeric(14,2) not null default 0,

  total_cost numeric(14,2) not null default 0,
  total_sale numeric(14,2) not null default 0,

  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);


create index if not exists
  yacht_os_quote_items_quote_idx
on public.yacht_os_quote_items (
  quote_id,
  sort_order
);


drop trigger if exists
  yacht_os_quotes_updated_at
on public.yacht_os_quotes;

create trigger
  yacht_os_quotes_updated_at
before update
on public.yacht_os_quotes
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_quotes
enable row level security;

alter table public.yacht_os_quote_items
enable row level security;


create policy yacht_os_quotes_company_access
on public.yacht_os_quotes
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


create policy yacht_os_quote_items_company_access
on public.yacht_os_quote_items
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


grant select, insert, update, delete
on
  public.yacht_os_quotes,
  public.yacht_os_quote_items
to authenticated;


-- ============================================================
-- PUBLIC QUOTE VIEW
-- Customer never receives cost fields
-- ============================================================

create or replace function
public.get_public_yacht_quote(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_row public.yacht_os_quotes%rowtype;
  result jsonb;
begin

  select *
  into quote_row
  from public.yacht_os_quotes
  where public_token = p_token
    and status not in (
      'cancelled'
    )
  limit 1;

  if quote_row.id is null then
    return null;
  end if;

  if
    quote_row.valid_until is not null
    and quote_row.valid_until < now()
    and quote_row.status in (
      'draft',
      'sent',
      'viewed'
    )
  then
    update public.yacht_os_quotes
    set status = 'expired'
    where id = quote_row.id;

    quote_row.status := 'expired';
  end if;

  if quote_row.status = 'sent' then
    update public.yacht_os_quotes
    set
      status = 'viewed',
      viewed_at = coalesce(
        viewed_at,
        now()
      )
    where id = quote_row.id;

    quote_row.status := 'viewed';
  end if;

  select jsonb_build_object(

    'quote_code',
    quote_row.quote_code,

    'customer_name',
    quote_row.customer_name,

    'start_date',
    quote_row.start_date,

    'end_date',
    quote_row.end_date,

    'guest_count',
    quote_row.guest_count,

    'currency',
    quote_row.currency,

    'sale_price',
    quote_row.sale_price,

    'status',
    quote_row.status,

    'valid_until',
    quote_row.valid_until,

    'option_expires_at',
    quote_row.option_expires_at,

    'customer_note',
    quote_row.customer_note,

    'yacht',
    (
      select jsonb_build_object(
        'id', y.id,
        'name', y.name,
        'type', y.yacht_type,
        'city', y.city,
        'marina', y.marina,
        'departure_point', y.departure_point,
        'max_guests', y.max_guests,
        'cabins', y.cabins,
        'bathrooms', y.bathrooms,
        'captain_name', y.captain_name,
        'captain_included', y.captain_included,
        'fuel_included', y.fuel_included,
        'meals_included', y.meals_included,
        'cover_url', y.cover_url
      )
      from public.yacht_os_yachts y
      where y.id = quote_row.yacht_id
    ),

    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', i.id,
            'item_type', i.item_type,
            'title', i.title,
            'description', i.description,
            'quantity', i.quantity,
            'unit_sale', i.unit_sale,
            'total_sale', i.total_sale
          )
          order by i.sort_order, i.created_at
        )
        from public.yacht_os_quote_items i
        where i.quote_id = quote_row.id
      ),
      '[]'::jsonb
    )

  )
  into result;

  return result;
end;
$$;


-- ============================================================
-- CUSTOMER ACCEPT / REJECT
-- ============================================================

create or replace function
public.respond_public_yacht_quote(
  p_token uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_row public.yacht_os_quotes%rowtype;
begin

  if p_decision not in (
    'accepted',
    'rejected'
  ) then
    raise exception 'Invalid decision';
  end if;

  select *
  into quote_row
  from public.yacht_os_quotes
  where public_token = p_token
  limit 1;

  if quote_row.id is null then
    raise exception 'Quote not found';
  end if;

  if quote_row.status not in (
    'sent',
    'viewed'
  ) then
    raise exception 'Quote cannot be answered';
  end if;

  if
    quote_row.valid_until is not null
    and quote_row.valid_until < now()
  then
    update public.yacht_os_quotes
    set status = 'expired'
    where id = quote_row.id;

    raise exception 'Quote expired';
  end if;

  update public.yacht_os_quotes
  set
    status = p_decision,

    accepted_at =
      case
        when p_decision = 'accepted'
        then now()
        else accepted_at
      end,

    rejected_at =
      case
        when p_decision = 'rejected'
        then now()
        else rejected_at
      end

  where id = quote_row.id;

  return jsonb_build_object(
    'ok', true,
    'status', p_decision
  );
end;
$$;


grant execute
on function public.get_public_yacht_quote(uuid)
to anon, authenticated;

grant execute
on function public.respond_public_yacht_quote(uuid, text)
to anon, authenticated;


-- ============================================================
-- MARK SENT
-- ============================================================

create or replace function
public.mark_yacht_quote_sent(
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quote_row public.yacht_os_quotes%rowtype;
begin

  select *
  into quote_row
  from public.yacht_os_quotes
  where id = p_quote_id
  limit 1;

  if quote_row.id is null then
    raise exception 'Quote not found';
  end if;

  if not public.is_active_company_member(
    quote_row.company_id
  ) then
    raise exception 'Access denied';
  end if;

  if quote_row.status = 'draft' then
    update public.yacht_os_quotes
    set
      status = 'sent',
      sent_at = now()
    where id = quote_row.id;
  end if;

  return jsonb_build_object(
    'ok', true
  );
end;
$$;


grant execute
on function public.mark_yacht_quote_sent(uuid)
to authenticated;


-- ============================================================
-- CONVERT ACCEPTED QUOTE TO BOOKING
-- Atomic conversion
-- ============================================================

create or replace function
public.convert_yacht_quote_to_booking(
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.yacht_os_quotes%rowtype;
  booking_id uuid;
  booking_code text;
  current_day date;
begin

  select *
  into q
  from public.yacht_os_quotes
  where id = p_quote_id
  for update;

  if q.id is null then
    raise exception 'Quote not found';
  end if;

  if not public.is_active_company_member(
    q.company_id
  ) then
    raise exception 'Access denied';
  end if;

  if q.status <> 'accepted' then
    raise exception 'Only accepted quote can be converted';
  end if;

  if q.converted_booking_id is not null then
    return jsonb_build_object(
      'ok', true,
      'booking_id', q.converted_booking_id,
      'already_converted', true
    );
  end if;

  if exists (
    select 1
    from public.yacht_os_bookings b
    where b.yacht_id = q.yacht_id
      and b.status in (
        'pending',
        'confirmed'
      )
      and daterange(
        b.start_date,
        b.end_date,
        '[]'
      ) &&
      daterange(
        q.start_date,
        q.end_date,
        '[]'
      )
  ) then
    raise exception 'Yacht already booked for selected date range';
  end if;

  booking_code :=
    'YAT-' ||
    to_char(
      now(),
      'YYMMDDHH24MISS'
    );

  insert into public.yacht_os_bookings (
    company_id,
    yacht_id,
    booking_code,

    guest_name,
    guest_phone,
    guest_count,

    start_date,
    end_date,

    source,

    total_amount,
    paid_amount,

    commission_amount,
    supplier_cost,

    currency,

    status,
    payment_status,
    operation_status,

    notes,
    created_by
  )
  values (
    q.company_id,
    q.yacht_id,
    booking_code,

    q.customer_name,
    q.customer_phone,
    q.guest_count,

    q.start_date,
    q.end_date,

    'yacht_quote',

    q.sale_price,
    0,

    q.commission_amount,
    q.supplier_cost + q.extra_cost,

    q.currency,

    'pending',
    'pending',
    'preparing',

    'Tekliften dönüştürüldü: ' || q.quote_code,
    auth.uid()
  )
  returning id
  into booking_id;

  current_day :=
    q.start_date;

  while current_day <= q.end_date loop

    insert into public.yacht_os_availability (
      company_id,
      yacht_id,
      day,
      status,
      booking_id
    )
    values (
      q.company_id,
      q.yacht_id,
      current_day,
      'booked',
      booking_id
    )
    on conflict (
      yacht_id,
      day
    )
    do update set
      status = 'booked',
      booking_id = excluded.booking_id,
      updated_at = now();

    current_day :=
      current_day +
      1;

  end loop;

  update public.yacht_os_quotes
  set
    status = 'converted',
    converted_booking_id = booking_id
  where id = q.id;

  return jsonb_build_object(
    'ok', true,
    'booking_id', booking_id,
    'booking_code', booking_code
  );
end;
$$;


grant execute
on function public.convert_yacht_quote_to_booking(uuid)
to authenticated;
