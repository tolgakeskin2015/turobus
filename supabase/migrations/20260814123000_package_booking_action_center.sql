begin;

-- =========================================================
-- PACKAGE BOOKING ACTION CENTER
-- Tahsilat + operasyon + tedarikçi + audit timeline
-- =========================================================

create table if not exists
public.package_booking_events (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null,

  booking_id uuid not null
    references public.package_bookings(id)
    on delete cascade,

  booking_item_id uuid
    references public.package_booking_items(id)
    on delete set null,

  event_type text not null,

  title text not null,

  description text,

  metadata jsonb
    not null
    default '{}'::jsonb,

  created_by uuid,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
idx_package_booking_events_booking
on public.package_booking_events (
  company_id,
  booking_id,
  created_at desc
);


alter table
public.package_booking_events
enable row level security;


drop policy if exists
package_booking_events_member_select
on public.package_booking_events;


create policy
package_booking_events_member_select
on public.package_booking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_booking_events.company_id
      and cm.user_id =
        auth.uid()
      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);


revoke insert, update, delete
on public.package_booking_events
from authenticated;


-- =========================================================
-- COMMON MEMBERSHIP CHECK
-- =========================================================

create or replace function
public.package_assert_booking_member(
  p_booking_id uuid
)
returns public.package_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_booking
    public.package_bookings%rowtype;
begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  select *
  into v_booking
  from public.package_bookings
  where id =
    p_booking_id
  for update;


  if not found then
    raise exception
      'Rezervasyon bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      v_booking.company_id
      and cm.user_id =
        v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu rezervasyon için yetkiniz yok.';
  end if;


  return
    v_booking;
end;
$$;


revoke all
on function
public.package_assert_booking_member(uuid)
from public;


-- =========================================================
-- MANUAL PAYMENT
-- =========================================================

