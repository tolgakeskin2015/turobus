create table if not exists public.hotel_night_audits (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid
    references public.hotels(id)
    on delete cascade,

  business_date date not null,

  status text not null default 'completed'
    check (
      status in (
        'running',
        'completed',
        'failed',
        'reopened'
      )
    ),

  reservation_count integer not null default 0,
  arrival_count integer not null default 0,
  departure_count integer not null default 0,
  in_house_count integer not null default 0,
  no_show_count integer not null default 0,

  room_revenue numeric(14,2) not null default 0,
  extra_revenue numeric(14,2) not null default 0,
  payment_total numeric(14,2) not null default 0,
  refund_total numeric(14,2) not null default 0,
  outstanding_balance numeric(14,2) not null default 0,

  dirty_room_count integer not null default 0,
  unassigned_reservation_count integer not null default 0,
  overdue_checkout_count integer not null default 0,
  open_folio_count integer not null default 0,

  warnings jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,

  completed_by uuid
    references auth.users(id)
    on delete set null,

  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    company_id,
    hotel_id,
    business_date
  )
);

create index if not exists
hotel_night_audits_company_date_idx
on public.hotel_night_audits (
  company_id,
  business_date desc
);

alter table public.hotel_night_audits
enable row level security;

grant select, insert, update, delete
on public.hotel_night_audits
to authenticated;

drop policy if exists
"Members manage night audits"
on public.hotel_night_audits;

