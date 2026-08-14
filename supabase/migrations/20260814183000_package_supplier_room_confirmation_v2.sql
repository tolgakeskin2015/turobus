begin;

-- =========================================================
-- PACKAGE OS V3 - PHASE 5
-- TEDARIKCI WHATSAPP + ODA BAZLI TEYIT
-- =========================================================


-- ---------------------------------------------------------
-- 1. ODA TEYIT SNAPSHOT
-- ---------------------------------------------------------

alter table public.package_booking_items
add column if not exists supplier_room_confirmation jsonb
not null default '[]'::jsonb;


-- ---------------------------------------------------------
-- 2. PROFESYONEL TEDARIKCI WHATSAPP MESAJI
-- ---------------------------------------------------------

create or replace function
public.package_booking_queue_supplier_whatsapp(
  p_booking_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_item public.package_booking_items%rowtype;
  v_booking public.package_bookings%rowtype;
  v_supplier public.suppliers%rowtype;

  v_portal jsonb;

  v_phone text;
  v_queue_id uuid;
  v_message text;

  v_room jsonb;
  v_room_text text := '';

  v_guest record;

  v_guest_text text := '';
  v_child_text text := '';

  v_room_index integer := 0;
  v_occupancy integer := 0;

begin

  select *
  into v_item
  from public.package_booking_items
  where id = p_booking_item_id;

  if not found then
    raise exception 'Hizmet bulunamadı.';
  end if;


  v_booking :=
    public.package_assert_booking_member(
      v_item.booking_id
    );


  if v_item.supplier_id is null then
    raise exception
      'Bu hizmete tedarikçi atanmadı.';
  end if;


  select *
  into v_supplier
  from public.suppliers
  where id = v_item.supplier_id
    and company_id = v_item.company_id;

  if not found then
    raise exception
      'Tedarikçi bulunamadı.';
  end if;


  v_phone :=
    public.normalize_package_whatsapp_phone(
      coalesce(
        v_supplier.whatsapp_phone,
        v_supplier.phone
      )
    );


  if v_phone is null then
    raise exception
      'Tedarikçinin WhatsApp/telefon numarası bulunamadı.';
  end if;


  select
    public.ensure_package_supplier_portal(
      v_item.supplier_id
    )
  into
    v_portal;


  -- ======================================================
  -- ODA PLANI
  -- ======================================================

  if
    v_booking.room_plan is not null
    and jsonb_typeof(v_booking.room_plan) = 'array'
  then

    for v_room in
      select value
      from jsonb_array_elements(
        v_booking.room_plan
      )
    loop

      v_room_index :=
        v_room_index + 1;

      v_occupancy :=
        coalesce(
          (v_room ->> 'adults')::integer,
          0
        )
        +
        coalesce(
          (v_room ->> 'children')::integer,
          0
        );


      v_room_text :=
        v_room_text
        ||
        case
          when v_room_index > 1
          then E'\n'
          else ''
        end
        ||
        v_room_index::text
        ||
        '. Oda: '
        ||
        case
          when v_occupancy = 1
            then 'Single'
          when v_occupancy = 2
            then 'Double'
          when v_occupancy = 3
            then 'Triple'
          else
            v_occupancy::text
            ||
            ' Kişilik'
        end
        ||
        ' ('
        ||
        coalesce(
          v_room ->> 'adults',
          '0'
        )
        ||
        ' yetişkin'
        ||
        case
          when
            coalesce(
              (v_room ->> 'children')::integer,
              0
            ) > 0
          then
            ' + '
            ||
            coalesce(
              v_room ->> 'children',
              '0'
            )
            ||
            ' çocuk'
          else ''
        end
        ||
        ')';

    end loop;

  end if;


  -- ======================================================
  -- MISAFIRLER + COCUK YASLARI
  -- ======================================================

  for v_guest in

    select
      guest_order,
      guest_type,
      full_name,
      child_age

    from public.package_booking_guests

    where booking_id = v_booking.id
      and company_id = v_booking.company_id

    order by guest_order

  loop

    v_guest_text :=
      v_guest_text
      ||
      case
        when v_guest_text <> ''
          then E'\n'
        else ''
      end
      ||
      v_guest.guest_order::text
      ||
      '. '
      ||
      coalesce(
        v_guest.full_name,
        '-'
      )
      ||
      case
        when v_guest.guest_type = 'child'
        then
          ' · Çocuk'
          ||
          case
            when v_guest.child_age is not null
            then
              ' · '
              ||
              v_guest.child_age::text
              ||
              ' yaş'
            else ''
          end
        else
          ' · Yetişkin'
      end;


    if
      v_guest.guest_type = 'child'
      and v_guest.child_age is not null
    then

      v_child_text :=
        v_child_text
        ||
        case
          when v_child_text <> ''
            then ', '
          else ''
        end
        ||
        v_guest.child_age::text
        ||
        ' yaş';

    end if;

  end loop;


  -- ======================================================
  -- PROFESYONEL WHATSAPP MESAJI
  -- ======================================================

  v_message :=
    concat(

      '📌 YENİ REZERVASYON TALEBİ',
      E'\n\n',

      'Rezervasyon: ',
      v_booking.booking_code,
      E'\n',

      'Hizmet: ',
      v_item.name,
      E'\n',

      'Misafir: ',
      v_booking.customer_name,
      E'\n',

      'Kişi: ',
      v_booking.adults,
      ' yetişkin',

      case
        when v_booking.children > 0
        then
          ' + '
          ||
          v_booking.children
          ||
          ' çocuk'
        else ''
      end,

      E'\n',

      case
        when
          v_booking.children > 0
          and v_child_text <> ''
        then
          'Çocuk Yaşları: '
          ||
          v_child_text
          ||
          E'\n'
        else ''
      end,

      E'\n',

      '📅 Giriş: ',
      v_booking.check_in::text,
      E'\n',

      '📅 Çıkış: ',
      v_booking.check_out::text,
      E'\n',

      '🌙 Konaklama: ',
      v_booking.nights,
      ' gece',

      case
        when v_item.service_date is not null
        then
          E'\nHizmet Tarihi: '
          ||
          v_item.service_date::text
        else ''
      end,

      case
        when v_item.service_time is not null
        then
          E'\nSaat: '
          ||
          to_char(
            v_item.service_time,
            'HH24:MI'
          )
        else ''
      end,

      case
        when v_room_text <> ''
        then
          E'\n\n🏨 ODA DAĞILIMI\n'
          ||
          v_room_text
        else ''
      end,

      case
        when v_guest_text <> ''
        then
          E'\n\n👥 MİSAFİR LİSTESİ\n'
          ||
          v_guest_text
        else ''
      end,

      E'\n\n',

      'Lütfen rezervasyonu kontrol ederek teyit numarası ve varsa notunuzu giriniz.',

      E'\n\n',

      '🔗 Tedarikçi Portalı:',
      E'\n',

      '/tedarikci/',
      v_portal ->> 'portal_token'

    );


  -- ======================================================
  -- WHATSAPP KUYRUGU
  -- ======================================================

  insert into public.package_whatsapp_queue (
    company_id,
    supplier_id,
    source,
    source_id,
    to_phone,
    supplier_name,
    title,
    message,
    metadata
  )
  values (
    v_item.company_id,
    v_item.supplier_id,
    'manual',
    v_item.id,
    v_phone,
    v_supplier.name,
    'Yeni rezervasyon / hizmet talebi',
    v_message,

    jsonb_build_object(
      'booking_id',
        v_item.booking_id,

      'booking_code',
        v_booking.booking_code,

      'booking_item_id',
        v_item.id,

      'service_name',
        v_item.name,

      'service_date',
        v_item.service_date,

      'check_in',
        v_booking.check_in,

      'check_out',
        v_booking.check_out,

      'nights',
        v_booking.nights,

      'adults',
        v_booking.adults,

      'children',
        v_booking.children,

      'room_plan',
        coalesce(
          v_booking.room_plan,
          '[]'::jsonb
        ),

      'portal_token',
        v_portal ->> 'portal_token'
    )

  )
  returning id
  into v_queue_id;


  -- ======================================================
  -- TIMELINE
  -- ======================================================

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
    v_item.company_id,
    v_item.booking_id,
    v_item.id,

    'supplier_whatsapp_queued',

    'Tedarikçi WhatsApp mesajı kuyruğa alındı',

    concat(
      v_supplier.name,
      ' için oda ve misafir detaylı WhatsApp talebi hazırlandı.'
    ),

    jsonb_build_object(
      'queue_id',
        v_queue_id,

      'supplier_id',
        v_item.supplier_id,

      'phone',
        v_phone,

      'room_plan',
        coalesce(
          v_booking.room_plan,
          '[]'::jsonb
        )
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'success',
      true,

    'queue_id',
      v_queue_id,

    'supplier_name',
      v_supplier.name,

    'to_phone',
      v_phone,

    'message',
      v_message
  );

end;
$$;


revoke all
on function
public.package_booking_queue_supplier_whatsapp(uuid)
from public;

grant execute
on function
public.package_booking_queue_supplier_whatsapp(uuid)
to authenticated;


-- =========================================================
-- 3. ODA BAZLI TEDARIKCI TEYIDI V2
-- =========================================================

create or replace function
public.package_booking_confirm_supplier_service_v2(
  p_booking_item_id uuid,
  p_confirmation_code text default null,
  p_note text default null,
  p_due_date date default null,
  p_room_confirmation jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_item public.package_booking_items%rowtype;
  v_result jsonb;
  v_booking public.package_bookings%rowtype;

begin

  select *
  into v_item
  from public.package_booking_items
  where id = p_booking_item_id
  for update;


  if not found then
    raise exception
      'Hizmet bulunamadı.';
  end if;


  v_booking :=
    public.package_assert_booking_member(
      v_item.booking_id
    );


  if p_room_confirmation is null then
    p_room_confirmation :=
      '[]'::jsonb;
  end if;


  if jsonb_typeof(
    p_room_confirmation
  ) <> 'array'
  then
    raise exception
      'Oda teyit bilgisi geçersiz.';
  end if;


  -- Mevcut teyit ve hakediş motorunu koruyoruz.
  v_result :=
    public.package_booking_confirm_supplier_service(
      p_booking_item_id,
      p_confirmation_code,
      p_note,
      p_due_date
    );


  update public.package_booking_items
  set
    supplier_room_confirmation =
      case
        when jsonb_array_length(
          p_room_confirmation
        ) > 0
        then p_room_confirmation
        else coalesce(
          supplier_room_confirmation,
          '[]'::jsonb
        )
      end,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'supplier_room_confirmation',
          p_room_confirmation,

        'supplier_room_confirmation_at',
          now(),

        'supplier_confirmation_code',
          nullif(
            trim(
              coalesce(
                p_confirmation_code,
                ''
              )
            ),
            ''
          )
      ),

    updated_at = now()

  where id = p_booking_item_id;


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
    v_item.company_id,
    v_item.booking_id,
    v_item.id,

    'supplier_room_confirmation',

    'Oda dağılımı tedarikçi tarafından teyit edildi',

    concat(
      v_item.name,
      ' için oda teyit bilgileri kaydedildi.'
    ),

    jsonb_build_object(
      'confirmation_code',
        p_confirmation_code,

      'room_confirmation',
        p_room_confirmation,

      'note',
        p_note,

      'due_date',
        p_due_date
    ),

    auth.uid()
  );


  return
    coalesce(
      v_result,
      '{}'::jsonb
    )
    ||
    jsonb_build_object(
      'room_confirmation',
        p_room_confirmation,

      'confirmation_code',
        p_confirmation_code,

      'success',
        true
    );

end;
$$;


revoke all
on function
public.package_booking_confirm_supplier_service_v2(
  uuid,
  text,
  text,
  date,
  jsonb
)
from public;

grant execute
on function
public.package_booking_confirm_supplier_service_v2(
  uuid,
  text,
  text,
  date,
  jsonb
)
to authenticated;


commit;
