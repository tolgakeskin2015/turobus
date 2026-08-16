begin;

-- ============================================================
-- TUROBUS VILLA MARKETPLACE PUBLIC V1
-- Public catalog + detail + quote + reservation
-- Private owner/finance data is NEVER exposed.
-- ============================================================


-- ============================================================
-- PUBLIC VILLA CATALOG
-- ============================================================

create or replace function public.get_public_villa_marketplace(
  p_city text default null,
  p_guests integer default null,
  p_check_in date default null,
  p_check_out date default null
)
returns table(
  slug text,
  name text,
  city text,
  district text,
  bedrooms integer,
  bathrooms integer,
  max_guests integer,
  base_nightly_rate numeric,
  currency text,
  minimum_stay integer,
  cleaning_fee numeric,
  security_deposit numeric,
  cover_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.slug,
    v.name,
    v.city,
    v.district,
    v.bedrooms,
    v.bathrooms,
    v.max_guests,
    v.base_nightly_rate,
    v.currency,
    v.minimum_stay,
    v.cleaning_fee,
    v.security_deposit,

    (
      select vp.public_url
      from public.villa_photos vp
      where vp.villa_id = v.id
      order by
        vp.is_cover desc,
        vp.sort_order asc,
        vp.created_at asc
      limit 1
    ) as cover_url

  from public.villas v

  where
    v.is_active = true
    and v.marketplace_enabled = true
    and nullif(v.slug, '') is not null

    and (
      p_city is null
      or trim(p_city) = ''
      or lower(coalesce(v.city, '')) like
         '%' || lower(trim(p_city)) || '%'
      or lower(coalesce(v.district, '')) like
         '%' || lower(trim(p_city)) || '%'
    )

    and (
      p_guests is null
      or p_guests <= 0
      or v.max_guests >= p_guests
    )

    and (
      p_check_in is null
      or p_check_out is null

      or (
        p_check_out > p_check_in

        and not exists(
          select 1
          from public.villa_reservations r
          where r.villa_id = v.id
            and r.status <> 'cancelled'
            and daterange(
              r.check_in,
              r.check_out,
              '[)'
            ) && daterange(
              p_check_in,
              p_check_out,
              '[)'
            )
        )

        and not exists(
          select 1
          from public.villa_calendar c
          where c.villa_id = v.id
            and c.calendar_date >= p_check_in
            and c.calendar_date < p_check_out
            and c.status <> 'available'
        )
      )
    )

  order by
    v.marketplace_commission_rate desc,
    v.created_at desc;
$$;


-- ============================================================
-- PUBLIC VILLA DETAIL
-- ============================================================

create or replace function public.get_public_villa_detail(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_villa public.villas%rowtype;
  v_photos jsonb;
begin

  select *
  into v_villa
  from public.villas
  where slug = p_slug
    and is_active = true
    and marketplace_enabled = true
  limit 1;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;


  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'url', vp.public_url,
          'caption', vp.caption,
          'category', vp.category,
          'is_cover', vp.is_cover
        )
        order by
          vp.is_cover desc,
          vp.sort_order asc,
          vp.created_at asc
      ),
      '[]'::jsonb
    )
  into v_photos
  from public.villa_photos vp
  where vp.villa_id = v_villa.id;


  return jsonb_build_object(

    'slug',
    v_villa.slug,

    'name',
    v_villa.name,

    'city',
    v_villa.city,

    'district',
    v_villa.district,

    'bedrooms',
    v_villa.bedrooms,

    'bathrooms',
    v_villa.bathrooms,

    'max_guests',
    v_villa.max_guests,

    'base_nightly_rate',
    v_villa.base_nightly_rate,

    'currency',
    v_villa.currency,

    'cleaning_fee',
    v_villa.cleaning_fee,

    'cleaning_fee_under_nights',
    v_villa.cleaning_fee_under_nights,

    'security_deposit',
    v_villa.security_deposit,

    'minimum_stay',
    v_villa.minimum_stay,

    'check_in_time',
    v_villa.check_in_time,

    'check_out_time',
    v_villa.check_out_time,

    'description',
    v_villa.description,

    'amenities',
    v_villa.amenities,

    'house_rules',
    v_villa.house_rules,

    'photos',
    v_photos

  );

end;
$$;


