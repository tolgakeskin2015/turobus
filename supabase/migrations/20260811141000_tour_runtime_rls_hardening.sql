-- TUROBUS
-- Phase 7E3
-- Tour runtime / crew / tracking RLS hardening
--
-- Amaç:
-- 1. Development döneminden kalan anon mutation politikalarını kaldırmak.
-- 2. Authenticated kullanıcıları company membership ile sınırlandırmak.
-- 3. Crew / QR / rehber mevcut frontend'i bozmamak için
--    company_id değerini reservation üzerinden DB tarafında üretmek.
-- 4. Public tracking geçiş tamamlanana kadar anon'a yalnız SELECT bırakmak.


-- =========================================================
-- 1. TRACKING COMPANY DERIVATION
-- =========================================================

create or replace function
public.set_tour_runtime_company_from_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if new.reservation_id is null then
    raise exception
      'reservation_id zorunludur';
  end if;

  select r.company_id
  into v_company_id
  from public.reservations r
  where r.id = new.reservation_id;

  if not found then
    raise exception
      'Rezervasyon bulunamadı';
  end if;

  if v_company_id is null then
    raise exception
      'Rezervasyon şirket bilgisi bulunamadı';
  end if;

  if new.company_id is not null
     and new.company_id <> v_company_id then
    raise exception
      'Rezervasyon şirketi ile kayıt şirketi eşleşmiyor';
  end if;

  new.company_id := v_company_id;

  return new;
end;
$$;


-- =========================================================
-- 2. TRACKING TRIGGERS
-- =========================================================

drop trigger if exists
trg_tour_checkins_company
on public.tour_checkins;

create trigger
trg_tour_checkins_company
before insert or update of
  reservation_id,
  company_id
on public.tour_checkins
for each row
execute function
public.set_tour_runtime_company_from_reservation();


drop trigger if exists
trg_tour_status_history_company
on public.tour_status_history;

create trigger
trg_tour_status_history_company
before insert or update of
  reservation_id,
  company_id
on public.tour_status_history
for each row
execute function
public.set_tour_runtime_company_from_reservation();


drop trigger if exists
trg_tour_live_locations_company
on public.tour_live_locations;

create trigger
trg_tour_live_locations_company
before insert or update of
  reservation_id,
  company_id
on public.tour_live_locations
for each row
execute function
public.set_tour_runtime_company_from_reservation();


drop trigger if exists
trg_tour_location_history_company
on public.tour_location_history;

create trigger
trg_tour_location_history_company
before insert or update of
  reservation_id,
  company_id
on public.tour_location_history
for each row
execute function
public.set_tour_runtime_company_from_reservation();


-- =========================================================
-- 3. EXISTING DATA INTEGRITY ASSERT
-- =========================================================

do $$
declare
  v_bad integer;
begin

  select count(*)
  into v_bad
  from public.tour_checkins x
  join public.reservations r
    on r.id = x.reservation_id
  where x.company_id is distinct from r.company_id;

  if v_bad > 0 then
    raise exception
      'tour_checkins company mismatch: %',
      v_bad;
  end if;


  select count(*)
  into v_bad
  from public.tour_status_history x
  join public.reservations r
    on r.id = x.reservation_id
  where x.company_id is distinct from r.company_id;

  if v_bad > 0 then
    raise exception
      'tour_status_history company mismatch: %',
      v_bad;
  end if;


  select count(*)
  into v_bad
  from public.tour_live_locations x
  join public.reservations r
    on r.id = x.reservation_id
  where x.company_id is distinct from r.company_id;

  if v_bad > 0 then
    raise exception
      'tour_live_locations company mismatch: %',
      v_bad;
  end if;


  select count(*)
  into v_bad
  from public.tour_location_history x
  join public.reservations r
    on r.id = x.reservation_id
  where x.company_id is distinct from r.company_id;

  if v_bad > 0 then
    raise exception
      'tour_location_history company mismatch: %',
      v_bad;
  end if;

end;
$$;


-- =========================================================
-- 4. REMOVE DEVELOPMENT TRACKING POLICIES
-- =========================================================

drop policy if exists
"Development create location history"
on public.tour_location_history;

drop policy if exists
"Development create status history"
on public.tour_status_history;

