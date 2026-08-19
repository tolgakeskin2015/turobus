
-- ============================================================
-- TUROBUS YACHT REVENUE & RATE CENTER
--
-- Professional seasonal pricing layer.
--
-- - Seasonal rate plans
-- - Weekend pricing
-- - Min stay
-- - Priority-based overlapping plans
-- - Price calendar publishing
-- - Existing booking / maintenance status preserved
-- ============================================================


-- ============================================================
-- RATE PLANS
-- ============================================================

create table if not exists public.yacht_os_rate_plans (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  name text not null,

  start_date date not null,
  end_date date not null,

  weekday_price numeric(14,2) not null
    check (weekday_price >= 0),

  weekend_price numeric(14,2)
    check (
      weekend_price is null
      or weekend_price >= 0
    ),

  minimum_days integer not null
    default 1
    check (minimum_days > 0),

  priority integer not null
    default 100,

  currency text not null
    default 'TRY',

  status text not null
    default 'active'
    check (
      status in (
        'draft',
        'active',
        'passive',
        'archived'
      )
    ),

  note text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint yacht_os_rate_plan_dates_check
    check (
      end_date >= start_date
    )
);


create index if not exists
  yacht_os_rate_plans_company_idx
on public.yacht_os_rate_plans (
  company_id,
  status,
  start_date
);


create index if not exists
  yacht_os_rate_plans_yacht_idx
on public.yacht_os_rate_plans (
  yacht_id,
  start_date,
  end_date,
  priority
);


-- ============================================================
-- RATE CHANGE AUDIT
-- ============================================================

create table if not exists public.yacht_os_rate_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  rate_plan_id uuid
    references public.yacht_os_rate_plans(id)
    on delete set null,

  event_type text not null,

  event_label text not null,

  date_from date,
  date_to date,

  payload jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now()
);


create index if not exists
  yacht_os_rate_events_company_idx
on public.yacht_os_rate_events (
  company_id,
  created_at desc
);


-- ============================================================
-- UPDATED AT
-- ============================================================

drop trigger if exists
  yacht_os_rate_plans_updated_at
on public.yacht_os_rate_plans;

create trigger
  yacht_os_rate_plans_updated_at
before update
on public.yacht_os_rate_plans
for each row
execute function
  public.yacht_os_set_updated_at();


-- ============================================================
-- RLS
-- ============================================================

alter table public.yacht_os_rate_plans
enable row level security;

alter table public.yacht_os_rate_events
enable row level security;


create policy yacht_os_rate_plans_company_access
on public.yacht_os_rate_plans
for all
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
)
with check (
  public.is_active_company_member(
    company_id
  )
);


create policy yacht_os_rate_events_company_access
on public.yacht_os_rate_events
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on
  public.yacht_os_rate_plans,
  public.yacht_os_rate_events
to authenticated;


-- Direct price writes are disabled.
revoke insert, update, delete
on public.yacht_os_rate_plans
from authenticated;


-- ============================================================
-- CREATE RATE PLAN
-- ============================================================

create or replace function
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
  y public.yacht_os_yachts%rowtype;
  v_id uuid;
