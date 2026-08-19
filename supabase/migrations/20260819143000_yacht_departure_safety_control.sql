
-- ============================================================
-- TUROBUS YACHT DEPARTURE & SAFETY CONTROL
-- Departure gate + safety checklist + incident management
-- ============================================================


-- ============================================================
-- BOOKING DISPATCH FIELDS
-- ============================================================

alter table public.yacht_os_bookings
  add column if not exists requires_full_payment_before_departure boolean
    not null default false;

alter table public.yacht_os_bookings
  add column if not exists departure_override_reason text;

alter table public.yacht_os_bookings
  add column if not exists departure_override_at timestamptz;

alter table public.yacht_os_bookings
  add column if not exists departure_override_by uuid
    references auth.users(id)
    on delete set null;


-- ============================================================
-- SERVICES CAN BLOCK DEPARTURE
-- ============================================================

alter table public.yacht_os_booking_services
  add column if not exists is_departure_blocker boolean
    not null default false;


-- ============================================================
-- DEPARTURE CHECKLIST
-- ============================================================

create table if not exists public.yacht_os_departure_checklist (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  category text not null
    check (
      category in (
        'safety',
        'technical',
        'documents',
        'crew',
        'guest',
        'marina',
        'service',
        'other'
      )
    ),

  title text not null,

  description text,

  is_required boolean not null
    default true,

  is_completed boolean not null
    default false,

  completed_by uuid
    references auth.users(id)
    on delete set null,

  completed_at timestamptz,

  note text,

  sort_order integer not null
    default 0,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_departure_checklist_booking_idx
on public.yacht_os_departure_checklist (
  booking_id,
  is_required,
  is_completed
);


-- ============================================================
-- INCIDENT / RISK CENTER
-- ============================================================

create table if not exists public.yacht_os_incidents (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  booking_id uuid not null
    references public.yacht_os_bookings(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  severity text not null
    default 'medium'
    check (
      severity in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  category text not null
    default 'operation'
    check (
      category in (
        'operation',
        'safety',
        'technical',
        'guest',
        'crew',
        'weather',
        'marina',
        'finance',
        'other'
      )
    ),

  title text not null,

  description text,

  status text not null
    default 'open'
    check (
      status in (
        'open',
        'investigating',
        'resolved',
        'closed'
      )
    ),

  occurred_at timestamptz not null
    default now(),

  resolved_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  resolved_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  yacht_incidents_booking_idx
on public.yacht_os_incidents (
  booking_id,
  status,
  severity
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_departure_checklist_updated_at
on public.yacht_os_departure_checklist;

create trigger
  yacht_departure_checklist_updated_at
before update
on public.yacht_os_departure_checklist
for each row
execute function
  public.yacht_os_set_updated_at();


drop trigger if exists
  yacht_incidents_updated_at
on public.yacht_os_incidents;

create trigger
  yacht_incidents_updated_at
before update
on public.yacht_os_incidents
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_departure_checklist
enable row level security;

alter table public.yacht_os_incidents
enable row level security;


create policy yacht_departure_checklist_company_access
on public.yacht_os_departure_checklist
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


create policy yacht_incidents_company_access
on public.yacht_os_incidents
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


grant select, insert, update, delete
on
  public.yacht_os_departure_checklist,
  public.yacht_os_incidents
to authenticated;


-- ============================================================
-- SEED PROFESSIONAL DEFAULT CHECKLIST
-- ============================================================

create or replace function
public.yacht_os_seed_departure_checklist(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
  v_existing integer;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id;

  if b.id is null then
    raise exception 'Booking not found';
  end if;


  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception 'Access denied';
  end if;


  select count(*)
  into v_existing
  from public.yacht_os_departure_checklist
  where booking_id = b.id;


  if v_existing > 0 then
    return jsonb_build_object(
      'ok', true,
      'already_seeded', true,
      'count', v_existing
    );
  end if;


  insert into public.yacht_os_departure_checklist (
    company_id,
    booking_id,
    yacht_id,
    category,
    title,
    description,
    is_required,
    sort_order
  )
  values

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'technical',
    'Motor ve temel teknik kontrol',
    'Motor, akü, elektrik, sintine ve temel tekne sistemleri kontrol edildi.',
    true,
    10
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'safety',
    'Can yelekleri ve güvenlik ekipmanı',
    'Misafir sayısına uygun can yeleği ve zorunlu güvenlik ekipmanı hazır.',
    true,
    20
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'safety',
    'Yangın söndürücü ve ilk yardım',
    'Yangın ekipmanı ve ilk yardım seti erişilebilir ve hazır.',
    true,
    30
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'documents',
    'Tekne evrakları',
    'Gerekli tekne ve operasyon belgeleri kontrol edildi.',
    true,
    40
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'crew',
    'Kaptan ve crew hazır',
    'Kaptan ve görevli ekip operasyona hazır.',
    true,
    50
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'guest',
    'Yolcu manifestosu doğrulandı',
    'Yolcu listesi ve kişi sayısı kontrol edildi.',
    true,
    60
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'guest',
    'Misafir güvenlik bilgilendirmesi',
    'Misafirlere temel tekne ve acil durum güvenlik bilgisi verildi.',
    true,
    70
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'marina',
    'Rota ve hava durumu kontrolü',
    'Rota, marina koşulları ve hava durumu operasyon için kontrol edildi.',
    true,
    80
  ),

  (
    b.company_id,
    b.id,
    b.yacht_id,
    'service',
    'Yakıt ve operasyon hazırlığı',
    'Yakıt, su, buz, ikram ve gerekli operasyon hazırlıkları kontrol edildi.',
    true,
    90
  );


  return jsonb_build_object(
    'ok', true,
    'already_seeded', false,
    'count', 9
  );

end;
$$;


grant execute
on function
  public.yacht_os_seed_departure_checklist(uuid)
to authenticated;


-- ============================================================
-- READINESS REPORT
-- ============================================================

create or replace function
public.yacht_os_get_departure_readiness(
  p_booking_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;

  v_manifest_count integer;
  v_manifest_checked integer;

  v_captain_count integer;

  v_required_total integer;
  v_required_completed integer;
  v_required_open integer;

  v_service_blockers integer;

  v_incident_blockers integer;

  v_payment_blocker integer;

  v_total_blockers integer;

  v_score numeric;

  v_blockers jsonb := '[]'::jsonb;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id;


  if b.id is null then
    raise exception 'Booking not found';
  end if;


  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception 'Access denied';
  end if;


  select
    count(*),
    count(*) filter (
      where check_in_status in (
        'checked_in',
        'boarded'
      )
    )
  into
    v_manifest_count,
    v_manifest_checked

  from public.yacht_os_booking_guests
  where booking_id = b.id;


  select count(*)
  into v_captain_count

  from public.yacht_os_booking_crew

  where booking_id = b.id
    and role = 'captain'
    and status in (
      'confirmed',
      'on_board',
      'completed'
    );


  select
    count(*) filter (
      where is_required
    ),

    count(*) filter (
      where is_required
        and is_completed
    ),

    count(*) filter (
      where is_required
        and not is_completed
    )

  into
    v_required_total,
    v_required_completed,
    v_required_open

  from public.yacht_os_departure_checklist

  where booking_id = b.id;


  select count(*)
  into v_service_blockers

  from public.yacht_os_booking_services

  where booking_id = b.id
    and is_departure_blocker = true
    and status not in (
      'ready',
      'delivered',
      'completed',
      'cancelled'
    );


  select count(*)
  into v_incident_blockers

  from public.yacht_os_incidents

  where booking_id = b.id
    and severity in (
      'high',
      'critical'
    )
    and status in (
      'open',
      'investigating'
    );


  v_payment_blocker :=
    case
      when
        b.requires_full_payment_before_departure = true
        and b.paid_amount < b.total_amount - 0.01
      then 1
      else 0
    end;


  if b.check_in_status not in (
    'checked_in',
    'boarded'
  ) then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'BOOKING_CHECKIN',
          'label', 'Rezervasyon check-in tamamlanmadı'
        )
      );

  end if;


  if v_manifest_count < b.guest_count then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'MANIFEST_COUNT',
          'label',
            format(
              'Manifest eksik: %s / %s misafir',
              v_manifest_count,
              b.guest_count
            )
        )
      );

  end if;


  if v_manifest_checked < b.guest_count then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'MANIFEST_CHECKIN',
          'label',
            format(
              'Manifest check-in eksik: %s / %s misafir',
              v_manifest_checked,
              b.guest_count
            )
        )
      );

  end if;


  if v_captain_count <= 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'CAPTAIN',
          'label', 'Onaylı kaptan bulunmuyor'
        )
      );

  end if;


  if v_required_total <= 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'CHECKLIST_NOT_CREATED',
          'label', 'Zorunlu çıkış checklisti oluşturulmamış'
        )
      );

  elsif v_required_open > 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'CHECKLIST_OPEN',
          'label',
            format(
              '%s zorunlu checklist maddesi açık',
              v_required_open
            )
        )
      );

  end if;


  if v_service_blockers > 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'SERVICE_BLOCKER',
          'label',
            format(
              '%s kritik hazırlık tamamlanmamış',
              v_service_blockers
            )
        )
      );

  end if;


  if v_incident_blockers > 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'INCIDENT',
          'label',
            format(
              '%s yüksek/kritik açık olay var',
              v_incident_blockers
            )
        )
      );

  end if;


  if v_payment_blocker > 0 then

    v_blockers :=
      v_blockers ||
      jsonb_build_array(
        jsonb_build_object(
          'code', 'PAYMENT',
          'label',
            format(
              'Tam ödeme zorunlu. Kalan bakiye: %s',
              greatest(
                b.total_amount -
                b.paid_amount,
                0
              )
            )
        )
      );

  end if;


  v_total_blockers :=
    jsonb_array_length(
      v_blockers
    );


  v_score :=
    greatest(
      0,
      100 -
      (
        v_total_blockers *
        15
      )
    );


  return jsonb_build_object(
    'ok', true,

    'booking_id', b.id,

    'ready',
      v_total_blockers = 0,

    'score',
      v_score,

    'blocker_count',
      v_total_blockers,

    'blockers',
      v_blockers,

    'manifest_count',
      v_manifest_count,

    'manifest_checked',
      v_manifest_checked,

    'guest_count',
      b.guest_count,

    'captain_ready',
      v_captain_count > 0,

    'required_checklist_total',
      v_required_total,

    'required_checklist_completed',
      v_required_completed,

    'required_checklist_open',
      v_required_open,

    'service_blockers',
      v_service_blockers,

    'incident_blockers',
      v_incident_blockers,

    'payment_blocker',
      v_payment_blocker > 0,

    'requires_full_payment',
      b.requires_full_payment_before_departure,

    'departure_override_active',
      b.departure_override_at is not null,

    'departure_override_reason',
      b.departure_override_reason
  );

