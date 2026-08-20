-- ============================================================
-- CUSTOMER 360 PHASE 1.19
-- PROVIDER HEALTH / DELIVERY TELEMETRY
-- READ-ONLY RPC
-- ============================================================

create or replace function
public.customer_360_whatsapp_health_snapshot(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Aktif firma üyeliği bulunamadı.';
  end if;


  select jsonb_build_object(
    'generated_at',
      now(),

    'total_whatsapp',
      count(*),

    'queued',
      count(*) filter (
        where m.delivery_status =
          'queued'
      ),

    'processing',
      count(*) filter (
        where m.delivery_status =
          'processing'
      ),

    'sent',
      count(*) filter (
        where m.delivery_status =
          'sent'
      ),

    'delivered',
      count(*) filter (
        where m.delivery_status =
          'delivered'
      ),

    'read',
      count(*) filter (
        where m.delivery_status =
          'read'
      ),

    'failed',
      count(*) filter (
        where m.delivery_status =
          'failed'
      ),

    'provider_linked',
      count(*) filter (
        where
          m.provider_message_id
          is not null
      ),

    'last_provider_activity_at',
      max(
        greatest(
          coalesce(
            m.provider_sent_at,
            '-infinity'::timestamptz
          ),
          coalesce(
            m.delivered_at,
            '-infinity'::timestamptz
          ),
          coalesce(
            m.read_at,
            '-infinity'::timestamptz
          ),
          coalesce(
            m.failed_at,
            '-infinity'::timestamptz
          )
        )
      ),

    'outbox',
      (
        select jsonb_build_object(
          'queued',
            count(*) filter (
              where q.status =
                'queued'
            ),

          'processing',
            count(*) filter (
              where q.status =
                'processing'
            ),

          'sent',
            count(*) filter (
              where q.status =
                'sent'
            ),

          'failed',
            count(*) filter (
              where q.status =
                'failed'
            ),

          'retryable_failed',
            count(*) filter (
              where
                q.status =
                  'failed'
                and q.attempts <
                  q.max_attempts
            ),

          'max_attempt_failed',
            count(*) filter (
              where
                q.status =
                  'failed'
                and q.attempts >=
                  q.max_attempts
            )
        )
        from
          public.customer_360_whatsapp_outbox q
        where
          q.company_id =
            p_company_id
      ),

    'recent_failed',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'message_id',
                x.id,

              'customer_id',
                x.customer_id,

              'subject',
                x.subject,

              'body',
                x.body,

              'provider_error',
                x.provider_error,

              'failed_at',
                x.failed_at
            )
            order by
              x.failed_at desc
          )
          from (
            select
              fm.id,
              fm.customer_id,
              fm.subject,
              fm.body,
              fm.provider_error,
              fm.failed_at
            from
              public.customer_360_messages fm
            where
              fm.company_id =
                p_company_id
              and fm.channel =
                'whatsapp'
              and fm.delivery_status =
                'failed'
            order by
              fm.failed_at desc nulls last
            limit 20
          ) x
        ),
        '[]'::jsonb
      )
  )
  into v_result

  from
    public.customer_360_messages m

  where
    m.company_id =
      p_company_id
    and m.channel =
      'whatsapp';


  return
    v_result;
end;
$$;


revoke all
on function
  public.customer_360_whatsapp_health_snapshot(uuid)
from public;


grant execute
on function
  public.customer_360_whatsapp_health_snapshot(uuid)
to authenticated;