drop policy if exists
"Development manage live locations"
on public.tour_live_locations;

drop policy if exists
"Development manage tour checkins"
on public.tour_checkins;

drop policy if exists
"Development read live locations"
on public.tour_live_locations;

drop policy if exists
"Development read location history"
on public.tour_location_history;

drop policy if exists
"Development read status history"
on public.tour_status_history;

drop policy if exists
"Development read tour checkins"
on public.tour_checkins;


-- =========================================================
-- 5. AUTHENTICATED MEMBER POLICIES
-- =========================================================

drop policy if exists
"tour_checkins_members_manage"
on public.tour_checkins;

create policy
"tour_checkins_members_manage"
on public.tour_checkins
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"tour_status_history_members_manage"
on public.tour_status_history;

create policy
"tour_status_history_members_manage"
on public.tour_status_history
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"tour_live_locations_members_manage"
on public.tour_live_locations;

create policy
"tour_live_locations_members_manage"
on public.tour_live_locations
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"tour_location_history_members_manage"
on public.tour_location_history;

create policy
"tour_location_history_members_manage"
on public.tour_location_history
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- =========================================================
-- 6. TEMPORARY PUBLIC READ ONLY
--
-- Phase 7E4'te bunlar public RPC'ye taşınınca kaldırılacak.
-- Anon artık WRITE yapamaz.
-- =========================================================

create policy
"tour_checkins_public_read"
on public.tour_checkins
for select
to anon
using (true);


create policy
"tour_status_history_public_read"
on public.tour_status_history
for select
to anon
using (true);


create policy
"tour_live_locations_public_read"
on public.tour_live_locations
for select
to anon
using (true);


-- Location history müşteri ekranında kullanılmıyor.
-- Bu nedenle anon'a açmıyoruz.


-- =========================================================
-- 7. ANON TRACKING GRANTS -> SELECT ONLY
-- =========================================================

revoke all
on public.tour_checkins
from anon;

grant select
on public.tour_checkins
to anon;


revoke all
on public.tour_status_history
from anon;

grant select
on public.tour_status_history
to anon;


revoke all
on public.tour_live_locations
from anon;

grant select
on public.tour_live_locations
to anon;


revoke all
on public.tour_location_history
from anon;


-- =========================================================
-- 8. REMOVE OLD TOUR / DEPARTURE MUTATION POLICIES
--
-- Company scoped policies zaten mevcut.
-- Bu eski USING(true) politikaları onları bypass ediyordu.
-- =========================================================

drop policy if exists
"Anyone can create tour departures"
on public.tour_departures;

drop policy if exists
"Anyone can delete tour departures"
on public.tour_departures;

drop policy if exists
"Anyone can update tour departures"
on public.tour_departures;


drop policy if exists
"Anyone can delete tours"
on public.tours;

drop policy if exists
"Anyone can update tours"
on public.tours;


-- =========================================================
-- 9. RESERVATIONS AUTHENTICATED TENANT READ
--
-- Public tracking anon SELECT Phase 7E4'e kadar korunuyor.
-- Authenticated kullanıcı artık USING(true) policy üzerinden
-- diğer firmaları okuyamayacak.
-- =========================================================

drop policy if exists
"Anyone can read reservations"
on public.reservations;


drop policy if exists
"reservations_members_select"
on public.reservations;

create policy
"reservations_members_select"
on public.reservations
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists
"reservations_public_tracking_read"
on public.reservations;

create policy
"reservations_public_tracking_read"
on public.reservations
for select
to anon
using (true);


-- =========================================================
-- 10. MEMBER RESERVATION MUTATIONS
-- =========================================================

drop policy if exists
"reservations_members_insert"
on public.reservations;

create policy
"reservations_members_insert"
on public.reservations
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"reservations_members_update"
on public.reservations;

create policy
"reservations_members_update"
on public.reservations
for update
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"reservations_members_delete"
on public.reservations;

create policy
"reservations_members_delete"
on public.reservations
for delete
to authenticated
using (
  public.is_company_member(company_id)
);


-- =========================================================
-- 11. RESERVATIONS ANON -> SELECT ONLY
-- =========================================================

revoke all
on public.reservations
from anon;

grant select
on public.reservations
to anon;

