-- ============================================================
-- CUSTOMER 360 PHASE 1.18
-- REAL WHATSAPP PROVIDER / DELIVERY LAYER
-- ============================================================


-- ============================================================
-- DELIVERY FIELDS
-- ============================================================

alter table
  public.customer_360_messages
add column if not exists
  delivery_status text not null
  default 'recorded';


alter table
  public.customer_360_messages
drop constraint if exists
  customer_360_messages_delivery_status_check;


alter table
  public.customer_360_messages
add constraint
  customer_360_messages_delivery_status_check
check (
  delivery_status in (
    'recorded',
    'queued',
    'processing',
    'sent',
    'delivered',
    'read',
    'failed'
  )
);


alter table
  public.customer_360_messages
add column if not exists
  provider_name text;


alter table
  public.customer_360_messages
add column if not exists
  provider_message_id text;


alter table
  public.customer_360_messages
add column if not exists
  provider_error text;


alter table
  public.customer_360_messages
add column if not exists
  queued_at timestamptz;


alter table
  public.customer_360_messages
add column if not exists
  provider_sent_at timestamptz;


alter table
  public.customer_360_messages
add column if not exists
  delivered_at timestamptz;


alter table
  public.customer_360_messages
add column if not exists
  read_at timestamptz;


alter table
  public.customer_360_messages
add column if not exists
  failed_at timestamptz;


alter table
  public.customer_360_messages
add column if not exists
  provider_payload jsonb
  not null
  default '{}'::jsonb;


create unique index if not exists
  customer_360_messages_provider_message_uidx
on public.customer_360_messages (
  provider_message_id
)
where provider_message_id
  is not null;


create index if not exists
  customer_360_messages_delivery_idx
on public.customer_360_messages (
  company_id,
  delivery_status,
  created_at desc
);


-- ============================================================
-- WHATSAPP OUTBOX
-- Internal queue. No direct authenticated access.
-- ============================================================

