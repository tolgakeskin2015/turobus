begin;

-- =========================================================
-- 1. SEYAHAT SAYFASI V2
-- Eski çalışan RPC'yi kullanır, oda/misafir snapshot ekler.
-- =========================================================

create or replace function
public.get_package_trip_public_v2(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_booking record;
  v_guests jsonb := '[]'::jsonb;
begin

  v_base :=
    public.get_package_trip_public(
      p_token
    );

  if v_base is null then
    return null;
  end if;

  select
    b.id,
    b.company_id,
    b.room_plan
  into
    v_booking
  from public.package_bookings b
  where b.public_token = p_token
  limit 1;

  if not found then
    return v_base;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'guest_order',
            bg.guest_order,
          'guest_type',
            bg.guest_type,
          'full_name',
            bg.full_name,
          'child_age',
            bg.child_age,
          'is_primary',
            bg.is_primary
        )
        order by
          bg.guest_order
      ),
      '[]'::jsonb
    )
  into
    v_guests
  from public.package_booking_guests bg
  where bg.booking_id =
    v_booking.id
    and bg.company_id =
      v_booking.company_id;

  return
    v_base
    ||
    jsonb_build_object(
      'room_plan',
        coalesce(
          v_booking.room_plan,
          '[]'::jsonb
        ),
      'guests',
        v_guests
    );
end;
$$;

revoke all
on function
public.get_package_trip_public_v2(text)
from public;

grant execute
on function
public.get_package_trip_public_v2(text)
to anon, authenticated;


-- =========================================================
-- 2. VOUCHER V2
-- Voucher'a oda ve tam misafir listesi ekler.
-- =========================================================

create or replace function
public.get_package_voucher_public_v2(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_booking record;
  v_guests jsonb := '[]'::jsonb;
begin

  v_base :=
    public.get_package_voucher_public(
      p_token
    );

  if v_base is null then
    return null;
  end if;

  select
    b.id,
    b.company_id,
    b.room_plan
  into
    v_booking
  from public.package_vouchers v
  join public.package_bookings b
    on b.id =
      v.booking_id
    and b.company_id =
      v.company_id
  where v.voucher_token =
    p_token
  limit 1;

  if not found then
    return v_base;
  end if;

  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'guest_order',
            bg.guest_order,
          'guest_type',
            bg.guest_type,
          'full_name',
            bg.full_name,
          'child_age',
            bg.child_age,
          'is_primary',
            bg.is_primary
        )
        order by
          bg.guest_order
      ),
      '[]'::jsonb
    )
  into
    v_guests
  from public.package_booking_guests bg
  where bg.booking_id =
    v_booking.id
    and bg.company_id =
      v_booking.company_id;

  return
    v_base
    ||
    jsonb_build_object(
      'room_plan',
        coalesce(
          v_booking.room_plan,
          '[]'::jsonb
        ),
      'guests',
        v_guests
    );
end;
$$;

revoke all
on function
public.get_package_voucher_public_v2(text)
from public;

grant execute
on function
public.get_package_voucher_public_v2(text)
to anon, authenticated;


-- =========================================================
-- 3. TEDARİKÇİ PORTALI V2
-- Her operasyon satırına booking oda/misafir bilgisini ekler.
-- =========================================================

create or replace function
public.get_package_supplier_portal_public_v2(
  p_token text,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_operations jsonb := '[]'::jsonb;
  v_operation jsonb;
  v_booking_id uuid;
  v_booking record;
  v_guests jsonb;
begin

  v_base :=
    public.get_package_supplier_portal_public(
      p_token,
      p_date
    );

  if v_base is null then
    return null;
  end if;

  for v_operation in
    select value
    from jsonb_array_elements(
      coalesce(
        v_base -> 'operations',
        '[]'::jsonb
      )
    )
  loop

    begin
      v_booking_id :=
        nullif(
          v_operation ->> 'booking_id',
          ''
        )::uuid;
    exception
      when others then
        v_booking_id := null;
    end;

    if v_booking_id is not null then

      select
        b.id,
        b.company_id,
        b.room_plan,
        b.adults,
        b.children,
        b.nights,
        b.check_in,
        b.check_out
      into
        v_booking
      from public.package_bookings b
      where b.id =
        v_booking_id
      limit 1;

      if found then

        select
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'guest_order',
                  bg.guest_order,
                'guest_type',
                  bg.guest_type,
                'full_name',
                  bg.full_name,
                'child_age',
                  bg.child_age,
                'is_primary',
                  bg.is_primary
              )
              order by
                bg.guest_order
            ),
            '[]'::jsonb
          )
        into
          v_guests
        from public.package_booking_guests bg
        where bg.booking_id =
          v_booking.id
          and bg.company_id =
            v_booking.company_id;

        v_operation :=
          v_operation
          ||
          jsonb_build_object(
            'room_plan',
              coalesce(
                v_booking.room_plan,
                '[]'::jsonb
              ),
            'guests',
              v_guests,
            'adults',
              v_booking.adults,
            'children',
              v_booking.children,
            'nights',
              v_booking.nights,
            'check_in',
              v_booking.check_in,
            'check_out',
              v_booking.check_out
          );

      end if;

    end if;

    v_operations :=
      v_operations
      ||
      jsonb_build_array(
        v_operation
      );

  end loop;

  return
    jsonb_set(
      v_base,
      '{operations}',
      v_operations,
      true
    );
end;
$$;

revoke all
on function
public.get_package_supplier_portal_public_v2(
  text,
  date
)
from public;

grant execute
on function
public.get_package_supplier_portal_public_v2(
  text,
  date
)
to anon, authenticated;


commit;
