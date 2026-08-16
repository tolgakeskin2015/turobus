begin;

-- ============================================================
-- PUBLIC ACTIVITY MARKETPLACE
-- Exposes ONLY public sale information.
-- Never exposes provider cost / contracts / internal source data.
-- ============================================================

create or replace function public.get_public_activity_marketplace_v1(
  p_location text default null,
  p_guests integer default 1,
  p_date date default null
)
returns table(
  product_key text,
  name text,
  category text,
  city text,
  district text,
  cover_image_url text,
  duration_minutes integer,
  minimum_price numeric,
  currency text,
  available_capacity integer,
  provider_count integer,
  next_date date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    public.turobus_activity_product_key(
      a.name,
      a.city
    ) as product_key,

    min(a.name) as name,
    min(a.category) as category,
    min(a.city) as city,
    min(a.district) as district,
    min(a.cover_image_url) as cover_image_url,
    min(a.duration_minutes) as duration_minutes,

    min(
      coalesce(
        s.sale_price,
        a.default_sale_price
      )
    ) as minimum_price,

    coalesce(
      min(s.currency),
      min(a.currency),
      'TRY'
    ) as currency,

    coalesce(
      sum(
        greatest(
          s.capacity -
          s.reserved_count,
          0
        )
      ),
      0
    )::integer as available_capacity,

    count(
      distinct a.company_id
    )::integer as provider_count,

    min(s.slot_date) as next_date

  from public.package_activities a

  join public.package_activity_slots s
    on s.activity_id = a.id

  join public.turobus_network_resources r
    on r.source_system = 'activity_os'
   and r.source_id = a.id
   and r.owner_company_id = a.company_id

  where
    a.is_active = true
    and r.is_active = true
    and r.marketplace_enabled = true

    and s.status = 'open'
    and s.reserved_count < s.capacity

    and s.slot_date >= current_date

    and (
      p_date is null
      or s.slot_date = p_date
    )

    and (
      p_location is null
      or trim(p_location) = ''
      or lower(
        coalesce(
          a.city,
          ''
        )
      ) like
        '%' ||
        lower(
          trim(
            p_location
          )
        ) ||
        '%'
      or lower(
        coalesce(
          a.district,
          ''
        )
      ) like
        '%' ||
        lower(
          trim(
            p_location
          )
        ) ||
        '%'
      or lower(
        a.name
      ) like
        '%' ||
        lower(
          trim(
            p_location
          )
        ) ||
        '%'
    )

  group by
    public.turobus_activity_product_key(
      a.name,
      a.city
    )

  having
    coalesce(
      sum(
        greatest(
          s.capacity -
          s.reserved_count,
          0
        )
      ),
      0
    ) >= greatest(
      coalesce(
        p_guests,
        1
      ),
      1
    )

  order by
    next_date asc,
    minimum_price asc,
    name asc;
$$;


revoke all
on function public.get_public_activity_marketplace_v1(
  text,
  integer,
  date
)
from public;


grant execute
on function public.get_public_activity_marketplace_v1(
  text,
  integer,
  date
)
to anon, authenticated;

commit;
