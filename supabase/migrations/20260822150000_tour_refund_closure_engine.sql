-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1E — REFUND CLOSURE ENGINE
--
-- Refund receipt registry
-- Customer notification preparation
-- Financial reconciliation
-- Closure readiness
--
-- IMPORTANT:
-- Communication record is prepared as READY.
-- This migration does NOT claim provider delivery.
-- ============================================================


alter table
  public.tour_change_refunds

add column if not exists
  reconciliation_status text
  not null
  default 'pending';


alter table
  public.tour_change_refunds

add column if not exists
  receipt_document_id uuid
  references public.tour_documents(id)
  on delete set null;


alter table
  public.tour_change_refunds

add column if not exists
  customer_notification_id uuid
  references public.tour_operation_communications(id)
  on delete set null;


alter table
  public.tour_change_refunds

add column if not exists
  closure_prepared_at timestamptz;


alter table
  public.tour_change_refunds

add column if not exists
  closure_prepared_by uuid;


alter table
  public.tour_change_refunds

add column if not exists
  reconciled_at timestamptz;


alter table
  public.tour_change_refunds

add column if not exists
  reconciled_by uuid;


alter table
  public.tour_change_refunds

add column if not exists
  reconciliation_note text;


alter table
  public.tour_change_refunds

drop constraint if exists
  tour_change_refunds_reconciliation_status_check;


alter table
  public.tour_change_refunds

add constraint
  tour_change_refunds_reconciliation_status_check

check (
  reconciliation_status in (
    'pending',
    'ready',
    'reconciled',
    'attention'
  )
);


create index if not exists
  tour_change_refunds_reconciliation_idx

on public.tour_change_refunds (
  company_id,
  reconciliation_status,
  created_at desc
);


-- ============================================================
-- PREPARE REFUND CLOSURE
-- ============================================================

create or replace function
  public.prepare_tour_refund_closure(
    p_refund_id uuid
  )

returns jsonb

language plpgsql

security definer

set search_path = public

as $$