end;
$$;


grant execute
on function
  public.yacht_os_get_departure_readiness(uuid)
to authenticated;


-- ============================================================
-- OVERRIDE
-- Only privileged operational roles.
-- ============================================================

create or replace function
public.yacht_os_authorize_departure_override(
  p_booking_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
  v_role text;
begin

  if nullif(
    trim(
      p_reason
    ),
    ''
  ) is null then
    raise exception
      'Override reason is required';
  end if;


  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  select cm.role
  into v_role

  from public.company_members cm

  where cm.company_id =
      b.company_id

    and cm.user_id =
      auth.uid()

    and cm.is_active =
      true

  limit 1;


  if v_role not in (
    'super_admin',
    'company_owner',
    'operation_manager'
  ) then
    raise exception
      'Departure override requires operational manager authority';
  end if;


  update public.yacht_os_bookings
  set
    departure_override_reason =
      trim(
        p_reason
      ),

    departure_override_at =
      now(),

    departure_override_by =
      auth.uid()

  where id =
    b.id;


  insert into public.yacht_os_operation_events (
    company_id,
    booking_id,
    yacht_id,

    event_type,
    event_label,

    new_value,

    note,

    created_by
  )
  values (
    b.company_id,
    b.id,
    b.yacht_id,

    'departure_override',

    'Sefer çıkış blokajı yetkili tarafından override edildi',

    jsonb_build_object(
      'override',
        true
    ),

    trim(
      p_reason
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok', true
  );

end;
$$;


grant execute
on function
  public.yacht_os_authorize_departure_override(
    uuid,
    text
  )
to authenticated;


-- ============================================================
-- DEPARTURE GATE TRIGGER
-- Prevent ANY code path from bypassing readiness.
-- ============================================================

create or replace function
public.yacht_os_enforce_departure_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest_count integer;
  v_manifest_checked integer;
  v_captain_count integer;
  v_required_total integer;
  v_required_open integer;
  v_service_blockers integer;
  v_incident_blockers integer;
begin

  if
    new.operation_status = 'departed'
    and old.operation_status is distinct from 'departed'
  then

    -- Explicit authorized override bypasses blockers.
    if new.departure_override_at is not null then
      return new;
    end if;


    if new.check_in_status not in (
      'checked_in',
      'boarded'
    ) then
      raise exception
        'Departure blocked: booking check-in is incomplete';
    end if;


    select
      count(*),

      count(*) filter (
        where check_in_status in (
          'checked_in',
          'boarded'
        )
      )

    into
      v_manifest_count,
      v_manifest_checked

    from public.yacht_os_booking_guests
    where booking_id = new.id;


    if v_manifest_count < new.guest_count then
      raise exception
        'Departure blocked: passenger manifest is incomplete';
    end if;


    if v_manifest_checked < new.guest_count then
      raise exception
        'Departure blocked: passenger check-in is incomplete';
    end if;


    select count(*)
    into v_captain_count

    from public.yacht_os_booking_crew

    where booking_id = new.id
      and role = 'captain'
      and status in (
        'confirmed',
        'on_board',
        'completed'
      );


    if v_captain_count <= 0 then
      raise exception
        'Departure blocked: confirmed captain is required';
    end if;


    select
      count(*) filter (
        where is_required
      ),

      count(*) filter (
        where is_required
          and not is_completed
      )

    into
      v_required_total,
      v_required_open

    from public.yacht_os_departure_checklist

    where booking_id = new.id;


    if v_required_total <= 0 then
      raise exception
        'Departure blocked: departure checklist has not been created';
    end if;


    if v_required_open > 0 then
      raise exception
        'Departure blocked: required checklist items are incomplete';
    end if;


    select count(*)
    into v_service_blockers

    from public.yacht_os_booking_services

    where booking_id = new.id
      and is_departure_blocker = true
      and status not in (
        'ready',
        'delivered',
        'completed',
        'cancelled'
      );


    if v_service_blockers > 0 then
      raise exception
        'Departure blocked: critical operation services are incomplete';
    end if;


    select count(*)
    into v_incident_blockers

    from public.yacht_os_incidents

    where booking_id = new.id
      and severity in (
        'high',
        'critical'
      )
      and status in (
        'open',
        'investigating'
      );


    if v_incident_blockers > 0 then
      raise exception
        'Departure blocked: unresolved high/critical incident exists';
    end if;


    if
      new.requires_full_payment_before_departure = true
      and new.paid_amount < new.total_amount - 0.01
    then
      raise exception
        'Departure blocked: full payment is required';
    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  yacht_os_departure_gate
on public.yacht_os_bookings;


create trigger
  yacht_os_departure_gate
before update of operation_status
on public.yacht_os_bookings
for each row
execute function
  public.yacht_os_enforce_departure_gate();


-- ============================================================
-- BOOKING FINANCE GATE SETTING
-- ============================================================

create or replace function
public.yacht_os_set_departure_payment_requirement(
  p_booking_id uuid,
  p_required boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.yacht_os_bookings%rowtype;
begin

  select *
  into b
  from public.yacht_os_bookings
  where id = p_booking_id
  for update;


  if b.id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.is_active_company_member(
    b.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_bookings
  set
    requires_full_payment_before_departure =
      p_required

  where id =
    b.id;


  return jsonb_build_object(
    'ok', true,
    'required', p_required
  );

end;
$$;


grant execute
on function
  public.yacht_os_set_departure_payment_requirement(
    uuid,
    boolean
  )
to authenticated;
