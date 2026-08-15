begin;

create table if not exists public.villa_b2b_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_company_id uuid not null references public.companies(id) on delete cascade,
  invitee_company_id uuid not null references public.companies(id) on delete cascade,
  villa_id uuid not null references public.villas(id) on delete cascade,
  pricing_type text not null default 'discount',
  net_rate numeric(14,2),
  discount_rate numeric(8,4) not null default 0,
  instant_confirm boolean not null default true,
  status text not null default 'pending',
  note text,
  created_by uuid default auth.uid(),
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint villa_b2b_invitation_status_check check (status in ('pending','accepted','rejected','cancelled')),
  constraint villa_b2b_invitation_pricing_check check (pricing_type in ('discount','net_rate','public_rate')),
  constraint villa_b2b_invitation_company_check check (inviter_company_id <> invitee_company_id)
);

create unique index if not exists villa_b2b_invitation_pending_unique
on public.villa_b2b_invitations(inviter_company_id, invitee_company_id, villa_id)
where status = 'pending';

alter table public.villa_b2b_invitations enable row level security;

drop policy if exists villa_b2b_invitations_member_access on public.villa_b2b_invitations;
create policy villa_b2b_invitations_member_access
on public.villa_b2b_invitations
for select to authenticated
using (
  public.is_company_member(inviter_company_id)
  or public.is_company_member(invitee_company_id)
);

