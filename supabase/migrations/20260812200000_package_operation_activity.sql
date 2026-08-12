begin;

create table if not exists
public.package_operation_activity (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  source text not null,

  item_id uuid not null,

  activity_type text not null,

  previous_status text,

  new_status text,

  note text,

  actor_user_id uuid,

  actor_email text,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint package_operation_activity_source_check
  check (
    source in (
      'package',
      'extra'
    )
  ),

  constraint package_operation_activity_type_check
  check (
    activity_type in (
      'status_change',
      'note'
    )
  )
);


create index if not exists
idx_package_operation_activity_lookup
on public.package_operation_activity (
  company_id,
  source,
  item_id,
  created_at desc
);


alter table
public.package_operation_activity
enable row level security;


drop policy if exists
package_operation_activity_company_members
on public.package_operation_activity;


create policy
package_operation_activity_company_members
on public.package_operation_activity
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_operation_activity.company_id
    and cm.user_id =
      auth.uid()
    and coalesce(
      cm.is_active,
      true
    ) = true
  )
);


create or replace function
public.add_package_operation_note(
  p_source text,
  p_item_id uuid,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_company_id uuid;

  v_email text :=
    auth.jwt() ->> 'email';

  v_note text :=
    trim(
      coalesce(
        p_note,
        ''
      )
    );

  v_activity_id uuid;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if v_note = '' then
    raise exception
      'Not boş olamaz.';
  end if;


  if length(v_note) > 2000 then
    raise exception
      'Not en fazla 2000 karakter olabilir.';
  end if;


  if p_source = 'package' then

    select company_id
    into v_company_id
    from public.package_booking_items
    where id = p_item_id
    limit 1;

  elsif p_source = 'extra' then

    select company_id
    into v_company_id
    from public.package_extra_order_items
    where id = p_item_id
    limit 1;

  else

    raise exception
      'Geçersiz operasyon kaynağı.';

  end if;


  if v_company_id is null then
    raise exception
      'Operasyon bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm
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


  insert into
  public.package_operation_activity (
    company_id,
    source,
    item_id,
    activity_type,
    note,
    actor_user_id,
    actor_email
  )
  values (
    v_company_id,
    p_source,
    p_item_id,
    'note',
    v_note,
    v_uid,
    v_email
  )
  returning id
  into v_activity_id;


  return jsonb_build_object(
    'success',
      true,
    'activity_id',
      v_activity_id
  );

end;
$$;


revoke all
on function
public.add_package_operation_note(
  text,
  uuid,
  text
)
from public;


grant execute
on function
public.add_package_operation_note(
  text,
  uuid,
  text
)
to authenticated;


create or replace function
public.get_package_operation_activity(
  p_source text,
  p_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_company_id uuid;

  v_rows jsonb;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if p_source = 'package' then

    select company_id
    into v_company_id
    from public.package_booking_items
    where id = p_item_id
    limit 1;

  elsif p_source = 'extra' then

    select company_id
    into v_company_id
    from public.package_extra_order_items
    where id = p_item_id
    limit 1;

  else

    raise exception
      'Geçersiz operasyon kaynağı.';

  end if;


  if v_company_id is null then
    raise exception
      'Operasyon bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm
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


  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',
          a.id,
        'activity_type',
          a.activity_type,
        'previous_status',
          a.previous_status,
        'new_status',
          a.new_status,
        'note',
          a.note,
        'actor_user_id',
          a.actor_user_id,
        'actor_email',
          a.actor_email,
        'created_at',
          a.created_at
      )
      order by a.created_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.package_operation_activity a
  where a.company_id =
    v_company_id
  and a.source =
    p_source
  and a.item_id =
    p_item_id;


  return v_rows;

end;
$$;


revoke all
on function
public.get_package_operation_activity(
  text,
  uuid
)
from public;


grant execute
on function
public.get_package_operation_activity(
  text,
  uuid
)
to authenticated;


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

  v_email text :=
    auth.jwt() ->> 'email';

  v_company_id uuid;

  v_extra_order_id uuid;

  v_previous_status text;

begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if p_source = 'package' then

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
      bi.company_id,
      bi.supplier_status
    into
      v_company_id,
      v_previous_status
    from public.package_booking_items bi
    where bi.id =
      p_item_id
    limit 1;


    if not found then
      raise exception
        'Paket operasyonu bulunamadı.';
    end if;


    if not exists (
      select 1
      from public.company_members cm
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


    update public.package_booking_items
    set
      supplier_status =
        p_status,
      updated_at =
        now()
    where id =
      p_item_id;


  elsif p_source = 'extra' then

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
      ei.order_id,
      eo.operation_status
    into
      v_company_id,
      v_extra_order_id,
      v_previous_status
    from public.package_extra_order_items ei
    join public.package_extra_orders eo
      on eo.id =
        ei.order_id
    where ei.id =
      p_item_id
    limit 1;


    if not found then
      raise exception
        'Ekstra operasyon bulunamadı.';
    end if;


    if not exists (
      select 1
      from public.company_members cm
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


    update public.package_extra_orders
    set
      operation_status =
        p_status,

      confirmed_at =
        case
          when p_status = 'confirmed'
          then coalesce(
            confirmed_at,
            now()
          )
          else confirmed_at
        end,

      service_started_at =
        case
          when p_status = 'in_service'
          then coalesce(
            service_started_at,
            now()
          )
          else service_started_at
        end,

      completed_at =
        case
          when p_status = 'completed'
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


  else

    raise exception
      'Geçersiz operasyon kaynağı.';

  end if;


  if coalesce(
    v_previous_status,
    ''
  ) <>
  coalesce(
    p_status,
    ''
  ) then

    insert into
    public.package_operation_activity (
      company_id,
      source,
      item_id,
      activity_type,
      previous_status,
      new_status,
      actor_user_id,
      actor_email,
      metadata
    )
    values (
      v_company_id,
      p_source,
      p_item_id,
      'status_change',
      v_previous_status,
      p_status,
      v_uid,
      v_email,
      jsonb_build_object(
        'source',
        'control_tower'
      )
    );

  end if;


  update public.package_supplier_notifications
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
    p_source
  and source_id =
    p_item_id
  and status =
    'unread';


  return jsonb_build_object(
    'success',
      true,
    'source',
      p_source,
    'item_id',
      p_item_id,
    'previous_status',
      v_previous_status,
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
