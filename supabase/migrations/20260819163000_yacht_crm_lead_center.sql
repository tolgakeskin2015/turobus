
-- ============================================================
-- TUROBUS YACHT CRM & LEAD CENTER
--
-- Lead -> Follow-up -> Quote -> Booking pipeline
-- ============================================================


-- ============================================================
-- LEADS
-- ============================================================

create table if not exists public.yacht_os_leads (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  preferred_yacht_id uuid
    references public.yacht_os_yachts(id)
    on delete set null,

  source text not null
    default 'manual'
    check (
      source in (
        'manual',
        'phone',
        'whatsapp',
        'instagram',
        'website',
        'google',
        'referral',
        'partner',
        'walk_in',
        'other'
      )
    ),

  stage text not null
    default 'new'
    check (
      stage in (
        'new',
        'contacted',
        'qualified',
        'quote_sent',
        'negotiation',
        'won',
        'lost'
      )
    ),

  priority text not null
    default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  customer_name text not null,

  customer_phone text,

  customer_email text,

  start_date date,

  end_date date,

  guest_count integer not null
    default 2
    check (guest_count > 0),

  budget_min numeric(14,2)
    check (
      budget_min is null
      or budget_min >= 0
    ),

  budget_max numeric(14,2)
    check (
      budget_max is null
      or budget_max >= 0
    ),

  currency text not null
    default 'TRY',

  request_note text,

  internal_note text,

  next_follow_up_at timestamptz,

  last_contact_at timestamptz,

  assigned_to uuid
    references auth.users(id)
    on delete set null,

  score integer not null
    default 50
    check (
      score >= 0
      and score <= 100
    ),

  converted_quote_id uuid
    references public.yacht_os_quotes(id)
    on delete set null,

  converted_booking_id uuid
    references public.yacht_os_bookings(id)
    on delete set null,

  lost_reason text,

  won_at timestamptz,

  lost_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint yacht_os_lead_dates_check
    check (
      start_date is null
      or end_date is null
      or end_date >= start_date
    ),

  constraint yacht_os_lead_budget_check
    check (
      budget_min is null
      or budget_max is null
      or budget_max >= budget_min
    )
);


create index if not exists
  yacht_os_leads_company_stage_idx
on public.yacht_os_leads (
  company_id,
  stage,
  created_at desc
);


create index if not exists
  yacht_os_leads_followup_idx
on public.yacht_os_leads (
  company_id,
  next_follow_up_at
)
where stage not in (
  'won',
  'lost'
);


create index if not exists
  yacht_os_leads_phone_idx
on public.yacht_os_leads (
  company_id,
  customer_phone
);


-- ============================================================
-- LEAD ACTIVITY / TIMELINE
-- ============================================================

