begin;

alter table public.activity_os_payments
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_reference text,
  add column if not exists checkout_token text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists status text not null default 'paid',
  add column if not exists paid_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_activity_os_payment_checkout_token
on public.activity_os_payments(checkout_token)
where checkout_token is not null;

create index if not exists idx_activity_os_payments_booking_provider
on public.activity_os_payments(
  booking_id,
  provider,
  created_at desc
);

create index if not exists idx_activity_os_payments_company_status
on public.activity_os_payments(
  company_id,
  status,
  created_at desc
);

update public.activity_os_payments
set
  provider = coalesce(provider,'manual'),
  status = case
    when payment_type = 'refund' then 'refunded'
    else 'paid'
  end,
  paid_at = coalesce(paid_at,payment_date,created_at),
  updated_at = now()
where provider is null
   or status is null;


create table if not exists public.activity_os_refunds (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.activity_os_bookings(id)
    on delete cascade,

  payment_id uuid not null
    references public.activity_os_payments(id)
    on delete restrict,

  amount numeric(14,2) not null
    check(amount > 0),

  currency text not null default 'TRY',

  provider text not null default 'iyzico',

  provider_reference text,

  status text not null default 'pending'
    check(
      status in (
        'pending',
        'processing',
        'paid',
        'failed',
        'cancelled'
      )
    ),

  reason text,

  metadata jsonb not null default '{}'::jsonb,

  requested_by uuid,

  processed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists idx_activity_os_refunds_company
on public.activity_os_refunds(
  company_id,
  created_at desc
);


alter table public.activity_os_refunds
enable row level security;


drop policy if exists activity_os_refunds_finance
on public.activity_os_refunds;

create policy activity_os_refunds_finance
on public.activity_os_refunds
for select
to authenticated
using (
  public.activity_os_can_view_finance(company_id)
);


create or replace function public.get_public_activity_payment_context(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin

  select jsonb_build_object(
    'booking_code',
      b.booking_code,

    'customer_name',
      b.customer_name,

    'customer_email',
      b.customer_email,

    'customer_phone',
      b.customer_phone,

    'activity_name',
      a.name,

    'service_date',
      b.service_date,

    'start_time',
      b.start_time,

    'quantity',
      b.quantity,

    'status',
      b.status,

    'payment_status',
      b.payment_status,

    'sale_total',
      b.sale_total,

    'paid_total',
      b.paid_total,

    'remaining_total',
      greatest(
        b.sale_total -
        b.paid_total,
        0
      ),

    'currency',
      a.currency,

    'company_name',
      c.name,

    'company_logo_url',
      c.logo_url

  )
  into v_result

  from public.activity_os_bookings b

  join public.package_activities a
    on a.id = b.activity_id

  join public.companies c
    on c.id = b.company_id

  where b.guest_token = p_token
    and b.guest_portal_enabled = true;


  if v_result is null then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  return v_result;

end;
$$;


revoke all
on function public.get_public_activity_payment_context(uuid)
from public;

grant execute
on function public.get_public_activity_payment_context(uuid)
to anon, authenticated;


create or replace function public.activity_os_apply_provider_payment(
  p_payment_id uuid,
  p_provider_payment_id text,
  p_provider_transaction_id text,
  p_provider_reference text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_booking record;
  v_new_paid numeric(14,2);
  v_new_status text;
begin

  select *
  into v_payment
  from public.activity_os_payments
  where id = p_payment_id
  for update;


  if not found then
    raise exception
      'Ödeme kaydı bulunamadı';
  end if;


  if v_payment.status = 'paid' then

    select *
    into v_booking
    from public.activity_os_bookings
    where id = v_payment.booking_id;


    return jsonb_build_object(
      'ok',true,
      'idempotent',true,
      'booking_id',v_payment.booking_id,
      'paid_total',v_booking.paid_total,
      'payment_status',v_booking.payment_status
    );

  end if;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = v_payment.booking_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  if v_payment.amount >
     greatest(
       v_booking.sale_total -
       v_booking.paid_total,
       0
     )
     + 0.01
  then
    raise exception
      'Ödeme tutarı kalan bakiyeden fazla';
  end if;


  v_new_paid :=
    least(
      v_booking.sale_total,
      v_booking.paid_total +
      v_payment.amount
    );


  v_new_status :=
    case
      when v_new_paid <= 0
        then 'unpaid'

      when v_new_paid >=
           v_booking.sale_total
        then 'paid'

      else 'partial'
    end;


  update public.activity_os_payments
  set
    status = 'paid',

    provider_payment_id =
      p_provider_payment_id,

    provider_transaction_id =
      p_provider_transaction_id,

    provider_reference =
      p_provider_reference,

    paid_at = now(),

    payment_date = now(),

    metadata =
      coalesce(metadata,'{}'::jsonb)
      ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      ),

    updated_at = now()

  where id = p_payment_id;


  update public.activity_os_bookings
  set
    paid_total =
      v_new_paid,

    payment_status =
      v_new_status,

    status =
      case
        when status = 'pending'
          then 'confirmed'
        else status
      end,

    updated_at = now()

  where id = v_booking.id;


  insert into public.activity_os_booking_events(
    company_id,
    booking_id,
    event_type,
    old_status,
    new_status,
    old_quantity,
    new_quantity,
    old_slot_id,
    new_slot_id,
    user_id,
    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,
    'payment_paid',
    v_booking.status,
    case
      when v_booking.status = 'pending'
        then 'confirmed'
      else v_booking.status
    end,
    v_booking.quantity,
    v_booking.quantity,
    v_booking.slot_id,
    v_booking.slot_id,
    null,
    jsonb_build_object(
      'payment_id',
        p_payment_id,

      'amount',
        v_payment.amount,

      'provider',
        v_payment.provider,

      'provider_payment_id',
        p_provider_payment_id
    )
  );


  return jsonb_build_object(
    'ok',true,
    'booking_id',v_booking.id,
    'paid_total',v_new_paid,
    'payment_status',v_new_status
  );

end;
$$;


revoke all
on function public.activity_os_apply_provider_payment(
  uuid,
  text,
  text,
  text,
  jsonb
)
from public;

grant execute
on function public.activity_os_apply_provider_payment(
  uuid,
  text,
  text,
  text,
  jsonb
)
to service_role;


create or replace function public.activity_os_mark_provider_payment_failed(
  p_payment_id uuid,
  p_error_message text,
  p_metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

  update public.activity_os_payments
  set
    status = 'failed',

    metadata =
      coalesce(metadata,'{}'::jsonb)
      ||
      jsonb_build_object(
        'error_message',
        p_error_message
      )
      ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      ),

    updated_at = now()

  where id = p_payment_id
    and status <> 'paid';

end;
$$;


revoke all
on function public.activity_os_mark_provider_payment_failed(
  uuid,
  text,
  jsonb
)
from public;

grant execute
on function public.activity_os_mark_provider_payment_failed(
  uuid,
  text,
  jsonb
)
to service_role;


create or replace function public.activity_os_apply_provider_refund(
  p_refund_id uuid,
  p_provider_reference text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund record;
  v_booking record;
  v_payment record;
  v_new_paid numeric(14,2);
  v_status text;
begin

  select *
  into v_refund
  from public.activity_os_refunds
  where id = p_refund_id
  for update;


  if not found then
    raise exception
      'İade kaydı bulunamadı';
  end if;


  if v_refund.status = 'paid' then
    return jsonb_build_object(
      'ok',true,
      'idempotent',true
    );
  end if;


  select *
  into v_payment
  from public.activity_os_payments
  where id = v_refund.payment_id
  for update;


  select *
  into v_booking
  from public.activity_os_bookings
  where id = v_refund.booking_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;


  v_new_paid :=
    greatest(
      v_booking.paid_total -
      v_refund.amount,
      0
    );


  v_status :=
    case
      when v_new_paid <= 0
        and v_booking.sale_total > 0
        then 'refunded'

      when v_new_paid >=
           v_booking.sale_total
        then 'paid'

      else 'partial'
    end;


  update public.activity_os_refunds
  set
    status = 'paid',

    provider_reference =
      p_provider_reference,

    processed_at =
      now(),

    metadata =
      coalesce(metadata,'{}'::jsonb)
      ||
      coalesce(
        p_metadata,
        '{}'::jsonb
      ),

    updated_at = now()

  where id = p_refund_id;


  insert into public.activity_os_payments(
    company_id,
    booking_id,

    payment_type,
    payment_method,

    amount,
    currency,

    reference_no,

    payment_date,

    provider,
    provider_reference,
    provider_payment_id,
    provider_transaction_id,

    status,
    paid_at,

    metadata
  )
  values (
    v_refund.company_id,
    v_refund.booking_id,

    'refund',
    'online',

    v_refund.amount,
    v_refund.currency,

    p_provider_reference,

    now(),

    v_refund.provider,
    p_provider_reference,
    v_payment.provider_payment_id,
    v_payment.provider_transaction_id,

    'refunded',
    now(),

    coalesce(
      p_metadata,
      '{}'::jsonb
    )
  );


  update public.activity_os_bookings
  set
    paid_total =
      v_new_paid,

    payment_status =
      v_status,

    updated_at =
      now()

  where id = v_booking.id;


  insert into public.activity_os_booking_events(
    company_id,
    booking_id,
    event_type,
    old_status,
    new_status,
    old_quantity,
    new_quantity,
    old_slot_id,
    new_slot_id,
    user_id,
    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,
    'payment_refunded',
    v_booking.status,
    v_booking.status,
    v_booking.quantity,
    v_booking.quantity,
    v_booking.slot_id,
    v_booking.slot_id,
    null,
    jsonb_build_object(
      'refund_id',
        p_refund_id,

      'amount',
        v_refund.amount,

      'provider_reference',
        p_provider_reference
    )
  );


  return jsonb_build_object(
    'ok',true,
    'paid_total',v_new_paid,
    'payment_status',v_status
  );

end;
$$;


revoke all
on function public.activity_os_apply_provider_refund(
  uuid,
  text,
  jsonb
)
from public;

grant execute
on function public.activity_os_apply_provider_refund(
  uuid,
  text,
  jsonb
)
to service_role;


create or replace function public.get_activity_os_payment_dashboard(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.activity_os_can_view_finance(
    p_company_id
  ) then
    raise exception
      'Finans yetkisi gerekli';
  end if;


  return jsonb_build_object(

    'today_collected',
      coalesce(
        (
          select sum(p.amount)
          from public.activity_os_payments p
          where p.company_id = p_company_id
            and p.payment_type = 'collection'
            and p.status = 'paid'
            and p.payment_date::date = current_date
        ),
        0
      ),

    'today_refunded',
      coalesce(
        (
          select sum(p.amount)
          from public.activity_os_payments p
          where p.company_id = p_company_id
            and p.payment_type = 'refund'
            and p.status = 'refunded'
            and p.payment_date::date = current_date
        ),
        0
      ),

    'online_collected',
      coalesce(
        (
          select sum(p.amount)
          from public.activity_os_payments p
          where p.company_id = p_company_id
            and p.payment_type = 'collection'
            and p.status = 'paid'
            and p.provider = 'iyzico'
        ),
        0
      ),

    'outstanding',
      coalesce(
        (
          select sum(
            greatest(
              b.sale_total -
              b.paid_total,
              0
            )
          )
          from public.activity_os_bookings b
          where b.company_id = p_company_id
            and b.status not in (
              'cancelled',
              'no_show'
            )
        ),
        0
      ),

    'pending_payments',
      (
        select count(*)
        from public.activity_os_payments p
        where p.company_id = p_company_id
          and p.status in (
            'initiating',
            'pending'
          )
      ),

    'failed_payments',
      (
        select count(*)
        from public.activity_os_payments p
        where p.company_id = p_company_id
          and p.status = 'failed'
      )
  );

end;
$$;


grant execute
on function public.get_activity_os_payment_dashboard(uuid)
to authenticated;


do $$
begin

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_os_payments'
  ) then

    alter publication supabase_realtime
    add table public.activity_os_payments;

  end if;

end $$;

commit;
