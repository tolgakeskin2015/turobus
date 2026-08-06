alter table public.hotel_guests
add column if not exists deleted_at timestamptz;

alter table public.hotel_guests
add column if not exists deleted_by uuid
references auth.users(id)
on delete set null;

alter table public.hotel_guests
add column if not exists deletion_reason text;


create table if not exists public.hotel_guest_audit_logs (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  guest_id uuid,

  guest_name text,

  action_type text not null
    check (
      action_type in (
        'created',
        'updated',
        'deleted',
        'restored',
        'permanently_deleted',
        'reservation_attached',
        'reservation_detached',
        'note_created',
        'note_deleted',
        'document_created',
        'document_deleted',
        'preferences_updated'
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
hotel_guests_active_idx
on public.hotel_guests (
  company_id,
  deleted_at,
  created_at desc
);

create index if not exists
hotel_guest_audit_logs_guest_idx
on public.hotel_guest_audit_logs (
  company_id,
  guest_id,
  created_at desc
);


alter table public.hotel_guest_audit_logs
enable row level security;

grant select, insert
on public.hotel_guest_audit_logs
to authenticated;


drop policy if exists
"Members read guest audit logs"
on public.hotel_guest_audit_logs;

create policy
"Members read guest audit logs"
on public.hotel_guest_audit_logs
for select
to authenticated
using (
  public.is_company_member(company_id)
);


drop policy if exists
"Members create guest audit logs"
on public.hotel_guest_audit_logs;

create policy
"Members create guest audit logs"
on public.hotel_guest_audit_logs
for insert
to authenticated
with check (
  public.is_company_member(company_id)
);


create or replace function public.soft_delete_hotel_guest(
  p_company_id uuid,
  p_guest_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.hotel_guests;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_guest
  from public.hotel_guests
  where id = p_guest_id
    and company_id = p_company_id
    and deleted_at is null
  for update;

  if not found then
    raise exception
      'Aktif misafir profili bulunamadı.';
  end if;

  update public.hotel_guests
  set
    deleted_at = now(),
    deleted_by = auth.uid(),
    deletion_reason = nullif(
      trim(p_reason),
      ''
    ),
    updated_at = now()
  where id = p_guest_id;

  insert into public.hotel_guest_audit_logs (
    company_id,
    guest_id,
    guest_name,
    action_type,
    description,
    old_values,
    new_values,
    performed_by
  )
  values (
    p_company_id,
    p_guest_id,
    concat(
      v_guest.first_name,
      ' ',
      v_guest.last_name
    ),
    'deleted',
    coalesce(
      nullif(
        trim(p_reason),
        ''
      ),
      'Misafir profili çöp kutusuna taşındı.'
    ),
    to_jsonb(v_guest),
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


create or replace function public.restore_hotel_guest(
  p_company_id uuid,
  p_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.hotel_guests;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_guest
  from public.hotel_guests
  where id = p_guest_id
    and company_id = p_company_id
    and deleted_at is not null
  for update;

  if not found then
    raise exception
      'Çöp kutusunda misafir profili bulunamadı.';
  end if;

  update public.hotel_guests
  set
    deleted_at = null,
    deleted_by = null,
    deletion_reason = null,
    updated_at = now()
  where id = p_guest_id;

  insert into public.hotel_guest_audit_logs (
    company_id,
    guest_id,
    guest_name,
    action_type,
    description,
    old_values,
    new_values,
    performed_by
  )
  values (
    p_company_id,
    p_guest_id,
    concat(
      v_guest.first_name,
      ' ',
      v_guest.last_name
    ),
    'restored',
    'Misafir profili çöp kutusundan geri yüklendi.',
    jsonb_build_object(
      'deleted_at',
      v_guest.deleted_at,
      'deletion_reason',
      v_guest.deletion_reason
    ),
    jsonb_build_object(
      'deleted_at',
      null
    ),
    auth.uid()
  );
end;
$$;


create or replace function public.permanently_delete_hotel_guest(
  p_company_id uuid,
  p_guest_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.hotel_guests;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_guest
  from public.hotel_guests
  where id = p_guest_id
    and company_id = p_company_id
    and deleted_at is not null
  for update;

  if not found then
    raise exception
      'Kalıcı olarak silinebilecek misafir bulunamadı.';
  end if;

  insert into public.hotel_guest_audit_logs (
    company_id,
    guest_id,
    guest_name,
    action_type,
    description,
    old_values,
    performed_by
  )
  values (
    p_company_id,
    p_guest_id,
    concat(
      v_guest.first_name,
      ' ',
      v_guest.last_name
    ),
    'permanently_deleted',
    'Misafir profili kalıcı olarak silindi.',
    to_jsonb(v_guest),
    auth.uid()
  );

  delete from public.hotel_guests
  where id = p_guest_id
    and company_id = p_company_id;
end;
$$;


create or replace function public.empty_hotel_guest_trash(
  p_company_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  insert into public.hotel_guest_audit_logs (
    company_id,
    guest_id,
    guest_name,
    action_type,
    description,
    old_values,
    performed_by
  )
  select
    guest.company_id,
    guest.id,
    concat(
      guest.first_name,
      ' ',
      guest.last_name
    ),
    'permanently_deleted',
    'Çöp kutusu toplu olarak temizlendi.',
    to_jsonb(guest),
    auth.uid()
  from public.hotel_guests guest
  where guest.company_id = p_company_id
    and guest.deleted_at is not null;

  delete from public.hotel_guests
  where company_id = p_company_id
    and deleted_at is not null;

  get diagnostics
    v_count = row_count;

  return v_count;
end;
$$;


grant execute
on function public.soft_delete_hotel_guest(
  uuid,
  uuid,
  text
)
to authenticated;

grant execute
on function public.restore_hotel_guest(
  uuid,
  uuid
)
to authenticated;

grant execute
on function public.permanently_delete_hotel_guest(
  uuid,
  uuid
)
to authenticated;

grant execute
on function public.empty_hotel_guest_trash(
  uuid
)
to authenticated;
