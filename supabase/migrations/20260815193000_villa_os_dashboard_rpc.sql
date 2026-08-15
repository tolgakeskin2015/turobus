begin;

create or replace function public.get_villa_os_dashboard(
  p_company_id uuid,
  p_month date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_days integer := extract(day from (v_month_end - v_month_start))::integer;
  v_villa_count integer := 0;
  v_reserved_nights numeric := 0;
  v_available_nights numeric := 0;
  v_revenue numeric := 0;
  v_paid numeric := 0;
  v_balance numeric := 0;
  v_today_checkins integer := 0;
  v_today_checkouts integer := 0;
  v_cleaning_pending integer := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select count(*)
  into v_villa_count
  from public.villas
  where company_id = p_company_id
    and is_active = true;

  v_available_nights := v_villa_count * greatest(v_days, 0);

  select coalesce(sum(
    greatest(
      0,
      least(r.check_out, v_month_end) - greatest(r.check_in, v_month_start)
    )
  ), 0)
  into v_reserved_nights
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.status not in ('cancelled')
    and r.check_in < v_month_end
    and r.check_out > v_month_start;

  select
    coalesce(sum(r.grand_total), 0),
    coalesce(sum(r.paid_total), 0),
    coalesce(sum(r.balance), 0)
  into
    v_revenue,
    v_paid,
    v_balance
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.status not in ('cancelled')
    and r.check_in < v_month_end
    and r.check_out > v_month_start;

  select count(*)
  into v_today_checkins
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.status not in ('cancelled')
    and r.check_in = current_date;

  select count(*)
  into v_today_checkouts
  from public.villa_reservations r
  where r.company_id = p_company_id
    and r.status not in ('cancelled')
    and r.check_out = current_date;

  select count(*)
  into v_cleaning_pending
  from public.villa_cleaning_tasks t
  where t.company_id = p_company_id
    and t.status in ('pending', 'assigned', 'in_progress');

  return jsonb_build_object(
    'occupancy_rate',
      case
        when v_available_nights > 0
          then round((v_reserved_nights / v_available_nights) * 100, 1)
        else 0
      end,
    'revenue', v_revenue,
    'paid', v_paid,
    'balance', v_balance,
    'today_checkins', v_today_checkins,
    'today_checkouts', v_today_checkouts,
    'cleaning_pending', v_cleaning_pending,
    'villa_count', v_villa_count,
    'reserved_nights', v_reserved_nights,
    'available_nights', v_available_nights,
    'month_start', v_month_start,
    'month_end', v_month_end
  );
end;
$$;

revoke all on function public.get_villa_os_dashboard(uuid, date) from public;
grant execute on function public.get_villa_os_dashboard(uuid, date) to authenticated;

commit;