create table if not exists
public.customer_360_whatsapp_outbox (
  id uuid primary key
    default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid not null
    references public.customer_360_customers(id)
    on delete cascade,

  message_id uuid not null unique
    references public.customer_360_messages(id)
    on delete cascade,

  to_phone text not null,

  body text not null,

  status text not null
    default 'queued'
    check (
      status in (
        'queued',
        'processing',
        'sent',
        'failed'
      )
    ),

  attempts integer not null
    default 0,

  max_attempts integer not null
    default 3,

  locked_at timestamptz,

  next_attempt_at timestamptz not null
    default now(),

  last_error text,

  provider_message_id text,

  provider_payload jsonb not null
    default '{}'::jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create index if not exists
  customer_360_whatsapp_outbox_claim_idx
on public.customer_360_whatsapp_outbox (
  status,
  next_attempt_at,
  created_at
);


alter table
  public.customer_360_whatsapp_outbox
enable row level security;


revoke all privileges
on public.customer_360_whatsapp_outbox
from anon, authenticated;


-- ============================================================
-- NORMALIZE PHONE
-- ============================================================

create or replace function
public.customer_360_normalize_whatsapp_phone(
  p_phone text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text;
begin
  v :=
    regexp_replace(
      coalesce(
        p_phone,
        ''
      ),
      '\D',
      '',
      'g'
    );


  if v = '' then
    return null;
  end if;


  if left(
    v,
    2
  ) = '00'
  then
    v :=
      substr(
        v,
        3
      );
  end if;


  if
    length(v) =
      11
    and left(
      v,
      1
    ) = '0'
  then
    v :=
      '90' ||
      substr(
        v,
        2
      );

  elsif
    length(v) =
      10
  then
    v :=
      '90' ||
      v;
  end if;


  return v;
end;
$$;


revoke all
on function
  public.customer_360_normalize_whatsapp_phone(text)
from public;


-- ============================================================
-- QUEUE OUTBOUND WHATSAPP
-- ============================================================

create or replace function
public.customer_360_queue_whatsapp_message(
  p_company_id uuid,
  p_customer_id uuid,
  p_body text,
  p_subject text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_message_id uuid;
  v_outbox_id uuid;
begin
  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'WhatsApp gönderme yetkiniz bulunmuyor.';
  end if;


  if length(
    trim(
      coalesce(
        p_body,
        ''
      )
    )
  ) < 1 then
    raise exception
      'Mesaj boş olamaz.';
  end if;


  select
    public.customer_360_normalize_whatsapp_phone(
      c.phone
    )
  into
    v_phone
  from
    public.customer_360_customers c
  where
    c.id =
      p_customer_id
    and c.company_id =
      p_company_id;


  if v_phone is null then
    raise exception
      'Müşterinin geçerli telefon numarası bulunamadı.';
  end if;


  insert into
    public.customer_360_messages (
      company_id,
      customer_id,
      channel,
      direction,
      subject,
      body,
      sent_at,
      created_by,
      delivery_status,
      provider_name,
      queued_at
    )
  values (
    p_company_id,
    p_customer_id,
    'whatsapp',
    'outbound',
    nullif(
      trim(
        coalesce(
          p_subject,
          ''
        )
      ),
      ''
    ),
    trim(
      p_body
    ),
    now(),
    auth.uid(),
    'queued',
    'meta_whatsapp_cloud',
    now()
  )
  returning id
  into v_message_id;


  insert into
    public.customer_360_whatsapp_outbox (
      company_id,
      customer_id,
      message_id,
      to_phone,
      body,
      created_by
    )
  values (
    p_company_id,
    p_customer_id,
    v_message_id,
    v_phone,
    trim(
      p_body
    ),
    auth.uid()
  )
  returning id
  into v_outbox_id;


  return jsonb_build_object(
    'success',
      true,

    'message_id',
      v_message_id,

    'outbox_id',
      v_outbox_id,

    'delivery_status',
      'queued'
  );
end;
$$;


revoke all
on function
  public.customer_360_queue_whatsapp_message(
    uuid,
    uuid,
    text,
    text
  )
from public;


grant execute
on function
  public.customer_360_queue_whatsapp_message(
    uuid,
    uuid,
    text,
    text
  )
to authenticated;


-- ============================================================
-- CLAIM QUEUE
-- Worker only via service role.
-- ============================================================

create or replace function
public.claim_customer_360_whatsapp_queue(
  p_limit integer default 20
)
returns table (
  id uuid,
  message_id uuid,
  company_id uuid,
  customer_id uuid,
  to_phone text,
  body text,
  attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query

  with candidates as (
    select q.id
    from
      public.customer_360_whatsapp_outbox q
    where
      q.status in (
        'queued',
        'failed'
      )
      and q.attempts <
        q.max_attempts
      and q.next_attempt_at <=
        now()
    order by
      q.created_at
    limit greatest(
      least(
        p_limit,
        100
      ),
      1
    )
    for update skip locked
  ),

  updated as (
    update
      public.customer_360_whatsapp_outbox q
    set
      status =
        'processing',

      locked_at =
        now(),

      attempts =
        q.attempts + 1,

      updated_at =
        now()
    from candidates c
    where q.id =
      c.id
    returning q.*
  )

  select
    u.id,
    u.message_id,
    u.company_id,
    u.customer_id,
    u.to_phone,
    u.body,
    u.attempts
  from updated u;
end;
$$;


revoke all
on function
  public.claim_customer_360_whatsapp_queue(integer)
from public, anon, authenticated;


-- ============================================================
-- MARK SENT
-- ============================================================

create or replace function
public.mark_customer_360_whatsapp_sent(
  p_outbox_id uuid,
  p_provider_message_id text,
  p_provider_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  update
    public.customer_360_whatsapp_outbox
  set
    status =
      'sent',

    provider_message_id =
      p_provider_message_id,

    provider_payload =
      coalesce(
        p_provider_payload,
        '{}'::jsonb
      ),

    last_error =
      null,

    updated_at =
      now()
  where id =
    p_outbox_id
  returning message_id
  into v_message_id;


  if v_message_id is null then
    raise exception
      'WhatsApp outbox kaydı bulunamadı.';
  end if;


  update
    public.customer_360_messages
  set
    delivery_status =
      'sent',

    provider_message_id =
      p_provider_message_id,

    provider_payload =
      coalesce(
        p_provider_payload,
        '{}'::jsonb
      ),

    provider_error =
      null,

    provider_sent_at =
      now()
  where id =
    v_message_id;
end;
$$;


revoke all
on function
  public.mark_customer_360_whatsapp_sent(
    uuid,
    text,
    jsonb
  )
from public, anon, authenticated;


-- ============================================================
-- MARK FAILED + RETRY
-- ============================================================

create or replace function
public.mark_customer_360_whatsapp_failed(
  p_outbox_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
  v_attempts integer;
  v_max integer;
begin
  update
    public.customer_360_whatsapp_outbox
  set
    status =
      'failed',

    last_error =
      left(
        coalesce(
          p_error,
          'WhatsApp gönderim hatası.'
        ),
        2000
      ),

    next_attempt_at =
      now() +
      (
        interval '1 minute' *
        greatest(
          attempts,
          1
        )
      ),

    updated_at =
      now()
  where id =
    p_outbox_id
  returning
    message_id,
    attempts,
    max_attempts
  into
    v_message_id,
    v_attempts,
    v_max;


  if v_message_id is null then
    return;
  end if;


  update
    public.customer_360_messages
  set
    delivery_status =
      case
        when v_attempts >=
          v_max
        then 'failed'
        else 'queued'
      end,

    provider_error =
      left(
        coalesce(
          p_error,
          'WhatsApp gönderim hatası.'
        ),
        2000
      ),

    failed_at =
      case
        when v_attempts >=
          v_max
        then now()
        else failed_at
      end
  where id =
    v_message_id;
end;
$$;


revoke all
on function
  public.mark_customer_360_whatsapp_failed(
    uuid,
    text
  )
from public, anon, authenticated;


-- ============================================================
-- DELIVERY WEBHOOK
-- ============================================================

create or replace function
public.update_customer_360_whatsapp_delivery(
  p_provider_message_id text,
  p_status text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  v_status :=
    lower(
      trim(
        coalesce(
          p_status,
          ''
        )
      )
    );


  if v_status not in (
    'sent',
    'delivered',
    'read',
    'failed'
  ) then
    return;
  end if;


  update
    public.customer_360_messages
  set
    delivery_status =
      v_status,

    provider_payload =
      coalesce(
        provider_payload,
        '{}'::jsonb
      ) ||
      jsonb_build_object(
        'last_webhook',
        coalesce(
          p_payload,
          '{}'::jsonb
        )
      ),

    delivered_at =
      case
        when v_status in (
          'delivered',
          'read'
        )
        then coalesce(
          delivered_at,
          now()
        )
        else delivered_at
      end,

    read_at =
      case
        when v_status =
          'read'
        then coalesce(
          read_at,
          now()
        )
        else read_at
      end,

    failed_at =
      case
        when v_status =
          'failed'
        then coalesce(
          failed_at,
          now()
        )
        else failed_at
      end,

    provider_error =
      case
        when v_status =
          'failed'
        then coalesce(
          p_payload ->>
            'errors',
          provider_error,
          'Provider teslimat hatası.'
        )
        else provider_error
      end

  where
    provider_message_id =
      p_provider_message_id;
end;
$$;


revoke all
on function
  public.update_customer_360_whatsapp_delivery(
    text,
    text,
    jsonb
  )
from public, anon, authenticated;


-- ============================================================
-- RETRY RPC FOR AUTHORIZED USER
-- ============================================================

create or replace function
public.customer_360_retry_whatsapp_message(
  p_company_id uuid,
  p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_outbox_id uuid;
begin
  if not public.customer_360_has_write_authority(
    p_company_id
  ) then
    raise exception
      'Mesaj yeniden gönderme yetkiniz bulunmuyor.';
  end if;


  update
    public.customer_360_whatsapp_outbox q
  set
    status =
      'queued',

    attempts =
      0,

    next_attempt_at =
      now(),

    last_error =
      null,

    updated_at =
      now()
  where
    q.company_id =
      p_company_id
    and q.message_id =
      p_message_id
  returning q.id
  into v_outbox_id;


  if v_outbox_id is null then
    raise exception
      'WhatsApp queue kaydı bulunamadı.';
  end if;


  update
    public.customer_360_messages
  set
    delivery_status =
      'queued',

    provider_error =
      null,

    failed_at =
      null,

    queued_at =
      now()
  where
    id =
      p_message_id
    and company_id =
      p_company_id;


  return jsonb_build_object(
    'success',
      true,

    'message_id',
      p_message_id,

    'delivery_status',
      'queued'
  );
end;
$$;


revoke all
on function
  public.customer_360_retry_whatsapp_message(
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.customer_360_retry_whatsapp_message(
    uuid,
    uuid
  )
to authenticated;
