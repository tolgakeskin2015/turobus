begin;

-- =========================================================
-- PACKAGE SUPPLIER SERVICE FLOW
-- Rezervasyon hizmeti -> tedarikçi -> teyit -> voucher -> hakediş
-- =========================================================


-- ---------------------------------------------------------
-- BOOKING ITEM OPERASYON ALANLARI
-- ---------------------------------------------------------

alter table public.package_booking_items
add column if not exists supplier_requested_at timestamptz;

alter table public.package_booking_items
add column if not exists supplier_confirmed_at timestamptz;

alter table public.package_booking_items
add column if not exists supplier_completed_at timestamptz;

alter table public.package_booking_items
add column if not exists supplier_confirmation_code text;

alter table public.package_booking_items
add column if not exists supplier_note text;

alter table public.package_booking_items
add column if not exists supplier_due_date date;

alter table public.package_booking_items
add column if not exists voucher_created_at timestamptz;


-- ---------------------------------------------------------
-- INDEX
-- ---------------------------------------------------------

create index if not exists
idx_package_booking_items_supplier_flow
on public.package_booking_items (
  company_id,
  supplier_id,
  supplier_status,
  service_date
);


-- =========================================================
-- SEND REQUEST TO SUPPLIER
-- =========================================================

create or replace function
public.package_booking_send_supplier_request(
  p_booking_item_id uuid,
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

  v_portal jsonb;

  v_portal_token uuid;
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


  if v_item.supplier_id is null then
    raise exception
      'Bu hizmete tedarikçi atanmadı.';
  end if;


  if v_item.supplier_status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'Tamamlanmış veya iptal edilmiş hizmet yeniden gönderilemez.';
  end if;


  -- Mevcut güvenli portal motorunu kullan.
  select
    public.ensure_package_supplier_portal(
      v_item.supplier_id
    )
  into v_portal;


  v_portal_token :=
    nullif(
      v_portal ->> 'portal_token',
      ''
    )::uuid;


  update public.package_booking_items
  set
    supplier_status =
      'requested',

    supplier_requested_at =
      now(),

    supplier_note =
      coalesce(
        nullif(
          trim(
            p_note
          ),
          ''
        ),
        supplier_note
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'supplier_request_source',
          'booking_action_center',

        'supplier_portal_token',
          v_portal_token,

        'supplier_request_sent_at',
          now()
      ),

    updated_at =
      now()

  where id =
    v_item.id;


  insert into public.package_booking_events (
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
    'supplier_request_sent',
    'Tedarikçiye talep gönderildi',
    concat(
      v_item.name,
      ' için tedarikçi talebi oluşturuldu.'
    ),
    jsonb_build_object(
      'supplier_id',
        v_item.supplier_id,

      'service_name',
        v_item.name,

      'service_date',
        v_item.service_date,

      'portal_token',
        v_portal_token,

      'note',
        p_note
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'booking_item_id',
        v_item.id,

      'supplier_status',
        'requested',

      'portal_token',
        v_portal_token,

      'portal_path',
        concat(
          '/tedarikci/',
          v_portal_token
        )
    );
end;
$$;


revoke all
on function
public.package_booking_send_supplier_request(
  uuid,
  text
)
from public;


grant execute
on function
public.package_booking_send_supplier_request(
  uuid,
  text
)
to authenticated;


-- =========================================================
-- CONFIRM SERVICE
-- =========================================================

create or replace function
public.package_booking_confirm_supplier_service(
  p_booking_item_id uuid,
  p_confirmation_code text default null,
  p_note text default null,
  p_due_date date default null
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

  v_payable_id uuid;
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


  if v_item.supplier_id is null then
    raise exception
      'Bu hizmete tedarikçi atanmadı.';
  end if;


  update public.package_booking_items
  set
    supplier_status =
      'confirmed',

    supplier_confirmed_at =
      coalesce(
        supplier_confirmed_at,
        now()
      ),

    supplier_confirmation_code =
      nullif(
        trim(
          coalesce(
            p_confirmation_code,
            ''
          )
        ),
        ''
      ),

    supplier_note =
      coalesce(
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        ),
        supplier_note
      ),

    supplier_due_date =
      coalesce(
        p_due_date,
        supplier_due_date
      ),

    updated_at =
      now()

  where id =
    v_item.id;


  -- Hakediş rezervasyon dönüşümünde zaten oluşmuş olabilir.
  -- Aynı booking_item için ikinci kayıt açmıyoruz.
  select id
  into v_payable_id

  from public.package_supplier_payables

  where booking_item_id =
    v_item.id

  order by created_at
  limit 1;


  if v_payable_id is null then

    insert into public.package_supplier_payables (
      company_id,
      booking_id,
      booking_item_id,
      supplier_id,
      amount,
      currency,
      due_date,
      paid_amount,
      status,
      notes,
      metadata
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,
      v_item.supplier_id,
      greatest(
        coalesce(
          v_item.total_cost,
          0
        ),
        0
      ),
      v_item.currency,
      p_due_date,
      0,
      'open',
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
        'source',
          'supplier_confirmation',

        'confirmation_code',
          nullif(
            trim(
              coalesce(
                p_confirmation_code,
                ''
              )
            ),
            ''
          )
      )
    )
    returning id
    into v_payable_id;

  else

    update public.package_supplier_payables
    set
      supplier_id =
        v_item.supplier_id,

      due_date =
        coalesce(
          p_due_date,
          due_date
        ),

      notes =
        coalesce(
          nullif(
            trim(
              coalesce(
                p_note,
                ''
              )
            ),
            ''
          ),
          notes
        ),

      metadata =
        coalesce(
          metadata,
          '{}'::jsonb
        )
        ||
        jsonb_build_object(
          'confirmation_code',
            nullif(
              trim(
                coalesce(
                  p_confirmation_code,
                  ''
                )
              ),
              ''
            ),

          'confirmed_at',
            now()
        ),

      updated_at =
        now()

    where id =
      v_payable_id;

  end if;


  insert into public.package_booking_events (
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
    'supplier_confirmed',
    'Tedarikçi hizmeti onayladı',
    concat(
      v_item.name,
      ' hizmeti teyit edildi.'
    ),
    jsonb_build_object(
      'supplier_id',
        v_item.supplier_id,

      'confirmation_code',
        nullif(
          trim(
            coalesce(
              p_confirmation_code,
              ''
            )
          ),
          ''
        ),

      'due_date',
        p_due_date,

      'payable_id',
        v_payable_id,

      'note',
        p_note
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'booking_item_id',
        v_item.id,

      'supplier_status',
        'confirmed',

      'payable_id',
        v_payable_id
    );
end;
$$;


revoke all
on function
public.package_booking_confirm_supplier_service(
  uuid,
  text,
  text,
  date
)
from public;


grant execute
on function
public.package_booking_confirm_supplier_service(
  uuid,
  text,
  text,
  date
)
to authenticated;


-- =========================================================
-- ENSURE VOUCHER
-- =========================================================

create or replace function
public.package_booking_ensure_voucher(
  p_booking_item_id uuid
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

  v_voucher
    public.package_vouchers%rowtype;

  v_code text;
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


  if v_item.supplier_status not in (
    'confirmed',
    'completed'
  ) then
    raise exception
      'Voucher oluşturmadan önce tedarikçi hizmeti onaylamalıdır.';
  end if;


  select *
  into v_voucher

  from public.package_vouchers

  where booking_item_id =
    v_item.id

  order by created_at
  limit 1;


  if not found then

    v_code :=
      concat(
        'VCH-',
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
        )
      );


    insert into public.package_vouchers (
      company_id,
      booking_id,
      booking_item_id,
      voucher_code,
      status,
      metadata
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,
      v_code,
      'active',
      jsonb_build_object(
        'service_name',
          v_item.name,

        'supplier_id',
          v_item.supplier_id,

        'service_date',
          v_item.service_date,

        'confirmation_code',
          v_item.supplier_confirmation_code,

        'source',
          'booking_action_center'
      )
    )
    returning *
    into v_voucher;


    update public.package_booking_items
    set
      voucher_created_at =
        now(),

      updated_at =
        now()

    where id =
      v_item.id;


    insert into public.package_booking_events (
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
      'voucher_created',
      'Voucher oluşturuldu',
      concat(
        v_item.name,
        ' için ',
        v_voucher.voucher_code,
        ' voucherı oluşturuldu.'
      ),
      jsonb_build_object(
        'voucher_id',
          v_voucher.id,

        'voucher_code',
          v_voucher.voucher_code,

        'qr_token',
          v_voucher.qr_token
      ),
      v_uid
    );

  end if;


  return
    jsonb_build_object(
      'success',
        true,

      'voucher_id',
        v_voucher.id,

      'voucher_code',
        v_voucher.voucher_code,

      'qr_token',
        v_voucher.qr_token,

      'voucher_path',
        concat(
          '/voucher/',
          v_voucher.qr_token
        )
    );
end;
$$;


revoke all
on function
public.package_booking_ensure_voucher(
  uuid
)
from public;


grant execute
on function
public.package_booking_ensure_voucher(
  uuid
)
to authenticated;


-- =========================================================
-- COMPLETE SUPPLIER SERVICE
-- =========================================================

create or replace function
public.package_booking_complete_supplier_service(
  p_booking_item_id uuid,
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


  if v_item.supplier_status <>
     'confirmed'
  then
    raise exception
      'Hizmet tamamlanmadan önce tedarikçi onayı gerekir.';
  end if;


  update public.package_booking_items
  set
    supplier_status =
      'completed',

    supplier_completed_at =
      now(),

    supplier_note =
      coalesce(
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        ),
        supplier_note
      ),

    updated_at =
      now()

  where id =
    v_item.id;


  insert into public.package_booking_events (
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
    'supplier_service_completed',
    'Hizmet tamamlandı',
    concat(
      v_item.name,
      ' hizmeti tamamlandı.'
    ),
    jsonb_build_object(
      'supplier_id',
        v_item.supplier_id,

      'service_date',
        v_item.service_date,

      'note',
        p_note
    ),
    v_uid
  );


  return
    jsonb_build_object(
      'success',
        true,

      'booking_item_id',
        v_item.id,

      'supplier_status',
        'completed'
    );
end;
$$;


revoke all
on function
public.package_booking_complete_supplier_service(
  uuid,
  text
)
from public;


grant execute
on function
public.package_booking_complete_supplier_service(
  uuid,
  text
)
to authenticated;


commit;