create or replace function public.search_turobus_partner_companies(
  p_company_id uuid,
  p_query text default ''
)
returns table(
  company_id uuid,
  company_name text,
  city text,
  company_type text
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(
      nullif(to_jsonb(c)->>'name',''),
      nullif(to_jsonb(c)->>'company_name',''),
      nullif(to_jsonb(c)->>'title',''),
      'Firma ' || left(c.id::text, 8)
    ) as company_name,
    coalesce(to_jsonb(c)->>'city', to_jsonb(c)->>'province') as city,
    coalesce(to_jsonb(c)->>'company_type', to_jsonb(c)->>'type') as company_type
  from public.companies c
  where c.id <> p_company_id
    and exists (
      select 1
      from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
    )
    and (
      coalesce(trim(p_query),'') = ''
      or lower(coalesce(to_jsonb(c)->>'name', to_jsonb(c)->>'company_name', to_jsonb(c)->>'title', c.id::text))
         like '%' || lower(trim(p_query)) || '%'
    )
  order by company_name
  limit 30;
$$;

grant execute on function public.search_turobus_partner_companies(uuid,text) to authenticated;

create or replace function public.create_villa_b2b_invitation(
  p_inviter_company_id uuid,
  p_invitee_company_id uuid,
  p_villa_id uuid,
  p_pricing_type text default 'discount',
  p_net_rate numeric default null,
  p_discount_rate numeric default 0,
  p_instant_confirm boolean default true,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_inviter_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in ('super_admin','company_owner','operation_manager')
  ) then
    raise exception 'Bu firma adına davet gönderme yetkiniz yok.';
  end if;

  if not exists (
    select 1 from public.villas v
    where v.id = p_villa_id
      and v.company_id = p_inviter_company_id
      and v.is_active = true
  ) then
    raise exception 'Villa bulunamadı veya bu firmaya ait değil.';
  end if;

  if p_inviter_company_id = p_invitee_company_id then
    raise exception 'Kendi firmanıza davet gönderemezsiniz.';
  end if;

  insert into public.villa_b2b_invitations(
    inviter_company_id, invitee_company_id, villa_id,
    pricing_type, net_rate, discount_rate, instant_confirm,
    status, note, created_by
  ) values (
    p_inviter_company_id, p_invitee_company_id, p_villa_id,
    p_pricing_type,
    case when p_pricing_type = 'net_rate' then p_net_rate else null end,
    case when p_pricing_type = 'discount' then greatest(coalesce(p_discount_rate,0),0) else 0 end,
    coalesce(p_instant_confirm,true),
    'pending', nullif(trim(coalesce(p_note,'')),''), auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_villa_b2b_invitation(uuid,uuid,uuid,text,numeric,numeric,boolean,text) to authenticated;

create or replace function public.respond_villa_b2b_invitation(
  p_invitation_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.villa_b2b_invitations%rowtype;
  v_status text;
begin
  select * into v_inv
  from public.villa_b2b_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Davet bulunamadı.';
  end if;

  if v_inv.status <> 'pending' then
    raise exception 'Bu davet daha önce sonuçlandırılmış.';
  end if;

  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = v_inv.invitee_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in ('super_admin','company_owner','operation_manager')
  ) then
    raise exception 'Bu davete cevap verme yetkiniz yok.';
  end if;

  if p_action = 'accept' then
    v_status := 'accepted';

    insert into public.villa_b2b_access(
      owner_company_id, partner_company_id, villa_id,
      access_role, pricing_type, net_rate, discount_rate,
      instant_confirm, can_view_calendar, can_book, is_active,
      created_at, updated_at
    ) values (
      v_inv.inviter_company_id, v_inv.invitee_company_id, v_inv.villa_id,
      'sales', v_inv.pricing_type, v_inv.net_rate, v_inv.discount_rate,
      v_inv.instant_confirm, true, true, true,
      now(), now()
    )
    on conflict (partner_company_id, villa_id)
    do update set
      owner_company_id = excluded.owner_company_id,
      pricing_type = excluded.pricing_type,
      net_rate = excluded.net_rate,
      discount_rate = excluded.discount_rate,
      instant_confirm = excluded.instant_confirm,
      can_view_calendar = true,
      can_book = true,
      is_active = true,
      updated_at = now();
  elsif p_action = 'reject' then
    v_status := 'rejected';
  else
    raise exception 'Geçersiz işlem.';
  end if;

  update public.villa_b2b_invitations
  set status = v_status,
      responded_by = auth.uid(),
      responded_at = now(),
      updated_at = now()
  where id = p_invitation_id;

  return jsonb_build_object('ok', true, 'status', v_status);
end;
$$;

grant execute on function public.respond_villa_b2b_invitation(uuid,text) to authenticated;

create or replace function public.cancel_villa_b2b_invitation(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.villa_b2b_invitations%rowtype;
begin
  select * into v_inv
  from public.villa_b2b_invitations
  where id = p_invitation_id
  for update;

  if not found then return false; end if;

  if not exists (
    select 1 from public.company_members cm
    where cm.company_id = v_inv.inviter_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in ('super_admin','company_owner','operation_manager')
  ) then
    raise exception 'Davet iptal yetkiniz yok.';
  end if;

  if v_inv.status <> 'pending' then return false; end if;

  update public.villa_b2b_invitations
  set status = 'cancelled', updated_at = now()
  where id = p_invitation_id;

  return true;
end;
$$;

grant execute on function public.cancel_villa_b2b_invitation(uuid) to authenticated;

create or replace function public.get_villa_b2b_invitation_center(
  p_company_id uuid
)
returns table(
  invitation_id uuid,
  direction text,
  counterparty_company_id uuid,
  counterparty_name text,
  villa_id uuid,
  villa_name text,
  pricing_type text,
  net_rate numeric,
  discount_rate numeric,
  instant_confirm boolean,
  status text,
  note text,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    case when i.inviter_company_id = p_company_id then 'outgoing' else 'incoming' end,
    case when i.inviter_company_id = p_company_id then i.invitee_company_id else i.inviter_company_id end,
    coalesce(
      nullif(to_jsonb(c)->>'name',''),
      nullif(to_jsonb(c)->>'company_name',''),
      nullif(to_jsonb(c)->>'title',''),
      'Firma ' || left(c.id::text,8)
    ),
    i.villa_id,
    v.name,
    i.pricing_type,
    i.net_rate,
    i.discount_rate,
    i.instant_confirm,
    i.status,
    i.note,
    i.created_at,
    i.responded_at
  from public.villa_b2b_invitations i
  join public.villas v on v.id = i.villa_id
  join public.companies c on c.id = case when i.inviter_company_id = p_company_id then i.invitee_company_id else i.inviter_company_id end
  where (i.inviter_company_id = p_company_id or i.invitee_company_id = p_company_id)
    and exists (
      select 1 from public.company_members cm
      where cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
    )
  order by i.created_at desc;
$$;

grant execute on function public.get_villa_b2b_invitation_center(uuid) to authenticated;

commit;
