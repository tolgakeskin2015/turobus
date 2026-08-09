-- TUROBUS RMS
-- Dynamic Pricing Auto Rate Plan Resolver
--
-- CEO ekraninda yonetici tek tikla onay verir.
-- Sistem onerinin oda tipine uygun aktif rate plan'i guvenli sekilde bulur.

create or replace function public.hotel_approve_revenue_recommendation_auto(
  p_company_id uuid,
  p_recommendation_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rec public.hotel_revenue_recommendations%rowtype;
  v_rate_plan_id uuid;
begin

  select *
  into v_rec
  from public.hotel_revenue_recommendations
  where id = p_recommendation_id
    and company_id = p_company_id;

  if not found then
    raise exception 'Revenue recommendation bulunamadi.';
  end if;

  -- Önce oda tipine özel plan.
  select rp.id
  into v_rate_plan_id
  from public.hotel_rate_plans rp
  where rp.company_id = p_company_id
    and rp.hotel_id = v_rec.hotel_id
    and rp.room_type_id = v_rec.room_type_id
    and rp.is_active = true
  order by rp.created_at
  limit 1;

  -- Oda tipine özel plan yoksa genel otel planı.
  if v_rate_plan_id is null then
    select rp.id
    into v_rate_plan_id
    from public.hotel_rate_plans rp
    where rp.company_id = p_company_id
      and rp.hotel_id = v_rec.hotel_id
      and rp.room_type_id is null
      and rp.is_active = true
    order by rp.created_at
    limit 1;
  end if;

  if v_rate_plan_id is null then
    raise exception
      'Bu oda tipi icin aktif fiyat plani bulunamadi.';
  end if;

  return public.hotel_approve_revenue_recommendation(
    p_company_id,
    p_recommendation_id,
    v_rate_plan_id,
    p_note
  );

end;
$$;

grant execute
on function public.hotel_approve_revenue_recommendation_auto(
  uuid,
  uuid,
  text
)
to authenticated;