declare

  v_refund
    public.tour_change_refunds%rowtype;

  v_case
    public.tour_change_cases%rowtype;

  v_reservation
    public.reservations%rowtype;

  v_actor uuid;

  v_document_id uuid;

  v_message_id uuid;

  v_channel text;

  v_recipient_name text;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_refund
  from
    public.tour_change_refunds
  where
    id =
      p_refund_id
  for update;


  if not found then
    raise exception
      'Refund not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_refund.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_refund.status <>
      'paid'
  then
    raise exception
      'Only paid refunds can enter closure';
  end if;


  select
    *
  into
    v_case
  from
    public.tour_change_cases
  where
    id =
      v_refund.case_id;


  if not found then
    raise exception
      'Change case not found';
  end if;


  if
    v_refund.reservation_id
    is not null
  then

    select
      *
    into
      v_reservation
    from
      public.reservations
    where
      id =
        v_refund.reservation_id
      and
      company_id =
        v_refund.company_id;

  end if;


  -- --------------------------------------------------------
  -- REFUND RECEIPT REGISTRY
  -- --------------------------------------------------------

  v_document_id :=
    v_refund.receipt_document_id;


  if
    v_document_id is null
  then

    insert into
      public.tour_documents
    (
      company_id,
      tour_id,
      departure_id,
      reservation_id,

      document_type,

      title,

      document_status,

      recipient_scope,

      source_kind,

      source_reference,

      is_required,

      issued_at,

      note,

      created_by
    )

    values
    (
      v_refund.company_id,

      v_refund.tour_id,

      v_refund.departure_id,

      v_refund.reservation_id,

      'other',

      'İade Makbuzu · ' ||
      v_case.case_number,

      'ready',

      'customer',

      'manual',

      'tour_refund:' ||
      v_refund.id::text,

      false,

      now(),

      'İade tutarı: ' ||
      v_refund.amount::text ||
      ' ' ||
      v_refund.currency ||
      case
        when
          v_refund.provider_reference
          is not null
        then
          ' · Referans: ' ||
          v_refund.provider_reference
        else
          ''
      end,

      v_actor
    )

    returning
      id
    into
      v_document_id;


    insert into
      public.tour_change_case_events
    (
      company_id,
      case_id,
      event_type,
      actor_id,
      note,
      payload
    )

    values
    (
      v_refund.company_id,

      v_refund.case_id,

      'document_created',

      v_actor,

      'İade kapanış belgesi oluşturuldu.',

      jsonb_build_object(
        'refund_id',
        v_refund.id,

        'document_id',
        v_document_id,

        'document_category',
        'refund_receipt'
      )
    );

  end if;


  -- --------------------------------------------------------
  -- CUSTOMER NOTIFICATION PREPARATION
  -- --------------------------------------------------------

  v_message_id :=
    v_refund.customer_notification_id;


  if
    v_message_id is null
  then

    v_recipient_name :=
      coalesce(
        nullif(
          v_reservation.full_name,
          ''
        ),
        'Müşteri'
      );


    v_channel :=
      case

        when
          nullif(
            v_reservation.email,
            ''
          )
          is not null
        then
          'email'

        when
          nullif(
            v_reservation.phone,
            ''
          )
          is not null
        then
          'whatsapp'

        else
          'system'

      end;


    insert into
      public.tour_operation_communications
    (
      company_id,
      tour_id,
      departure_id,
      reservation_id,

      recipient_type,

      recipient_name,

      recipient_phone,

      recipient_email,

      channel,

      message_type,

      subject,

      message_body,

      delivery_status,

      delivery_source,

      created_by
    )

    values
    (
      v_refund.company_id,

      v_refund.tour_id,

      v_refund.departure_id,

      v_refund.reservation_id,

      'customer',

      v_recipient_name,

      v_reservation.phone,

      v_reservation.email,

      v_channel,

      'other',

      'İade işleminiz tamamlandı',

      'İade işleminiz tamamlandı. Tutar: ' ||
      v_refund.amount::text ||
      ' ' ||
      v_refund.currency ||
      '. Vaka: ' ||
      v_case.case_number ||
      '.',

      'ready',

      'system',

      v_actor
    )

    returning
      id
    into
      v_message_id;


    insert into
      public.tour_change_case_events
    (
      company_id,
      case_id,
      event_type,
      actor_id,
      note,
      payload
    )

    values
    (
      v_refund.company_id,

      v_refund.case_id,

      'message_created',

      v_actor,

      'Müşteri iade bildirimi gönderime hazırlandı.',

      jsonb_build_object(
        'refund_id',
        v_refund.id,

        'communication_id',
        v_message_id,

        'delivery_status',
        'ready',

        'actual_provider_delivery',
        false
      )
    );

  end if;


  -- --------------------------------------------------------
  -- CLOSURE READY
  -- --------------------------------------------------------

  update
    public.tour_change_refunds

  set
    receipt_document_id =
      v_document_id,

    customer_notification_id =
      v_message_id,

    reconciliation_status =
      'ready',

    closure_prepared_at =
      coalesce(
        closure_prepared_at,
        now()
      ),

    closure_prepared_by =
      coalesce(
        closure_prepared_by,
        v_actor
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'closure_ready',
        true,

        'receipt_document_id',
        v_document_id,

        'customer_notification_id',
        v_message_id,

        'customer_notification_provider_sent',
        false
      )

  where
    id =
      v_refund.id;


  update
    public.tour_change_cases

  set
    result_snapshot =
      coalesce(
        result_snapshot,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'refund_closure_ready',
        true,

        'refund_receipt_document_id',
        v_document_id,

        'refund_customer_notification_id',
        v_message_id
      )

  where
    id =
      v_refund.case_id;


  return
    jsonb_build_object(
      'refund_id',
      v_refund.id,

      'reconciliation_status',
      'ready',

      'receipt_document_id',
      v_document_id,

      'customer_notification_id',
      v_message_id,

      'provider_delivery_claimed',
      false
    );

end;
$$;


revoke all
on function
  public.prepare_tour_refund_closure(uuid)
from public;


grant execute
on function
  public.prepare_tour_refund_closure(uuid)
to authenticated;


