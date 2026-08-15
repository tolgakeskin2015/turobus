begin;

create table if not exists public.activity_network_staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  staff_type text not null default 'crew',
  phone text,
  email text,
  license_no text,
  daily_capacity integer,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_network_staff_type_check check (
    staff_type in ('pilot','divemaster','instructor','captain','guide','driver','crew','operator')
  )
);

create index if not exists idx_activity_network_staff_company
on public.activity_network_staff(company_id, staff_type, is_active);

alter table public.activity_network_staff enable row level security;
drop policy if exists activity_network_staff_company_access on public.activity_network_staff;
create policy activity_network_staff_company_access
on public.activity_network_staff for all to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create table if not exists public.activity_network_slot_staff (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  slot_id uuid not null references public.package_activity_slots(id) on delete cascade,
  staff_id uuid not null references public.activity_network_staff(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique(slot_id, staff_id)
);

alter table public.activity_network_slot_staff enable row level security;
drop policy if exists activity_network_slot_staff_company_access on public.activity_network_slot_staff;
create policy activity_network_slot_staff_company_access
on public.activity_network_slot_staff for all to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create table if not exists public.package_quote_activity_network_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  quote_id uuid not null references public.package_quotes(id) on delete cascade,
  product_key text not null,
  activity_name text not null,
  city text,
  district text,
  service_date date not null,
  quantity integer not null default 1,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint package_quote_activity_network_quantity_check check (quantity > 0)
);

create unique index if not exists idx_package_quote_activity_network_unique
on public.package_quote_activity_network_requests(quote_id, product_key, service_date);

alter table public.package_quote_activity_network_requests enable row level security;
drop policy if exists package_quote_activity_network_access on public.package_quote_activity_network_requests;
create policy package_quote_activity_network_access
on public.package_quote_activity_network_requests for all to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create table if not exists public.activity_network_assignments (
  id uuid primary key default gen_random_uuid(),
  agency_company_id uuid not null references public.companies(id) on delete cascade,
  provider_company_id uuid not null references public.companies(id) on delete cascade,
  booking_id uuid not null references public.package_bookings(id) on delete cascade,
  quote_request_id uuid not null references public.package_quote_activity_network_requests(id) on delete cascade,
  activity_id uuid not null references public.package_activities(id) on delete restrict,
  slot_id uuid not null references public.package_activity_slots(id) on delete restrict,
  allocation_id uuid references public.turobus_network_allocations(id) on delete set null,
  quantity integer not null,
  status text not null default 'confirmed',
  confirmation_code text,
  note text,
  confirmed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_network_assignment_quantity_check check (quantity > 0),
  constraint activity_network_assignment_status_check check (
    status in ('pending','confirmed','completed','released','cancelled')
  )
);

create unique index if not exists idx_activity_network_assignment_request
on public.activity_network_assignments(booking_id, quote_request_id)
where status in ('pending','confirmed');

create index if not exists idx_activity_network_assignment_provider
on public.activity_network_assignments(provider_company_id, status, booking_id);

alter table public.activity_network_assignments enable row level security;
drop policy if exists activity_network_assignment_access on public.activity_network_assignments;
create policy activity_network_assignment_access
on public.activity_network_assignments for select to authenticated
using (
  public.is_company_member(agency_company_id)
  or public.is_company_member(provider_company_id)
);

create or replace function public.turobus_activity_product_key(p_name text, p_city text)
returns text language sql immutable as $$
  select lower(
    regexp_replace(
      translate(
        coalesce(trim(p_name),'') || '|' || coalesce(trim(p_city),''),
        'ÇĞİÖŞÜçğıöşü','CGIOSUcgiosu'
      ),
      '[^a-zA-Z0-9|]+','-','g'
    )
  );
$$;

create or replace function public.sync_turobus_activity_network()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_activities integer := 0;
  v_slots integer := 0;
