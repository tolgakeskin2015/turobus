
-- ============================================================
-- TUROBUS YACHT CRM AUTOMATION & ALERT CENTER
--
-- Rule based CRM intelligence:
--
-- - Overdue follow-up
-- - Hot lead
-- - Stale lead
-- - Quote viewed / no response
-- - Quote sent / no response
-- - Deduplicated alerts
-- - Automatic Yacht OS task creation
-- ============================================================


-- ============================================================
-- CRM AUTOMATION EVENTS
-- ============================================================

create table if not exists public.yacht_os_crm_automation_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  lead_id uuid not null
    references public.yacht_os_leads(id)
    on delete cascade,

  quote_id uuid
    references public.yacht_os_quotes(id)
    on delete cascade,

  task_id uuid
    references public.yacht_os_tasks(id)
    on delete set null,

  rule_code text not null
    check (
      rule_code in (
        'overdue_followup',
        'hot_lead',
        'stale_lead',
        'quote_viewed_no_response',
        'quote_sent_no_response'
      )
    ),

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

  title text not null,
  message text,

  fingerprint text not null,

  status text not null
    default 'open'
    check (
      status in (
        'open',
        'resolved',
        'dismissed'
      )
    ),

  due_at timestamptz,

  detected_at timestamptz not null
    default now(),

  resolved_at timestamptz,

  resolved_by uuid
    references auth.users(id)
    on delete set null,

  metadata jsonb,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now()
);


create unique index if not exists
  yacht_crm_automation_open_fingerprint_idx
on public.yacht_os_crm_automation_events (
  company_id,
  fingerprint
)
where status = 'open';


create index if not exists
  yacht_crm_automation_company_idx
on public.yacht_os_crm_automation_events (
  company_id,
  status,
  severity,
  detected_at desc
);


create index if not exists
  yacht_crm_automation_lead_idx
on public.yacht_os_crm_automation_events (
  lead_id,
  status
);


-- ============================================================
-- LINK CRM LEAD TO GENERATED TASK
-- ============================================================

alter table public.yacht_os_tasks
  add column if not exists lead_id uuid
    references public.yacht_os_leads(id)
    on delete cascade;


create index if not exists
  yacht_os_tasks_lead_idx
