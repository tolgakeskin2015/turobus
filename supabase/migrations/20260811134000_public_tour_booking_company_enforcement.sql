-- TUROBUS
-- Phase 7D
-- Public tour booking tenant enforcement

-- =========================================================
-- 1. MEVCUT VERI BUTUNLUGUNU DOGRULA
-- =========================================================

do $$
declare
  v_company_mismatch integer;
  v_tour_mismatch integer;
begin
  select count(*)
  into v_company_mismatch
  from public.reservations r
  join public.tour_departures d
    on d.id = r.departure_id
  where r.departure_id is not null
    and r.company_id <> d.company_id;

  if v_company_mismatch > 0 then
    raise exception
      'Cannot enforce reservation company ownership: % reservation/company mismatches found',
      v_company_mismatch;
  end if;

  select count(*)
  into v_tour_mismatch
  from public.reservations r
  join public.tour_departures d
    on d.id = r.departure_id
  where r.departure_id is not null
    and r.tour_id::text <> d.tour_id::text;

  if v_tour_mismatch > 0 then
    raise exception
      'Cannot enforce reservation tour ownership: % reservation/tour mismatches found',
      v_tour_mismatch;
  end if;
end;
$$;


-- =========================================================
-- 2. HARDCODED COMPANY DEFAULT'U KALDIR
-- =========================================================

alter table public.reservations
alter column company_id
drop default;


-- =========================================================
-- 3. RESERVATION -> DEPARTURE COMPANY COMPOSITE FK
-- =========================================================

alter table public.reservations
drop constraint if exists
reservations_departure_company_fkey;

alter table public.reservations
add constraint
reservations_departure_company_fkey
foreign key (
  departure_id,
  company_id
)
references public.tour_departures (
  id,
  company_id
);


-- =========================================================
-- 4. PUBLIC RESERVATION RPC HARDENING
-- =========================================================

create or replace function public.create_tour_reservation(
  p_departure_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_guests integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departure public.tour_departures%rowtype;
  v_tour public.tours%rowtype;
  v_unit_price integer;
  v_total_price integer;
  v_code text;
  v_reservation_id uuid;
begin
  if p_guests < 1
     or p_guests > 20 then
    raise exception
      'Geçersiz kişi sayısı';
  end if;

  if nullif(
    trim(p_full_name),
    ''
  ) is null then
    raise exception
      'Ad soyad zorunludur';
  end if;

  if nullif(
    trim(p_email),
    ''
  ) is null then
    raise exception
      'E-posta zorunludur';
  end if;

  if nullif(
    trim(p_phone),
    ''
  ) is null then
    raise exception
      'Telefon zorunludur';
  end if;

  -- Aynı departure için eşzamanlı rezervasyonları sıraya al.
  select *
  into v_departure
  from public.tour_departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception
      'Tur tarihi bulunamadı';
  end if;

  if v_departure.company_id is null then
    raise exception
      'Tur tarihi şirket bilgisi bulunamadı';
  end if;

  if v_departure.status <> 'active' then
    raise exception
      'Bu tur tarihi rezervasyona kapalı';
  end if;

  if v_departure.departure_date <
     current_date then
    raise exception
      'Geçmiş bir tarihe rezervasyon yapılamaz';
  end if;

  if (
    v_departure.reserved_count +
    p_guests
  ) > v_departure.capacity then
    raise exception
      'Yeterli kontenjan bulunmuyor';
  end if;

  select *
  into v_tour
  from public.tours
  where id = v_departure.tour_id
    and company_id =
      v_departure.company_id;

  if not found then
    raise exception
      'Tur bulunamadı veya tur şirketi ile tarih şirketi eşleşmiyor';
  end if;

  v_unit_price :=
    coalesce(
      v_departure.adult_price,
      v_tour.adult_price,
      0
    );

  v_total_price :=
    v_unit_price *
    p_guests;

  v_code :=
    'TRB-' ||
    upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        10
      )
    );

  insert into public.reservations (
    company_id,
    departure_id,
    reservation_code,
    tour_id,
    tour_title,
    tour_date,
    guests,
    full_name,
    email,
    phone,
    unit_price,
    total_price,
    status
  )
  values (
    v_departure.company_id,
    v_departure.id,
    v_code,
    v_tour.id::text,
    v_tour.title,
    v_departure.departure_date,
    p_guests,
    trim(p_full_name),
    lower(trim(p_email)),
    trim(p_phone),
    v_unit_price,
    v_total_price,
    'pending'
  )
  returning id
  into v_reservation_id;

  update public.tour_departures
  set
    reserved_count =
      reserved_count +
      p_guests,
    status = case
      when
        reserved_count +
        p_guests >= capacity
      then 'full'
      else status
    end,
    updated_at = now()
  where id = v_departure.id
    and company_id =
      v_departure.company_id;

  return jsonb_build_object(
    'reservation_id',
      v_reservation_id,
    'reservation_code',
      v_code,
    'tour_title',
      v_tour.title,
    'tour_date',
      v_departure.departure_date,
    'guests',
      p_guests,
    'unit_price',
      v_unit_price,
    'total_price',
      v_total_price
  );
end;
$$;


-- =========================================================
-- 5. RPC ERISIMLERI
-- =========================================================

revoke all on function
public.create_tour_reservation(
  uuid,
  text,
  text,
  text,
  integer
)
from public;

grant execute on function
public.create_tour_reservation(
  uuid,
  text,
  text,
  text,
  integer
)
to anon;

grant execute on function
public.create_tour_reservation(
  uuid,
  text,
  text,
  text,
  integer
)
to authenticated;

grant execute on function
public.create_tour_reservation(
  uuid,
  text,
  text,
  text,
  integer
)
to service_role;


-- =========================================================
-- 6. ANON DIRECT TABLE INSERT KAPAT
-- =========================================================

drop policy if exists
"Anyone can insert reservations"
on public.reservations;

revoke insert
on public.reservations
from anon;