-- ============================================================
-- RECONCILE / CLOSE
-- ============================================================

create or replace function
  public.reconcile_tour_refund_closure(
    p_refund_id uuid,
    p_note text default null,
    p_allow_unsent_notification boolean default false
  )

returns jsonb

language plpgsql

security definer

set search_path = public

as $$

declare

  v_refund
    public.tour_change_refunds%rowtype;

  v_comm
    public.tour_operation_communications%rowtype;

  v_actor uuid;

  v_notification_ok boolean :=
    false;

begin

  v_actor :=
    auth.uid();


  if
    v_actor is null
  then
    raise exception
      'Authentication required';
  end if;


  select
    *
  into
    v_refund
  from
    public.tour_change_refunds
  where
    id =
      p_refund_id
  for update;


  if not found then
    raise exception
      'Refund not found';
  end if;


  if not
    public.is_tour_refund_finance_authorized(
      v_refund.company_id
    )
  then
    raise exception
      'Finance authority required';
  end if;


  if
    v_refund.status <>
      'paid'
  then
    raise exception
      'Refund is not paid';
  end if;


  if
    v_refund.reconciliation_status =
      'reconciled'
  then

    return
      jsonb_build_object(
        'refund_id',
        v_refund.id,

        'reconciliation_status',
        'reconciled'
      );

  end if;


  if
    v_refund.receipt_document_id
      is null
    or
    v_refund.customer_notification_id
      is null
  then
    raise exception
      'Closure preparation is incomplete';
  end if;


  select
    *
  into
    v_comm
  from
    public.tour_operation_communications
  where
    id =
      v_refund.customer_notification_id
    and
    company_id =
      v_refund.company_id;


  v_notification_ok :=
    coalesce(
      v_comm.delivery_status
      in (
        'sent',
        'delivered',
        'read'
      ),
      false
    );


  if
    not v_notification_ok
    and
    not p_allow_unsent_notification
  then
    raise exception
      'Customer notification has not been confirmed as sent';
  end if;


  update
    public.tour_change_refunds

  set
    reconciliation_status =
      'reconciled',

    reconciled_at =
      now(),

    reconciled_by =
      v_actor,

    reconciliation_note =
      nullif(
        btrim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      ),

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'reconciled_at',
        now(),

        'notification_delivery_status',
        v_comm.delivery_status,

        'unsent_override',
        p_allow_unsent_notification
      )

  where
    id =
      v_refund.id;


  update
    public.tour_change_cases

  set
    result_snapshot =
      coalesce(
        result_snapshot,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'refund_reconciliation_status',
        'reconciled',

        'refund_reconciled_at',
        now()
      )

  where
    id =
      v_refund.case_id;


  insert into
    public.tour_change_case_events
  (
    company_id,
    case_id,
    event_type,
    actor_id,
    note,
    payload
  )

  values
  (
    v_refund.company_id,

    v_refund.case_id,

    'case_updated',

    v_actor,

    coalesce(
      nullif(
        btrim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      ),
      'İade finans mutabakatı kapatıldı.'
    ),

    jsonb_build_object(
      'event_category',
      'refund_reconciled',

      'refund_id',
      v_refund.id,

      'notification_delivery_status',
      v_comm.delivery_status,

      'unsent_override',
      p_allow_unsent_notification
    )
  );


  return
    jsonb_build_object(
      'refund_id',
      v_refund.id,

      'reconciliation_status',
      'reconciled',

      'notification_delivery_status',
      v_comm.delivery_status
    );

end;
$$;


revoke all
on function
  public.reconcile_tour_refund_closure(
    uuid,
    text,
    boolean
  )
from public;


grant execute
on function
  public.reconcile_tour_refund_closure(
    uuid,
    text,
    boolean
  )
to authenticated;


comment on function
  public.prepare_tour_refund_closure(uuid)

is
  'Creates refund receipt registry and customer notification READY record without claiming provider delivery.';


comment on function
  public.reconcile_tour_refund_closure(
    uuid,
    text,
    boolean
  )

is
  'Closes financial refund reconciliation. Default behavior requires confirmed customer message delivery.';

