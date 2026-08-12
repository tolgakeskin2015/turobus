-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-C
-- EXTRA ORDER OPERATION MANAGEMENT
-- =========================================================

alter table public.package_extra_orders
  add column if not exists operation_status text
  not null default 'new';

alter table public.package_extra_orders
  add column if not exists service_date date;

alter table public.package_extra_orders
  add column if not exists service_time time;

alter table public.package_extra_orders
  add column if not exists operation_notes text;

alter table public.package_extra_orders
  add column if not exists confirmed_at timestamptz;

alter table public.package_extra_orders
  add column if not exists service_started_at timestamptz;

alter table public.package_extra_orders
  add column if not exists completed_at timestamptz;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_extra_orders_operation_status_check'
  ) then
    alter table public.package_extra_orders
      add constraint
        package_extra_orders_operation_status_check
      check (
        operation_status in (
          'new',
          'confirmed',
          'in_service',
          'completed',
          'cancelled'
        )
      );
  end if;
end;
$$;


create index if not exists
  idx_package_extra_orders_company_operation
on public.package_extra_orders(
  company_id,
  operation_status,
  created_at desc
);


create index if not exists
  idx_package_extra_orders_service_date
on public.package_extra_orders(
  company_id,
  service_date
);


create or replace function
public.update_package_extra_operation(
  p_order_id uuid,
  p_operation_status text,
  p_service_date date default null,
  p_service_time time default null,
  p_operation_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.package_extra_orders%rowtype;
begin

  if p_operation_status not in (
    'new',
    'confirmed',
    'in_service',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Geçersiz operasyon durumu.';
  end if;


  select *
  into v_order
  from public.package_extra_orders
  where id = p_order_id
  limit 1;


  if not found then
    raise exception
      'Ekstra sipariş bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      v_order.company_id

      and cm.user_id =
        auth.uid()

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu işlem için yetkiniz bulunmuyor.';
  end if;


  update public.package_extra_orders
  set
    operation_status =
      p_operation_status,

    service_date =
      p_service_date,

    service_time =
      p_service_time,

    operation_notes =
      nullif(
        trim(
          coalesce(
            p_operation_notes,
            ''
          )
        ),
        ''
      ),

    confirmed_at =
      case
        when
          p_operation_status = 'confirmed'
          and confirmed_at is null
        then now()
        else confirmed_at
      end,

    service_started_at =
      case
        when
          p_operation_status = 'in_service'
          and service_started_at is null
        then now()
        else service_started_at
      end,

    completed_at =
      case
        when
          p_operation_status = 'completed'
          and completed_at is null
        then now()

        when
          p_operation_status <> 'completed'
        then null

        else completed_at
      end,

    updated_at = now()

  where id =
    p_order_id

  returning *
  into v_order;


  return jsonb_build_object(
    'id',
      v_order.id,

    'status',
      v_order.status,

    'operation_status',
      v_order.operation_status,

    'service_date',
      v_order.service_date,

    'service_time',
      v_order.service_time,

    'updated_at',
      v_order.updated_at
  );

end;
$$;


revoke all
on function public.update_package_extra_operation(
  uuid,
  text,
  date,
  time,
  text
)
from public;

grant execute
on function public.update_package_extra_operation(
  uuid,
  text,
  date,
  time,
  text
)
to authenticated;


comment on function
public.update_package_extra_operation(
  uuid,
  text,
  date,
  time,
  text
)
is
'Turobus Package OS extra order operation status update.';
