begin;

create or replace function public.get_villa_b2b_sales_calendar(
  p_partner_company_id uuid,
  p_villa_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  calendar_date date,
  is_available boolean,
  public_rate numeric,
  partner_rate numeric,
  minimum_stay integer,
  availability_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.villa_b2b_access%rowtype;
  v_villa public.villas%rowtype;
  v_discount numeric := 0;
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Partner firma yetkisi bulunamadı';
  end if;

  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  if p_end_date - p_start_date > 120 then
    raise exception 'Takvim aralığı en fazla 120 gün olabilir';
  end if;

  select * into v_access
  from public.villa_b2b_access
  where partner_company_id = p_partner_company_id
    and villa_id = p_villa_id
    and is_active = true
    and can_view_calendar = true
  limit 1;

  if not found then
    raise exception 'Bu villa için B2B takvim yetkisi yok';
  end if;

  select * into v_villa
  from public.villas
  where id = p_villa_id
    and is_active = true;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;

  v_discount := case
    when v_access.discount_rate > 1 then v_access.discount_rate / 100
    else v_access.discount_rate
  end;

  return query
  with days as (
    select d::date as day
    from generate_series(p_start_date, p_end_date, interval '1 day') d
  ),
  blocked as (
    select d.day,
      exists (
        select 1
        from public.villa_reservations r
        where r.villa_id = p_villa_id
          and r.status <> 'cancelled'
          and d.day >= r.check_in
          and d.day < r.check_out
      ) as has_reservation,
      exists (
        select 1
        from public.villa_calendar c2
        where c2.villa_id = p_villa_id
          and c2.calendar_date = d.day
          and c2.status in ('reserved','blocked','maintenance','owner_use')
      ) as has_calendar_block
    from days d
  )
  select
    d.day,
    not (b.has_reservation or b.has_calendar_block) as is_available,
    coalesce(c.nightly_rate, v_villa.base_nightly_rate) as public_rate,
    case
      when v_access.pricing_type = 'net_rate' and coalesce(v_access.net_rate,0) > 0
        then v_access.net_rate
      when v_access.pricing_type = 'discount'
        then round(coalesce(c.nightly_rate, v_villa.base_nightly_rate) * (1 - v_discount), 2)
      else coalesce(c.nightly_rate, v_villa.base_nightly_rate)
    end as partner_rate,
    coalesce(c.minimum_stay, v_villa.minimum_stay) as minimum_stay,
    case when b.has_reservation or b.has_calendar_block then 'unavailable' else 'available' end as availability_state
  from days d
  join blocked b on b.day = d.day
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d.day
  order by d.day;
end;
$$;

grant execute on function public.get_villa_b2b_sales_calendar(uuid,uuid,date,date) to authenticated;

create or replace function public.get_villa_b2b_sales_quote(
  p_partner_company_id uuid,
  p_villa_id uuid,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access public.villa_b2b_access%rowtype;
  v_villa public.villas%rowtype;
  v_nights integer;
  v_public_total numeric := 0;
  v_partner_total numeric := 0;
  v_discount numeric := 0;
  v_minimum_stay integer := 1;
  v_conflict boolean := false;
begin
  if not public.is_company_member(p_partner_company_id) then
    raise exception 'Partner firma yetkisi bulunamadı';
  end if;

  if p_check_in is null or p_check_out is null or p_check_out <= p_check_in then
    raise exception 'Geçersiz tarih aralığı';
  end if;

  select * into v_access
  from public.villa_b2b_access
  where partner_company_id = p_partner_company_id
    and villa_id = p_villa_id
    and is_active = true
    and can_book = true
  limit 1;

  if not found then
    raise exception 'Bu villa için B2B satış yetkisi yok';
  end if;

  select * into v_villa
  from public.villas
  where id = p_villa_id
    and is_active = true;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;

  v_nights := p_check_out - p_check_in;

  select coalesce(max(coalesce(c.minimum_stay, v_villa.minimum_stay)), v_villa.minimum_stay)
  into v_minimum_stay
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d::date;

  select exists (
    select 1
    from public.villa_reservations r
    where r.villa_id = p_villa_id
      and r.status <> 'cancelled'
      and daterange(r.check_in, r.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) into v_conflict;

  if not v_conflict then
    select exists (
      select 1
      from public.villa_calendar c
      where c.villa_id = p_villa_id
        and c.calendar_date >= p_check_in
        and c.calendar_date < p_check_out
        and c.status in ('reserved','blocked','maintenance','owner_use')
    ) into v_conflict;
  end if;

  select coalesce(sum(coalesce(c.nightly_rate, v_villa.base_nightly_rate)),0)
  into v_public_total
  from generate_series(p_check_in, p_check_out - 1, interval '1 day') d
  left join public.villa_calendar c
    on c.villa_id = p_villa_id
   and c.calendar_date = d::date;

  v_discount := case
    when v_access.discount_rate > 1 then v_access.discount_rate / 100
    else v_access.discount_rate
  end;

  if v_access.pricing_type = 'net_rate' and coalesce(v_access.net_rate,0) > 0 then
    v_partner_total := v_access.net_rate * v_nights;
  elsif v_access.pricing_type = 'discount' then
    v_partner_total := round(v_public_total * (1 - v_discount), 2);
  else
    v_partner_total := v_public_total;
  end if;

  return jsonb_build_object(
    'ok', true,
    'available', not v_conflict and v_nights >= v_minimum_stay,
    'conflict', v_conflict,
    'minimum_stay', v_minimum_stay,
    'nights', v_nights,
    'public_total', v_public_total,
    'partner_total', v_partner_total,
    'suggested_customer_total', v_public_total,
    'suggested_margin', greatest(v_public_total - v_partner_total, 0),
    'currency', v_villa.currency,
    'instant_confirm', v_access.instant_confirm,
    'pricing_type', v_access.pricing_type
  );
end;
$$;

grant execute on function public.get_villa_b2b_sales_quote(uuid,uuid,date,date) to authenticated;

commit;
