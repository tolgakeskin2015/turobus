-- =========================================================
-- TurOS
-- HOTEL RESERVATION <-> CRM
-- AUTOMATION QUEUE ENGINE
-- Migration 028
-- =========================================================


-- =========================================================
-- 1. HOTEL RESERVATION -> CRM CUSTOMER
-- =========================================================

alter table public.hotel_reservations
add column if not exists customer_id uuid
references public.crm_customers(id)
on delete set null;


create index if not exists
hotel_reservations_customer_idx
on public.hotel_reservations(
  company_id,
  customer_id
);


-- =========================================================
-- 2. OUTBOX -> HOTEL RESERVATION
-- =========================================================

alter table public.crm_message_outbox
add column if not exists hotel_reservation_id uuid
references public.hotel_reservations(id)
on delete set null;


alter table public.crm_message_outbox
add column if not exists event_key text;


create unique index if not exists
crm_message_outbox_event_key_uidx
on public.crm_message_outbox(
  company_id,
  event_key
)
where event_key is not null;


create index if not exists
crm_message_outbox_hotel_reservation_idx
on public.crm_message_outbox(
  hotel_reservation_id,
  created_at desc
);


-- =========================================================
-- 3. TARİH / SAAT YARDIMCISI
-- =========================================================

create or replace function public.crm_rule_interval(
  p_value integer,
  p_unit text
)
returns interval
language plpgsql
immutable
as $$
begin
  if p_unit = 'minute' then
    return make_interval(
      mins => p_value
    );
  end if;

  if p_unit = 'day' then
    return make_interval(
      days => p_value
    );
  end if;

  return make_interval(
    hours => p_value
  );
end;
$$;


-- =========================================================
-- 4. TEMPLATE RENDER
-- =========================================================

create or replace function public.crm_render_template(
  p_body text,
  p_customer_name text,
  p_reservation_no text,
  p_check_in date,
  p_check_out date,
  p_balance numeric
)
returns text
language plpgsql
immutable
as $$
declare
  v_result text;
begin
  v_result := coalesce(
    p_body,
    ''
  );

  v_result :=
    replace(
      v_result,
      '{{customer_name}}',
      coalesce(
        p_customer_name,
        ''
      )
    );

  v_result :=
    replace(
      v_result,
      '{{reservation_no}}',
      coalesce(
        p_reservation_no,
        ''
      )
    );

  v_result :=
    replace(
      v_result,
      '{{check_in}}',
      coalesce(
        to_char(
          p_check_in,
          'DD.MM.YYYY'
        ),
        ''
      )
    );

  v_result :=
    replace(
      v_result,
      '{{check_out}}',
      coalesce(
        to_char(
          p_check_out,
          'DD.MM.YYYY'
        ),
        ''
      )
    );

  v_result :=
    replace(
      v_result,
      '{{balance}}',
      coalesce(
        to_char(
          p_balance,
          'FM999G999G999D00'
        ),
        '0'
      )
    );

  return v_result;
end;
$$;


-- =========================================================
-- 5. OTOMASYON MOTORU
-- =========================================================

