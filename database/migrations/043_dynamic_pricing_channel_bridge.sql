-- ============================================================
-- 043_dynamic_pricing_channel_bridge.sql
-- Dynamic Pricing -> Channel Manager rate sync bridge
-- ============================================================

create or replace function public.enqueue_dynamic_pricing_rate_sync(
  p_company_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_rate_plan_id uuid,
  p_rate_date date,
  p_price numeric,
  p_currency text default 'TRY'
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mapping record;
  v_count integer := 0;
begin

  if not public.is_company_member(p_company_id) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  if coalesce(p_price, 0) <= 0 then
    raise exception
      'Senkronize edilecek fiyat geçersiz.';
  end if;

  for v_mapping in

    select
      m.id as mapping_id,
      m.connection_id,
      m.external_room_id,
      m.external_rate_plan_id,
      c.channel_code

    from public.hotel_channel_room_mappings m

    join public.hotel_channel_connections c
      on c.id = m.connection_id
     and c.company_id = m.company_id
     and c.hotel_id = m.hotel_id

    where m.company_id = p_company_id
      and m.hotel_id = p_hotel_id
      and m.room_type_id = p_room_type_id
      and m.is_active = true
      and c.status = 'active'
      and c.sync_rates = true

      and (
        m.rate_plan_id = p_rate_plan_id
        or m.rate_plan_id is null
      )

  loop

    perform public.enqueue_hotel_channel_sync(
      p_company_id,
      p_hotel_id,
      v_mapping.connection_id,
      'rate_update',

      jsonb_build_object(
        'source', 'dynamic_pricing',
        'mapping_id', v_mapping.mapping_id,
        'room_type_id', p_room_type_id,
        'rate_plan_id', p_rate_plan_id,
        'external_room_id', v_mapping.external_room_id,
        'external_rate_plan_id', v_mapping.external_rate_plan_id,
        'rate_date', p_rate_date,
        'base_price', round(p_price, 2),
        'currency', coalesce(p_currency, 'TRY')
      ),

      50
    );

    v_count := v_count + 1;

  end loop;

  return v_count;

end;
$$;


grant execute
on function public.enqueue_dynamic_pricing_rate_sync(
  uuid,
  uuid,
  uuid,
  uuid,
  date,
  numeric,
  text
)
to authenticated;


-- ============================================================
-- Trigger function
-- hotel_daily_rates değiştiğinde ilgili kanallara rate_update
-- ============================================================

create or replace function public.hotel_daily_rate_channel_sync_trigger()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin

  -- Pasif fiyatları göndermiyoruz
  if new.is_active is not true then
    return new;
  end if;

  -- UPDATE'te fiyat gerçekten değişmediyse queue oluşturma
  if tg_op = 'UPDATE'
     and new.base_price is not distinct from old.base_price
     and new.currency is not distinct from old.currency
  then
    return new;
  end if;

  perform public.enqueue_dynamic_pricing_rate_sync(
    new.company_id,
    new.hotel_id,
    new.room_type_id,
    new.rate_plan_id,
    new.rate_date,
    new.base_price,
    new.currency
  );

  return new;

end;
$$;


drop trigger if exists
hotel_daily_rates_channel_sync
on public.hotel_daily_rates;


create trigger hotel_daily_rates_channel_sync
after insert or update
on public.hotel_daily_rates
for each row
execute function public.hotel_daily_rate_channel_sync_trigger();


-- ============================================================
-- END
-- ============================================================
