begin;

alter table public.package_hotel_integrations
add column if not exists package_hotel_id uuid;

create index if not exists idx_package_hotel_integrations_hotel
on public.package_hotel_integrations (
  company_id,
  package_hotel_id,
  provider,
  status
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'package-hotel-media',
  'package-hotel-media',
  true,
  12582912,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]::text[]
)
on conflict (id)
do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists package_hotel_media_storage_select
on storage.objects;

create policy package_hotel_media_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'package-hotel-media'
);

drop policy if exists package_hotel_media_storage_insert
on storage.objects;

create policy package_hotel_media_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'package-hotel-media'
  and exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id::text =
        split_part(storage.objects.name, '/', 1)
      and coalesce(cm.is_active, true) = true
      and cm.role::text in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  )
);

drop policy if exists package_hotel_media_storage_update
on storage.objects;

create policy package_hotel_media_storage_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'package-hotel-media'
  and exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id::text =
        split_part(storage.objects.name, '/', 1)
      and coalesce(cm.is_active, true) = true
      and cm.role::text in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  )
)
with check (
  bucket_id = 'package-hotel-media'
);

drop policy if exists package_hotel_media_storage_delete
on storage.objects;

create policy package_hotel_media_storage_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'package-hotel-media'
  and exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id::text =
        split_part(storage.objects.name, '/', 1)
      and coalesce(cm.is_active, true) = true
      and cm.role::text in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  )
);

create or replace function
public.get_package_hotel_contract_admin(
  p_hotel_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_company_id uuid;
  v_result jsonb;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  select cm.company_id
  into v_company_id
  from public.company_members cm
  where cm.user_id = v_uid
    and coalesce(cm.is_active, true) = true
    and cm.company_id = (
      select h.company_id
      from public.package_catalog_hotels h
      where h.id = p_hotel_id
      limit 1
    )
  limit 1;

  if v_company_id is null then
    raise exception
      'Otel veya şirket üyeliği bulunamadı.';
  end if;

  if not public.package_user_can_view_costs(
    v_company_id
  ) then
    raise exception
      'Bu alana erişim yetkiniz bulunmuyor.';
  end if;

  select jsonb_build_object(

    'hotel',
    (
      select to_jsonb(h)
      from public.package_catalog_hotels h
      where h.id = p_hotel_id
        and h.company_id = v_company_id
      limit 1
    ),

    'media',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(m)
          order by
            m.is_cover desc,
            m.sort_order asc,
            m.created_at asc
        )
        from public.package_hotel_media m
        where m.package_hotel_id = p_hotel_id
          and m.company_id = v_company_id
      ),
      '[]'::jsonb
    ),

    'room_types',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(r)
          order by r.name asc
        )
        from public.package_hotel_room_types r
        where r.package_hotel_id = p_hotel_id
          and r.company_id = v_company_id
          and r.is_active = true
      ),
      '[]'::jsonb
    ),

    'rates',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(r)
          order by
            r.valid_from desc,
            r.room_type_name asc
        )
        from public.package_hotel_rates r
        where r.package_hotel_id = p_hotel_id
          and r.company_id = v_company_id
          and r.is_active = true
      ),
      '[]'::jsonb
    ),

    'promotions',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(p)
          order by
            p.priority asc,
            p.stay_from asc
        )
        from public.package_hotel_promotions p
        where p.package_hotel_id = p_hotel_id
          and p.company_id = v_company_id
          and p.is_active = true
      ),
      '[]'::jsonb
    ),

    'child_policies',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(c)
          order by
            c.child_order asc,
            c.age_from asc
        )
        from public.package_hotel_child_policies c
        where c.package_hotel_id = p_hotel_id
          and c.company_id = v_company_id
          and c.is_active = true
      ),
      '[]'::jsonb
    ),

    'integrations',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(i)
          order by i.created_at desc
        )
        from public.package_hotel_integrations i
        where i.company_id = v_company_id
          and i.package_hotel_id = p_hotel_id
      ),
      '[]'::jsonb
    )

  )
  into v_result;

  return v_result;

end;
$$;

revoke all
on function
public.get_package_hotel_contract_admin(uuid)
from public;

grant execute
on function
public.get_package_hotel_contract_admin(uuid)
to authenticated;

commit;
