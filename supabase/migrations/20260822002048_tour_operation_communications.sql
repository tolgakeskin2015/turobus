-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 13 — OPERATION COMMUNICATION CENTER
--
-- This is an operational communication orchestration registry.
--
-- It DOES NOT replace:
--   customer_360_messages
--   Customer360 WhatsApp queue
--   provider workers
--   SMS / e-mail provider engines
--
-- Provider delivery must never be claimed without a real provider result.
-- ============================================================

create table if not exists
public.tour_operation_communications (

  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  supplier_id uuid
    references public.suppliers(id)
    on delete set null,

  staff_id uuid
    references public.staff_profiles(id)
    on delete set null,

  recipient_type text
    not null
    check (
      recipient_type in (
        'customer',
        'supplier',
        'staff',
        'guide',
        'driver',
        'internal'
      )
    ),

  recipient_name text
    not null,

  recipient_phone text,

  recipient_email text,

  channel text
    not null
    check (
      channel in (
        'whatsapp',
        'sms',
        'email',
        'phone',
        'system'
      )
    ),

  message_type text
    not null
    default 'general'
    check (
      message_type in (
        'general',
        'tour_reminder',
        'boarding_info',
        'flight_info',
        'flight_change',
        'voucher',
        'payment_reminder',
        'supplier_confirmation',
        'guide_instruction',
        'delay',
        'emergency',
        'return_info',
        'other'
      )
    ),

  subject text,

  message_body text
    not null,

  delivery_status text
    not null
    default 'draft'
    check (
      delivery_status in (
        'draft',
        'ready',
        'queued',
        'sent',
        'delivered',
        'read',
        'failed',
        'cancelled'
      )
    ),

  delivery_source text
    not null
    default 'manual'
    check (
      delivery_source in (
        'manual',
        'customer360',
        'provider',
        'system'
      )
    ),

  provider_message_id text,

  provider_error text,

  scheduled_at timestamptz,

  sent_at timestamptz,

  delivered_at timestamptz,

  read_at timestamptz,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
  tour_operation_communications_tour_idx
on public.tour_operation_communications (
  company_id,
  tour_id
);


create index if not exists
  tour_operation_communications_departure_idx
on public.tour_operation_communications (
  company_id,
  departure_id
);


create index if not exists
  tour_operation_communications_status_idx
on public.tour_operation_communications (
  company_id,
  delivery_status
);


create index if not exists
  tour_operation_communications_channel_idx
on public.tour_operation_communications (
  company_id,
  channel,
  delivery_status
);


create index if not exists
  tour_operation_communications_schedule_idx
on public.tour_operation_communications (
  company_id,
  scheduled_at
);


alter table
public.tour_operation_communications
enable row level security;


drop policy if exists
  tour_operation_communications_select_company
on public.tour_operation_communications;


create policy
  tour_operation_communications_select_company
on public.tour_operation_communications
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_communications_insert_company
on public.tour_operation_communications;


create policy
  tour_operation_communications_insert_company
on public.tour_operation_communications
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_operation_communications_update_company
on public.tour_operation_communications;


create policy
  tour_operation_communications_update_company
on public.tour_operation_communications
for update
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


drop policy if exists
  tour_operation_communications_delete_company
on public.tour_operation_communications;


create policy
  tour_operation_communications_delete_company
on public.tour_operation_communications
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create or replace function
public.touch_tour_operation_communications()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at =
    now();

  new.updated_by =
    coalesce(
      auth.uid(),
      new.updated_by
    );

  if
    new.delivery_status =
      'sent'
    and
    old.delivery_status <>
      'sent'
    and
    new.sent_at
      is null
  then

    new.sent_at =
      now();

  end if;

  if
    new.delivery_status =
      'delivered'
    and
    old.delivery_status <>
      'delivered'
    and
    new.delivered_at
      is null
  then

    new.delivered_at =
      now();

  end if;

  if
    new.delivery_status =
      'read'
    and
    old.delivery_status <>
      'read'
    and
    new.read_at
      is null
  then

    new.read_at =
      now();

  end if;

  return new;

end;
$$;


drop trigger if exists
  trg_touch_tour_operation_communications
on public.tour_operation_communications;


create trigger
  trg_touch_tour_operation_communications
before update
on public.tour_operation_communications
for each row
execute function
public.touch_tour_operation_communications();


revoke all
on function
public.touch_tour_operation_communications()
from public;


revoke all
on public.tour_operation_communications
from anon;


grant
  select,
  insert,
  update,
  delete
on public.tour_operation_communications
to authenticated;


comment on table
public.tour_operation_communications
is
'Tour OS operational communication orchestration. Provider delivery remains authoritative in existing provider/message systems.';
