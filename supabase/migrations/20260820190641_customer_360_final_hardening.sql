-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.20 FINAL HARDENING
--
-- Fix:
-- identity_access_log must really be bounded to latest 50 rows
-- before JSON aggregation.
-- ============================================================


create or replace function
public.customer_360_privacy_detail_snapshot(
  p_company_id uuid,
  p_customer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_can_reveal boolean;
  v_result jsonb;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Aktif firma üyeliği bulunamadı.';
  end if;


  if not exists (
    select 1
    from
      public.customer_360_customers c
    where
      c.id =
        p_customer_id
      and c.company_id =
        p_company_id
  ) then
    raise exception
      'Müşteri bulunamadı.';
  end if;


  v_can_reveal =
    public.customer_360_has_sensitive_identity_authority(
      p_company_id
    );


  select
    jsonb_build_object(

      'can_reveal_identity',
        v_can_reveal,


      'consent_history',
        coalesce(
          (
            select
              jsonb_agg(
                jsonb_build_object(
                  'id',
                    h.id,

                  'consent_type',
                    h.consent_type,

                  'granted',
                    h.granted,

                  'event_type',
                    h.event_type,

                  'source_channel',
                    h.source_channel,

                  'statement_version',
                    h.statement_version,

                  'note',
                    h.note,

                  'recorded_by',
                    h.recorded_by,

                  'created_at',
                    h.created_at
                )
                order by
                  h.created_at desc
              )
            from
              public.customer_360_consent_history h
            where
              h.company_id =
                p_company_id
              and h.customer_id =
                p_customer_id
          ),
          '[]'::jsonb
        ),


      'identity_access_log',

        case

          when
            v_can_reveal

          then
            coalesce(
              (
                select
                  jsonb_agg(
                    jsonb_build_object(
                      'id',
                        a.id,

                      'subject_type',
                        a.subject_type,

                      'subject_id',
                        a.subject_id,

                      'reason',
                        a.reason,

                      'performed_by',
                        a.performed_by,

                      'created_at',
                        a.created_at
                    )
                    order by
                      a.created_at desc
                  )

                from (
                  select
                    l.id,
                    l.subject_type,
                    l.subject_id,
                    l.reason,
                    l.performed_by,
                    l.created_at

                  from
                    public.customer_360_identity_access_log l

                  where
                    l.company_id =
                      p_company_id
                    and l.customer_id =
                      p_customer_id

                  order by
                    l.created_at desc,
                    l.id desc

                  limit 50
                ) a
              ),
              '[]'::jsonb
            )

          else
            '[]'::jsonb

        end
    )
  into
    v_result;


  return
    v_result;
end;
$$;


revoke all
on function
  public.customer_360_privacy_detail_snapshot(
    uuid,
    uuid
  )
from public;


grant execute
on function
  public.customer_360_privacy_detail_snapshot(
    uuid,
    uuid
  )
to authenticated;
