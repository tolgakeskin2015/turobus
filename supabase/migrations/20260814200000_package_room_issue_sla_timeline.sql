begin;

alter table public.package_booking_items
add column if not exists supplier_room_issue_priority text
not null default 'high';

alter table public.package_booking_items
add column if not exists supplier_room_issue_sla_due_at timestamptz;

alter table public.package_booking_items
drop constraint if exists
package_booking_items_supplier_room_issue_priority_check;

alter table public.package_booking_items
add constraint
package_booking_items_supplier_room_issue_priority_check
check (
  supplier_room_issue_priority in (
    'low',
    'normal',
    'high',
    'critical'
  )
);


create or replace function
public.package_room_issue_default_sla()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_hours integer;
begin

  if new.supplier_room_issue_status in (
    'open',
    'waiting_supplier',
    'assigned'
  )
  and (
    old.supplier_room_issue_status is distinct from
    new.supplier_room_issue_status
  )
  and new.supplier_room_issue_sla_due_at is null
  then

    v_hours :=
      case new.supplier_room_issue_priority
        when 'critical' then 2
        when 'high' then 4
        when 'normal' then 8
        else 24
      end;

    new.supplier_room_issue_sla_due_at :=
      now() +
      make_interval(
        hours => v_hours
      );

  end if;

  if new.supplier_room_issue_status = 'resolved' then
    new.supplier_room_issue_sla_due_at :=
      coalesce(
        new.supplier_room_issue_sla_due_at,
        now()
      );
  end if;

  return new;
end;
$$;


drop trigger if exists
trg_package_room_issue_default_sla
on public.package_booking_items;

create trigger
trg_package_room_issue_default_sla
before update
on public.package_booking_items
for each row
execute function
public.package_room_issue_default_sla();


update public.package_booking_items
set
  supplier_room_issue_sla_due_at =
    now() +
    interval '4 hours'
where supplier_room_issue_status in (
  'open',
  'waiting_supplier',
  'assigned'
)
and supplier_room_issue_sla_due_at is null;


create or replace function
public.package_booking_room_issue_manage_v2(
  p_booking_item_id uuid,
  p_assigned_to uuid default null,
  p_priority text default null,
  p_sla_hours integer default null,
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

  v_priority text;

  v_assignee_name text;

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


  v_priority :=
    coalesce(
      nullif(
        trim(
          coalesce(
            p_priority,
            ''
          )
        ),
        ''
      ),
      v_item.supplier_room_issue_priority,
      'high'
    );


  if v_priority not in (
    'low',
    'normal',
    'high',
    'critical'
  ) then

    raise exception
      'Geçersiz öncelik seviyesi.';

  end if;


  if
    p_sla_hours is not null
    and (
      p_sla_hours < 1
      or p_sla_hours > 720
    )
  then

    raise exception
      'SLA süresi 1 ile 720 saat arasında olmalıdır.';

  end if;


  if p_assigned_to is not null then

    select
      cm.full_name
    into
      v_assignee_name
    from public.company_members cm
    where cm.company_id =
      v_item.company_id
      and cm.user_id =
        p_assigned_to
      and coalesce(
        cm.is_active,
        true
      ) = true
    limit 1;


    if not found then
      raise exception
        'Seçilen personel bu firmada aktif değil.';
    end if;

  end if;


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


  update public.package_booking_items
  set

    supplier_room_issue_status =
      case
        when supplier_room_issue_status in (
          'none',
          'resolved'
        )
        then 'assigned'
        else supplier_room_issue_status
      end,

    supplier_room_issue_assigned_to =
      coalesce(
        p_assigned_to,
        supplier_room_issue_assigned_to
      ),

    supplier_room_issue_priority =
      v_priority,

    supplier_room_issue_sla_due_at =
      case

        when p_sla_hours is not null
        then
          now() +
          make_interval(
            hours =>
              p_sla_hours
          )

        when supplier_room_issue_sla_due_at is not null
        then
          supplier_room_issue_sla_due_at

        else
          now() +
          make_interval(
            hours =>
              case v_priority
                when 'critical' then 2
                when 'high' then 4
                when 'normal' then 8
                else 24
              end
          )

      end,

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
      case
        when supplier_room_issue_status =
          'resolved'
        then null
        else supplier_room_issue_resolved_at
      end,

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

    'room_issue_sla_updated',

    'Operasyon görevi ve SLA güncellendi',

    concat(
      v_item.name,
      ' için sorumlu, öncelik veya SLA bilgisi güncellendi.'
    ),

    jsonb_build_object(
      'assigned_to',
        p_assigned_to,

      'assigned_name',
        v_assignee_name,

      'priority',
        v_priority,

      'sla_hours',
        p_sla_hours,

      'note',
        v_clean_note
    ),

    auth.uid()
  );


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

    'assigned_to',
      v_item.supplier_room_issue_assigned_to,

    'priority',
      v_item.supplier_room_issue_priority,

    'sla_due_at',
      v_item.supplier_room_issue_sla_due_at
  );

end;
$$;


revoke all
on function
public.package_booking_room_issue_manage_v2(
  uuid,
  uuid,
  text,
  integer,
  text
)
from public;


grant execute
on function
public.package_booking_room_issue_manage_v2(
  uuid,
  uuid,
  text,
  integer,
  text
)
to authenticated;

commit;