begin
  insert into public.turobus_network_resources(
    owner_company_id, resource_type, source_system, source_id,
    name, city, district, is_active, marketplace_enabled, metadata
  )
  select
    a.company_id, 'activity', 'activity_os', a.id,
    a.name, a.city, a.district, a.is_active, false,
    jsonb_build_object(
      'product_key', public.turobus_activity_product_key(a.name,a.city),
      'category', a.category,
      'pricing_unit', a.pricing_unit,
      'default_cost', a.default_cost,
      'default_sale_price', a.default_sale_price,
      'currency', a.currency,
      'duration_minutes', a.duration_minutes,
      'requires_slot', a.requires_slot,
      'supplier_id', a.supplier_id
    )
  from public.package_activities a
  where a.company_id is not null
  on conflict(owner_company_id, source_system, source_id)
  do update set
    name=excluded.name, city=excluded.city, district=excluded.district,
    is_active=excluded.is_active, metadata=excluded.metadata, updated_at=now();
  get diagnostics v_activities = row_count;

  insert into public.turobus_network_inventory_units(
    resource_id, owner_company_id, unit_type, source_system,
    source_ref_id, parent_source_ref_id, name, currency,
    marketplace_enabled, is_active, metadata
  )
  select
    r.id, s.company_id, 'activity_slot', 'activity_os', s.id, s.activity_id,
    a.name || ' · ' || to_char(s.slot_date,'DD.MM.YYYY') ||
      case when s.start_time is not null then ' · ' || to_char(s.start_time,'HH24:MI') else '' end,
    coalesce(s.currency,a.currency,'TRY'), false,
    (s.status='open' and s.reserved_count < s.capacity),
    jsonb_build_object(
      'activity_id',s.activity_id,
      'slot_date',s.slot_date,
      'start_time',s.start_time,
      'capacity',s.capacity,
      'reserved_count',s.reserved_count,
      'available',greatest(s.capacity-s.reserved_count,0),
      'cost',coalesce(s.cost,a.default_cost),
      'sale_price',coalesce(s.sale_price,a.default_sale_price),
      'status',s.status,
      'supplier_id',s.supplier_id
    )
  from public.package_activity_slots s
  join public.package_activities a on a.id=s.activity_id
  join public.turobus_network_resources r
    on r.owner_company_id=a.company_id
   and r.source_system='activity_os'
   and r.source_id=a.id
  on conflict(owner_company_id, source_system, source_ref_id)
  do update set
    resource_id=excluded.resource_id,
    parent_source_ref_id=excluded.parent_source_ref_id,
    name=excluded.name,
    currency=excluded.currency,
    is_active=excluded.is_active,
    metadata=excluded.metadata,
    updated_at=now();
  get diagnostics v_slots = row_count;

  return jsonb_build_object('ok',true,'activities',v_activities,'slots',v_slots);
end;
$$;

grant execute on function public.sync_turobus_activity_network() to authenticated;

