begin;


create table if not exists public.activity_os_checkins (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.activity_os_bookings(id)
    on delete cascade,

  checked_in_at timestamptz not null default now(),

  checked_in_by uuid,

  note text,

  created_at timestamptz not null default now(),

  unique(booking_id)
);


alter table public.activity_os_checkins
enable row level security;


drop policy if exists activity_os_checkins_access
on public.activity_os_checkins;

create policy activity_os_checkins_access
on public.activity_os_checkins
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


create table if not exists public.activity_os_guest_users (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.activity_os_bookings(id)
    on delete cascade,

  user_id uuid not null,

  created_at timestamptz not null default now(),

  unique(booking_id, user_id)
);


alter table public.activity_os_guest_users
enable row level security;


drop policy if exists activity_os_guest_users_access
on public.activity_os_guest_users;

create policy activity_os_guest_users_access
on public.activity_os_guest_users
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_company_member(company_id)
);


drop policy if exists activity_os_guest_users_manage
on public.activity_os_guest_users;

create policy activity_os_guest_users_manage
on public.activity_os_guest_users
for all
to authenticated
using (
  public.activity_os_can_manage(company_id)
)
with check (
  public.activity_os_can_manage(company_id)
);


create index if not exists idx_activity_os_tasks_booking
on public.activity_os_operation_tasks(
  booking_id,
  status
);


create index if not exists idx_activity_os_tasks_staff
on public.activity_os_operation_tasks(
  assigned_staff_id,
  due_at
);


