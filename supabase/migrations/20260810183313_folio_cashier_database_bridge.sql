-- TUROBUS HOTEL PMS
-- FOLIO -> CASHIER DATABASE BRIDGE

create or replace function public.sync_folio_cash_payment_to_cashier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id uuid;
  v_amount numeric;
begin

  -- Sadece nakit işlemleri işle
  if new.payment_type <> 'cash' then
    return new;
  end if;

  -- Ödemenin ait olduğu AYNI OTELİN açık kasasını bul
  select id
  into v_shift_id
  from public.hotel_cashier_shifts
  where company_id = new.company_id
    and hotel_id = new.hotel_id
    and status = 'open'
  order by opened_at desc
  limit 1;

  -- O otelde açık kasa yoksa hiçbir şey yapma
  if v_shift_id is null then
    return new;
  end if;

  v_amount :=
    new.amount * coalesce(new.exchange_rate, 1);

  -- Aynı ödeme daha önce kasaya işlendi mi?
  if exists (
    select 1
    from public.hotel_cashier_movements
    where reference_type = 'folio_payment'
      and reference_id = new.id
  ) then
    return new;
  end if;

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
    new.company_id,
    new.hotel_id,
    v_shift_id,
    case
      when new.transaction_type = 'refund'
        then 'refund'
      else 'payment'
    end,
    v_amount,
    coalesce(new.currency, 'TRY'),
    case
      when new.transaction_type = 'refund'
        then 'Folio nakit iadesi'
      else 'Folio nakit tahsilatı'
    end,
    'folio_payment',
    new.id,
    new.created_by
  );

  update public.hotel_cashier_shifts
  set
    expected_cash =
      expected_cash +
      case
        when new.transaction_type = 'refund'
          then -v_amount
        else v_amount
      end,
    updated_at = now()
  where id = v_shift_id;

  return new;
end;
$$;

drop trigger if exists
folio_cash_payment_to_cashier_trigger
on public.hotel_folio_payments;

create trigger folio_cash_payment_to_cashier_trigger
after insert
on public.hotel_folio_payments
for each row
execute function public.sync_folio_cash_payment_to_cashier();
