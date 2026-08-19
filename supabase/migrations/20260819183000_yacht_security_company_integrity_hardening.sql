
-- ============================================================
-- TUROBUS YACHT OS
-- SECURITY + COMPANY INTEGRITY HARDENING — PHASE 1
--
-- IMPORTANT:
-- Applied migrations are NOT edited.
-- Existing RPC names are preserved with hardened wrappers.
-- ============================================================


-- ============================================================
-- SERVICE ROLE DETECTION
-- ============================================================

create or replace function
public.yacht_os_is_service_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      auth.jwt() ->> 'role',
      ''
    ) = 'service_role';
$$;

revoke execute
on function public.yacht_os_is_service_role()
from public;

grant execute
on function public.yacht_os_is_service_role()
to authenticated, service_role;


-- ============================================================
-- FINANCE AUTHORITY
-- ============================================================

create or replace function
public.yacht_os_has_finance_authority(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.yacht_os_is_service_role()
    or exists (
      select 1
      from public.company_members cm
      where
        cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
        and cm.role in (
          'super_admin',
          'company_owner',
          'accounting'
        )
    );
$$;

revoke execute
on function
  public.yacht_os_has_finance_authority(uuid)
from public;

grant execute
on function
  public.yacht_os_has_finance_authority(uuid)
to authenticated, service_role;


-- ============================================================
-- OPERATION AUTHORITY
-- ============================================================

create or replace function
public.yacht_os_has_operation_authority(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.yacht_os_is_service_role()
    or exists (
      select 1
      from public.company_members cm
      where
        cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
        and cm.role in (
          'super_admin',
          'company_owner',
          'operation_manager'
        )
    );
$$;

revoke execute
on function
  public.yacht_os_has_operation_authority(uuid)
from public;

grant execute
on function
  public.yacht_os_has_operation_authority(uuid)
to authenticated, service_role;


-- ============================================================
-- PAYMENT LINK AUTHORITY
--
-- Sales personnel may SEND payment links.
-- They cannot record manual money or refunds.
-- ============================================================

create or replace function
public.yacht_os_has_payment_link_authority(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.yacht_os_is_service_role()
    or exists (
      select 1
      from public.company_members cm
      where
        cm.company_id = p_company_id
        and cm.user_id = auth.uid()
        and cm.is_active = true
        and cm.role in (
          'super_admin',
          'company_owner',
          'operation_manager',
          'accounting',
          'sales'
        )
    );
$$;

revoke execute
on function
  public.yacht_os_has_payment_link_authority(uuid)
from public;

grant execute
on function
  public.yacht_os_has_payment_link_authority(uuid)
to authenticated, service_role;


-- ============================================================
-- GLOBAL SECURITY DEFINER PUBLIC REVOKE
--
-- PostgreSQL gives PUBLIC execute by default on functions.
-- Remove that implicit access from Yacht security-definer RPCs.
-- Explicit anon/auth/service_role grants remain separate.
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where
      n.nspname = 'public'
      and p.prosecdef = true
      and (
        p.proname like 'yacht_os_%'
        or p.proname like 'get_public_yacht_%'
        or p.proname like 'check_yacht_%'
        or p.proname like 'finalize_yacht_%'
      )
  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;


-- ============================================================
-- PROVIDER-ONLY FUNCTIONS
-- ============================================================

revoke execute
on function
  public.check_yacht_payment_link_payable(uuid)
from public, anon, authenticated;

grant execute
on function
  public.check_yacht_payment_link_payable(uuid)
to service_role;


revoke execute
on function
  public.finalize_yacht_iyzico_payment(
    uuid,
    text,
    text,
    numeric,
    jsonb
  )
from public, anon, authenticated;

grant execute
on function
  public.finalize_yacht_iyzico_payment(
    uuid,
    text,
    text,
    numeric,
    jsonb
  )
to service_role;


revoke execute
on function
  public.yacht_os_apply_provider_refund(
    uuid,
    text,
    jsonb
  )
from public, anon, authenticated;

grant execute
on function
  public.yacht_os_apply_provider_refund(
    uuid,
    text,
    jsonb
  )
to service_role;


-- Public token view remains intentionally public-by-token.
revoke execute
on function
  public.get_public_yacht_payment_link(uuid)
from public;

grant execute
on function
  public.get_public_yacht_payment_link(uuid)
to anon, authenticated;


-- ============================================================
-- HARDEN MANUAL PAYMENT
-- Existing implementation is renamed.
-- Same public RPC name stays alive via wrapper.
-- ============================================================

alter function
public.yacht_os_record_manual_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
rename to
yacht_os_record_manual_payment_internal_20260819;


revoke execute
on function
public.yacht_os_record_manual_payment_internal_20260819(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_record_manual_payment(
  p_booking_id uuid,
  p_amount numeric,
  p_method text,
  p_reference_no text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_bookings
  where id = p_booking_id;


  if v_company_id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    v_company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  return
    public.yacht_os_record_manual_payment_internal_20260819(
      p_booking_id,
      p_amount,
      p_method,
      p_reference_no,
      p_note
    );

end;
$$;

revoke execute
on function
public.yacht_os_record_manual_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
from public, anon;

grant execute
on function
public.yacht_os_record_manual_payment(
  uuid,
  numeric,
  text,
  text,
  text
)
to authenticated;


-- ============================================================
-- HARDEN PAYMENT LINK CREATION
-- ============================================================

alter function
public.yacht_os_create_payment_link(
  uuid,
  numeric,
  timestamptz,
  text
)
rename to
yacht_os_create_payment_link_internal_20260819;


revoke execute
on function
public.yacht_os_create_payment_link_internal_20260819(
  uuid,
  numeric,
  timestamptz,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_create_payment_link(
  p_booking_id uuid,
  p_amount numeric,
  p_valid_until timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_bookings
  where id = p_booking_id;


  if v_company_id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_payment_link_authority(
    v_company_id
  ) then
    raise exception
      'Payment link authority required';
  end if;


  return
    public.yacht_os_create_payment_link_internal_20260819(
      p_booking_id,
      p_amount,
      p_valid_until,
      p_note
    );

end;
$$;

revoke execute
on function
public.yacht_os_create_payment_link(
  uuid,
  numeric,
  timestamptz,
  text
)
from public, anon;

grant execute
on function
public.yacht_os_create_payment_link(
  uuid,
  numeric,
  timestamptz,
  text
)
to authenticated;


-- ============================================================
-- HARDEN COLLECTION PLAN
-- ============================================================

alter function
public.yacht_os_update_collection_plan(
  uuid,
  timestamptz,
  numeric,
  text,
  text
)
rename to
yacht_os_update_collection_plan_internal_20260819;


revoke execute
on function
public.yacht_os_update_collection_plan_internal_20260819(
  uuid,
  timestamptz,
  numeric,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_update_collection_plan(
  p_booking_id uuid,
  p_due_at timestamptz default null,
  p_deposit_target numeric default 0,
  p_priority text default 'normal',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_bookings
  where id = p_booking_id;


  if v_company_id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    v_company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  return
    public.yacht_os_update_collection_plan_internal_20260819(
      p_booking_id,
      p_due_at,
      p_deposit_target,
      p_priority,
      p_note
    );

end;
$$;

revoke execute
on function
public.yacht_os_update_collection_plan(
  uuid,
  timestamptz,
  numeric,
  text,
  text
)
from public, anon;

grant execute
on function
public.yacht_os_update_collection_plan(
  uuid,
  timestamptz,
  numeric,
  text,
  text
)
to authenticated;


-- ============================================================
-- HARDEN MANUAL REFUND
-- ============================================================

alter function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
rename to
yacht_os_record_manual_refund_internal_20260819;


revoke execute
on function
public.yacht_os_record_manual_refund_internal_20260819(
  uuid,
  numeric,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_record_manual_refund(
  p_payment_id uuid,
  p_amount numeric,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_payments
  where id = p_payment_id;


  if v_company_id is null then
    raise exception
      'Payment not found';
  end if;


  if not public.yacht_os_has_finance_authority(
    v_company_id
  ) then
    raise exception
      'Finance authority required';
  end if;


  return
    public.yacht_os_record_manual_refund_internal_20260819(
      p_payment_id,
      p_amount,
      p_reason
    );

end;
$$;

revoke execute
on function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
from public, anon;

grant execute
on function
public.yacht_os_record_manual_refund(
  uuid,
  numeric,
  text
)
to authenticated;


-- ============================================================
-- HARDEN RATE PLAN CREATION
-- ============================================================

alter function
public.yacht_os_create_rate_plan(
  uuid,
  text,
  date,
  date,
  numeric,
  numeric,
  integer,
  integer,
  text,
  text
)
rename to
yacht_os_create_rate_plan_internal_20260819;


revoke execute
on function
public.yacht_os_create_rate_plan_internal_20260819(
  uuid,
  text,
  date,
  date,
  numeric,
  numeric,
  integer,
  integer,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_create_rate_plan(
  p_yacht_id uuid,
  p_name text,
  p_start_date date,
  p_end_date date,
  p_weekday_price numeric,
  p_weekend_price numeric default null,
  p_minimum_days integer default 1,
  p_priority integer default 100,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if v_company_id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    v_company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  return
    public.yacht_os_create_rate_plan_internal_20260819(
      p_yacht_id,
      p_name,
      p_start_date,
      p_end_date,
      p_weekday_price,
      p_weekend_price,
      p_minimum_days,
      p_priority,
      p_currency,
      p_note
    );

end;
$$;


-- ============================================================
-- HARDEN RATE PLAN STATUS
-- ============================================================

alter function
public.yacht_os_set_rate_plan_status(
  uuid,
  text
)
rename to
yacht_os_set_rate_plan_status_internal_20260819;


revoke execute
on function
public.yacht_os_set_rate_plan_status_internal_20260819(
  uuid,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_set_rate_plan_status(
  p_rate_plan_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_rate_plans
  where id = p_rate_plan_id;


  if v_company_id is null then
    raise exception
      'Rate plan not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    v_company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  return
    public.yacht_os_set_rate_plan_status_internal_20260819(
      p_rate_plan_id,
      p_status
    );

end;
$$;


-- ============================================================
-- HARDEN RATE CALENDAR PUBLISH
-- ============================================================

alter function
public.yacht_os_publish_rate_calendar(
  uuid,
  date,
  date
)
rename to
yacht_os_publish_rate_calendar_internal_20260819;


revoke execute
on function
public.yacht_os_publish_rate_calendar_internal_20260819(
  uuid,
  date,
  date
)
from public, anon, authenticated;


create function
public.yacht_os_publish_rate_calendar(
  p_yacht_id uuid,
  p_date_from date,
  p_date_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if v_company_id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    v_company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  return
    public.yacht_os_publish_rate_calendar_internal_20260819(
      p_yacht_id,
      p_date_from,
      p_date_to
    );

end;
$$;


-- ============================================================
-- HARDEN BASE RATE
-- ============================================================

alter function
public.yacht_os_update_base_rate(
  uuid,
  numeric,
  integer
)
rename to
yacht_os_update_base_rate_internal_20260819;


revoke execute
on function
public.yacht_os_update_base_rate_internal_20260819(
  uuid,
  numeric,
  integer
)
from public, anon, authenticated;


create function
public.yacht_os_update_base_rate(
  p_yacht_id uuid,
  p_base_daily_price numeric,
  p_minimum_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if v_company_id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    v_company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  return
    public.yacht_os_update_base_rate_internal_20260819(
      p_yacht_id,
      p_base_daily_price,
      p_minimum_days
    );

end;
$$;


-- Revenue wrappers:
revoke execute
on function public.yacht_os_create_rate_plan(
  uuid,text,date,date,numeric,numeric,integer,integer,text,text
)
from public, anon;

grant execute
on function public.yacht_os_create_rate_plan(
  uuid,text,date,date,numeric,numeric,integer,integer,text,text
)
to authenticated;


revoke execute
on function public.yacht_os_set_rate_plan_status(uuid,text)
from public, anon;

grant execute
on function public.yacht_os_set_rate_plan_status(uuid,text)
to authenticated;


revoke execute
on function public.yacht_os_publish_rate_calendar(uuid,date,date)
from public, anon;

grant execute
on function public.yacht_os_publish_rate_calendar(uuid,date,date)
to authenticated;


revoke execute
on function public.yacht_os_update_base_rate(uuid,numeric,integer)
from public, anon;

grant execute
on function public.yacht_os_update_base_rate(uuid,numeric,integer)
to authenticated;


-- ============================================================
-- HARDEN MAINTENANCE SCHEDULE
-- ============================================================

alter function
public.yacht_os_schedule_maintenance(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
rename to
yacht_os_schedule_maintenance_internal_20260819;


revoke execute
on function
public.yacht_os_schedule_maintenance_internal_20260819(
  uuid,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  numeric,
  text,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_schedule_maintenance(
  p_yacht_id uuid,
  p_maintenance_type text,
  p_title text,
  p_description text,
  p_planned_start date,
  p_planned_end date,
  p_priority text default 'medium',
  p_service_provider text default null,
  p_estimated_cost numeric default 0,
  p_currency text default 'TRY',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if v_company_id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    v_company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  return
    public.yacht_os_schedule_maintenance_internal_20260819(
      p_yacht_id,
      p_maintenance_type,
      p_title,
      p_description,
      p_planned_start,
      p_planned_end,
      p_priority,
      p_service_provider,
      p_estimated_cost,
      p_currency,
      p_note
    );

end;
$$;


-- ============================================================
-- HARDEN MAINTENANCE STATUS
-- ============================================================

alter function
public.yacht_os_update_maintenance_status(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
rename to
yacht_os_update_maintenance_status_internal_20260819;


revoke execute
on function
public.yacht_os_update_maintenance_status_internal_20260819(
  uuid,
  text,
  numeric,
  numeric,
  numeric,
  date,
  text
)
from public, anon, authenticated;


create function
public.yacht_os_update_maintenance_status(
  p_maintenance_id uuid,
  p_status text,
  p_actual_cost numeric default null,
  p_engine_hours numeric default null,
  p_next_service_engine_hours numeric default null,
  p_next_maintenance_date date default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_maintenance_jobs
  where id = p_maintenance_id;


  if v_company_id is null then
    raise exception
      'Maintenance not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    v_company_id
  ) then
    raise exception
      'Operation authority required';
  end if;


  return
    public.yacht_os_update_maintenance_status_internal_20260819(
      p_maintenance_id,
      p_status,
      p_actual_cost,
      p_engine_hours,
      p_next_service_engine_hours,
      p_next_maintenance_date,
      p_note
    );

end;
$$;


revoke execute
on function public.yacht_os_schedule_maintenance(
  uuid,text,text,text,date,date,text,text,numeric,text,text
)
from public, anon;

grant execute
on function public.yacht_os_schedule_maintenance(
  uuid,text,text,text,date,date,text,text,numeric,text,text
)
to authenticated;


revoke execute
on function public.yacht_os_update_maintenance_status(
  uuid,text,numeric,numeric,numeric,date,text
)
from public, anon;

grant execute
on function public.yacht_os_update_maintenance_status(
  uuid,text,numeric,numeric,numeric,date,text
)
to authenticated;


-- ============================================================
-- HARDEN DEPARTURE OVERRIDE
--
-- Wrapping fixes the NULL-role authorization hole without
-- editing the original applied migration.
-- ============================================================

alter function
public.yacht_os_authorize_departure_override(
  uuid,
  text
)
rename to
yacht_os_authorize_departure_override_internal_20260819;


revoke execute
on function
public.yacht_os_authorize_departure_override_internal_20260819(
  uuid,
  text
)
from public, anon, authenticated;


create function
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
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_bookings
  where id = p_booking_id;


  if v_company_id is null then
    raise exception
      'Booking not found';
  end if;


  if not public.yacht_os_has_operation_authority(
    v_company_id
  ) then
    raise exception
      'Departure override requires operation authority';
  end if;


  return
    public.yacht_os_authorize_departure_override_internal_20260819(
      p_booking_id,
      p_reason
    );

end;
$$;


revoke execute
on function
public.yacht_os_authorize_departure_override(
  uuid,
  text
)
from public, anon;

grant execute
on function
public.yacht_os_authorize_departure_override(
  uuid,
  text
)
to authenticated;


-- ============================================================
-- HARDEN DEPARTURE PAYMENT POLICY
-- ============================================================

alter function
public.yacht_os_set_departure_payment_requirement(
  uuid,
  boolean
)
rename to
yacht_os_set_departure_payment_requirement_internal_20260819;


revoke execute
on function
public.yacht_os_set_departure_payment_requirement_internal_20260819(
  uuid,
  boolean
)
from public, anon, authenticated;


create function
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
  v_company_id uuid;
begin

  select company_id
  into v_company_id
  from public.yacht_os_bookings
  where id = p_booking_id;


  if v_company_id is null then
    raise exception
      'Booking not found';
  end if;


  if not (
    public.yacht_os_has_operation_authority(
      v_company_id
    )
    or public.yacht_os_has_finance_authority(
      v_company_id
    )
  ) then
    raise exception
      'Departure payment policy authority required';
  end if;


  return
    public.yacht_os_set_departure_payment_requirement_internal_20260819(
      p_booking_id,
      p_required
    );

end;
$$;


revoke execute
on function
public.yacht_os_set_departure_payment_requirement(
  uuid,
  boolean
)
from public, anon;

grant execute
on function
public.yacht_os_set_departure_payment_requirement(
  uuid,
  boolean
)
to authenticated;


-- ============================================================
-- OVERRIDE LIFETIME
--
-- Override is valid for max 30 minutes.
-- Existing departure gate will then perform normal checks.
-- ============================================================

create or replace function
public.yacht_os_expire_stale_departure_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    new.operation_status = 'departed'
    and old.operation_status
      is distinct from 'departed'
    and new.departure_override_at
      is not null
    and new.departure_override_at <
      now() - interval '30 minutes'
  then

    new.departure_override_at :=
      null;

    new.departure_override_by :=
      null;

    new.departure_override_reason :=
      null;

  end if;


  return new;

end;
$$;

revoke execute
on function
  public.yacht_os_expire_stale_departure_override()
from public, anon, authenticated;


drop trigger if exists
  aaa_yacht_os_expire_stale_departure_override
on public.yacht_os_bookings;


create trigger
  aaa_yacht_os_expire_stale_departure_override
before update of operation_status
on public.yacht_os_bookings
for each row
execute function
  public.yacht_os_expire_stale_departure_override();


-- ============================================================
-- CONSUME OVERRIDE AFTER SUCCESSFUL DEPARTURE
-- Prevent permanent future bypass.
-- ============================================================

create or replace function
public.yacht_os_consume_departure_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  if
    new.operation_status = 'departed'
    and old.operation_status
      is distinct from 'departed'
    and new.departure_override_at
      is not null
  then

    update public.yacht_os_bookings
    set
      departure_override_at =
        null,

      departure_override_by =
        null,

      departure_override_reason =
        null

    where id =
      new.id;

  end if;


  return new;

end;
$$;

revoke execute
on function
  public.yacht_os_consume_departure_override()
from public, anon, authenticated;


drop trigger if exists
  zzz_yacht_os_consume_departure_override
on public.yacht_os_bookings;


create trigger
  zzz_yacht_os_consume_departure_override
after update of operation_status
on public.yacht_os_bookings
for each row
execute function
  public.yacht_os_consume_departure_override();


-- ============================================================
-- GENERIC COMPANY INTEGRITY GUARD
--
-- Prevent:
-- company A child row -> company B parent row
-- ============================================================

create or replace function
public.yacht_os_enforce_company_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fk_column text;
  v_parent_table regclass;

  v_fk uuid;
  v_parent_company uuid;
begin

  v_parent_table :=
    to_regclass(
      TG_ARGV[0]
    );

  v_fk_column :=
    TG_ARGV[1];


  if v_parent_table is null then
    raise exception
      'Company integrity parent table not found: %',
      TG_ARGV[0];
  end if;


  v_fk :=
    nullif(
      to_jsonb(new) ->>
        v_fk_column,
      ''
    )::uuid;


  if v_fk is null then
    return new;
  end if;


  execute format(
    'select company_id from %s where id = $1',
    v_parent_table
  )
  into v_parent_company
  using v_fk;


  if v_parent_company is null then
    raise exception
      'Company integrity parent record not found';
  end if;


  if new.company_id
     is distinct from
     v_parent_company
  then
    raise exception
      'Cross-company reference blocked: %.%',
      TG_TABLE_NAME,
      v_fk_column;
  end if;


  return new;

end;
$$;


revoke execute
on function
  public.yacht_os_enforce_company_parent()
from public, anon, authenticated;


-- ============================================================
-- INSTALL COMPANY INTEGRITY TRIGGERS
--
-- Missing optional tables/columns are safely skipped.
-- ============================================================

do $$
declare
  r record;
  v_child regclass;
  v_parent regclass;
begin

  for r in
    select *
    from (
      values

      ('public.yacht_os_booking_guests',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_guests_booking'),

      ('public.yacht_os_booking_crew',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_crew_booking'),

      ('public.yacht_os_booking_crew',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_crew_yacht'),

      ('public.yacht_os_booking_services',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_services_booking'),

      ('public.yacht_os_operation_events',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_events_booking'),

      ('public.yacht_os_operation_events',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_events_yacht'),

      ('public.yacht_os_departure_checklist',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_checklist_booking'),

      ('public.yacht_os_incidents',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_incidents_booking'),

      ('public.yacht_os_incidents',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_incidents_yacht'),

      ('public.yacht_os_maintenance_jobs',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_maintenance_yacht'),

      ('public.yacht_os_yacht_documents',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_documents_yacht'),

      ('public.yacht_os_yacht_documents',
       'public.yacht_os_maintenance_jobs',
       'maintenance_id',
       'yi_documents_maintenance'),

      ('public.yacht_os_rate_plans',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_rate_plan_yacht'),

      ('public.yacht_os_rate_events',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_rate_event_yacht'),

      ('public.yacht_os_rate_events',
       'public.yacht_os_rate_plans',
       'rate_plan_id',
       'yi_rate_event_plan'),

      ('public.yacht_os_rate_recommendations',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_recommendation_yacht'),

      ('public.yacht_os_rate_recommendations',
       'public.yacht_os_rate_plans',
       'rate_plan_id',
       'yi_recommendation_plan'),

      ('public.yacht_os_quotes',
       'public.yacht_os_leads',
       'lead_id',
       'yi_quote_lead'),

      ('public.yacht_os_lead_activities',
       'public.yacht_os_leads',
       'lead_id',
       'yi_lead_activity'),

      ('public.yacht_os_crm_automation_events',
       'public.yacht_os_leads',
       'lead_id',
       'yi_crm_event_lead'),

      ('public.yacht_os_crm_automation_events',
       'public.yacht_os_quotes',
       'quote_id',
       'yi_crm_event_quote'),

      ('public.yacht_os_crm_automation_events',
       'public.yacht_os_tasks',
       'task_id',
       'yi_crm_event_task'),

      ('public.yacht_os_sales_commission_earnings',
       'public.yacht_os_leads',
       'lead_id',
       'yi_commission_lead'),

      ('public.yacht_os_sales_commission_earnings',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_commission_booking'),

      ('public.yacht_os_sales_commission_earnings',
       'public.yacht_os_sales_commission_rules',
       'rule_id',
       'yi_commission_rule'),

      ('public.yacht_os_payment_links',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_payment_link_booking'),

      ('public.yacht_os_payments',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_payment_booking'),

      ('public.yacht_os_refunds',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_refund_booking'),

      ('public.yacht_os_refunds',
       'public.yacht_os_payments',
       'payment_id',
       'yi_refund_payment'),

      ('public.yacht_os_finance_entries',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_finance_booking'),

      ('public.yacht_os_availability',
       'public.yacht_os_yachts',
       'yacht_id',
       'yi_availability_yacht'),

      ('public.yacht_os_availability',
       'public.yacht_os_bookings',
       'booking_id',
       'yi_availability_booking'),

      ('public.yacht_os_availability',
       'public.yacht_os_maintenance_jobs',
       'maintenance_id',
       'yi_availability_maintenance')

    ) as x(
      child_table,
      parent_table,
      fk_column,
      trigger_name
    )

  loop

    v_child :=
      to_regclass(
        r.child_table
      );

    v_parent :=
      to_regclass(
        r.parent_table
      );


    if
      v_child is null
      or v_parent is null
    then
      continue;
    end if;


    if not exists (
      select 1
      from pg_attribute
      where
        attrelid =
          v_child
        and attname =
          'company_id'
        and not attisdropped
    ) then
      continue;
    end if;


    if not exists (
      select 1
      from pg_attribute
      where
        attrelid =
          v_child
        and attname =
          r.fk_column
        and not attisdropped
    ) then
      continue;
    end if;


    execute format(
      'drop trigger if exists %I on %s',
      r.trigger_name,
      v_child
    );


    execute format(
      'create trigger %I
       before insert or update
       on %s
       for each row
       execute function
       public.yacht_os_enforce_company_parent(%L,%L)',
      r.trigger_name,
      v_child,
      r.parent_table,
      r.fk_column
    );

  end loop;

end;
$$;


-- ============================================================
-- FINAL ACL NORMALIZATION FOR NEW WRAPPERS
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n
      on n.oid =
        p.pronamespace
    where
      n.nspname =
        'public'
      and p.prosecdef =
        true
      and p.proname like
        'yacht_os_%'
  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;
