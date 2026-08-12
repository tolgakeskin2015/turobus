begin;


create or replace function
public.update_package_operation_admin(
  p_source text,
  p_item_id uuid,
  p_status text
)
returns jsonb

language plpgsql
security definer
set search_path = public

as $$
declare

  v_uid uuid :=
    auth.uid();

  v_company_id uuid;

  v_extra_order_id uuid;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if p_source =
    'package'
  then

    if p_status not in (
      'requested',
      'confirmed',
      'completed',
      'cancelled'
    ) then
      raise exception
        'Geçersiz paket operasyon durumu.';
    end if;


    select
      bi.company_id

    into
      v_company_id

    from
      public.package_booking_items bi

    where bi.id =
      p_item_id

    limit 1;


    if not found then
      raise exception
        'Paket operasyonu bulunamadı.';
    end if;


    if not exists (
      select 1

      from
        public.company_members cm

      where cm.company_id =
          v_company_id

        and cm.user_id =
          v_uid

        and coalesce(
          cm.is_active,
          true
        ) = true
    ) then
      raise exception
        'Bu operasyon için yetkiniz yok.';
    end if;


    update
      public.package_booking_items

    set
      supplier_status =
        p_status,

      updated_at =
        now()

    where id =
      p_item_id;


    update
      public.package_supplier_notifications

    set
      status =
        case
          when p_status in (
            'confirmed',
            'completed',
            'cancelled'
          )
          then 'dismissed'
          else status
        end,

      updated_at =
        now()

    where company_id =
        v_company_id

      and source =
        'package'

      and source_id =
        p_item_id

      and status =
        'unread';


  elsif p_source =
    'extra'
  then

    if p_status not in (
      'confirmed',
      'in_service',
      'completed',
      'cancelled'
    ) then
      raise exception
        'Geçersiz ekstra operasyon durumu.';
    end if;


    select
      ei.company_id,
      ei.order_id

    into
      v_company_id,
      v_extra_order_id

    from
      public.package_extra_order_items ei

    where ei.id =
      p_item_id

    limit 1;


    if not found then
      raise exception
        'Ekstra operasyon bulunamadı.';
    end if;


    if not exists (
      select 1

      from
        public.company_members cm

      where cm.company_id =
          v_company_id

        and cm.user_id =
          v_uid

        and coalesce(
          cm.is_active,
          true
        ) = true
    ) then
      raise exception
        'Bu operasyon için yetkiniz yok.';
    end if;


    update
      public.package_extra_orders

    set
      operation_status =
        p_status,

      confirmed_at =
        case
          when p_status =
            'confirmed'
          then coalesce(
            confirmed_at,
            now()
          )
          else confirmed_at
        end,

      service_started_at =
        case
          when p_status =
            'in_service'
          then coalesce(
            service_started_at,
            now()
          )
          else service_started_at
        end,

      completed_at =
        case
          when p_status =
            'completed'
          then coalesce(
            completed_at,
            now()
          )
          else completed_at
        end,

      updated_at =
        now()

    where id =
        v_extra_order_id

      and company_id =
        v_company_id

      and status =
        'paid';


    if not found then
      raise exception
        'Ekstra sipariş güncellenemedi.';
    end if;


    update
      public.package_supplier_notifications

    set
      status =
        case
          when p_status in (
            'confirmed',
            'in_service',
            'completed',
            'cancelled'
          )
          then 'dismissed'
          else status
        end,

      updated_at =
        now()

    where company_id =
        v_company_id

      and source =
        'extra'

      and source_id =
        p_item_id

      and status =
        'unread';


  else

    raise exception
      'Geçersiz operasyon kaynağı.';

  end if;


  return jsonb_build_object(

    'success',
      true,

    'source',
      p_source,

    'item_id',
      p_item_id,

    'status',
      p_status

  );

end;
$$;


revoke all
on function
public.update_package_operation_admin(
  text,
  uuid,
  text
)
from public;


grant execute
on function
public.update_package_operation_admin(
  text,
  uuid,
  text
)
to authenticated;


commit;
