create table if not exists public.hotel_guests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  first_name text not null,
  last_name text not null,

  gender text
    check (
      gender is null
      or gender in (
        'male',
        'female',
        'other',
        'unspecified'
      )
    ),

  birth_date date,

  nationality text,

  identity_type text
    check (
      identity_type is null
      or identity_type in (
        'tc_identity',
        'passport',
        'foreign_identity',
        'driving_license',
        'other'
      )
    ),

  identity_number text,

  passport_expiry_date date,

  phone text,
  email text,

  country text,
  city text,
  address text,
  postal_code text,

  language text default 'tr',

  vip_level text not null default 'standard'
    check (
      vip_level in (
        'standard',
        'vip',
        'vip_plus',
        'blacklist'
      )
    ),

  tags text[] not null
    default '{}'::text[],

  preferences jsonb not null
    default '{}'::jsonb,

  notes text,

  marketing_consent boolean
    not null default false,

  kvkk_consent boolean
    not null default false,

  kvkk_consent_at timestamptz,

  total_stays integer
    not null default 0,

  total_nights integer
    not null default 0,

  total_spend numeric(14,2)
    not null default 0,

  last_stay_at date,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create table if not exists public.hotel_reservation_guests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  reservation_id uuid not null
    references public.hotel_reservations(id)
    on delete cascade,

  guest_id uuid not null
    references public.hotel_guests(id)
    on delete cascade,

  is_primary boolean
    not null default false,

  guest_type text not null default 'adult'
    check (
      guest_type in (
        'adult',
        'child',
        'infant'
      )
    ),

  check_in_completed boolean
    not null default false,

  checked_in_at timestamptz,

  checked_out_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique (
    reservation_id,
    guest_id
  )
);


create index if not exists
hotel_guests_company_name_idx
on public.hotel_guests (
  company_id,
  last_name,
  first_name
);

create index if not exists
hotel_guests_identity_idx
on public.hotel_guests (
  company_id,
  identity_number
);

create index if not exists
hotel_guests_phone_idx
on public.hotel_guests (
  company_id,
  phone
);

create index if not exists
hotel_reservation_guests_reservation_idx
on public.hotel_reservation_guests (
  company_id,
  reservation_id
);


create or replace function
public.enforce_single_primary_reservation_guest()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_primary = true then
    update public.hotel_reservation_guests
    set
      is_primary = false,
      updated_at = now()
    where reservation_id =
        new.reservation_id
      and id <> new.id
      and is_primary = true;
  end if;

  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
enforce_single_primary_reservation_guest_trigger
on public.hotel_reservation_guests;

create trigger
enforce_single_primary_reservation_guest_trigger
before insert or update
on public.hotel_reservation_guests
for each row
execute function
public.enforce_single_primary_reservation_guest();


create or replace function
public.refresh_hotel_guest_statistics(
  p_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.hotel_guests;
begin
  select *
  into v_guest
  from public.hotel_guests
  where id = p_guest_id;

  if not found then
    return;
  end if;

  if not public.is_company_member(
    v_guest.company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  update public.hotel_guests guest
  set
    total_stays = (
      select count(distinct relation.reservation_id)
      from public.hotel_reservation_guests relation
      join public.hotel_reservations reservation
        on reservation.id = relation.reservation_id
      where relation.guest_id = guest.id
        and reservation.status in (
          'checked_in',
          'checked_out'
        )
    ),

    total_nights = coalesce((
      select sum(reservation.nights)
      from public.hotel_reservation_guests relation
      join public.hotel_reservations reservation
        on reservation.id = relation.reservation_id
      where relation.guest_id = guest.id
        and reservation.status in (
          'checked_in',
          'checked_out'
        )
    ), 0),

    total_spend = coalesce((
      select sum(folio.payment_total - folio.refund_total)
      from public.hotel_reservation_guests relation
      join public.hotel_folios folio
        on folio.reservation_id = relation.reservation_id
      where relation.guest_id = guest.id
    ), 0),

    last_stay_at = (
      select max(reservation.check_out)
      from public.hotel_reservation_guests relation
      join public.hotel_reservations reservation
        on reservation.id = relation.reservation_id
      where relation.guest_id = guest.id
        and reservation.status in (
          'checked_in',
          'checked_out'
        )
    ),

    updated_at = now()

  where guest.id = p_guest_id;
end;
$$;


alter table public.hotel_guests
enable row level security;

alter table public.hotel_reservation_guests
enable row level security;


grant select, insert, update, delete
on
  public.hotel_guests,
  public.hotel_reservation_guests
to authenticated;


drop policy if exists
"Members manage hotel guests"
on public.hotel_guests;

create policy
"Members manage hotel guests"
on public.hotel_guests
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage reservation guests"
on public.hotel_reservation_guests;

create policy
"Members manage reservation guests"
on public.hotel_reservation_guests
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


grant execute
on function public.refresh_hotel_guest_statistics(uuid)
to authenticated;