create or replace function public.activity_os_assign_operation(
  p_company_id uuid,
  p_booking_id uuid,
  p_staff_id uuid,
  p_task_type text,
  p_title text,
  p_due_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_id uuid;
begin

  if not public.activity_os_can_manage(p_company_id) then
    raise exception 'Operation management permission required';
  end if;


  if not exists (
    select 1
    from public.activity_os_bookings b
    where b.id = p_booking_id
      and b.company_id = p_company_id
      and b.status <> 'cancelled'
  ) then
    raise exception 'Booking not found';
  end if;


  if p_staff_id is not null
     and not exists (
       select 1
       from public.activity_network_staff s
       where s.id = p_staff_id
         and s.company_id = p_company_id
         and s.is_active = true
     )
  then
    raise exception 'Staff not found';
  end if;


  insert into public.activity_os_operation_tasks(
    company_id,
    booking_id,
    assigned_staff_id,
    task_type,
    title,
    due_at,
    status,
    notes
  )
  values (
    p_company_id,
    p_booking_id,
    p_staff_id,
    coalesce(nullif(trim(p_task_type),''),'operation'),
    coalesce(nullif(trim(p_title),''),'Operasyon görevi'),
    p_due_at,
    case
      when p_staff_id is null
        then 'pending'
      else 'assigned'
    end,
    nullif(trim(coalesce(p_notes,'')),'')
  )
  returning id
  into v_task_id;


  return jsonb_build_object(
    'ok', true,
    'task_id', v_task_id
  );

end;
$$;


grant execute
on function public.activity_os_assign_operation(
  uuid,
  uuid,
  uuid,
  text,
  text,
  timestamptz,
  text
)
to authenticated;


create or replace function public.activity_os_update_task_status(
  p_company_id uuid,
  p_task_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;


  if p_status not in (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
  ) then
    raise exception 'Invalid task status';
  end if;


  update public.activity_os_operation_tasks
  set
    status = p_status,
    updated_at = now()
  where id = p_task_id
    and company_id = p_company_id;


  if not found then
    raise exception 'Task not found';
  end if;


  return jsonb_build_object(
    'ok', true,
    'status', p_status
  );

end;
$$;


grant execute
on function public.activity_os_update_task_status(
  uuid,
  uuid,
  text
)
to authenticated;


create or replace function public.activity_os_checkin_by_token(
  p_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin

  select *
  into v_booking
  from public.activity_os_bookings
  where guest_token = p_token
  for update;


  if not found then
    raise exception 'Booking not found';
  end if;


  if not public.is_company_member(v_booking.company_id) then
    raise exception 'Company membership required';
  end if;


  if v_booking.status = 'cancelled' then
    raise exception 'Cancelled booking cannot check in';
  end if;


  if v_booking.status = 'completed' then
    raise exception 'Booking already completed';
  end if;


  insert into public.activity_os_checkins(
    company_id,
    booking_id,
    checked_in_by
  )
  values (
    v_booking.company_id,
    v_booking.id,
    auth.uid()
  )
  on conflict(booking_id)
  do update set
    checked_in_at = now(),
    checked_in_by = auth.uid();


  update public.activity_os_bookings
  set
    status = 'checked_in',
    updated_at = now()
  where id = v_booking.id;


  return jsonb_build_object(
    'ok', true,
    'booking_id', v_booking.id,
    'booking_code', v_booking.booking_code,
    'customer_name', v_booking.customer_name,
    'status', 'checked_in'
  );

end;
$$;


grant execute
on function public.activity_os_checkin_by_token(uuid)
to authenticated;


create or replace function public.activity_os_record_seller_payout(
  p_company_id uuid,
  p_seller_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_no text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_earned numeric(14,2);
  v_paid numeric(14,2);
  v_remaining numeric(14,2);
  v_payout_id uuid;
begin

  if not public.activity_os_can_view_finance(p_company_id) then
    raise exception 'Finance permission required';
  end if;


  if not exists (
    select 1
    from public.activity_os_sellers s
    where s.id = p_seller_id
      and s.company_id = p_company_id
      and s.is_active = true
  ) then
    raise exception 'Seller not found';
  end if;


  select coalesce(
    sum(f.seller_commission),
    0
  )
  into v_earned
  from public.activity_os_booking_finance f
  join public.activity_os_bookings b
    on b.id = f.booking_id
  where b.company_id = p_company_id
    and b.seller_id = p_seller_id
    and b.status <> 'cancelled';


  select coalesce(
    sum(p.amount),
    0
  )
  into v_paid
  from public.activity_os_seller_payouts p
  where p.company_id = p_company_id
    and p.seller_id = p_seller_id;


  v_remaining :=
    greatest(
      v_earned -
      v_paid,
      0
    );


  if coalesce(p_amount,0) <= 0 then
    raise exception 'Payout amount must be greater than zero';
  end if;


  if p_amount > v_remaining then
    raise exception 'Payout amount exceeds remaining commission';
  end if;


  insert into public.activity_os_seller_payouts(
    company_id,
    seller_id,
    amount,
    currency,
    payment_method,
    reference_no,
    note,
    created_by
  )
  values (
    p_company_id,
    p_seller_id,
    p_amount,
    'TRY',
    nullif(trim(coalesce(p_payment_method,'')),''),
    nullif(trim(coalesce(p_reference_no,'')),''),
    nullif(trim(coalesce(p_note,'')),''),
    auth.uid()
  )
  returning id
  into v_payout_id;


  return jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'earned', v_earned,
    'previously_paid', v_paid,
    'paid_now', p_amount,
    'remaining',
      greatest(
        v_remaining -
        p_amount,
        0
      )
  );

end;
$$;


grant execute
on function public.activity_os_record_seller_payout(
  uuid,
  uuid,
  numeric,
  text,
  text,
  text
)
to authenticated;


create or replace function public.get_activity_os_control_center(
  p_company_id uuid,
  p_date date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_finance boolean;
begin

  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;


  v_finance :=
    public.activity_os_can_view_finance(p_company_id);


  return jsonb_build_object(

    'date',
      p_date,

    'bookings',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', b.id,
              'booking_code', b.booking_code,
              'activity_id', b.activity_id,
              'activity_name', a.name,
              'customer_name', b.customer_name,
              'customer_phone', b.customer_phone,
              'customer_email', b.customer_email,
              'service_date', b.service_date,
              'start_time', b.start_time,
              'quantity', b.quantity,
              'status', b.status,
              'payment_status', b.payment_status,
              'sale_total', b.sale_total,
              'paid_total', b.paid_total,
              'pickup_location', b.pickup_location,
              'hotel_name', b.hotel_name,
              'guest_token', b.guest_token,
              'seller_id', b.seller_id,
              'seller_name', s.name
            )
            order by
              b.start_time nulls last,
              b.created_at
          )
          from public.activity_os_bookings b
          join public.package_activities a
            on a.id = b.activity_id
          left join public.activity_os_sellers s
            on s.id = b.seller_id
          where b.company_id = p_company_id
            and b.service_date = p_date
            and b.status <> 'cancelled'
        ),
        '[]'::jsonb
      ),

    'tasks',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'booking_id', t.booking_id,
              'assigned_staff_id', t.assigned_staff_id,
              'staff_name', st.full_name,
              'task_type', t.task_type,
              'title', t.title,
              'due_at', t.due_at,
              'status', t.status,
              'notes', t.notes
            )
            order by t.due_at nulls last
          )
          from public.activity_os_operation_tasks t
          left join public.activity_network_staff st
            on st.id = t.assigned_staff_id
          where t.company_id = p_company_id
            and (
              t.due_at is null
              or t.due_at::date = p_date
            )
        ),
        '[]'::jsonb
      ),

    'staff',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'full_name', s.full_name,
              'staff_type', s.staff_type,
              'phone', s.phone,
              'license_no', s.license_no
            )
            order by s.full_name
          )
          from public.activity_network_staff s
          where s.company_id = p_company_id
            and s.is_active = true
        ),
        '[]'::jsonb
      ),

    'sellers',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'seller_type', s.seller_type,

              'earned',
                case
                  when v_finance
                    then coalesce(
                      (
                        select sum(f.seller_commission)
                        from public.activity_os_booking_finance f
                        join public.activity_os_bookings b
                          on b.id = f.booking_id
                        where b.company_id = p_company_id
                          and b.seller_id = s.id
                          and b.status <> 'cancelled'
                      ),
                      0
                    )
                  else null
                end,

              'paid',
                case
                  when v_finance
                    then coalesce(
                      (
                        select sum(p.amount)
                        from public.activity_os_seller_payouts p
                        where p.company_id = p_company_id
                          and p.seller_id = s.id
                      ),
                      0
                    )
                  else null
                end
            )
            order by s.name
          )
          from public.activity_os_sellers s
          where s.company_id = p_company_id
            and s.is_active = true
        ),
        '[]'::jsonb
      ),

    'summary',
      jsonb_build_object(
        'booking_count',
          (
            select count(*)
            from public.activity_os_bookings b
            where b.company_id = p_company_id
              and b.service_date = p_date
              and b.status <> 'cancelled'
          ),

        'guest_count',
          coalesce(
            (
              select sum(b.quantity)
              from public.activity_os_bookings b
              where b.company_id = p_company_id
                and b.service_date = p_date
                and b.status <> 'cancelled'
            ),
            0
          ),

        'checked_in',
          (
            select count(*)
            from public.activity_os_bookings b
            where b.company_id = p_company_id
              and b.service_date = p_date
              and b.status in (
                'checked_in',
                'in_progress',
                'completed'
              )
          ),

        'completed',
          (
            select count(*)
            from public.activity_os_bookings b
            where b.company_id = p_company_id
              and b.service_date = p_date
              and b.status = 'completed'
          ),

        'finance_allowed',
          v_finance
      )
  );

end;
$$;


grant execute
on function public.get_activity_os_control_center(uuid,date)
to authenticated;


create or replace function public.get_my_activity_guest_reservations()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'booking_code', b.booking_code,
          'guest_token', b.guest_token,
          'activity_name', a.name,
          'company_name', c.name,
          'service_date', b.service_date,
          'start_time', b.start_time,
          'quantity', b.quantity,
          'status', b.status,
          'payment_status', b.payment_status,
          'sale_total', b.sale_total,
          'paid_total', b.paid_total,
          'currency', a.currency,
          'hotel_name', b.hotel_name,
          'pickup_location', b.pickup_location,
          'cover_image_url', a.cover_image_url
        )
        order by b.service_date desc
      )
      from public.activity_os_guest_users gu
      join public.activity_os_bookings b
        on b.id = gu.booking_id
      join public.package_activities a
        on a.id = b.activity_id
      join public.companies c
        on c.id = b.company_id
      where gu.user_id = auth.uid()
    ),
    '[]'::jsonb
  );

end;
$$;


grant execute
on function public.get_my_activity_guest_reservations()
to authenticated;


commit;
