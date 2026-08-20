-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.9 — OMNICHANNEL COMMUNICATION CENTER
--
-- Append-only communication log.
-- Existing provider/operational tables are untouched.
-- No fake provider integration.
-- ============================================================


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists
  customer_360_messages_company_customer_sent_idx
on public.customer_360_messages (
  company_id,
  customer_id,
  sent_at desc
);


create index if not exists
  customer_360_messages_company_channel_sent_idx
on public.customer_360_messages (
  company_id,
  channel,
  sent_at desc
);


-- ============================================================
-- COMMUNICATION SNAPSHOT
-- ============================================================

create or replace function
public.customer_360_message_snapshot(
  p_customer_id uuid,
  p_limit integer default 500
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;

  v_limit integer;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.is_active_company_member(
    c.company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  v_limit :=
    greatest(
      1,
      least(
        coalesce(
          p_limit,
          500
        ),
        1000
      )
    );


  return jsonb_build_object(

    'customer',
      jsonb_build_object(
        'id',
          c.id,

        'customer_code',
          c.customer_code,

        'full_name',
          c.full_name,

        'phone',
          c.phone,

        'email',
          c.email
      ),


    'messages',

      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                x.id,

              'channel',
                x.channel,

              'direction',
                x.direction,

              'subject',
                x.subject,

              'body',
                x.body,

              'external_id',
                x.external_id,

              'sent_at',
                x.sent_at,

              'created_at',
                x.created_at,

              'created_by',
                x.created_by
            )
            order by
              x.sent_at desc
          )

          from (
            select
              m.id,
              m.channel,
              m.direction,
              m.subject,
              m.body,
              m.external_id,
              m.sent_at,
              m.created_at,
              m.created_by

            from public.customer_360_messages m

            where
              m.company_id =
                c.company_id

              and m.customer_id =
                c.id

            order by
              m.sent_at desc

            limit v_limit
          ) x
        ),
        '[]'::jsonb
      )
  );

end;
$$;


revoke execute
on function
public.customer_360_message_snapshot(
  uuid,
  integer
)
from public;


grant execute
on function
public.customer_360_message_snapshot(
  uuid,
  integer
)
to authenticated;


-- ============================================================
-- ADD COMMUNICATION LOG
--
-- IMPORTANT:
-- This LOGS a communication event.
-- It does NOT send WhatsApp/SMS/e-mail itself.
-- ============================================================

create or replace function
public.customer_360_add_message(
  p_customer_id uuid,
  p_channel text,
  p_direction text,
  p_subject text default null,
  p_body text default null,
  p_external_id text default null,
  p_sent_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;

  v_id uuid;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if p_channel not in (
    'whatsapp',
    'sms',
    'email',
    'phone',
    'instagram',
    'system',
    'other'
  ) then
    raise exception
      'Invalid communication channel';
  end if;


  if p_direction not in (
    'inbound',
    'outbound'
  ) then
    raise exception
      'Invalid communication direction';
  end if;


  if
    nullif(
      trim(
        coalesce(
          p_subject,
          ''
        )
      ),
      ''
    ) is null

    and nullif(
      trim(
        coalesce(
          p_body,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Subject or body required';
  end if;


  insert into
    public.customer_360_messages (
      company_id,
      customer_id,

      channel,
      direction,

      subject,
      body,

      external_id,

      sent_at,

      created_by
    )
  values (
    c.company_id,
    c.id,

    p_channel,
    p_direction,

    nullif(
      trim(
        p_subject
      ),
      ''
    ),

    nullif(
      trim(
        p_body
      ),
      ''
    ),

    nullif(
      trim(
        p_external_id
      ),
      ''
    ),

    coalesce(
      p_sent_at,
      now()
    ),

    auth.uid()
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'message_id',
      v_id
  );

end;
$$;


revoke execute
on function
public.customer_360_add_message(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
from public;


grant execute
on function
public.customer_360_add_message(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
to authenticated;


-- ============================================================
-- SECURITY DEFINER EXECUTE HARDENING
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select
      p.oid

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
        'customer_360_%'

  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;


grant execute
on function
public.customer_360_message_snapshot(
  uuid,
  integer
)
to authenticated;


grant execute
on function
public.customer_360_add_message(
  uuid,
  text,
  text,
  text,
  text,
  text,
  timestamptz
)
to authenticated;