create policy
"Members manage night audits"
on public.hotel_night_audits
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create or replace function public.run_hotel_night_audit(
  p_company_id uuid,
  p_hotel_id uuid,
  p_business_date date
)
returns public.hotel_night_audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit public.hotel_night_audits;

  v_reservation_count integer := 0;
  v_arrival_count integer := 0;
  v_departure_count integer := 0;
  v_in_house_count integer := 0;
  v_no_show_count integer := 0;

  v_room_revenue numeric(14,2) := 0;
  v_extra_revenue numeric(14,2) := 0;
  v_payment_total numeric(14,2) := 0;
  v_refund_total numeric(14,2) := 0;
  v_outstanding_balance numeric(14,2) := 0;

  v_dirty_room_count integer := 0;
  v_unassigned_count integer := 0;
  v_overdue_checkout_count integer := 0;
  v_open_folio_count integer := 0;

  v_warnings jsonb := '[]'::jsonb;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_company_id::text ||
      coalesce(p_hotel_id::text, '') ||
      p_business_date::text,
      0
    )
  );

  if exists (
    select 1
    from public.hotel_night_audits audit
    where audit.company_id = p_company_id
      and audit.hotel_id is not distinct from p_hotel_id
      and audit.business_date = p_business_date
      and audit.status = 'completed'
  ) then
    raise exception
      '% tarihi için gün sonu daha önce tamamlanmış.',
      to_char(p_business_date, 'DD.MM.YYYY');
  end if;

  select count(*)
  into v_reservation_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_in <= p_business_date
    and reservation.check_out > p_business_date
    and reservation.status not in (
      'cancelled',
      'no_show'
    );

  select count(*)
  into v_arrival_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_in = p_business_date
    and reservation.status not in (
      'cancelled',
      'no_show'
    );

  select count(*)
  into v_departure_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_out = p_business_date
    and reservation.status in (
      'checked_in',
      'checked_out'
    );

  select count(*)
  into v_in_house_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.status = 'checked_in';

  select count(*)
  into v_no_show_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_in = p_business_date
    and reservation.status = 'no_show';

  select coalesce(sum(
    case
      when reservation.nights > 0
      then reservation.total_price / reservation.nights
      else reservation.total_price
    end
  ), 0)
  into v_room_revenue
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_in <= p_business_date
    and reservation.check_out > p_business_date
    and reservation.status not in (
      'cancelled',
      'no_show'
    );

  select coalesce(sum(charge.total_amount), 0)
  into v_extra_revenue
  from public.hotel_folio_charges charge
  where charge.company_id = p_company_id
    and (
      p_hotel_id is null or
      charge.hotel_id = p_hotel_id
    )
    and charge.charge_date = p_business_date
    and charge.status = 'posted';

  select
    coalesce(sum(
      case
        when payment.transaction_type = 'payment'
        then payment.base_amount
        else 0
      end
    ), 0),
    coalesce(sum(
      case
        when payment.transaction_type = 'refund'
        then payment.base_amount
        else 0
      end
    ), 0)
  into
    v_payment_total,
    v_refund_total
  from public.hotel_folio_payments payment
  where payment.company_id = p_company_id
    and (
      p_hotel_id is null or
      payment.hotel_id = p_hotel_id
    )
    and payment.payment_date::date = p_business_date
    and payment.status = 'completed';

  select coalesce(sum(folio.balance), 0)
  into v_outstanding_balance
  from public.hotel_folios folio
  where folio.company_id = p_company_id
    and (
      p_hotel_id is null or
      folio.hotel_id = p_hotel_id
    )
    and folio.status = 'open';

  select count(*)
  into v_open_folio_count
  from public.hotel_folios folio
  where folio.company_id = p_company_id
    and (
      p_hotel_id is null or
      folio.hotel_id = p_hotel_id
    )
    and folio.status = 'open';

  select count(*)
  into v_dirty_room_count
  from public.hotel_rooms room
  where room.company_id = p_company_id
    and (
      p_hotel_id is null or
      room.hotel_id = p_hotel_id
    )
    and room.is_active = true
    and room.housekeeping_status = 'dirty';

  select count(*)
  into v_unassigned_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_in <= p_business_date
    and reservation.check_out > p_business_date
    and reservation.room_id is null
    and reservation.status in (
      'pending',
      'confirmed',
      'checked_in'
    );

  select count(*)
  into v_overdue_checkout_count
  from public.hotel_reservations reservation
  where reservation.company_id = p_company_id
    and (
      p_hotel_id is null or
      reservation.hotel_id = p_hotel_id
    )
    and reservation.check_out <= p_business_date
    and reservation.status = 'checked_in';

  if v_unassigned_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      jsonb_build_object(
        'type', 'unassigned_reservations',
        'severity', 'high',
        'message',
        v_unassigned_count ||
        ' aktif rezervasyonda fiziksel oda ataması bulunmuyor.'
      )
    );
  end if;

  if v_overdue_checkout_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      jsonb_build_object(
        'type', 'overdue_checkouts',
        'severity', 'urgent',
        'message',
        v_overdue_checkout_count ||
        ' rezervasyonun çıkış tarihi geçtiği halde durumu hâlâ konaklıyor.'
      )
    );
  end if;

  if v_dirty_room_count > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      jsonb_build_object(
        'type', 'dirty_rooms',
        'severity', 'normal',
        'message',
        v_dirty_room_count ||
        ' oda temizlik bekliyor.'
      )
    );
  end if;

  if v_outstanding_balance > 0 then
    v_warnings := v_warnings || jsonb_build_array(
      jsonb_build_object(
        'type', 'outstanding_balance',
        'severity', 'high',
        'message',
        'Açık foliolarda toplam ' ||
        round(v_outstanding_balance, 2) ||
        ' bakiye bulunuyor.'
      )
    );
  end if;

  insert into public.hotel_night_audits (
    company_id,
    hotel_id,
    business_date,
    status,

    reservation_count,
    arrival_count,
    departure_count,
    in_house_count,
    no_show_count,

    room_revenue,
    extra_revenue,
    payment_total,
    refund_total,
    outstanding_balance,

    dirty_room_count,
    unassigned_reservation_count,
    overdue_checkout_count,
    open_folio_count,

    warnings,
    summary,

    completed_by,
    completed_at,
    updated_at
  )
  values (
    p_company_id,
    p_hotel_id,
    p_business_date,
    'completed',

    v_reservation_count,
    v_arrival_count,
    v_departure_count,
    v_in_house_count,
    v_no_show_count,

    round(v_room_revenue, 2),
    round(v_extra_revenue, 2),
    round(v_payment_total, 2),
    round(v_refund_total, 2),
    round(v_outstanding_balance, 2),

    v_dirty_room_count,
    v_unassigned_count,
    v_overdue_checkout_count,
    v_open_folio_count,

    v_warnings,

    jsonb_build_object(
      'gross_revenue',
      round(
        v_room_revenue +
        v_extra_revenue,
        2
      ),
      'net_collection',
      round(
        v_payment_total -
        v_refund_total,
        2
      ),
      'warning_count',
      jsonb_array_length(v_warnings)
    ),

    auth.uid(),
    now(),
    now()
  )
  on conflict (
    company_id,
    hotel_id,
    business_date
  )
  do update set
    status = excluded.status,

    reservation_count =
      excluded.reservation_count,
    arrival_count =
      excluded.arrival_count,
    departure_count =
      excluded.departure_count,
    in_house_count =
      excluded.in_house_count,
    no_show_count =
      excluded.no_show_count,

    room_revenue =
      excluded.room_revenue,
    extra_revenue =
      excluded.extra_revenue,
    payment_total =
      excluded.payment_total,
    refund_total =
      excluded.refund_total,
    outstanding_balance =
      excluded.outstanding_balance,

    dirty_room_count =
      excluded.dirty_room_count,
    unassigned_reservation_count =
      excluded.unassigned_reservation_count,
    overdue_checkout_count =
      excluded.overdue_checkout_count,
    open_folio_count =
      excluded.open_folio_count,

    warnings = excluded.warnings,
    summary = excluded.summary,

    completed_by =
      excluded.completed_by,
    completed_at =
      excluded.completed_at,
    updated_at = now()

  returning *
  into v_audit;

  return v_audit;
end;
$$;

grant execute
on function public.run_hotel_night_audit(
  uuid,
  uuid,
  date
)
to authenticated;