-- ============================================================
-- PUBLIC MARKETPLACE QUOTE
-- ============================================================

create or replace function public.public_quote_villa_marketplace(
  p_slug text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_villa public.villas%rowtype;
  v_nights integer;
  v_minimum integer;
  v_nightly_total numeric := 0;
  v_cleaning numeric := 0;
  v_total numeric := 0;
begin

  select *
  into v_villa
  from public.villas
  where slug = p_slug
    and is_active = true
    and marketplace_enabled = true
  limit 1;

  if not found then
    raise exception 'Villa bulunamadı';
  end if;


  if p_check_in is null
     or p_check_out is null then
    raise exception
      'Giriş ve çıkış tarihini seç';
  end if;


  if p_check_in < current_date then
    raise exception
      'Geçmiş tarihe rezervasyon yapılamaz';
  end if;


  if p_check_out <= p_check_in then
    raise exception
      'Çıkış tarihi girişten sonra olmalıdır';
  end if;


  if greatest(
    coalesce(p_guest_count, 1),
    1
  ) > v_villa.max_guests then
    raise exception
      'Misafir sayısı villa kapasitesini aşıyor';
  end if;


  v_nights :=
    p_check_out -
    p_check_in;


  select greatest(
    v_villa.minimum_stay,
    coalesce(
      max(c.minimum_stay),
      v_villa.minimum_stay
    )
  )
  into v_minimum
  from public.villa_calendar c
  where c.villa_id = v_villa.id
    and c.calendar_date >= p_check_in
    and c.calendar_date < p_check_out;


  if v_nights < v_minimum then
    raise exception
      'Minimum konaklama % gecedir',
      v_minimum;
  end if;


  if exists(
    select 1
    from public.villa_reservations r
    where r.villa_id = v_villa.id
      and r.status <> 'cancelled'
      and daterange(
        r.check_in,
        r.check_out,
        '[)'
      ) && daterange(
        p_check_in,
        p_check_out,
        '[)'
      )
  ) then
    raise exception
      'Villa seçilen tarihlerde dolu';
  end if;


  if exists(
    select 1
    from public.villa_calendar c
    where c.villa_id = v_villa.id
      and c.calendar_date >= p_check_in
      and c.calendar_date < p_check_out
      and c.status <> 'available'
  ) then
    raise exception
      'Seçilen tarihlerde kapalı gün bulunuyor';
  end if;


  select
    coalesce(
      sum(
        coalesce(
          c.nightly_rate,
          v_villa.base_nightly_rate
        )
      ),
      0
    )
  into v_nightly_total

  from generate_series(
    p_check_in,
    p_check_out - 1,
    interval '1 day'
  ) d(day)

  left join public.villa_calendar c
    on c.villa_id = v_villa.id
   and c.calendar_date =
       d.day::date;


  if v_nightly_total = 0 then

    v_nightly_total :=
      v_villa.base_nightly_rate *
      v_nights;

  end if;


  v_cleaning :=
    coalesce(
      public.calculate_villa_cleaning_fee(
        v_villa.id,
        v_nights
      ),
      0
    );


  v_total :=
    v_nightly_total +
    v_cleaning;


  return jsonb_build_object(

    'available',
    true,

    'villa_name',
    v_villa.name,

    'check_in',
    p_check_in,

    'check_out',
    p_check_out,

    'nights',
    v_nights,

    'guest_count',
    greatest(
      coalesce(p_guest_count,1),
      1
    ),

    'nightly_total',
    v_nightly_total,

    'cleaning_fee',
    v_cleaning,

    'security_deposit',
    v_villa.security_deposit,

    'grand_total',
    v_total,

    'currency',
    v_villa.currency

  );

end;
$$;


-- ============================================================
-- PUBLIC MARKETPLACE RESERVATION
-- ============================================================

create or replace function public.create_public_villa_marketplace_reservation(
  p_slug text,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text,
  p_guest_count integer,
  p_check_in date,
  p_check_out date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_villa public.villas%rowtype;
  v_quote jsonb;
  v_res public.villa_reservations%rowtype;

  v_nights integer;
  v_nightly_total numeric;
  v_cleaning numeric;
  v_total numeric;
  v_commission numeric;
begin

  if coalesce(
    trim(p_guest_name),
    ''
  ) = '' then
    raise exception
      'Ad soyad zorunludur';
  end if;


  if coalesce(
    trim(p_guest_phone),
    ''
  ) = '' then
    raise exception
      'Telefon numarası zorunludur';
  end if;


  select *
  into v_villa
  from public.villas
  where slug = p_slug
    and is_active = true
    and marketplace_enabled = true
  limit 1;


  if not found then
    raise exception
      'Villa bulunamadı';
  end if;


  -- Aynı villa için eş zamanlı marketplace satışını kilitle.
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_villa.id::text,
      0
    )
  );


  -- Kilitten sonra müsaitliği tekrar kontrol et.
  v_quote :=
    public.public_quote_villa_marketplace(
      p_slug,
      p_guest_count,
      p_check_in,
      p_check_out
    );


  v_nights :=
    (v_quote ->> 'nights')::integer;

  v_nightly_total :=
    (v_quote ->> 'nightly_total')::numeric;

  v_cleaning :=
    (v_quote ->> 'cleaning_fee')::numeric;

  v_total :=
    (v_quote ->> 'grand_total')::numeric;


  v_commission :=
    round(
      v_total *
      v_villa.marketplace_commission_rate /
      100,
      2
    );


  insert into public.villa_reservations(

    company_id,
    villa_id,

    reservation_code,

    sales_channel,

    guest_name,
    guest_phone,
    guest_email,
    guest_count,

    check_in,
    check_out,

    nights,

    nightly_total,
    cleaning_fee,
    security_deposit,

    grand_total,
    paid_total,
    balance,

    currency,

    status,

    guest_token,

    turobus_commission_rate,
    turobus_commission_amount

  )
  values(

    v_villa.company_id,
    v_villa.id,

    public.villa_generate_code(),

    'turobus_marketplace',

    trim(p_guest_name),
    trim(p_guest_phone),
    nullif(
      trim(
        coalesce(
          p_guest_email,
          ''
        )
      ),
      ''
    ),

    greatest(
      coalesce(p_guest_count,1),
      1
    ),

    p_check_in,
    p_check_out,

    v_nights,

    v_nightly_total,
    v_cleaning,
    v_villa.security_deposit,

    v_total,
    0,
    v_total,

    v_villa.currency,

    'pending',

    public.villa_generate_guest_token(),

    v_villa.marketplace_commission_rate,
    v_commission

  )
  returning *
  into v_res;


  insert into public.villa_calendar(

    villa_id,
    company_id,
    calendar_date,
    status,
    source,
    note

  )

  select

    v_villa.id,
    v_villa.company_id,
    d::date,
    'reserved',
    'turobus_marketplace',
    'Turobus Marketplace · ' ||
      v_res.reservation_code

  from generate_series(
    p_check_in,
    p_check_out - 1,
    interval '1 day'
  ) d

  on conflict(
    villa_id,
    calendar_date
  )

  do update set

    status = 'reserved',

    source =
      'turobus_marketplace',

    note =
      excluded.note,

    updated_at =
      now();


  return jsonb_build_object(

    'success',
    true,

    'reservation_id',
    v_res.id,

    'reservation_code',
    v_res.reservation_code,

    'guest_token',
    v_res.guest_token,

    'grand_total',
    v_res.grand_total,

    'currency',
    v_res.currency,

    'status',
    v_res.status

  );

end;
$$;


revoke all
on function public.get_public_villa_marketplace(
  text,
  integer,
  date,
  date
)
from public;

revoke all
on function public.get_public_villa_detail(text)
from public;

revoke all
on function public.public_quote_villa_marketplace(
  text,
  integer,
  date,
  date
)
from public;

revoke all
on function public.create_public_villa_marketplace_reservation(
  text,
  text,
  text,
  text,
  integer,
  date,
  date
)
from public;


grant execute
on function public.get_public_villa_marketplace(
  text,
  integer,
  date,
  date
)
to anon, authenticated;


grant execute
on function public.get_public_villa_detail(text)
to anon, authenticated;


grant execute
on function public.public_quote_villa_marketplace(
  text,
  integer,
  date,
  date
)
to anon, authenticated;


grant execute
on function public.create_public_villa_marketplace_reservation(
  text,
  text,
  text,
  text,
  integer,
  date,
  date
)
to anon, authenticated;


commit;
