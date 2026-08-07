-- =========================================================
-- TurOS CRM Communications
-- WhatsApp / Email / SMS Automation Infrastructure
-- Migration 027
-- =========================================================

create table if not exists public.crm_message_templates (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,

  channel text not null default 'whatsapp'
    check (
      channel in (
        'whatsapp',
        'email',
        'sms'
      )
    ),

  category text not null default 'general'
    check (
      category in (
        'general',
        'reservation',
        'pre_arrival',
        'check_in',
        'check_out',
        'payment',
        'birthday',
        'anniversary',
        'campaign'
      )
    ),

  language_code text not null default 'tr',

  subject text,

  body text not null,

  variables jsonb not null default '[]'::jsonb,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.crm_automation_rules (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,

  channel text not null default 'whatsapp'
    check (
      channel in (
        'whatsapp',
        'email',
        'sms'
      )
    ),

  trigger_type text not null
    check (
      trigger_type in (
        'reservation_created',
        'before_check_in',
        'after_check_in',
        'before_check_out',
        'after_check_out',
        'payment_reminder',
        'birthday',
        'anniversary',
        'manual'
      )
    ),

  template_id uuid
    references public.crm_message_templates(id)
    on delete set null,

  timing_value integer not null default 0,

  timing_unit text not null default 'hour'
    check (
      timing_unit in (
        'minute',
        'hour',
        'day'
      )
    ),

  require_marketing_consent boolean not null default false,
  require_channel_consent boolean not null default true,

  is_active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.crm_message_outbox (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  customer_id uuid
    references public.crm_customers(id)
    on delete set null,

  template_id uuid
    references public.crm_message_templates(id)
    on delete set null,

  automation_rule_id uuid
    references public.crm_automation_rules(id)
    on delete set null,

  channel text not null
    check (
      channel in (
        'whatsapp',
        'email',
        'sms'
      )
    ),

  recipient text not null,

  subject text,

  rendered_body text not null,

  status text not null default 'queued'
    check (
      status in (
        'queued',
        'processing',
        'sent',
        'delivered',
        'read',
        'failed',
        'cancelled'
      )
    ),

  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,

  provider_message_id text,
  provider_response jsonb,

  error_message text,

  retry_count integer not null default 0,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create index if not exists
crm_message_templates_company_idx
on public.crm_message_templates(
  company_id,
  channel,
  is_active
);

create index if not exists
crm_automation_rules_company_idx
on public.crm_automation_rules(
  company_id,
  trigger_type,
  is_active
);

create index if not exists
crm_message_outbox_queue_idx
on public.crm_message_outbox(
  company_id,
  status,
  scheduled_at
);

create index if not exists
crm_message_outbox_customer_idx
on public.crm_message_outbox(
  customer_id,
  created_at desc
);


alter table public.crm_message_templates
enable row level security;

alter table public.crm_automation_rules
enable row level security;

alter table public.crm_message_outbox
enable row level security;


grant select, insert, update, delete
on public.crm_message_templates,
   public.crm_automation_rules,
   public.crm_message_outbox
to authenticated;


drop policy if exists
"Members manage CRM message templates"
on public.crm_message_templates;

create policy
"Members manage CRM message templates"
on public.crm_message_templates
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage CRM automation rules"
on public.crm_automation_rules;

create policy
"Members manage CRM automation rules"
on public.crm_automation_rules
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


drop policy if exists
"Members manage CRM message outbox"
on public.crm_message_outbox;

create policy
"Members manage CRM message outbox"
on public.crm_message_outbox
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);


-- Başlangıç şablonları
create or replace function public.seed_crm_message_templates(
  p_company_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Bu şirket için yetkiniz bulunmuyor.';
  end if;

  if exists (
    select 1
    from public.crm_message_templates
    where company_id = p_company_id
  ) then
    return;
  end if;

  insert into public.crm_message_templates (
    company_id,
    name,
    channel,
    category,
    body,
    variables,
    created_by
  )
  values
  (
    p_company_id,
    'Rezervasyon Onayı',
    'whatsapp',
    'reservation',
    'Merhaba {{customer_name}}, rezervasyonunuz oluşturuldu. Rezervasyon No: {{reservation_no}}. Giriş: {{check_in}}, Çıkış: {{check_out}}. Bizi tercih ettiğiniz için teşekkür ederiz.',
    '["customer_name","reservation_no","check_in","check_out"]'::jsonb,
    auth.uid()
  ),
  (
    p_company_id,
    'Check-in Hatırlatma',
    'whatsapp',
    'pre_arrival',
    'Merhaba {{customer_name}}, yarın sizi ağırlayacağımız için mutluyuz. Rezervasyon No: {{reservation_no}}. Check-in tarihiniz: {{check_in}}.',
    '["customer_name","reservation_no","check_in"]'::jsonb,
    auth.uid()
  ),
  (
    p_company_id,
    'Check-out Sonrası Memnuniyet',
    'whatsapp',
    'check_out',
    'Merhaba {{customer_name}}, bizi tercih ettiğiniz için teşekkür ederiz. Konaklamanızdan memnun kaldığınızı umuyoruz. Görüşleriniz bizim için değerlidir.',
    '["customer_name"]'::jsonb,
    auth.uid()
  ),
  (
    p_company_id,
    'Ödeme Hatırlatma',
    'whatsapp',
    'payment',
    'Merhaba {{customer_name}}, {{reservation_no}} numaralı rezervasyonunuz için kalan bakiyeniz {{balance}} tutarındadır.',
    '["customer_name","reservation_no","balance"]'::jsonb,
    auth.uid()
  );
end;
$$;

grant execute
on function public.seed_crm_message_templates(uuid)
to authenticated;
