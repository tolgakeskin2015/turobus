begin;

-- ============================================================
-- TUROBUS HOTEL MARKETPLACE · PUBLIC SAFE CATALOG
-- Hotel OS iç finans / maliyet / kontrat bilgisi ASLA açılmaz.
-- ============================================================

create or replace function public.get_public_hotel_marketplace(
  p_destination text default null,
  p_guests integer default null,
  p_star integer default null
)
returns table(
  id uuid,
  name text,
  city text,
  district text,
  star_rating integer,
  hotel_type text,
  currency text,
  verified boolean,
  room_type_count bigint,
  max_occupancy integer,
  cover_image text
)
language sql
stable
security definer
set search_path = public
as $$

  select
    r.id,
    r.name,
    r.city,
    r.district,

    case
      when
        (r.metadata ->> 'star_rating') ~ '^[0-9]+$'
      then
        (r.metadata ->> 'star_rating')::integer
      else
        null
    end as star_rating,

    r.metadata ->> 'hotel_type'
      as hotel_type,

    coalesce(
      r.metadata ->> 'currency',
      'TRY'
    ) as currency,

    coalesce(
      (r.metadata ->> 'verified')::boolean,
      false
    ) as verified,

    (
      select count(*)
      from public.turobus_network_inventory_units u
      where u.resource_id = r.id
        and u.unit_type = 'hotel_room_type'
        and u.is_active = true
    ) as room_type_count,

    (
      select
        coalesce(
          max(
            case
              when
                (u.metadata ->> 'max_occupancy') ~ '^[0-9]+$'
              then
                (u.metadata ->> 'max_occupancy')::integer
              else
                0
            end
          ),
          0
        )
      from public.turobus_network_inventory_units u
      where u.resource_id = r.id
        and u.unit_type = 'hotel_room_type'
        and u.is_active = true
    ) as max_occupancy,

    coalesce(
      nullif(
        r.metadata ->> 'cover_image',
        ''
      ),
      nullif(
        r.metadata ->> 'image',
        ''
      )
    ) as cover_image

  from public.turobus_network_resources r

  where
    r.resource_type = 'hotel'
    and r.source_system = 'hotel_os'
    and r.is_active = true
    and r.marketplace_enabled = true

    and (
      p_destination is null
      or trim(p_destination) = ''
      or lower(
        coalesce(r.name, '')
      ) like
        '%' || lower(trim(p_destination)) || '%'
      or lower(
        coalesce(r.city, '')
      ) like
        '%' || lower(trim(p_destination)) || '%'
      or lower(
        coalesce(r.district, '')
      ) like
        '%' || lower(trim(p_destination)) || '%'
    )

    and (
      p_star is null
      or p_star <= 0
      or (
        (r.metadata ->> 'star_rating') ~ '^[0-9]+$'
        and
        (r.metadata ->> 'star_rating')::integer >= p_star
      )
    )

    and (
      p_guests is null
      or p_guests <= 0
      or exists(
        select 1
        from public.turobus_network_inventory_units u
        where u.resource_id = r.id
          and u.unit_type = 'hotel_room_type'
          and u.is_active = true
          and coalesce(
            case
              when
                (u.metadata ->> 'max_occupancy') ~ '^[0-9]+$'
              then
                (u.metadata ->> 'max_occupancy')::integer
              else
                0
            end,
            0
          ) >= p_guests
      )
    )

  order by
    coalesce(
      (r.metadata ->> 'verified')::boolean,
      false
    ) desc,
    case
      when
        (r.metadata ->> 'star_rating') ~ '^[0-9]+$'
      then
        (r.metadata ->> 'star_rating')::integer
      else
        0
    end desc,
    r.name;

$$;


create or replace function public.get_public_hotel_marketplace_detail(
  p_resource_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_resource public.turobus_network_resources%rowtype;
  v_rooms jsonb;
begin

  select *
  into v_resource
  from public.turobus_network_resources
  where id = p_resource_id
    and resource_type = 'hotel'
    and source_system = 'hotel_os'
    and is_active = true
    and marketplace_enabled = true;

  if not found then
    raise exception 'Otel bulunamadı';
  end if;


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
            u.id,

          'name',
            u.name,

          'currency',
            u.currency,

          'max_adults',
            u.metadata ->> 'max_adults',

          'max_children',
            u.metadata ->> 'max_children',

          'max_occupancy',
            u.metadata ->> 'max_occupancy',

          'total_rooms',
            u.metadata ->> 'total_rooms',

          'bed_type',
            u.metadata ->> 'bed_type',

          'stop_sell',
            u.metadata ->> 'stop_sell'
        )
        order by u.name
      ),
      '[]'::jsonb
    )
  into v_rooms
  from public.turobus_network_inventory_units u
  where u.resource_id = v_resource.id
    and u.unit_type = 'hotel_room_type'
    and u.is_active = true;


  return jsonb_build_object(

    'id',
      v_resource.id,

    'name',
      v_resource.name,

    'city',
      v_resource.city,

    'district',
      v_resource.district,

    'star_rating',
      v_resource.metadata ->> 'star_rating',

    'hotel_type',
      v_resource.metadata ->> 'hotel_type',

    'currency',
      coalesce(
        v_resource.metadata ->> 'currency',
        'TRY'
      ),

    'verified',
      coalesce(
        (v_resource.metadata ->> 'verified')::boolean,
        false
      ),

    'cover_image',
      coalesce(
        v_resource.metadata ->> 'cover_image',
        v_resource.metadata ->> 'image'
      ),

    'rooms',
      v_rooms

  );

end;
$$;


revoke all
on function public.get_public_hotel_marketplace(
  text,
  integer,
  integer
)
from public;

grant execute
on function public.get_public_hotel_marketplace(
  text,
  integer,
  integer
)
to anon, authenticated;


revoke all
on function public.get_public_hotel_marketplace_detail(uuid)
from public;

grant execute
on function public.get_public_hotel_marketplace_detail(uuid)
to anon, authenticated;

commit;