create or replace function public.get_turobus_activity_network_catalog(
  p_company_id uuid, p_start_date date, p_end_date date
)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  perform public.sync_turobus_activity_network();

  return jsonb_build_object(
    'products',
    coalesce((
      select jsonb_agg(x order by x->>'name')
      from (
        select jsonb_build_object(
          'product_key', public.turobus_activity_product_key(a.name,a.city),
          'name', min(a.name),
          'city', min(a.city),
          'district', min(a.district),
          'provider_count', count(distinct a.company_id),
          'slot_count', count(distinct s.id),
          'total_available', coalesce(sum(greatest(s.capacity-s.reserved_count,0)),0),
          'minimum_sale_price', min(coalesce(s.sale_price,a.default_sale_price)),
          'currency', coalesce(min(s.currency),min(a.currency),'TRY')
        ) as x
        from public.package_activities a
        join public.package_activity_slots s on s.activity_id=a.id
        where a.is_active=true
          and s.status='open'
          and s.slot_date>=p_start_date
          and s.slot_date<=p_end_date
          and s.reserved_count<s.capacity
        group by public.turobus_activity_product_key(a.name,a.city)
      ) q
    ),'[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_turobus_activity_network_catalog(uuid,date,date) to authenticated;

create or replace function public.save_package_quote_activity_network_requests(
  p_company_id uuid, p_quote_code text, p_requests jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_quote_id uuid;
  v_request jsonb;
  v_count integer := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select q.id into v_quote_id
  from public.package_quotes q
  where q.company_id=p_company_id and q.quote_code=p_quote_code
  limit 1;

  if v_quote_id is null then raise exception 'Package quote not found'; end if;

  delete from public.package_quote_activity_network_requests
  where company_id=p_company_id and quote_id=v_quote_id;

  for v_request in select value from jsonb_array_elements(coalesce(p_requests,'[]'::jsonb))
  loop
    insert into public.package_quote_activity_network_requests(
      company_id, quote_id, product_key, activity_name, city, district,
      service_date, quantity, snapshot
    ) values (
      p_company_id,
      v_quote_id,
      v_request->>'productKey',
      v_request->>'activityName',
      nullif(v_request->>'city',''),
      nullif(v_request->>'district',''),
      (v_request->>'serviceDate')::date,
      greatest(coalesce((v_request->>'quantity')::integer,1),1),
      v_request
    )
    on conflict(quote_id,product_key,service_date)
    do update set quantity=excluded.quantity, snapshot=excluded.snapshot, updated_at=now();
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok',true,'quote_id',v_quote_id,'request_count',v_count);
end;
$$;

grant execute on function public.save_package_quote_activity_network_requests(uuid,text,jsonb) to authenticated;

create or replace function public.get_package_booking_activity_network(
  p_company_id uuid, p_booking_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking record;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  perform public.sync_turobus_activity_network();

  select b.id,b.quote_id into v_booking
  from public.package_bookings b
  where b.id=p_booking_id and b.company_id=p_company_id;

  if not found then raise exception 'Booking not found'; end if;

  return jsonb_build_object(
    'requests',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'request_id',req.id,
          'product_key',req.product_key,
          'activity_name',req.activity_name,
          'city',req.city,
          'district',req.district,
          'service_date',req.service_date,
          'quantity',req.quantity,
          'assignment_id',ass.id,
          'assignment_status',ass.status,
          'provider_company_id',ass.provider_company_id,
          'activity_id',ass.activity_id,
          'slot_id',ass.slot_id,
          'allocation_id',ass.allocation_id,
          'confirmation_code',ass.confirmation_code,
          'providers',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'provider_company_id',a.company_id,
                'activity_id',a.id,
                'activity_name',a.name,
                'slot_id',s.id,
                'slot_date',s.slot_date,
                'start_time',s.start_time,
                'capacity',s.capacity,
                'reserved_count',s.reserved_count,
                'available',greatest(s.capacity-s.reserved_count,0),
                'cost',coalesce(s.cost,a.default_cost),
                'sale_price',coalesce(s.sale_price,a.default_sale_price),
                'currency',coalesce(s.currency,a.currency,'TRY'),
                'staff',coalesce((
                  select jsonb_agg(jsonb_build_object(
                    'id',st.id,'name',st.full_name,'type',st.staff_type,'role',ss.role
                  ))
                  from public.activity_network_slot_staff ss
                  join public.activity_network_staff st on st.id=ss.staff_id
                  where ss.slot_id=s.id
                ),'[]'::jsonb)
              ) order by s.start_time,a.company_id
            )
            from public.package_activities a
            join public.package_activity_slots s on s.activity_id=a.id
            where public.turobus_activity_product_key(a.name,a.city)=req.product_key
              and a.is_active=true
              and s.slot_date=req.service_date
              and s.status='open'
              and s.reserved_count<s.capacity
          ),'[]'::jsonb)
        ) order by req.service_date,req.activity_name
      )
      from public.package_quote_activity_network_requests req
      left join public.activity_network_assignments ass
        on ass.booking_id=p_booking_id
       and ass.quote_request_id=req.id
       and ass.status in ('pending','confirmed')
      where req.company_id=p_company_id
        and req.quote_id=v_booking.quote_id
    ),'[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_package_booking_activity_network(uuid,uuid) to authenticated;

