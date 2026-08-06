alter table public.hotel_reservations
add column if not exists deleted_at timestamptz;

alter table public.hotel_reservations
add column if not exists deleted_by uuid
references auth.users(id)
on delete set null;

alter table public.hotel_reservations
add column if not exists deletion_reason text;


create table if not exists public.hotel_reservation_audit_logs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  reservation_id uuid,

  reservation_no text,

  action_type text not null
    check (
      action_type in (
        'created',
        'updated',
        'status_changed',
        'room_assigned',
        'room_unassigned',
        'checked_in',
        'checked_out',
        'cancelled',
        'deleted',
        'restored',
        'permanently_deleted'
      )
    ),

  description text,

  old_values jsonb,

  new_values jsonb,

  performed_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now()
);


create index if not exists
hotel_reservations_active_idx
on public.hotel_reservations (
  company_id,
  deleted_at,
  check_in,
  check_out
);

create index if not exists
hotel_reservation_audit_logs_idx
on public.hotel_reservation_audit_logs (
  company_id,
  reservation_id,
  created_at desc
);


alter table public.hotel_reservation_audit_logs
enable row level security;

grant select, insert
on public.hotel_reservation_audit_logs
to authenticated;


drop policy if exists
"Members read reservation audit logs"
on public.hotel_reservation_audit_logs;

create policy
"Members read reservation audit logs"
on public.hotel_reservation_audit_logs
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists
"Members create reservation audit logs"
on public.hotel_reservation_audit_logs;

create policy
"Members create reservation audit logs"
on public.hotel_reservation_audit_logs
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);


create or replace function
public.soft_delete_hotel_reservation(
  p_company_id uuid,
  p_reservation_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
    and deleted_at is null
  for update;

  if not found then
    raise exception
      'Aktif rezervasyon bulunamadı.';
  end if;

  if v_reservation.status = 'checked_in' then
    raise exception
      'Konaklayan rezervasyon silinemez. Önce check-out veya iptal işlemi yapılmalıdır.';
  end if;

  update public.hotel_reservations
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason =
      nullif(trim(p_reason), ''),
    updated_at = now()
  where id = p_reservation_id;

  insert into public.hotel_reservation_audit_logs (
    company_id,
    reservation_id,
    reservation_no,
    action_type,
    description,
    old_values,
    new_values,
    performed_by
  )
  values (
    p_company_id,
    p_reservation_id,
    v_reservation.reservation_no,
    'deleted',
    coalesce(
      nullif(trim(p_reason), ''),
      'Rezervasyon çöp kutusuna taşındı.'
    ),
    to_jsonb(v_reservation),
    jsonb_build_object(
      'deleted_at',
      now(),
      'deletion_reason',
      p_reason
    ),
    auth.uid()
  );
end;
$$;


create or replace function
public.restore_hotel_reservation(
  p_company_id uuid,
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
    and deleted_at is not null
  for update;

  if not found then
    raise exception
      'Çöp kutusunda rezervasyon bulunamadı.';
  end if;

  update public.hotel_reservations
  set
    deleted_at = null,
    deleted_by = null,
    deletion_reason = null,
    updated_at = now()
  where id = p_reservation_id;

  insert into public.hotel_reservation_audit_logs (
    company_id,
    reservation_id,
    reservation_no,
    action_type,
    description,
    old_values,
    new_values,
    performed_by
  )
  values (
    p_company_id,
    p_reservation_id,
    v_reservation.reservation_no,
    'restored',
    'Rezervasyon çöp kutusundan geri yüklendi.',
    jsonb_build_object(
      'deleted_at',
      v_reservation.deleted_at
    ),
    jsonb_build_object(
      'deleted_at',
      null
    ),
    auth.uid()
  );
end;
$$;


create or replace function
public.permanently_delete_hotel_reservation(
  p_company_id uuid,
  p_reservation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.hotel_reservations;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_reservation
  from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id
    and deleted_at is not null
  for update;

  if not found then
    raise exception
      'Kalıcı silinebilecek rezervasyon bulunamadı.';
  end if;

  insert into public.hotel_reservation_audit_logs (
    company_id,
    reservation_id,
    reservation_no,
    action_type,
    description,
    old_values,
    performed_by
  )
  values (
    p_company_id,
    p_reservation_id,
    v_reservation.reservation_no,
    'permanently_deleted',
    'Rezervasyon kalıcı olarak silindi.',
    to_jsonb(v_reservation),
    auth.uid()
  );

  delete from public.hotel_reservations
  where id = p_reservation_id
    and company_id = p_company_id;
end;
$$;


grant execute
on function public.soft_delete_hotel_reservation(
  uuid,
  uuid,
  text
)
to authenticated;

grant execute
on function public.restore_hotel_reservation(
  uuid,
  uuid
)
to authenticated;

grant execute
on function public.permanently_delete_hotel_reservation(
  uuid,
  uuid
)
to authenticated;
