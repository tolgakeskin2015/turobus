begin;

-- =========================================================
-- PACKAGE OS / PUBLIC QUOTE FLOW
--
-- Public users never receive:
-- cost
-- supplier cost
-- gross profit
-- margin
-- internal metadata
-- =========================================================

create or replace function public.get_package_quote_public(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.package_quotes%rowtype;
  v_items jsonb;
begin
  select *
  into v_quote
  from public.package_quotes
  where public_token = p_token
    and status not in (
      'rejected',
      'cancelled'
    )
    and (
      valid_until is null
      or valid_until >= now()
    )
  limit 1;

  if not found then
    raise exception 'Teklif bulunamadı veya artık geçerli değil.';
  end if;

  if v_quote.status = 'sent' then
    update public.package_quotes
    set
      status = 'viewed',
      updated_at = now()
    where id = v_quote.id;

    v_quote.status := 'viewed';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'item_type', i.item_type,
        'name', i.name,
        'service_date', i.service_date,
        'quantity', i.quantity,
        'unit_sale_price', i.unit_sale_price,
        'total_sale_price', i.total_sale_price,
        'currency', i.currency,
        'description', i.description,
        'sort_order', i.sort_order
      )
      order by i.sort_order, i.created_at
    ),
    '[]'::jsonb
  )
  into v_items
  from public.package_quote_items i
  where i.quote_id = v_quote.id;

  return jsonb_build_object(
    'id', v_quote.id,
    'quote_code', v_quote.quote_code,

    'customer_name', v_quote.customer_name,

    'package_type', v_quote.package_type,
    'destination', v_quote.destination,

    'check_in', v_quote.check_in,
    'check_out', v_quote.check_out,

    'adults', v_quote.adults,
    'children', v_quote.children,
    'nights', v_quote.nights,

    'currency', v_quote.currency,
    'sale_price', v_quote.sale_price,

    'status', v_quote.status,
    'valid_until', v_quote.valid_until,

    'items', v_items
  );
end;
$$;


create or replace function public.accept_package_quote_public(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.package_quotes%rowtype;
begin
  select *
  into v_quote
  from public.package_quotes
  where public_token = p_token
  for update;

  if not found then
    raise exception 'Teklif bulunamadı.';
  end if;

  if (
    v_quote.valid_until is not null
    and v_quote.valid_until < now()
  ) then
    raise exception 'Teklifin geçerlilik süresi dolmuş.';
  end if;

  if v_quote.status = 'accepted' then
    return jsonb_build_object(
      'success', true,
      'quote_code', v_quote.quote_code,
      'status', 'accepted'
    );
  end if;

  if v_quote.status not in (
    'sent',
    'viewed'
  ) then
    raise exception 'Bu teklif şu anda kabul edilemez.';
  end if;

  update public.package_quotes
  set
    status = 'accepted',
    updated_at = now()
  where id = v_quote.id;

  return jsonb_build_object(
    'success', true,
    'quote_code', v_quote.quote_code,
    'status', 'accepted'
  );
end;
$$;


revoke all
on function public.get_package_quote_public(uuid)
from public;

revoke all
on function public.accept_package_quote_public(uuid)
from public;


grant execute
on function public.get_package_quote_public(uuid)
to anon, authenticated;

grant execute
on function public.accept_package_quote_public(uuid)
to anon, authenticated;

commit;