create or replace function public.assign_package_activity_network_slot(
  p_company_id uuid, p_booking_id uuid, p_request_id uuid, p_slot_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking public.package_bookings%rowtype;
  v_request public.package_quote_activity_network_requests%rowtype;
  v_slot public.package_activity_slots%rowtype;
  v_activity public.package_activities%rowtype;
  v_network_unit public.turobus_network_inventory_units%rowtype;
  v_allocation_id uuid;
  v_assignment_id uuid;
  v_confirmation_code text;
  v_available integer;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select * into v_booking from public.package_bookings
  where id=p_booking_id and company_id=p_company_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status='cancelled' then raise exception 'Cancelled booking cannot reserve activity'; end if;

  select * into v_request from public.package_quote_activity_network_requests
  where id=p_request_id and company_id=p_company_id and quote_id=v_booking.quote_id for update;
  if not found then raise exception 'Activity request not found'; end if;

  if exists(
    select 1 from public.activity_network_assignments ass
    where ass.booking_id=p_booking_id and ass.quote_request_id=p_request_id and ass.status='confirmed'
  ) then
    return jsonb_build_object('ok',true,'already_confirmed',true);
  end if;

  select * into v_slot from public.package_activity_slots where id=p_slot_id for update;
  if not found then raise exception 'Activity slot not found'; end if;

  select * into v_activity from public.package_activities
  where id=v_slot.activity_id and is_active=true;
  if not found then raise exception 'Activity not found'; end if;

  if public.turobus_activity_product_key(v_activity.name,v_activity.city)<>v_request.product_key then
    raise exception 'Selected provider activity does not match request';
  end if;
  if v_slot.slot_date<>v_request.service_date then raise exception 'Selected slot date does not match requested date'; end if;
  if v_slot.status<>'open' then raise exception 'Activity slot is not open'; end if;

  v_available := v_slot.capacity-v_slot.reserved_count;
  if v_available<v_request.quantity then raise exception 'Activity capacity is not available'; end if;

  update public.package_activity_slots
  set reserved_count=reserved_count+v_request.quantity,
      status=case when reserved_count+v_request.quantity>=capacity then 'full' else status end,
      updated_at=now()
  where id=v_slot.id;

  perform public.sync_turobus_activity_network();

  select * into v_network_unit
  from public.turobus_network_inventory_units
  where source_system='activity_os'
    and source_ref_id=v_slot.id
    and owner_company_id=v_activity.company_id
  limit 1;
  if not found then raise exception 'Network activity unit could not be created'; end if;

  v_confirmation_code := 'TB-ACT-' || upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.turobus_network_allocations(
    buyer_company_id,owner_company_id,unit_id,package_booking_id,
    allocation_type,quantity,start_date,end_date,allocation_status,
    external_reference,metadata
  ) values (
    p_company_id,v_activity.company_id,v_network_unit.id,p_booking_id,
    'activity',v_request.quantity,v_slot.slot_date,v_slot.slot_date,'confirmed',
    v_confirmation_code,
    jsonb_build_object(
      'activity_request_id',v_request.id,
      'activity_id',v_activity.id,
      'slot_id',v_slot.id,
      'start_time',v_slot.start_time,
      'provider_company_id',v_activity.company_id
    )
  ) returning id into v_allocation_id;

  insert into public.activity_network_assignments(
    agency_company_id,provider_company_id,booking_id,quote_request_id,
    activity_id,slot_id,allocation_id,quantity,status,confirmation_code,confirmed_at
  ) values (
    p_company_id,v_activity.company_id,p_booking_id,v_request.id,
    v_activity.id,v_slot.id,v_allocation_id,v_request.quantity,'confirmed',v_confirmation_code,now()
  ) returning id into v_assignment_id;

  return jsonb_build_object(
    'ok',true,
    'assignment_id',v_assignment_id,
    'allocation_id',v_allocation_id,
    'confirmation_code',v_confirmation_code,
    'provider_company_id',v_activity.company_id,
    'remaining',greatest(v_available-v_request.quantity,0)
  );
end;
$$;

grant execute on function public.assign_package_activity_network_slot(uuid,uuid,uuid,uuid) to authenticated;

create or replace function public.release_package_activity_network_assignment(
  p_company_id uuid, p_booking_id uuid, p_request_id uuid, p_reason text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_assignment public.activity_network_assignments%rowtype;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  select * into v_assignment from public.activity_network_assignments
  where agency_company_id=p_company_id
    and booking_id=p_booking_id
    and quote_request_id=p_request_id
    and status='confirmed'
  for update;
  if not found then raise exception 'Active activity assignment not found'; end if;

  update public.package_activity_slots
  set reserved_count=greatest(reserved_count-v_assignment.quantity,0),
      status=case when status='full' then 'open' else status end,
      updated_at=now()
  where id=v_assignment.slot_id;

  update public.turobus_network_allocations
  set allocation_status='released',released_at=now(),
      metadata=metadata||jsonb_build_object('release_reason',p_reason),updated_at=now()
  where id=v_assignment.allocation_id;

  update public.activity_network_assignments
  set status='released',released_at=now(),note=concat_ws(E'\n',note,p_reason),updated_at=now()
  where id=v_assignment.id;

  perform public.sync_turobus_activity_network();

  return jsonb_build_object('ok',true,'released',true,'assignment_id',v_assignment.id);
end;
$$;

grant execute on function public.release_package_activity_network_assignment(uuid,uuid,uuid,text) to authenticated;

create or replace function public.get_activity_provider_network_bookings(p_company_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Company membership required';
  end if;

  return jsonb_build_object(
    'bookings',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'assignment_id',ass.id,
          'booking_id',ass.booking_id,
          'booking_code',b.booking_code,
          'customer_name',b.customer_name,
          'customer_phone',b.customer_phone,
          'activity_name',a.name,
          'slot_date',s.slot_date,
          'start_time',s.start_time,
          'quantity',ass.quantity,
          'status',ass.status,
          'confirmation_code',ass.confirmation_code,
          'agency_company_id',ass.agency_company_id,
          'confirmed_at',ass.confirmed_at
        ) order by s.slot_date,s.start_time
      )
      from public.activity_network_assignments ass
      join public.package_bookings b on b.id=ass.booking_id
      join public.package_activities a on a.id=ass.activity_id
      join public.package_activity_slots s on s.id=ass.slot_id
      where ass.provider_company_id=p_company_id
        and ass.status in ('confirmed','completed')
    ),'[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_activity_provider_network_bookings(uuid) to authenticated;

select public.sync_turobus_activity_network();

commit;
