begin;

-- =========================================================
-- 1. REZERVASYONA ODA PLANI SNAPSHOT
-- =========================================================

alter table public.package_bookings
add column if not exists room_plan jsonb not null default '[]'::jsonb;


-- =========================================================
-- 2. TEKLİFTEN REZERVASYONA ODA PLANINI OTOMATİK TAŞI
-- =========================================================

create or replace function
public.package_booking_copy_room_plan_from_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_plan jsonb;
begin

  if new.quote_id is null then
    return new;
  end if;

  if
    new.room_plan is null
    or
    jsonb_typeof(new.room_plan) <> 'array'
    or
    jsonb_array_length(new.room_plan) = 0
  then

    select
      q.room_plan
    into
      v_room_plan
    from public.package_quotes q
    where q.id = new.quote_id
      and q.company_id = new.company_id
    limit 1;

    if
      v_room_plan is not null
      and jsonb_typeof(v_room_plan) = 'array'
    then
      new.room_plan :=
        v_room_plan;
    end if;

  end if;

  return new;
end;
$$;


drop trigger if exists
trg_package_booking_copy_room_plan
on public.package_bookings;


create trigger
trg_package_booking_copy_room_plan
before insert or update of quote_id
on public.package_bookings
for each row
execute function
public.package_booking_copy_room_plan_from_quote();


-- =========================================================
-- 3. CHILD AGE TEKLİF SNAPSHOT'INDAN REZERVASYON MİSAFİRİNE
-- =========================================================

create or replace function
public.package_booking_guest_copy_child_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_child_age integer;
begin

  if new.guest_type <> 'child' then
    new.child_age := null;
    return new;
  end if;

  if new.child_age is not null then
    return new;
  end if;

  select
    b.quote_id
  into
    v_quote_id
  from public.package_bookings b
  where b.id = new.booking_id
    and b.company_id = new.company_id
  limit 1;

  if v_quote_id is null then
    return new;
  end if;

  select
    qg.child_age
  into
    v_child_age
  from public.package_quote_guests qg
  where qg.quote_id = v_quote_id
    and qg.company_id = new.company_id
    and qg.guest_order = new.guest_order
  limit 1;

  new.child_age :=
    v_child_age;

  return new;
end;
$$;


drop trigger if exists
trg_package_booking_guest_copy_child_age
on public.package_booking_guests;


create trigger
trg_package_booking_guest_copy_child_age
before insert
on public.package_booking_guests
for each row
execute function
public.package_booking_guest_copy_child_age();


-- =========================================================
-- 4. MEVCUT REZERVASYONLARDA ODA PLANINI GERİ DOLDUR
-- =========================================================

update public.package_bookings b
set
  room_plan =
    q.room_plan
from public.package_quotes q
where b.quote_id = q.id
  and b.company_id = q.company_id
  and (
    b.room_plan is null
    or jsonb_typeof(b.room_plan) <> 'array'
    or jsonb_array_length(b.room_plan) = 0
  )
  and q.room_plan is not null
  and jsonb_typeof(q.room_plan) = 'array'
  and jsonb_array_length(q.room_plan) > 0;


commit;