create table if not exists public.yacht_os_lead_activities (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  lead_id uuid not null
    references public.yacht_os_leads(id)
    on delete cascade,

  activity_type text not null
    check (
      activity_type in (
        'created',
        'call',
        'whatsapp',
        'email',
        'meeting',
        'note',
        'follow_up',
        'stage_change',
        'quote_linked',
        'booking_linked',
        'won',
        'lost'
      )
    ),

  title text not null,

  note text,

  metadata jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  yacht_os_lead_activities_lead_idx
on public.yacht_os_lead_activities (
  lead_id,
  created_at desc
);


-- ============================================================
-- QUOTE <-> LEAD LINK
-- ============================================================

alter table public.yacht_os_quotes
  add column if not exists lead_id uuid
    references public.yacht_os_leads(id)
    on delete set null;


create index if not exists
  yacht_os_quotes_lead_idx
on public.yacht_os_quotes (
  lead_id
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_leads_updated_at
on public.yacht_os_leads;

create trigger
  yacht_os_leads_updated_at
before update
on public.yacht_os_leads
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_leads
enable row level security;

alter table public.yacht_os_lead_activities
enable row level security;


create policy yacht_os_leads_company_access
on public.yacht_os_leads
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy yacht_os_lead_activities_company_access
on public.yacht_os_lead_activities
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on
  public.yacht_os_leads,
  public.yacht_os_lead_activities
to authenticated;


revoke insert, update, delete
on
  public.yacht_os_leads,
  public.yacht_os_lead_activities
from authenticated;


-- ============================================================
-- CREATE LEAD
-- ============================================================

create or replace function
public.yacht_os_create_lead(
  p_company_id uuid,
  p_customer_name text,
  p_customer_phone text default null,
  p_customer_email text default null,
  p_source text default 'manual',
  p_priority text default 'medium',
  p_preferred_yacht_id uuid default null,
  p_start_date date default null,
  p_end_date date default null,
  p_guest_count integer default 2,
  p_budget_min numeric default null,
  p_budget_max numeric default null,
  p_currency text default 'TRY',
  p_request_note text default null,
  p_next_follow_up_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if nullif(
    trim(
      p_customer_name
    ),
    ''
  ) is null then
    raise exception
      'Customer name is required';
  end if;


  if p_guest_count < 1 then
    raise exception
      'Guest count must be positive';
  end if;


  if
    p_start_date is not null
    and p_end_date is not null
    and p_end_date < p_start_date
  then
    raise exception
      'Invalid travel dates';
  end if;


  if
    p_budget_min is not null
    and p_budget_max is not null
    and p_budget_max < p_budget_min
  then
    raise exception
      'Invalid budget range';
  end if;


  if p_source not in (
    'manual',
    'phone',
    'whatsapp',
    'instagram',
    'website',
    'google',
    'referral',
    'partner',
    'walk_in',
    'other'
  ) then
    raise exception
      'Invalid lead source';
  end if;


  if p_priority not in (
    'low',
    'medium',
    'high',
    'critical'
  ) then
    raise exception
      'Invalid priority';
  end if;


  if p_preferred_yacht_id is not null then

    if not exists (
      select 1
      from public.yacht_os_yachts y
      where
        y.id =
          p_preferred_yacht_id
        and y.company_id =
          p_company_id
    ) then
      raise exception
        'Preferred yacht is not in company';
    end if;

  end if;


  insert into public.yacht_os_leads (
    company_id,

    customer_name,
    customer_phone,
    customer_email,

    source,
    priority,

    preferred_yacht_id,

    start_date,
    end_date,

    guest_count,

    budget_min,
    budget_max,

    currency,

    request_note,

    next_follow_up_at,

    created_by
  )
  values (
    p_company_id,

    trim(
      p_customer_name
    ),

    nullif(
      trim(
        p_customer_phone
      ),
      ''
    ),

    nullif(
      trim(
        p_customer_email
      ),
      ''
    ),

    p_source,
    p_priority,

    p_preferred_yacht_id,

    p_start_date,
    p_end_date,

    p_guest_count,

    p_budget_min,
    p_budget_max,

    coalesce(
      nullif(
        trim(
          p_currency
        ),
        ''
      ),
      'TRY'
    ),

    nullif(
      trim(
        p_request_note
      ),
      ''
    ),

    p_next_follow_up_at,

    auth.uid()
  )
  returning id
  into v_id;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,

    activity_type,
    title,

    metadata,

    created_by
  )
  values (
    p_company_id,
    v_id,

    'created',
    'Lead oluşturuldu',

    jsonb_build_object(
      'source',
        p_source,

      'priority',
        p_priority
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'lead_id',
      v_id
  );

end;
$$;


-- ============================================================
-- UPDATE LEAD COMMERCIAL DATA
-- ============================================================

create or replace function
public.yacht_os_update_lead(
  p_lead_id uuid,
  p_priority text,
  p_preferred_yacht_id uuid,
  p_start_date date,
  p_end_date date,
  p_guest_count integer,
  p_budget_min numeric,
  p_budget_max numeric,
  p_internal_note text,
  p_next_follow_up_at timestamptz,
  p_score integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
begin

  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if not public.is_active_company_member(
    l.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  if p_priority not in (
    'low',
    'medium',
    'high',
    'critical'
  ) then
    raise exception
      'Invalid priority';
  end if;


  if p_guest_count < 1 then
    raise exception
      'Invalid guest count';
  end if;


  if p_score < 0
     or p_score > 100
  then
    raise exception
      'Invalid score';
  end if;


  if
    p_start_date is not null
    and p_end_date is not null
    and p_end_date < p_start_date
  then
    raise exception
      'Invalid travel dates';
  end if;


  if
    p_budget_min is not null
    and p_budget_max is not null
    and p_budget_max < p_budget_min
  then
    raise exception
      'Invalid budget';
  end if;


  if p_preferred_yacht_id is not null then

    if not exists (
      select 1
      from public.yacht_os_yachts y
      where
        y.id =
          p_preferred_yacht_id
        and y.company_id =
          l.company_id
    ) then
      raise exception
        'Preferred yacht is not in company';
    end if;

  end if;


  update public.yacht_os_leads
  set
    priority =
      p_priority,

    preferred_yacht_id =
      p_preferred_yacht_id,

    start_date =
      p_start_date,

    end_date =
      p_end_date,

    guest_count =
      p_guest_count,

    budget_min =
      p_budget_min,

    budget_max =
      p_budget_max,

    internal_note =
      nullif(
        trim(
          p_internal_note
        ),
        ''
      ),

    next_follow_up_at =
      p_next_follow_up_at,

    score =
      p_score

  where id =
    l.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


-- ============================================================
-- PIPELINE STAGE
-- ============================================================

create or replace function
public.yacht_os_set_lead_stage(
  p_lead_id uuid,
  p_stage text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
begin

  if p_stage not in (
    'new',
    'contacted',
    'qualified',
    'quote_sent',
    'negotiation',
    'won',
    'lost'
  ) then
    raise exception
      'Invalid lead stage';
  end if;


  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if not public.is_active_company_member(
    l.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_leads
  set
    stage =
      p_stage,

    won_at =
      case
        when p_stage = 'won'
        then coalesce(
          won_at,
          now()
        )
        else won_at
      end,

    lost_at =
      case
        when p_stage = 'lost'
        then coalesce(
          lost_at,
          now()
        )
        else lost_at
      end,

    lost_reason =
      case
        when p_stage = 'lost'
        then nullif(
          trim(
            p_note
          ),
          ''
        )
        else lost_reason
      end

  where id =
    l.id;


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
    l.company_id,
    l.id,

    case
      when p_stage = 'won'
      then 'won'

      when p_stage = 'lost'
      then 'lost'

      else 'stage_change'
    end,

    case
      when p_stage = 'won'
      then 'Satış kazanıldı'

      when p_stage = 'lost'
      then 'Lead kaybedildi'

      else 'Satış aşaması değiştirildi'
    end,

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    jsonb_build_object(
      'old_stage',
        l.stage,

      'new_stage',
        p_stage
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'stage',
      p_stage
  );

end;
$$;


-- ============================================================
-- LOG CONTACT / ACTIVITY
-- ============================================================

create or replace function
public.yacht_os_add_lead_activity(
  p_lead_id uuid,
  p_activity_type text,
  p_title text,
  p_note text default null,
  p_next_follow_up_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
  v_activity_id uuid;
begin

  if p_activity_type not in (
    'call',
    'whatsapp',
    'email',
    'meeting',
    'note',
    'follow_up'
  ) then
    raise exception
      'Invalid activity type';
  end if;


  if nullif(
    trim(
      p_title
    ),
    ''
  ) is null then
    raise exception
      'Activity title is required';
  end if;


  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if not public.is_active_company_member(
    l.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,

    activity_type,
    title,
    note,

    created_by
  )
  values (
    l.company_id,
    l.id,

    p_activity_type,
    trim(
      p_title
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_activity_id;


  update public.yacht_os_leads
  set
    last_contact_at =
      case
        when p_activity_type in (
          'call',
          'whatsapp',
          'email',
          'meeting'
        )
        then now()

        else last_contact_at
      end,

    next_follow_up_at =
      coalesce(
        p_next_follow_up_at,
        next_follow_up_at
      ),

    stage =
      case
        when stage = 'new'
             and p_activity_type in (
               'call',
               'whatsapp',
               'email',
               'meeting'
             )
        then 'contacted'

        else stage
      end

  where id =
    l.id;


  return jsonb_build_object(
    'ok',
      true,

    'activity_id',
      v_activity_id
  );

end;
$$;


-- ============================================================
-- LINK EXISTING QUOTE TO LEAD
-- ============================================================

create or replace function
public.yacht_os_link_lead_quote(
  p_lead_id uuid,
  p_quote_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.yacht_os_leads%rowtype;
  q public.yacht_os_quotes%rowtype;
begin

  select *
  into l
  from public.yacht_os_leads
  where id =
    p_lead_id
  for update;


  if l.id is null then
    raise exception
      'Lead not found';
  end if;


  if not public.is_active_company_member(
    l.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  select *
  into q
  from public.yacht_os_quotes
  where id =
    p_quote_id
  for update;


  if q.id is null then
    raise exception
      'Quote not found';
  end if;


  if q.company_id <>
     l.company_id
  then
    raise exception
      'Lead and quote company mismatch';
  end if;


  update public.yacht_os_quotes
  set lead_id =
    l.id
  where id =
    q.id;


  update public.yacht_os_leads
  set
    converted_quote_id =
      q.id,

    stage =
      case
        when stage in (
          'new',
          'contacted',
          'qualified'
        )
        then 'quote_sent'
        else stage
      end

  where id =
    l.id;


  insert into public.yacht_os_lead_activities (
    company_id,
    lead_id,

    activity_type,
    title,

    metadata,

    created_by
  )
  values (
    l.company_id,
    l.id,

    'quote_linked',

    'Teklif lead ile ilişkilendirildi',

    jsonb_build_object(
      'quote_id',
        q.id,

      'quote_code',
        q.quote_code,

      'quote_status',
        q.status,

      'sale_price',
        q.sale_price
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'quote_id',
      q.id,

    'quote_code',
      q.quote_code
  );

end;
$$;


-- ============================================================
-- SYNC QUOTE / BOOKING CONVERSION TO CRM
-- ============================================================

create or replace function
public.yacht_os_sync_lead_conversions(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quotes integer := 0;
  v_bookings integer := 0;
begin

  if not public.is_active_company_member(
    p_company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_leads l
  set
    converted_quote_id =
      q.id,

    stage =
      case
        when q.status in (
          'sent',
          'viewed'
        )
        then 'quote_sent'

        when q.status =
          'accepted'
        then 'negotiation'

        when q.status =
          'converted'
        then 'won'

        else l.stage
      end,

    won_at =
      case
        when q.status =
          'converted'
        then coalesce(
          l.won_at,
          now()
        )
        else l.won_at
      end

  from public.yacht_os_quotes q

  where
    q.company_id =
      p_company_id

    and q.lead_id =
      l.id

    and l.company_id =
      p_company_id;


  get diagnostics
    v_quotes =
      row_count;


  update public.yacht_os_leads l
  set
    converted_booking_id =
      q.converted_booking_id,

    stage =
      'won',

    won_at =
      coalesce(
        l.won_at,
        now()
      )

  from public.yacht_os_quotes q

  where
    q.company_id =
      p_company_id

    and q.lead_id =
      l.id

    and q.converted_booking_id
      is not null

    and l.company_id =
      p_company_id;


  get diagnostics
    v_bookings =
      row_count;


  return jsonb_build_object(
    'ok',
      true,

    'quotes_synced',
      v_quotes,

    'bookings_synced',
      v_bookings
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function public.yacht_os_create_lead(
  uuid,text,text,text,text,text,uuid,date,date,integer,numeric,numeric,text,text,timestamptz
)
from public;

revoke execute
on function public.yacht_os_update_lead(
  uuid,text,uuid,date,date,integer,numeric,numeric,text,timestamptz,integer
)
from public;

revoke execute
on function public.yacht_os_set_lead_stage(
  uuid,text,text
)
from public;

revoke execute
on function public.yacht_os_add_lead_activity(
  uuid,text,text,text,timestamptz
)
from public;

revoke execute
on function public.yacht_os_link_lead_quote(
  uuid,uuid
)
from public;

revoke execute
on function public.yacht_os_sync_lead_conversions(
  uuid
)
from public;


grant execute
on function public.yacht_os_create_lead(
  uuid,text,text,text,text,text,uuid,date,date,integer,numeric,numeric,text,text,timestamptz
)
to authenticated;

grant execute
on function public.yacht_os_update_lead(
  uuid,text,uuid,date,date,integer,numeric,numeric,text,timestamptz,integer
)
to authenticated;

grant execute
on function public.yacht_os_set_lead_stage(
  uuid,text,text
)
to authenticated;

grant execute
on function public.yacht_os_add_lead_activity(
  uuid,text,text,text,timestamptz
)
to authenticated;

grant execute
on function public.yacht_os_link_lead_quote(
  uuid,uuid
)
to authenticated;

grant execute
on function public.yacht_os_sync_lead_conversions(
  uuid
)
to authenticated;