create or replace function public.run_crm_hotel_automations(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_reservation record;

  v_recipient text;
  v_message text;

  v_schedule timestamptz;

  v_event_key text;

  v_inserted integer := 0;
  v_skipped integer := 0;
begin

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu şirket için yetkiniz bulunmuyor.';
  end if;


  -- =======================================================
  -- AKTİF KURALLAR
  -- =======================================================

  for v_rule in

    select
      rule.id,
      rule.name,
      rule.channel,
      rule.trigger_type,
      rule.template_id,
      rule.timing_value,
      rule.timing_unit,
      rule.require_marketing_consent,
      rule.require_channel_consent,

      template.body,
      template.subject

    from public.crm_automation_rules rule

    join public.crm_message_templates template
      on template.id =
        rule.template_id

    where
      rule.company_id =
        p_company_id

      and rule.is_active = true

      and template.is_active = true

      and rule.channel =
        template.channel

  loop


    -- =====================================================
    -- REZERVASYONLAR
    -- =====================================================

    for v_reservation in

      select
        reservation.id,
        reservation.company_id,
        reservation.customer_id,
        reservation.reservation_no,
        reservation.status,
        reservation.check_in,
        reservation.check_out,
        reservation.balance,
        reservation.created_at,

        customer.full_name,
        customer.phone,
        customer.whatsapp_phone,
        customer.email,

        customer.marketing_consent,
        customer.whatsapp_consent,
        customer.email_consent

      from public.hotel_reservations reservation

      join public.crm_customers customer
        on customer.id =
          reservation.customer_id

        and customer.company_id =
          reservation.company_id

      where
        reservation.company_id =
          p_company_id

        and reservation.customer_id
          is not null

        and customer.is_active =
          true

        and reservation.status
          not in (
            'cancelled',
            'no_show'
          )

    loop


      -- ===================================================
      -- KANAL ALICISI
      -- ===================================================

      if v_rule.channel =
        'whatsapp'
      then

        v_recipient :=
          coalesce(
            nullif(
              v_reservation.whatsapp_phone,
              ''
            ),
            nullif(
              v_reservation.phone,
              ''
            )
          );

        if
          v_rule.require_channel_consent
          and
          not coalesce(
            v_reservation.whatsapp_consent,
            false
          )
        then
          v_skipped :=
            v_skipped + 1;

          continue;
        end if;


      elsif v_rule.channel =
        'email'
      then

        v_recipient :=
          nullif(
            v_reservation.email,
            ''
          );

        if
          v_rule.require_channel_consent
          and
          not coalesce(
            v_reservation.email_consent,
            false
          )
        then
          v_skipped :=
            v_skipped + 1;

          continue;
        end if;


      else

        v_recipient :=
          coalesce(
            nullif(
              v_reservation.phone,
              ''
            ),
            nullif(
              v_reservation.whatsapp_phone,
              ''
            )
          );

      end if;


      if v_recipient is null then
        v_skipped :=
          v_skipped + 1;

        continue;
      end if;


      -- ===================================================
      -- PAZARLAMA İZNİ
      -- ===================================================

      if
        v_rule.require_marketing_consent
        and
        not coalesce(
          v_reservation.marketing_consent,
          false
        )
      then

        v_skipped :=
          v_skipped + 1;

        continue;

      end if;


      -- ===================================================
      -- ZAMANLAMA
      -- ===================================================

      case v_rule.trigger_type


        when 'reservation_created'
        then

          v_schedule :=
            v_reservation.created_at;


        when 'before_check_in'
        then

          v_schedule :=
            (
              v_reservation.check_in::timestamp
              -
              public.crm_rule_interval(
                v_rule.timing_value,
                v_rule.timing_unit
              )
            );


        when 'after_check_in'
        then

          if
            v_reservation.status
            not in (
              'checked_in',
              'checked_out'
            )
          then
            continue;
          end if;

          v_schedule :=
            (
              v_reservation.check_in::timestamp
              +
              public.crm_rule_interval(
                v_rule.timing_value,
                v_rule.timing_unit
              )
            );


        when 'before_check_out'
        then

          v_schedule :=
            (
              v_reservation.check_out::timestamp
              -
              public.crm_rule_interval(
                v_rule.timing_value,
                v_rule.timing_unit
              )
            );


        when 'after_check_out'
        then

          if
            v_reservation.status <>
            'checked_out'
          then
            continue;
          end if;

          v_schedule :=
            (
              v_reservation.check_out::timestamp
              +
              public.crm_rule_interval(
                v_rule.timing_value,
                v_rule.timing_unit
              )
            );


        when 'payment_reminder'
        then

          if
            coalesce(
              v_reservation.balance,
              0
            ) <= 0
          then
            continue;
          end if;

          v_schedule :=
            (
              v_reservation.check_in::timestamp
              -
              public.crm_rule_interval(
                v_rule.timing_value,
                v_rule.timing_unit
              )
            );


        else
          continue;

      end case;


      -- ===================================================
      -- SADECE UYGUN ZAMAN PENCERESİ
      --
      -- Geçmişte çok eski mesajları aniden kuyruğa atmayalım.
      -- 48 saat öncesinden eski planları işlemiyoruz.
      -- ===================================================

      if
        v_schedule <
        now() - interval '48 hours'
      then
        continue;
      end if;


      -- ===================================================
      -- MESAJ
      -- ===================================================

      v_message :=
        public.crm_render_template(
          v_rule.body,
          v_reservation.full_name,
          v_reservation.reservation_no,
          v_reservation.check_in,
          v_reservation.check_out,
          v_reservation.balance
        );


      -- ===================================================
      -- EVENT KEY
      -- Aynı otomasyon aynı rezervasyonda ikinci kez oluşmaz.
      -- ===================================================

      v_event_key :=
        concat(
          'hotel:',
          v_reservation.id,
          ':rule:',
          v_rule.id
        );


      -- ===================================================
      -- KUYRUĞA EKLE
      -- ===================================================

      insert into public.crm_message_outbox (
        company_id,
        customer_id,
        hotel_reservation_id,
        template_id,
        automation_rule_id,

        channel,
        recipient,
        subject,
        rendered_body,

        status,
        scheduled_at,

        event_key,

        created_by
      )
      values (
        p_company_id,
        v_reservation.customer_id,
        v_reservation.id,
        v_rule.template_id,
        v_rule.id,

        v_rule.channel,
        v_recipient,
        v_rule.subject,
        v_message,

        'queued',
        v_schedule,

        v_event_key,

        auth.uid()
      )

      on conflict (
        company_id,
        event_key
      )
      where event_key is not null
      do nothing;


      if found then
        v_inserted :=
          v_inserted + 1;
      else
        v_skipped :=
          v_skipped + 1;
      end if;


    end loop;

  end loop;


  return jsonb_build_object(
    'success',
    true,

    'queued',
    v_inserted,

    'skipped',
    v_skipped,

    'executed_at',
    now()
  );

end;
$$;


grant execute
on function public.run_crm_hotel_automations(uuid)
to authenticated;


-- =========================================================
-- 6. REZERVASYON OLUŞUNCA OTOMASYON MOTORU
-- =========================================================

create or replace function
public.hotel_reservation_crm_automation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

  -- CRM müşterisi bağlanmamışsa işlem yok.
  if new.customer_id is null then
    return new;
  end if;


  -- Yeni rezervasyon
  if TG_OP = 'INSERT' then

    perform
      public.run_crm_hotel_automations(
        new.company_id
      );

    return new;

  end if;


  -- Durum değişikliği
  if
    TG_OP = 'UPDATE'
    and
    old.status is distinct from
    new.status
  then

    perform
      public.run_crm_hotel_automations(
        new.company_id
      );

  end if;


  return new;

end;
$$;


drop trigger if exists
hotel_reservation_crm_automation_trg
on public.hotel_reservations;


create trigger
hotel_reservation_crm_automation_trg
after insert or update of status, customer_id
on public.hotel_reservations
for each row
execute function
public.hotel_reservation_crm_automation_trigger();


-- =========================================================
-- 7. KUYRUK DURUM ÖZETİ
-- =========================================================

create or replace function
public.crm_message_queue_summary(
  p_company_id uuid
)
returns table (
  queued bigint,
  ready bigint,
  sent bigint,
  failed bigint
)
language sql
security definer
set search_path = public
as $$
  select

    count(*)
      filter (
        where status =
        'queued'
      ) as queued,

    count(*)
      filter (
        where
          status = 'queued'
          and scheduled_at <=
            now()
      ) as ready,

    count(*)
      filter (
        where status in (
          'sent',
          'delivered',
          'read'
        )
      ) as sent,

    count(*)
      filter (
        where status =
        'failed'
      ) as failed

  from public.crm_message_outbox

  where
    company_id =
      p_company_id

    and public.is_company_member(
      p_company_id
    );
$$;


grant execute
on function
public.crm_message_queue_summary(uuid)
to authenticated;
