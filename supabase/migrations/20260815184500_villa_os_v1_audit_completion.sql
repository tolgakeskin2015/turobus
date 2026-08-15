begin;

-- Villa OS V1 audit completion.
-- Keep the original V1 migration immutable now that it has been applied remotely.

-- ------------------------------------------------------------
-- PHOTO STORAGE
-- ------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'villa-media',
  'villa-media',
  true,
  15728640,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]::text[]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Bucket policies deliberately scope writes to authenticated users.
-- Villa ownership/company authorization remains enforced when metadata
-- is written to public.villa_photos.

drop policy if exists villa_media_public_read on storage.objects;
create policy villa_media_public_read
on storage.objects
for select
using (bucket_id = 'villa-media');

drop policy if exists villa_media_authenticated_insert on storage.objects;
create policy villa_media_authenticated_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'villa-media');

drop policy if exists villa_media_authenticated_update on storage.objects;
create policy villa_media_authenticated_update
on storage.objects
for update
to authenticated
using (bucket_id = 'villa-media')
with check (bucket_id = 'villa-media');

drop policy if exists villa_media_authenticated_delete on storage.objects;
create policy villa_media_authenticated_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'villa-media');

-- ------------------------------------------------------------
-- PAYMENT / BALANCE CORE
-- ------------------------------------------------------------

create or replace function public.refresh_villa_reservation_balance(
  p_reservation_id uuid
)
returns public.villa_reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.villa_reservations%rowtype;
  v_paid numeric(14,2) := 0;
  v_refunded numeric(14,2) := 0;
begin
  select *
  into v_res
  from public.villa_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Villa reservation not found';
  end if;

  if not public.is_company_member(v_res.company_id) then
    raise exception 'Company membership required';
  end if;

  select
    coalesce(sum(case
      when payment_type in ('payment','extra') then amount
      else 0
    end),0),
    coalesce(sum(case
      when payment_type in ('refund') then amount
      else 0
    end),0)
  into v_paid, v_refunded
  from public.villa_payments
  where reservation_id = p_reservation_id;

  update public.villa_reservations
  set
    paid_total = greatest(v_paid - v_refunded, 0),
    balance = greatest(grand_total - greatest(v_paid - v_refunded, 0), 0),
    updated_at = now()
  where id = p_reservation_id
  returning * into v_res;

  return v_res;
end;
$$;

grant execute on function public.refresh_villa_reservation_balance(uuid)
to authenticated;

create or replace function public.record_villa_payment(
  p_company_id uuid,
  p_reservation_id uuid,
  p_payment_type text,
  p_method text,
  p_amount numeric,
  p_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.villa_reservations%rowtype;
  v_payment public.villa_payments%rowtype;
  v_updated public.villa_reservations%rowtype;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select *
  into v_res
  from public.villa_reservations
  where id = p_reservation_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Villa reservation not found';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_payment_type not in ('payment','deposit','deposit_refund','refund','extra') then
    raise exception 'Invalid payment type';
  end if;

  insert into public.villa_payments (
    company_id,
    reservation_id,
    payment_type,
    method,
    amount,
    currency,
    reference,
    note
  )
  values (
    p_company_id,
    p_reservation_id,
    p_payment_type,
    coalesce(nullif(trim(p_method),''),'cash'),
    p_amount,
    v_res.currency,
    nullif(trim(coalesce(p_reference,'')),''),
    nullif(trim(coalesce(p_note,'')),'')
  )
  returning * into v_payment;

  v_updated := public.refresh_villa_reservation_balance(p_reservation_id);

  return jsonb_build_object(
    'ok', true,
    'payment_id', v_payment.id,
    'paid_total', v_updated.paid_total,
    'balance', v_updated.balance,
    'currency', v_updated.currency
  );
end;
$$;

grant execute on function public.record_villa_payment(
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  text
)
to authenticated;

commit;
