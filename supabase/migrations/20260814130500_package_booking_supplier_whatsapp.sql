begin;

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
  v_item
    public.package_booking_items%rowtype;

  v_booking
    public.package_bookings%rowtype;

  v_supplier
    public.suppliers%rowtype;

  v_portal jsonb;

  v_phone text;

  v_queue_id uuid;

  v_message text;
begin

  select *
  into v_item
  from public.package_booking_items
  where id =
    p_booking_item_id;


  if not found then
    raise exception
      'Hizmet bulunamadı.';
  end if;


  v_booking :=
    public.package_assert_booking_member(
      v_item.booking_id
    );


  if v_item.supplier_id
     is null
  then
    raise exception
      'Bu hizmete tedarikçi atanmadı.';
  end if;


  select *
  into v_supplier
  from public.suppliers
  where id =
    v_item.supplier_id
    and company_id =
      v_item.company_id;


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
  into v_portal;


  v_message :=
    concat(
      'Rezervasyon: ',
      v_booking.booking_code,
      E'\n',
      'Hizmet: ',
      v_item.name,
      E'\n',
      'Tarih: ',
      coalesce(
        v_item.service_date::text,
        '-'
      ),
      case
        when v_item.service_time
          is not null
        then
          E'\nSaat: ' ||
          to_char(
            v_item.service_time,
            'HH24:MI'
          )
        else ''
      end,
      E'\n',
      'Portal: /tedarikci/',
      v_portal ->> 'portal_token'
    );


  insert into
  public.package_whatsapp_queue (
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

      'portal_token',
        v_portal ->> 'portal_token'
    )
  )
  returning id
  into v_queue_id;


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
    v_item.company_id,
    v_item.booking_id,
    v_item.id,
    'supplier_whatsapp_queued',
    'Tedarikçi WhatsApp mesajı kuyruğa alındı',
    concat(
      v_supplier.name,
      ' için WhatsApp mesajı hazırlandı.'
    ),
    jsonb_build_object(
      'queue_id',
        v_queue_id,

      'supplier_id',
        v_item.supplier_id,

      'phone',
        v_phone
    ),
    auth.uid()
  );


  return
    jsonb_build_object(
      'success',
        true,

      'queue_id',
        v_queue_id,

      'supplier_name',
        v_supplier.name,

      'to_phone',
        v_phone
    );

end;
$$;


revoke all
on function
public.package_booking_queue_supplier_whatsapp(
  uuid
)
from public;


grant execute
on function
public.package_booking_queue_supplier_whatsapp(
  uuid
)
to authenticated;


commit;