create or replace function
public.package_booking_add_payment(
  p_booking_id uuid,
  p_amount numeric,
  p_payment_method text default 'cash',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_booking
    public.package_bookings%rowtype;

  v_payment_id uuid;

  v_paid numeric :=
    0;

  v_balance numeric :=
    0;

  v_payment_status text;
begin

  v_booking :=
    public.package_assert_booking_member(
      p_booking_id
    );


  if coalesce(
    p_amount,
    0
  ) <= 0 then
    raise exception
      'Tahsilat tutarı sıfırdan büyük olmalıdır.';
  end if;


  if p_amount >
     coalesce(
       v_booking.balance_amount,
       v_booking.sale_price,
       0
     )
  then
    raise exception
      'Tahsilat kalan tutardan büyük olamaz.';
  end if;


  insert into
  public.package_customer_payments (
    company_id,
    booking_id,
    amount,
    currency,
    payment_method,
    provider,
    status,
    received_by,
    paid_at,
    metadata
  )
  values (
    v_booking.company_id,
    v_booking.id,
    p_amount,
    v_booking.currency,
    nullif(
      trim(
        coalesce(
          p_payment_method,
          ''
        )
      ),
      ''
    ),
    'manual',
    'completed',
    v_uid,
    now(),
    jsonb_build_object(
      'note',
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        ),

      'source',
        'booking_action_center'
    )
  )
  returning id
  into v_payment_id;


  select
    coalesce(
      sum(
        p.amount
      ),
      0
    )
  into v_paid

  from public.package_customer_payments p

  where p.booking_id =
      v_booking.id

    and p.status =
      'completed';


  v_balance :=
    greatest(
      coalesce(
        v_booking.sale_price,
        0
      ) -
      v_paid,
      0
    );


  v_payment_status :=
    case
      when v_paid <= 0
        then 'unpaid'

      when v_balance <= 0
        then 'paid'

      else 'partial'
    end;


  update public.package_bookings
  set
    paid_amount =
      v_paid,

    balance_amount =
      v_balance,

    payment_status =
      v_payment_status,

    updated_at =
      now()

  where id =
    v_booking.id;


  insert into
  public.package_booking_events (
    company_id,
    booking_id,
    event_type,
    title,
    description,
    metadata,
    created_by
  )
  values (
    v_booking.company_id,
    v_booking.id,
    'payment_received',
    'Tahsilat alındı',
    concat(
      p_amount,
      ' ',
      v_booking.currency,
      ' tahsil edildi.'
    ),
    jsonb_build_object(
      'payment_id',
        v_payment_id,

      'amount',
        p_amount,

      'payment_method',
        p_payment_method,

      'remaining_balance',
        v_balance,

      'note',
        p_note
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'payment_id',
        v_payment_id,

      'paid_amount',
        v_paid,

      'balance_amount',
        v_balance,

      'payment_status',
        v_payment_status
    );
end;
$$;


revoke all
on function
public.package_booking_add_payment(
  uuid,
  numeric,
  text,
  text
)
from public;


grant execute
on function
public.package_booking_add_payment(
  uuid,
  numeric,
  text,
  text
)
to authenticated;


-- =========================================================
-- BOOKING STATUS
-- =========================================================

create or replace function
public.package_booking_set_status(
  p_booking_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_booking
    public.package_bookings%rowtype;

  v_old_status text;
begin

  v_booking :=
    public.package_assert_booking_member(
      p_booking_id
    );


  if p_status not in (
    'pending',
    'confirmed',
    'in_service',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Geçersiz rezervasyon durumu.';
  end if;


  v_old_status :=
    v_booking.status;


  update public.package_bookings
  set
    status =
      p_status,

    updated_at =
      now()

  where id =
    v_booking.id;


  insert into
  public.package_booking_events (
    company_id,
    booking_id,
    event_type,
    title,
    description,
    metadata,
    created_by
  )
  values (
    v_booking.company_id,
    v_booking.id,
    'booking_status_changed',
    'Rezervasyon durumu değiştirildi',
    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    jsonb_build_object(
      'old_status',
        v_old_status,

      'new_status',
        p_status
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'old_status',
        v_old_status,

      'status',
        p_status
    );
end;
$$;


revoke all
on function
public.package_booking_set_status(
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.package_booking_set_status(
  uuid,
  text,
  text
)
to authenticated;


-- =========================================================
-- SUPPLIER STATUS
-- =========================================================

create or replace function
public.package_booking_set_supplier_status(
  p_booking_item_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_item
    public.package_booking_items%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_old_status text;
begin

  select *
  into v_item

  from public.package_booking_items

  where id =
    p_booking_item_id

  for update;


  if not found then
    raise exception
      'Hizmet bulunamadı.';
  end if;


  v_booking :=
    public.package_assert_booking_member(
      v_item.booking_id
    );


  if p_status not in (
    'pending',
    'requested',
    'confirmed',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Geçersiz tedarikçi durumu.';
  end if;


  v_old_status :=
    v_item.supplier_status;


  update public.package_booking_items
  set
    supplier_status =
      p_status,

    updated_at =
      now()

  where id =
    v_item.id;


  insert into
  public.package_booking_events (
    company_id,
    booking_id,
    booking_item_id,
    event_type,
    title,
    description,
    metadata,
    created_by
  )
  values (
    v_booking.company_id,
    v_booking.id,
    v_item.id,
    'supplier_status_changed',
    concat(
      v_item.name,
      ' tedarikçi durumu güncellendi'
    ),
    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    ),
    jsonb_build_object(
      'service_name',
        v_item.name,

      'old_status',
        v_old_status,

      'new_status',
        p_status
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'item_id',
        v_item.id,

      'old_status',
        v_old_status,

      'supplier_status',
        p_status
    );
end;
$$;


revoke all
on function
public.package_booking_set_supplier_status(
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.package_booking_set_supplier_status(
  uuid,
  text,
  text
)
to authenticated;


-- =========================================================
-- OPERATION NOTE
-- =========================================================

create or replace function
public.package_booking_add_note(
  p_booking_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_booking
    public.package_bookings%rowtype;

  v_event_id uuid;
begin

  v_booking :=
    public.package_assert_booking_member(
      p_booking_id
    );


  if nullif(
    trim(
      coalesce(
        p_note,
        ''
      )
    ),
    ''
  ) is null then
    raise exception
      'Not boş bırakılamaz.';
  end if;


  insert into
  public.package_booking_events (
    company_id,
    booking_id,
    event_type,
    title,
    description,
    created_by
  )
  values (
    v_booking.company_id,
    v_booking.id,
    'operation_note',
    'Operasyon notu',
    trim(
      p_note
    ),
    v_uid
  )
  returning id
  into v_event_id;


  return
    jsonb_build_object(
      'success',
        true,

      'event_id',
        v_event_id
    );
end;
$$;


revoke all
on function
public.package_booking_add_note(
  uuid,
  text
)
from public;


grant execute
on function
public.package_booking_add_note(
  uuid,
  text
)
to authenticated;


-- =========================================================
-- EXISTING BOOKING TIMELINE BACKFILL
-- =========================================================

insert into
public.package_booking_events (
  company_id,
  booking_id,
  event_type,
  title,
  description,
  metadata,
  created_at
)
select
  pb.company_id,

  pb.id,

  'booking_created',

  'Rezervasyon oluşturuldu',

  concat(
    'Rezervasyon kodu: ',
    pb.booking_code
  ),

  jsonb_build_object(
    'booking_code',
      pb.booking_code,

    'sale_price',
      pb.sale_price,

    'status',
      pb.status
  ),

  coalesce(
    pb.booked_at,
    pb.created_at,
    now()
  )

from public.package_bookings pb

where not exists (
  select 1
  from public.package_booking_events e
  where e.booking_id =
    pb.id
    and e.event_type =
      'booking_created'
);


commit;