begin

  if nullif(
    trim(
      p_name
    ),
    ''
  ) is null then
    raise exception
      'Rate plan name is required';
  end if;


  if p_start_date is null
     or p_end_date is null
     or p_end_date < p_start_date
  then
    raise exception
      'Invalid rate plan dates';
  end if;


  if p_weekday_price is null
     or p_weekday_price < 0
  then
    raise exception
      'Invalid weekday price';
  end if;


  if p_weekend_price is not null
     and p_weekend_price < 0
  then
    raise exception
      'Invalid weekend price';
  end if;


  if p_minimum_days < 1 then
    raise exception
      'Minimum days must be at least 1';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  insert into public.yacht_os_rate_plans (
    company_id,
    yacht_id,

    name,

    start_date,
    end_date,

    weekday_price,
    weekend_price,

    minimum_days,
    priority,

    currency,

    status,

    note,

    created_by
  )
  values (
    y.company_id,
    y.id,

    trim(
      p_name
    ),

    p_start_date,
    p_end_date,

    p_weekday_price,
    p_weekend_price,

    p_minimum_days,
    p_priority,

    coalesce(
      nullif(
        trim(
          p_currency
        ),
        ''
      ),
      y.currency
    ),

    'active',

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_id;


  insert into public.yacht_os_rate_events (
    company_id,
    yacht_id,
    rate_plan_id,

    event_type,
    event_label,

    date_from,
    date_to,

    payload,

    created_by
  )
  values (
    y.company_id,
    y.id,
    v_id,

    'rate_plan_created',

    'Fiyat planı oluşturuldu',

    p_start_date,
    p_end_date,

    jsonb_build_object(
      'weekday_price',
        p_weekday_price,

      'weekend_price',
        p_weekend_price,

      'minimum_days',
        p_minimum_days,

      'priority',
        p_priority
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'rate_plan_id',
      v_id
  );

end;
$$;


-- ============================================================
-- RATE PLAN STATUS
-- ============================================================

create or replace function
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
  r public.yacht_os_rate_plans%rowtype;
begin

  if p_status not in (
    'draft',
    'active',
    'passive',
    'archived'
  ) then
    raise exception
      'Invalid rate plan status';
  end if;


  select *
  into r
  from public.yacht_os_rate_plans
  where id = p_rate_plan_id
  for update;


  if r.id is null then
    raise exception
      'Rate plan not found';
  end if;


  if not public.is_active_company_member(
    r.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_rate_plans
  set status =
    p_status
  where id =
    r.id;


  insert into public.yacht_os_rate_events (
    company_id,
    yacht_id,
    rate_plan_id,

    event_type,
    event_label,

    date_from,
    date_to,

    payload,

    created_by
  )
  values (
    r.company_id,
    r.yacht_id,
    r.id,

    'rate_plan_status',

    'Fiyat planı durumu değiştirildi',

    r.start_date,
    r.end_date,

    jsonb_build_object(
      'old_status',
        r.status,

      'new_status',
        p_status
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'status',
      p_status
  );

end;
$$;


-- ============================================================
-- RESOLVE ONE DAY PRICE
-- ============================================================

create or replace function
public.yacht_os_resolve_daily_rate(
  p_yacht_id uuid,
  p_day date
)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  y public.yacht_os_yachts%rowtype;

  r public.yacht_os_rate_plans%rowtype;

  v_price numeric(14,2);
begin

  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  select *
  into r

  from public.yacht_os_rate_plans

  where
    yacht_id =
      y.id

    and status =
      'active'

    and p_day between
      start_date
      and end_date

  order by
    priority desc,
    created_at desc

  limit 1;


  if r.id is null then

    return jsonb_build_object(
      'price',
        y.base_daily_price,

      'currency',
        y.currency,

      'minimum_days',
        y.minimum_days,

      'source',
        'base_rate',

      'rate_plan_id',
        null
    );

  end if;


  v_price :=
    case
      when extract(
        isodow
        from p_day
      ) in (
        6,
        7
      )
      then coalesce(
        r.weekend_price,
        r.weekday_price
      )

      else r.weekday_price
    end;


  return jsonb_build_object(
    'price',
      v_price,

    'currency',
      r.currency,

    'minimum_days',
      r.minimum_days,

    'source',
      'rate_plan',

    'rate_plan_id',
      r.id,

    'rate_plan_name',
      r.name
  );

end;
$$;


-- ============================================================
-- PUBLISH PRICE CALENDAR
-- ============================================================

create or replace function
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
  y public.yacht_os_yachts%rowtype;

  d record;

  r public.yacht_os_rate_plans%rowtype;

  v_price numeric(14,2);

  v_days integer := 0;

  v_base_days integer := 0;

  v_plan_days integer := 0;
begin

  if p_date_from is null
     or p_date_to is null
     or p_date_to < p_date_from
  then
    raise exception
      'Invalid publish date range';
  end if;


  if p_date_to >
     p_date_from +
     interval '730 days'
  then
    raise exception
      'Maximum publish horizon is 730 days';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id
  for update;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  for d in

    select
      day::date as day

    from generate_series(
      p_date_from,
      p_date_to,
      interval '1 day'
    ) day

  loop

    r :=
      null;


    select *
    into r

    from public.yacht_os_rate_plans

    where
      yacht_id =
        y.id

      and status =
        'active'

      and d.day between
        start_date
        and end_date

    order by
      priority desc,
      created_at desc

    limit 1;


    if r.id is null then

      v_price :=
        y.base_daily_price;

      v_base_days :=
        v_base_days +
        1;

    else

      v_price :=
        case
          when extract(
            isodow
            from d.day
          ) in (
            6,
            7
          )
          then coalesce(
            r.weekend_price,
            r.weekday_price
          )

          else
            r.weekday_price
        end;

      v_plan_days :=
        v_plan_days +
        1;

    end if;


    insert into public.yacht_os_availability as availability (
      company_id,
      yacht_id,
      day,
      status,
      price
    )
    values (
      y.company_id,
      y.id,
      d.day,
      'available',
      v_price
    )

    on conflict (
      yacht_id,
      day
    )
    do update
    set
      price =
        excluded.price

    where
      availability.company_id =
        y.company_id;


    v_days :=
      v_days +
      1;

  end loop;


  insert into public.yacht_os_rate_events (
    company_id,
    yacht_id,

    event_type,
    event_label,

    date_from,
    date_to,

    payload,

    created_by
  )
  values (
    y.company_id,
    y.id,

    'calendar_published',

    'Fiyat takvimi yayınlandı',

    p_date_from,
    p_date_to,

    jsonb_build_object(
      'days',
        v_days,

      'plan_days',
        v_plan_days,

      'base_days',
        v_base_days
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'days',
      v_days,

    'plan_days',
      v_plan_days,

    'base_days',
      v_base_days
  );

end;
$$;


-- ============================================================
-- SET BASE RATE SAFELY
-- ============================================================

create or replace function
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
  y public.yacht_os_yachts%rowtype;
begin

  if p_base_daily_price < 0 then
    raise exception
      'Base rate cannot be negative';
  end if;


  if p_minimum_days < 1 then
    raise exception
      'Minimum days must be at least 1';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = p_yacht_id
  for update;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  if not public.is_active_company_member(
    y.company_id
  ) then
    raise exception
      'Access denied';
  end if;


  update public.yacht_os_yachts
  set
    base_daily_price =
      p_base_daily_price,

    minimum_days =
      p_minimum_days

  where id =
    y.id;


  insert into public.yacht_os_rate_events (
    company_id,
    yacht_id,

    event_type,
    event_label,

    payload,

    created_by
  )
  values (
    y.company_id,
    y.id,

    'base_rate_updated',

    'Ana fiyat güncellendi',

    jsonb_build_object(
      'old_price',
        y.base_daily_price,

      'new_price',
        p_base_daily_price,

      'old_minimum_days',
        y.minimum_days,

      'new_minimum_days',
        p_minimum_days
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
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
from public;


revoke execute
on function
  public.yacht_os_set_rate_plan_status(
    uuid,
    text
  )
from public;


revoke execute
on function
  public.yacht_os_resolve_daily_rate(
    uuid,
    date
  )
from public;


revoke execute
on function
  public.yacht_os_publish_rate_calendar(
    uuid,
    date,
    date
  )
from public;


revoke execute
on function
  public.yacht_os_update_base_rate(
    uuid,
    numeric,
    integer
  )
from public;


grant execute
on function
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
to authenticated;


grant execute
on function
  public.yacht_os_set_rate_plan_status(
    uuid,
    text
  )
to authenticated;


grant execute
on function
  public.yacht_os_resolve_daily_rate(
    uuid,
    date
  )
to authenticated;


grant execute
on function
  public.yacht_os_publish_rate_calendar(
    uuid,
    date,
    date
  )
to authenticated;


grant execute
on function
  public.yacht_os_update_base_rate(
    uuid,
    numeric,
    integer
  )
to authenticated;
