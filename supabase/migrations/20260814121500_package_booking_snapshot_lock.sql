begin;

-- =========================================================
-- PACKAGE BOOKING IMMUTABLE SNAPSHOT
-- Quote -> Booking sırasında ticari ve misafir verisini kilitler
-- =========================================================

alter table public.package_bookings
add column if not exists quote_snapshot jsonb
not null default '{}'::jsonb;

alter table public.package_bookings
add column if not exists quote_snapshot_created_at timestamptz;

alter table public.package_bookings
add column if not exists primary_guest_address text;


-- =========================================================
-- BOOKING GUEST SNAPSHOT
-- Teklif misafirlerinden bağımsız kalıcı rezervasyon yolcu listesi
-- =========================================================

create table if not exists public.package_booking_guests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete cascade,

  source_quote_guest_id uuid,

  guest_order integer not null default 1,

  guest_type text not null default 'adult'
    check (
      guest_type in (
        'adult',
        'child'
      )
    ),

  full_name text not null,

  phone text,
  email text,
  address text,

  is_primary boolean not null default false,

  snapshot_locked_at timestamptz
    not null default now(),

  created_at timestamptz
    not null default now(),

  unique (
    booking_id,
    guest_order
  )
);


create index if not exists
idx_package_booking_guests_booking
on public.package_booking_guests (
  company_id,
  booking_id,
  guest_order
);


alter table public.package_booking_guests
enable row level security;


drop policy if exists
package_booking_guests_member_select
on public.package_booking_guests;


create policy
package_booking_guests_member_select
on public.package_booking_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_booking_guests.company_id
      and cm.user_id =
        auth.uid()
      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


-- Client tarafının snapshot misafirlerini
-- değiştirmesine izin vermiyoruz.
-- Kayıt yalnızca security definer trigger ile oluşur.

revoke insert, update, delete
on public.package_booking_guests
from authenticated;


-- =========================================================
-- SNAPSHOT CAPTURE FUNCTION
-- =========================================================

create or replace function
public.package_capture_booking_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.package_quotes%rowtype;

  v_items jsonb :=
    '[]'::jsonb;

  v_guests jsonb :=
    '[]'::jsonb;
begin

  if new.quote_id is null then
    return new;
  end if;


  select *
  into v_quote
  from public.package_quotes
  where id =
    new.quote_id;


  if not found then
    return new;
  end if;


  select
    coalesce(
      jsonb_agg(
        to_jsonb(qi)
        order by
          qi.sort_order,
          qi.created_at
      ),
      '[]'::jsonb
    )
  into v_items
  from public.package_quote_items qi
  where qi.quote_id =
    new.quote_id;


  select
    coalesce(
      jsonb_agg(
        to_jsonb(qg)
        order by
          qg.guest_order,
          qg.created_at
      ),
      '[]'::jsonb
    )
  into v_guests
  from public.package_quote_guests qg
  where qg.quote_id =
    new.quote_id;


  update public.package_bookings
  set
    quote_snapshot =
      jsonb_build_object(
        'snapshot_version',
          1,

        'locked_at',
          now(),

        'quote',
          to_jsonb(
            v_quote
          ),

        'items',
          v_items,

        'guests',
          v_guests
      ),

    quote_snapshot_created_at =
      now(),

    primary_guest_address =
      v_quote.primary_guest_address,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'quote_snapshot_locked',
          true,

        'quote_snapshot_version',
          1
      )

  where id =
    new.id;


  insert into public.package_booking_guests (
    company_id,
    booking_id,
    source_quote_guest_id,
    guest_order,
    guest_type,
    full_name,
    phone,
    email,
    address,
    is_primary,
    snapshot_locked_at
  )
  select
    new.company_id,
    new.id,
    qg.id,
    qg.guest_order,
    qg.guest_type,
    qg.full_name,
    qg.phone,
    qg.email,
    qg.address,
    qg.is_primary,
    now()

  from public.package_quote_guests qg

  where qg.quote_id =
    new.quote_id

  on conflict (
    booking_id,
    guest_order
  )
  do nothing;


  return new;
end;
$$;


drop trigger if exists
trg_package_booking_snapshot
on public.package_bookings;


create trigger
trg_package_booking_snapshot
after insert
on public.package_bookings
for each row
execute function
public.package_capture_booking_snapshot();


-- =========================================================
-- MEVCUT REZERVASYONLAR İÇİN BACKFILL
-- =========================================================

insert into public.package_booking_guests (
  company_id,
  booking_id,
  source_quote_guest_id,
  guest_order,
  guest_type,
  full_name,
  phone,
  email,
  address,
  is_primary,
  snapshot_locked_at
)
select
  pb.company_id,
  pb.id,
  qg.id,
  qg.guest_order,
  qg.guest_type,
  qg.full_name,
  qg.phone,
  qg.email,
  qg.address,
  qg.is_primary,
  coalesce(
    pb.booked_at,
    now()
  )

from public.package_bookings pb

join public.package_quote_guests qg
  on qg.quote_id =
     pb.quote_id

where pb.quote_id
      is not null

on conflict (
  booking_id,
  guest_order
)
do nothing;


update public.package_bookings pb
set
  quote_snapshot =
    jsonb_build_object(
      'snapshot_version',
        1,

      'locked_at',
        coalesce(
          pb.booked_at,
          now()
        ),

      'quote',
        to_jsonb(q),

      'items',
        coalesce(
          (
            select
              jsonb_agg(
                to_jsonb(qi)
                order by
                  qi.sort_order,
                  qi.created_at
              )
            from public.package_quote_items qi
            where qi.quote_id =
              pb.quote_id
          ),
          '[]'::jsonb
        ),

      'guests',
        coalesce(
          (
            select
              jsonb_agg(
                to_jsonb(qg)
                order by
                  qg.guest_order,
                  qg.created_at
              )
            from public.package_quote_guests qg
            where qg.quote_id =
              pb.quote_id
          ),
          '[]'::jsonb
        )
    ),

  quote_snapshot_created_at =
    coalesce(
      pb.quote_snapshot_created_at,
      pb.booked_at,
      now()
    ),

  primary_guest_address =
    coalesce(
      pb.primary_guest_address,
      q.primary_guest_address
    ),

  metadata =
    coalesce(
      pb.metadata,
      '{}'::jsonb
    )
    ||
    jsonb_build_object(
      'quote_snapshot_locked',
        true,

      'quote_snapshot_version',
        1
    )

from public.package_quotes q

where pb.quote_id =
      q.id

  and (
    pb.quote_snapshot =
      '{}'::jsonb
    or pb.quote_snapshot
      is null
  );


commit;
