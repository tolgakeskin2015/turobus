begin;

-- =========================================================
-- PACKAGE OS V3 - PHASE 8
-- ODA UYUSMAZLIK COZUM MERKEZI
-- =========================================================


alter table public.package_booking_items
add column if not exists
supplier_room_issue_status text
not null default 'none';


alter table public.package_booking_items
add column if not exists
supplier_room_issue_note text;


alter table public.package_booking_items
add column if not exists
supplier_room_issue_assigned_to uuid;


alter table public.package_booking_items
add column if not exists
supplier_room_issue_opened_at timestamptz;


alter table public.package_booking_items
add column if not exists
supplier_room_issue_resolved_at timestamptz;


alter table public.package_booking_items
drop constraint if exists
package_booking_items_supplier_room_issue_status_check;


alter table public.package_booking_items
add constraint
package_booking_items_supplier_room_issue_status_check
check (
  supplier_room_issue_status in (
    'none',
    'open',
    'waiting_supplier',
    'assigned',
    'resolved'
  )
);


-- =========================================================
-- TEK AKSIYON MOTORU
-- =========================================================

create or replace function
public.package_booking_room_issue_action(
  p_booking_item_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_item
    public.package_booking_items%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_queue_result jsonb;

  v_queue_id uuid;

  v_clean_note text;

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


  v_clean_note :=
    nullif(
      trim(
        coalesce(
          p_note,
          ''
        )
      ),
      ''
    );


  if p_action not in (
    'request_alternative',
    'resend_supplier',
    'assign_to_me',
    'resolve',
    'reopen'
  )
  then
    raise exception
      'Geçersiz uyuşmazlık aksiyonu.';
  end if;


  -- ======================================================
  -- ALTERNATIF ODA ISTE
  -- ======================================================

  if p_action =
    'request_alternative'
  then

    if v_item.supplier_id is null then
      raise exception
        'Tedarikçisi olmayan hizmet için alternatif oda istenemez.';
    end if;


    update public.package_booking_items
    set
      supplier_room_issue_status =
        'waiting_supplier',

      supplier_room_issue_note =
        coalesce(
          v_clean_note,
          supplier_room_issue_note,
          'Tedarikçiden alternatif oda talep edildi.'
        ),

      supplier_room_issue_assigned_to =
        coalesce(
          supplier_room_issue_assigned_to,
          auth.uid()
        ),

      supplier_room_issue_opened_at =
        coalesce(
          supplier_room_issue_opened_at,
          now()
        ),

      supplier_room_issue_resolved_at =
        null,

      updated_at =
        now()

    where id =
      p_booking_item_id;


    v_queue_result :=
      public.package_booking_queue_supplier_whatsapp(
        p_booking_item_id
      );


    begin

      v_queue_id :=
        nullif(
          v_queue_result ->>
          'queue_id',
          ''
        )::uuid;

    exception
      when others then
        v_queue_id := null;
    end;


    if v_queue_id is not null then

      update public.package_whatsapp_queue

      set
        title =
          'ACİL - Alternatif oda talebi',

        message =
          concat(
            '⚠️ ALTERNATİF ODA TALEBİ',
            E'\n\n',
            'Mevcut oda teyidinde uyuşmazlık bulunmaktadır.',
            E'\n',
            'Lütfen uygun alternatif oda/odaları kontrol ederek portal üzerinden yeni teyit veriniz.',
            E'\n\n',
            case
              when v_clean_note is not null
              then
                'Acenta Notu: '
                ||
                v_clean_note
                ||
                E'\n\n'
              else ''
            end,
            message
          ),

        metadata =
          coalesce(
            metadata,
            '{}'::jsonb
          )
          ||
          jsonb_build_object(
            'room_issue',
              true,

            'room_issue_action',
              'request_alternative',

            'room_issue_note',
              v_clean_note
          )

      where id =
        v_queue_id;

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
      v_item.company_id,
      v_item.booking_id,
      v_item.id,

      'room_issue_alternative_requested',

      'Alternatif oda talep edildi',

      concat(
        v_item.name,
        ' için tedarikçiden alternatif oda talep edildi.'
      ),

      jsonb_build_object(
        'note',
          v_clean_note,

        'queue_id',
          v_queue_id
      ),

      auth.uid()
    );


  -- ======================================================
  -- TEDARIKCIYE YENIDEN GONDER
  -- ======================================================

  elsif p_action =
    'resend_supplier'
  then

    if v_item.supplier_id is null then
      raise exception
        'Bu hizmette tedarikçi bulunamadı.';
    end if;


    v_queue_result :=
      public.package_booking_queue_supplier_whatsapp(
        p_booking_item_id
      );


    begin

      v_queue_id :=
        nullif(
          v_queue_result ->>
          'queue_id',
          ''
        )::uuid;

    exception
      when others then
        v_queue_id := null;
    end;


    update public.package_booking_items
    set
      supplier_room_issue_status =
        case
          when supplier_room_issue_status =
            'resolved'
          then
            'waiting_supplier'
          when supplier_room_issue_status =
            'none'
          then
            'waiting_supplier'
          else
            supplier_room_issue_status
        end,

      supplier_room_issue_opened_at =
        coalesce(
          supplier_room_issue_opened_at,
          now()
        ),

      supplier_room_issue_resolved_at =
        null,

      updated_at =
        now()

    where id =
      p_booking_item_id;


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

      'room_issue_supplier_resent',

      'Tedarikçiye tekrar gönderildi',

      concat(
        v_item.name,
        ' oda teyit talebi tedarikçiye yeniden gönderildi.'
      ),

      jsonb_build_object(
        'queue_id',
          v_queue_id,

        'note',
          v_clean_note
      ),

      auth.uid()
    );


  -- ======================================================
  -- BANA ATA
  -- ======================================================

  elsif p_action =
    'assign_to_me'
  then

    update public.package_booking_items
    set
      supplier_room_issue_status =
        'assigned',

      supplier_room_issue_assigned_to =
        auth.uid(),

      supplier_room_issue_note =
        coalesce(
          v_clean_note,
          supplier_room_issue_note
        ),

      supplier_room_issue_opened_at =
        coalesce(
          supplier_room_issue_opened_at,
          now()
        ),

      supplier_room_issue_resolved_at =
        null,

      updated_at =
        now()

    where id =
      p_booking_item_id;


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

      'room_issue_assigned',

      'Oda uyuşmazlığı operasyon sorumlusuna atandı',

      concat(
        v_item.name,
        ' oda uyuşmazlığı kullanıcı tarafından üzerine alındı.'
      ),

      jsonb_build_object(
        'assigned_to',
          auth.uid(),

        'note',
          v_clean_note
      ),

      auth.uid()
    );


  -- ======================================================
  -- SORUN COZULDU
  -- ======================================================

  elsif p_action =
    'resolve'
  then

    update public.package_booking_items
    set
      supplier_room_issue_status =
        'resolved',

      supplier_room_issue_note =
        coalesce(
          v_clean_note,
          supplier_room_issue_note
        ),

      supplier_room_issue_assigned_to =
        coalesce(
          supplier_room_issue_assigned_to,
          auth.uid()
        ),

      supplier_room_issue_resolved_at =
        now(),

      updated_at =
        now()

    where id =
      p_booking_item_id;


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

      'room_issue_resolved',

      'Oda uyuşmazlığı çözüldü',

      concat(
        v_item.name,
        ' için oda uyuşmazlığı çözüldü.'
      ),

      jsonb_build_object(
        'note',
          v_clean_note
      ),

      auth.uid()
    );


  -- ======================================================
  -- TEKRAR AC
  -- ======================================================

  elsif p_action =
    'reopen'
  then

    update public.package_booking_items
    set
      supplier_room_issue_status =
        'open',

      supplier_room_issue_note =
        coalesce(
          v_clean_note,
          supplier_room_issue_note
        ),

      supplier_room_issue_opened_at =
        now(),

      supplier_room_issue_resolved_at =
        null,

      updated_at =
        now()

    where id =
      p_booking_item_id;


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

      'room_issue_reopened',

      'Oda uyuşmazlığı yeniden açıldı',

      concat(
        v_item.name,
        ' oda uyuşmazlığı yeniden açıldı.'
      ),

      jsonb_build_object(
        'note',
          v_clean_note
      ),

      auth.uid()
    );

  end if;


  select *
  into v_item
  from public.package_booking_items
  where id =
    p_booking_item_id;


  return jsonb_build_object(
    'success',
      true,

    'item_id',
      v_item.id,

    'issue_status',
      v_item.supplier_room_issue_status,

    'issue_note',
      v_item.supplier_room_issue_note,

    'assigned_to',
      v_item.supplier_room_issue_assigned_to,

    'queue_id',
      v_queue_id
  );

end;
$$;


revoke all
on function
public.package_booking_room_issue_action(
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.package_booking_room_issue_action(
  uuid,
  text,
  text
)
to authenticated;


-- =========================================================
-- MEVCUT REDDEDILMIS ODALARI OTOMATIK OPEN YAP
-- =========================================================

update public.package_booking_items
set
  supplier_room_issue_status =
    'open',

  supplier_room_issue_opened_at =
    coalesce(
      supplier_room_issue_opened_at,
      now()
    )

where exists (
  select 1
  from jsonb_array_elements(
    coalesce(
      supplier_room_confirmation,
      '[]'::jsonb
    )
  ) room
  where room ->> 'status' =
    'rejected'
)
and supplier_room_issue_status =
  'none';


commit;
