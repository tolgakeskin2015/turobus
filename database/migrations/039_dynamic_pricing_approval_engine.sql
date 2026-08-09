-- TUROBUS RMS
-- Dynamic Pricing Approval Engine v1
--
-- Akis:
-- Revenue Intelligence -> suggested
-- Yönetici -> approve / reject
-- Approve -> hotel_daily_rates
-- Her işlem -> audit log

create table if not exists public.hotel_pricing_audit_log (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  recommendation_id uuid
    references public.hotel_revenue_recommendations(id)
    on delete set null,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete cascade,

  rate_plan_id uuid
    references public.hotel_rate_plans(id)
    on delete set null,

  rate_date date not null,

  action text not null
    check (
      action in (
        'approved',
        'rejected'
      )
    ),

  old_price numeric(14,2),
  new_price numeric(14,2),

  adjustment_percent numeric(8,2),

  reason text,
  decision_note text,

  acted_by uuid default auth.uid(),

  created_at timestamptz
    not null default now()
);


create index if not exists
idx_hotel_pricing_audit_lookup
on public.hotel_pricing_audit_log (
  company_id,
  hotel_id,
  rate_date
);


alter table public.hotel_pricing_audit_log
enable row level security;


drop policy if exists
"Members manage pricing audit"
on public.hotel_pricing_audit_log;


create policy
"Members manage pricing audit"
on public.hotel_pricing_audit_log
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- ============================================================
-- APPROVE
-- ============================================================

create or replace function public.hotel_approve_revenue_recommendation(
  p_company_id uuid,
  p_recommendation_id uuid,
  p_rate_plan_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rec public.hotel_revenue_recommendations%rowtype;
  v_rate_plan public.hotel_rate_plans%rowtype;
  v_old_price numeric(14,2);
  v_new_price numeric(14,2);
begin

  select *
  into v_rec
  from public.hotel_revenue_recommendations
  where id = p_recommendation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Revenue recommendation bulunamadı.';
  end if;


  if v_rec.status <> 'suggested' then
    raise exception
      'Bu öneri daha önce işleme alınmış. Durum: %',
      v_rec.status;
  end if;


  if coalesce(v_rec.recommended_rate, 0) <= 0 then
    raise exception
      'Önerilen fiyat 0 veya geçersiz. Uygulama yapılamaz.';
  end if;


  select *
  into v_rate_plan
  from public.hotel_rate_plans
  where id = p_rate_plan_id
    and company_id = p_company_id
    and hotel_id = v_rec.hotel_id
    and is_active = true;

  if not found then
    raise exception
      'Aktif fiyat planı bulunamadı.';
  end if;


  if v_rate_plan.room_type_id is not null
     and v_rate_plan.room_type_id <> v_rec.room_type_id then

    raise exception
      'Fiyat planı önerinin oda tipiyle eşleşmiyor.';

  end if;


  select dr.base_price
  into v_old_price
  from public.hotel_daily_rates dr
  where dr.company_id = p_company_id
    and dr.hotel_id = v_rec.hotel_id
    and dr.room_type_id = v_rec.room_type_id
    and dr.rate_plan_id = p_rate_plan_id
    and dr.rate_date = v_rec.business_date
  limit 1;


  v_new_price :=
    round(v_rec.recommended_rate, 2);


  insert into public.hotel_daily_rates (
    company_id,
    hotel_id,
    room_type_id,
    rate_plan_id,
    rate_date,
    base_price,
    currency,
    is_active,
    updated_at
  )
  values (
    p_company_id,
    v_rec.hotel_id,
    v_rec.room_type_id,
    p_rate_plan_id,
    v_rec.business_date,
    v_new_price,
    coalesce(v_rate_plan.currency, 'TRY'),
    true,
    now()
  )

  on conflict (
    hotel_id,
    room_type_id,
    rate_plan_id,
    rate_date
  )

  do update set
    base_price = excluded.base_price,
    currency = excluded.currency,
    is_active = true,
    updated_at = now();


  update public.hotel_revenue_recommendations
  set
    status = 'approved',
    updated_at = now()
  where id = v_rec.id;


  insert into public.hotel_pricing_audit_log (
    company_id,
    hotel_id,
    recommendation_id,
    room_type_id,
    rate_plan_id,
    rate_date,
    action,
    old_price,
    new_price,
    adjustment_percent,
    reason,
    decision_note,
    acted_by
  )
  values (
    p_company_id,
    v_rec.hotel_id,
    v_rec.id,
    v_rec.room_type_id,
    p_rate_plan_id,
    v_rec.business_date,
    'approved',
    v_old_price,
    v_new_price,
    v_rec.adjustment_percent,
    v_rec.reason,
    p_note,
    auth.uid()
  );


  return jsonb_build_object(
    'success', true,
    'status', 'approved',
    'recommendation_id', v_rec.id,
    'rate_date', v_rec.business_date,
    'old_price', v_old_price,
    'new_price', v_new_price,
    'rate_plan_id', p_rate_plan_id
  );

end;
$$;


-- ============================================================
-- REJECT
-- ============================================================

create or replace function public.hotel_reject_revenue_recommendation(
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
begin

  select *
  into v_rec
  from public.hotel_revenue_recommendations
  where id = p_recommendation_id
    and company_id = p_company_id
  for update;


  if not found then
    raise exception
      'Revenue recommendation bulunamadı.';
  end if;


  if v_rec.status <> 'suggested' then
    raise exception
      'Bu öneri daha önce işleme alınmış. Durum: %',
      v_rec.status;
  end if;


  update public.hotel_revenue_recommendations
  set
    status = 'rejected',
    updated_at = now()
  where id = v_rec.id;


  insert into public.hotel_pricing_audit_log (
    company_id,
    hotel_id,
    recommendation_id,
    room_type_id,
    rate_date,
    action,
    old_price,
    new_price,
    adjustment_percent,
    reason,
    decision_note,
    acted_by
  )
  values (
    p_company_id,
    v_rec.hotel_id,
    v_rec.id,
    v_rec.room_type_id,
    null,
    v_rec.business_date,
    'rejected',
    v_rec.current_rate,
    v_rec.recommended_rate,
    v_rec.adjustment_percent,
    v_rec.reason,
    p_note,
    auth.uid()
  );


  return jsonb_build_object(
    'success', true,
    'status', 'rejected',
    'recommendation_id', v_rec.id
  );

end;
$$;


grant execute
on function public.hotel_approve_revenue_recommendation(
  uuid,
  uuid,
  uuid,
  text
)
to authenticated;


grant execute
on function public.hotel_reject_revenue_recommendation(
  uuid,
  uuid,
  text
)
to authenticated;