on public.yacht_os_tasks (
  lead_id,
  status,
  due_at
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_crm_automation_events_updated_at
on public.yacht_os_crm_automation_events;

create trigger
  yacht_os_crm_automation_events_updated_at
before update
on public.yacht_os_crm_automation_events
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_crm_automation_events
enable row level security;


create policy yacht_crm_automation_company_access
on public.yacht_os_crm_automation_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.yacht_os_crm_automation_events
to authenticated;


revoke insert, update, delete
on public.yacht_os_crm_automation_events
from authenticated;


-- ============================================================
-- INTERNAL ALERT + TASK HELPER
-- ============================================================

create or replace function
public.yacht_os_create_crm_automation_event(
  p_company_id uuid,
  p_lead_id uuid,
  p_quote_id uuid,
  p_rule_code text,
  p_severity text,
  p_title text,
  p_message text,
  p_fingerprint text,
  p_due_at timestamptz,
  p_metadata jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;

  v_event_id uuid;
  v_task_id uuid;
begin

  select *
  into l
  from public.yacht_os_leads
  where
    id = p_lead_id
    and company_id = p_company_id;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if exists (
    select 1
    from public.yacht_os_crm_automation_events e
    where
      e.company_id =
        p_company_id

      and e.fingerprint =
        p_fingerprint

      and e.status =
        'open'
  ) then

    select e.id
    into v_event_id
    from public.yacht_os_crm_automation_events e
    where
      e.company_id =
        p_company_id

      and e.fingerprint =
        p_fingerprint

      and e.status =
        'open'
    limit 1;


    return v_event_id;

  end if;


  insert into public.yacht_os_tasks (
    company_id,

    yacht_id,
    lead_id,

    title,
    description,

    due_at,

    assigned_to_name,

    priority,
    status,

    created_by
  )
  values (
    p_company_id,

    l.preferred_yacht_id,
    l.id,

    p_title,
    p_message,

    p_due_at,

    null,

    p_severity,
    'open',

    auth.uid()
  )
  returning id
  into v_task_id;


  insert into public.yacht_os_crm_automation_events (
    company_id,
    lead_id,
    quote_id,
    task_id,

    rule_code,
    severity,

    title,
    message,

    fingerprint,

    status,

    due_at,

    metadata
  )
  values (
    p_company_id,
    p_lead_id,
    p_quote_id,
    v_task_id,

    p_rule_code,
    p_severity,

    p_title,
    p_message,

    p_fingerprint,

    'open',

    p_due_at,

    p_metadata
  )
  returning id
  into v_event_id;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,

    activity_type,
    title,
    note,

    metadata,

    created_by
  )
  values (
    p_company_id,
    p_lead_id,

    'follow_up',

    'CRM otomasyonu görev oluşturdu',

    p_title,

    jsonb_build_object(
      'automation_event_id',
        v_event_id,

      'task_id',
        v_task_id,

      'rule_code',
        p_rule_code
    ),

    auth.uid()
  );


  return v_event_id;

end;
$$;


-- Internal only.
revoke execute
on function
  public.yacht_os_create_crm_automation_event(
    uuid,
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    timestamptz,
    jsonb
  )
from public, authenticated;


-- ============================================================
-- RUN CRM AUTOMATIONS
-- ============================================================

create or replace function
public.yacht_os_run_crm_automations(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
  q public.yacht_os_quotes%rowtype;

  v_created integer := 0;
  v_before integer;
  v_after integer;

  v_fingerprint text;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Access denied';
  end if;


  -- ----------------------------------------------------------
  -- 1) OVERDUE FOLLOW-UP
  -- ----------------------------------------------------------

  for l in
    select *
    from public.yacht_os_leads
    where
      company_id =
        p_company_id

      and stage not in (
        'won',
        'lost'
      )

      and next_follow_up_at
        is not null

      and next_follow_up_at <
        now()
  loop

    v_fingerprint :=
      'overdue_followup:' ||
      l.id::text ||
      ':' ||
      to_char(
        l.next_follow_up_at,
        'YYYYMMDDHH24MI'
      );


    select count(*)
    into v_before
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    perform public.yacht_os_create_crm_automation_event(
      p_company_id,
      l.id,
      null,

      'overdue_followup',

      case
        when
          l.next_follow_up_at <
          now() - interval '24 hours'
        then 'critical'

        else 'high'
      end,

      'Geciken müşteri takibi: ' ||
      l.customer_name,

      'Planlanan CRM takip zamanı geçti. Müşteriyle yeniden iletişim kurulmalı.',

      v_fingerprint,

      now(),

      jsonb_build_object(
        'next_follow_up_at',
          l.next_follow_up_at,

        'lead_score',
          l.score
      )
    );


    select count(*)
    into v_after
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    if
      v_before = 0
      and v_after = 1
    then
      v_created :=
        v_created + 1;
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- 2) HOT LEAD
  -- Score 75+, still open, no contact in last 6 hours
  -- ----------------------------------------------------------

  for l in
    select *
    from public.yacht_os_leads
    where
      company_id =
        p_company_id

      and stage in (
        'new',
        'contacted',
        'qualified',
        'quote_sent',
        'negotiation'
      )

      and score >= 75

      and (
        last_contact_at
          is null

        or last_contact_at <
          now() - interval '6 hours'
      )
  loop

    v_fingerprint :=
      'hot_lead:' ||
      l.id::text ||
      ':' ||
      current_date::text;


    select count(*)
    into v_before
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    perform public.yacht_os_create_crm_automation_event(
      p_company_id,
      l.id,
      l.converted_quote_id,

      'hot_lead',

      case
        when l.score >= 90
        then 'critical'
        else 'high'
      end,

      'Sıcak müşteri: ' ||
      l.customer_name,

      'Lead skoru yüksek. Satış fırsatı bekletilmeden aranmalı.',

      v_fingerprint,

      now() + interval '1 hour',

      jsonb_build_object(
        'lead_score',
          l.score,

        'stage',
          l.stage,

        'budget_max',
          l.budget_max
      )
    );


    select count(*)
    into v_after
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    if
      v_before = 0
      and v_after = 1
    then
      v_created :=
        v_created + 1;
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- 3) STALE LEAD
  -- No meaningful contact for 48 hours
  -- ----------------------------------------------------------

  for l in
    select *
    from public.yacht_os_leads
    where
      company_id =
        p_company_id

      and stage in (
        'new',
        'contacted',
        'qualified'
      )

      and created_at <
        now() - interval '48 hours'

      and (
        last_contact_at
          is null

        or last_contact_at <
          now() - interval '48 hours'
      )
  loop

    v_fingerprint :=
      'stale_lead:' ||
      l.id::text ||
      ':' ||
      to_char(
        current_date,
        'IYYY-IW'
      );


    select count(*)
    into v_before
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    perform public.yacht_os_create_crm_automation_event(
      p_company_id,
      l.id,
      l.converted_quote_id,

      'stale_lead',

      'medium',

      'Temassız lead: ' ||
      l.customer_name,

      'Lead en az 48 saattir aktif takip almıyor.',

      v_fingerprint,

      now() + interval '4 hours',

      jsonb_build_object(
        'stage',
          l.stage,

        'last_contact_at',
          l.last_contact_at
      )
    );


    select count(*)
    into v_after
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    if
      v_before = 0
      and v_after = 1
    then
      v_created :=
        v_created + 1;
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- 4) QUOTE VIEWED BUT NO RESPONSE
  -- Viewed at least 2 hours ago
  -- ----------------------------------------------------------

  for q in
    select *
    from public.yacht_os_quotes
    where
      company_id =
        p_company_id

      and lead_id
        is not null

      and status =
        'viewed'

      and viewed_at
        is not null

      and viewed_at <
        now() - interval '2 hours'
  loop

    select *
    into l
    from public.yacht_os_leads
    where id =
      q.lead_id;


    if
      l.id is null
      or l.stage in (
        'won',
        'lost'
      )
    then
      continue;
    end if;


    v_fingerprint :=
      'quote_viewed_no_response:' ||
      q.id::text;


    select count(*)
    into v_before
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    perform public.yacht_os_create_crm_automation_event(
      p_company_id,
      l.id,
      q.id,

      'quote_viewed_no_response',

      'high',

      'Teklif görüntülendi: ' ||
      l.customer_name,

      'Müşteri teklifi görüntüledi ancak henüz yanıt vermedi. Satış takibi öneriliyor.',

      v_fingerprint,

      now() + interval '1 hour',

      jsonb_build_object(
        'quote_code',
          q.quote_code,

        'sale_price',
          q.sale_price,

        'viewed_at',
          q.viewed_at
      )
    );


    select count(*)
    into v_after
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    if
      v_before = 0
      and v_after = 1
    then
      v_created :=
        v_created + 1;
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- 5) QUOTE SENT BUT NOT VIEWED/ANSWERED
  -- Sent at least 24 hours ago
  -- ----------------------------------------------------------

  for q in
    select *
    from public.yacht_os_quotes
    where
      company_id =
        p_company_id

      and lead_id
        is not null

      and status =
        'sent'

      and sent_at
        is not null

      and sent_at <
        now() - interval '24 hours'
  loop

    select *
    into l
    from public.yacht_os_leads
    where id =
      q.lead_id;


    if
      l.id is null
      or l.stage in (
        'won',
        'lost'
      )
    then
      continue;
    end if;


    v_fingerprint :=
      'quote_sent_no_response:' ||
      q.id::text ||
      ':' ||
      current_date::text;


    select count(*)
    into v_before
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    perform public.yacht_os_create_crm_automation_event(
      p_company_id,
      l.id,
      q.id,

      'quote_sent_no_response',

      'medium',

      'Teklif takip bekliyor: ' ||
      l.customer_name,

      'Teklif 24 saatten uzun süredir gönderilmiş durumda. Müşteri takibi öneriliyor.',

      v_fingerprint,

      now() + interval '2 hours',

      jsonb_build_object(
        'quote_code',
          q.quote_code,

        'sale_price',
          q.sale_price,

        'sent_at',
          q.sent_at
      )
    );


    select count(*)
    into v_after
    from public.yacht_os_crm_automation_events
    where
      company_id =
        p_company_id

      and fingerprint =
        v_fingerprint

      and status =
        'open';


    if
      v_before = 0
      and v_after = 1
    then
      v_created :=
        v_created + 1;
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- AUTO RESOLVE EVENTS THAT ARE NO LONGER RELEVANT
  -- ----------------------------------------------------------

  update public.yacht_os_crm_automation_events e
  set
    status =
      'resolved',

    resolved_at =
      now(),

    resolved_by =
      auth.uid()

  from public.yacht_os_leads l

  where
    e.company_id =
      p_company_id

    and e.status =
      'open'

    and e.lead_id =
      l.id

    and l.stage in (
      'won',
      'lost'
    );


  update public.yacht_os_tasks t
  set
    status =
      'completed',

    completed_at =
      coalesce(
        completed_at,
        now()
      )

  from public.yacht_os_crm_automation_events e

  where
    e.company_id =
      p_company_id

    and e.task_id =
      t.id

    and e.status =
      'resolved'

    and t.status in (
      'open',
      'in_progress'
    );


  return jsonb_build_object(
    'ok',
      true,

    'created',
      v_created,

    'open_alerts',
      (
        select count(*)
        from public.yacht_os_crm_automation_events
        where
          company_id =
            p_company_id

          and status =
            'open'
      )
  );

