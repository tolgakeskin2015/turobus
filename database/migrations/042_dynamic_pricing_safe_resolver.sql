-- TUROBUS RMS
-- Dynamic Pricing Safe Resolver
--
-- Recommendation UUID yerine operasyonel unique anahtar:
-- company + hotel + room type + business date

create or replace function public.hotel_approve_revenue_recommendation_safe(
  p_company_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_business_date date,
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
  where company_id = p_company_id
    and hotel_id = p_hotel_id
    and room_type_id = p_room_type_id
    and business_date = p_business_date
  for update;

  if not found then
    raise exception
      'Fiyat önerisi bulunamadı. Otel / oda tipi / tarih eşleşmesini kontrol edin.';
  end if;

  if v_rec.status <> 'suggested' then
    raise exception
      'Bu fiyat önerisi daha önce işleme alınmış. Durum: %',
      v_rec.status;
  end if;

  if coalesce(v_rec.recommended_rate, 0) <= 0 then
    raise exception
      'Önerilen fiyat 0 veya geçersiz. Fiyat uygulanmadı.';
  end if;

  -- Öncelik: oda tipine özel aktif fiyat planı
  select rp.id
  into v_rate_plan_id
  from public.hotel_rate_plans rp
  where rp.company_id = p_company_id
    and rp.hotel_id = p_hotel_id
    and rp.room_type_id = p_room_type_id
    and rp.is_active = true
  order by rp.created_at
  limit 1;

  -- Yoksa otelin genel aktif planı
  if v_rate_plan_id is null then
    select rp.id
    into v_rate_plan_id
    from public.hotel_rate_plans rp
    where rp.company_id = p_company_id
      and rp.hotel_id = p_hotel_id
      and rp.room_type_id is null
      and rp.is_active = true
    order by rp.created_at
    limit 1;
  end if;

  if v_rate_plan_id is null then
    raise exception
      'Bu oda tipi için aktif fiyat planı bulunamadı.';
  end if;

  return public.hotel_approve_revenue_recommendation(
    p_company_id,
    v_rec.id,
    v_rate_plan_id,
    p_note
  );

end;
$$;


create or replace function public.hotel_reject_revenue_recommendation_safe(
  p_company_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_business_date date,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rec public.hotel_revenue_recommendations%rowtype;
begin

  select *
  into v_rec
  from public.hotel_revenue_recommendations
  where company_id = p_company_id
    and hotel_id = p_hotel_id
    and room_type_id = p_room_type_id
    and business_date = p_business_date
  for update;

  if not found then
    raise exception
      'Fiyat önerisi bulunamadı.';
  end if;

  return public.hotel_reject_revenue_recommendation(
    p_company_id,
    v_rec.id,
    p_note
  );

end;
$$;


grant execute
on function public.hotel_approve_revenue_recommendation_safe(
  uuid,
  uuid,
  uuid,
  date,
  text
)
to authenticated;


grant execute
on function public.hotel_reject_revenue_recommendation_safe(
  uuid,
  uuid,
  uuid,
  date,
  text
)
to authenticated;
