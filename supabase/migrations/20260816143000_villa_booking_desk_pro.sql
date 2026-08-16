begin;

-- ============================================================
-- TUROBUS VILLA OS · PROFESSIONAL BOOKING DESK
-- live availability + quote + concurrency-safe reservation
-- ============================================================

create or replace function public.get_villa_booking_calendar(
  p_company_id uuid,
  p_villa_id uuid,
  p_start date,
  p_end date
)
returns table(
  calendar_date date,
  status text,
  nightly_rate numeric,
  minimum_stay integer,
  is_arrival boolean,
  is_departure boolean,
  sales_channel text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;

  if p_end < p_start then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  if not exists(
    select 1
    from public.villas v
    where v.id = p_villa_id
      and v.company_id = p_company_id
      and v.is_active = true
  ) then
    raise exception 'Villa bulunamadı';
  end if;

  return query
  with days as (
    select d::date as day
    from generate_series(
      p_start,
      p_end,
      interval '1 day'
    ) d
  ),
  villa_base as (
    select
      v.base_nightly_rate,
      v.minimum_stay
    from public.villas v
    where v.id = p_villa_id
      and v.company_id = p_company_id
  )
  select
    days.day,

    case
      when exists(
        select 1
        from public.villa_reservations r
        where r.company_id = p_company_id
          and r.villa_id = p_villa_id
          and r.status <> 'cancelled'
          and days.day >= r.check_in
          and days.day < r.check_out
      )
      then 'reserved'
      else coalesce(c.status, 'available')
    end as status,

    coalesce(
      c.nightly_rate,
      vb.base_nightly_rate
    ) as nightly_rate,

    coalesce(
      c.minimum_stay,
      vb.minimum_stay
    ) as minimum_stay,

    exists(
      select 1
      from public.villa_reservations r
      where r.company_id = p_company_id
        and r.villa_id = p_villa_id
        and r.status <> 'cancelled'
        and r.check_in = days.day
    ) as is_arrival,

    exists(
      select 1
      from public.villa_reservations r
      where r.company_id = p_company_id
        and r.villa_id = p_villa_id
        and r.status <> 'cancelled'
        and r.check_out = days.day
    ) as is_departure,

    (
      select r.sales_channel
      from public.villa_reservations r
      where r.company_id = p_company_id
        and r.villa_id = p_villa_id
        and r.status <> 'cancelled'
        and days.day >= r.check_in
        and days.day < r.check_out
      order by r.created_at desc
      limit 1
    ) as sales_channel

  from days
  cross join villa_base vb
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = days.day
  order by days.day;
end;
$$;


create or replace function public.quote_villa_booking(
  p_company_id uuid,
  p_villa_id uuid,
  p_guest_count integer,
  p_check_in date,
  p_check_out date,
  p_sales_channel text default 'direct'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_villa public.villas%rowtype;
  v_nights integer;
  v_nightly_total numeric := 0;
  v_cleaning numeric := 0;
  v_total numeric := 0;
  v_commission numeric := 0;
  v_effective_minimum integer := 1;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;

  select *
  into v_villa
  from public.villas
  where id = p_villa_id
    and company_id = p_company_id
    and is_active = true;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;

  if p_check_in is null or p_check_out is null then
    raise exception 'Giriş ve çıkış tarihi seçilmelidir';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Çıkış tarihi giriş tarihinden sonra olmalıdır';
  end if;

  if greatest(coalesce(p_guest_count, 1), 1) > v_villa.max_guests then
    raise exception 'Misafir sayısı villa kapasitesini aşıyor';
  end if;

  v_nights := p_check_out - p_check_in;

  select greatest(
    v_villa.minimum_stay,
    coalesce(max(c.minimum_stay), v_villa.minimum_stay)
  )
  into v_effective_minimum
  from public.villa_calendar c
  where c.villa_id = p_villa_id
    and c.calendar_date >= p_check_in
    and c.calendar_date < p_check_out;

  if v_nights < v_effective_minimum then
    raise exception
      'Minimum konaklama şartı % gece',
      v_effective_minimum;
  end if;

  if exists(
    select 1
    from public.villa_reservations r
    where r.company_id = p_company_id
      and r.villa_id = p_villa_id
      and r.status <> 'cancelled'
      and daterange(
        r.check_in,
        r.check_out,
        '[)'
      ) && daterange(
        p_check_in,
        p_check_out,
        '[)'
      )
  ) then
    raise exception 'Seçilen tarih aralığında villa dolu';
  end if;

  if exists(
    select 1
    from public.villa_calendar c
    where c.villa_id = p_villa_id
      and c.calendar_date >= p_check_in
      and c.calendar_date < p_check_out
      and c.status <> 'available'
  ) then
    raise exception 'Seçilen aralıkta kapalı veya müsait olmayan gün var';
  end if;

  select coalesce(
    sum(
      coalesce(
        c.nightly_rate,
        v_villa.base_nightly_rate
      )
    ),
    0
  )
  into v_nightly_total
  from generate_series(
    p_check_in,
    p_check_out - 1,
    interval '1 day'
  ) d(day)
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d.day::date;

  if v_nightly_total = 0 then
    v_nightly_total :=
      v_villa.base_nightly_rate *
      v_nights;
  end if;

  v_cleaning :=
    coalesce(
      public.calculate_villa_cleaning_fee(
        p_villa_id,
        v_nights
      ),
      0
    );

  v_total :=
    v_nightly_total +
    v_cleaning;

  if p_sales_channel = 'turobus_marketplace' then
    v_commission :=
      round(
        v_total *
        v_villa.marketplace_commission_rate /
        100,
        2
      );
  end if;

  return jsonb_build_object(
    'available', true,
    'villa_id', p_villa_id,
    'villa_name', v_villa.name,
    'check_in', p_check_in,
    'check_out', p_check_out,
    'nights', v_nights,
    'guest_count', greatest(coalesce(p_guest_count,1),1),
    'max_guests', v_villa.max_guests,
    'minimum_stay', v_effective_minimum,
    'nightly_total', v_nightly_total,
    'cleaning_fee', v_cleaning,
    'security_deposit', v_villa.security_deposit,
    'grand_total', v_total,
    'currency', v_villa.currency,
    'turobus_commission_amount', v_commission
  );
end;
$$;


create or replace function public.create_villa_reservation_pro(
  p_company_id uuid,
  p_villa_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date,
  p_sales_channel text default 'direct'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote jsonb;
  v_villa public.villas%rowtype;
  v_res public.villa_reservations%rowtype;
  v_nights integer;
  v_nightly_total numeric;
  v_cleaning numeric;
  v_deposit numeric;
  v_total numeric;
  v_commission numeric;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Firma yetkisi bulunamadı';
  end if;

  if coalesce(trim(p_guest_name), '') = '' then
    raise exception 'Misafir adı zorunludur';
  end if;

  -- Aynı villa için eş zamanlı satışları sıraya al.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_villa_id::text,
      0
    )
  );

  select *
  into v_villa
  from public.villas
  where id = p_villa_id
    and company_id = p_company_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;

  -- Kilit alındıktan SONRA müsaitliği tekrar kontrol et.
  v_quote :=
    public.quote_villa_booking(
      p_company_id,
      p_villa_id,
      p_guest_count,
      p_check_in,
      p_check_out,
      p_sales_channel
    );

  v_nights :=
    (v_quote ->> 'nights')::integer;

  v_nightly_total :=
    (v_quote ->> 'nightly_total')::numeric;

  v_cleaning :=
    (v_quote ->> 'cleaning_fee')::numeric;

  v_deposit :=
    (v_quote ->> 'security_deposit')::numeric;

  v_total :=
    (v_quote ->> 'grand_total')::numeric;

  v_commission :=
    (v_quote ->> 'turobus_commission_amount')::numeric;

  insert into public.villa_reservations(
    company_id,
    villa_id,
    reservation_code,
    sales_channel,
    guest_name,
    guest_phone,
    guest_email,
    guest_count,
    check_in,
    check_out,
    nights,
    nightly_total,
    cleaning_fee,
    security_deposit,
    grand_total,
    paid_total,
    balance,
    currency,
    status,
    guest_token,
    turobus_commission_rate,
    turobus_commission_amount
  )
  values(
    p_company_id,
    p_villa_id,
    public.villa_generate_code(),
    p_sales_channel,
    trim(p_guest_name),
    nullif(trim(coalesce(p_guest_phone,'')), ''),
    nullif(trim(coalesce(p_guest_email,'')), ''),
    greatest(coalesce(p_guest_count,1),1),
    p_check_in,
    p_check_out,
    v_nights,
    v_nightly_total,
    v_cleaning,
    v_deposit,
    v_total,
    0,
    v_total,
    v_villa.currency,
    'confirmed',
    public.villa_generate_guest_token(),
    case
      when p_sales_channel = 'turobus_marketplace'
      then v_villa.marketplace_commission_rate
      else 0
    end,
    v_commission
  )
  returning *
  into v_res;

  insert into public.villa_calendar(
    villa_id,
    company_id,
    calendar_date,
    nightly_rate,
    minimum_stay,
    status,
    source,
    note
  )
  select
    p_villa_id,
    p_company_id,
    d::date,
    null,
    null,
    'reserved',
    'villa_os',
    'Rezervasyon ' || v_res.reservation_code
  from generate_series(
    p_check_in,
    p_check_out - 1,
    interval '1 day'
  ) d
  on conflict(villa_id, calendar_date)
  do update set
    status = 'reserved',
    source = 'villa_os',
    note = excluded.note,
    updated_at = now();

  insert into public.villa_cleaning_tasks(
    company_id,
    villa_id,
    reservation_id,
    task_date,
    task_type,
    status,
    fee
  )
  values(
    p_company_id,
    p_villa_id,
    v_res.id,
    p_check_out,
    'checkout',
    'pending',
    v_cleaning
  );

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_res.id,
    'reservation_code', v_res.reservation_code,
    'guest_token', v_res.guest_token,
    'check_in', v_res.check_in,
    'check_out', v_res.check_out,
    'nights', v_res.nights,
    'grand_total', v_res.grand_total,
    'security_deposit', v_res.security_deposit,
    'currency', v_res.currency
  );
end;
$$;

grant execute on function public.get_villa_booking_calendar(
  uuid, uuid, date, date
) to authenticated;

grant execute on function public.quote_villa_booking(
  uuid, uuid, integer, date, date, text
) to authenticated;

grant execute on function public.create_villa_reservation_pro(
  uuid, uuid, text, text, text, integer, date, date, text
) to authenticated;

commit;