end;
$$;


-- ============================================================
-- RESOLVE / DISMISS CRM AUTOMATION EVENT
-- ============================================================

create or replace function
public.yacht_os_resolve_crm_automation_event(
  p_event_id uuid,
  p_status text default 'resolved'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.yacht_os_crm_automation_events%rowtype;
begin

  if p_status not in (
    'resolved',
    'dismissed'
  ) then
    raise exception
      'Invalid resolution status';
  end if;


  select *
  into e
  from public.yacht_os_crm_automation_events
  where id =
    p_event_id
  for update;


  if e.id is null then
    raise exception
      'Automation event not found';
  end if;


  if not public.is_active_company_member(
    e.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if e.status <> 'open' then

    return jsonb_build_object(
      'ok',
        true,

      'status',
        e.status
    );

  end if;


  update public.yacht_os_crm_automation_events
  set
    status =
      p_status,

    resolved_at =
      now(),

    resolved_by =
      auth.uid()

  where id =
    e.id;


  if e.task_id is not null then

    update public.yacht_os_tasks
    set
      status =
        case
          when p_status = 'resolved'
          then 'completed'
          else 'cancelled'
        end,

      completed_at =
        case
          when p_status = 'resolved'
          then now()
          else completed_at
        end

    where
      id = e.task_id

      and status in (
        'open',
        'in_progress'
      );

  end if;


  return jsonb_build_object(
    'ok',
      true,

    'status',
      p_status
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
  public.yacht_os_run_crm_automations(uuid)
from public;


revoke execute
on function
  public.yacht_os_resolve_crm_automation_event(uuid,text)
from public;


grant execute
on function
  public.yacht_os_run_crm_automations(uuid)
to authenticated;


grant execute
on function
  public.yacht_os_resolve_crm_automation_event(uuid,text)
to authenticated;
