
-- ============================================================
-- TUROBUS YACHT REVENUE INTELLIGENCE
--
-- Decision-support only:
-- - Occupancy
-- - Booking pace
-- - Lead time
-- - Current published rate
-- - Suggested price
--
-- Recommendation -> Approval -> Explicit Publish
-- No automatic price change.
-- ============================================================


create table if not exists public.yacht_os_rate_recommendations (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  yacht_id uuid not null
    references public.yacht_os_yachts(id)
    on delete cascade,

  period_start date not null,
  period_end date not null,

  sellable_days integer not null
    default 0,

  booked_days integer not null
    default 0,

  occupancy_percent numeric(7,2) not null
    default 0,

  bookings_last_7_days integer not null
    default 0,

  current_average_price numeric(14,2) not null
    default 0,

  suggested_weekday_price numeric(14,2) not null
    default 0,

  suggested_weekend_price numeric(14,2) not null
    default 0,

  adjustment_percent numeric(7,2) not null
    default 0,

  minimum_days integer not null
    default 1
    check (minimum_days > 0),

  confidence_score integer not null
    default 0
    check (
      confidence_score >= 0
      and confidence_score <= 100
    ),

  reason_codes jsonb not null
    default '[]'::jsonb,

  reason_summary text,

  currency text not null
    default 'TRY',

  status text not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'published',
        'expired'
      )
    ),

  approved_by uuid
    references auth.users(id)
    on delete set null,

  approved_at timestamptz,

  rejected_by uuid
    references auth.users(id)
    on delete set null,

  rejected_at timestamptz,

  published_by uuid
    references auth.users(id)
    on delete set null,

  published_at timestamptz,

  rate_plan_id uuid
    references public.yacht_os_rate_plans(id)
    on delete set null,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint yacht_rate_recommendation_dates_check
    check (
      period_end >= period_start
    )
);


create index if not exists
  yacht_rate_recommendations_company_idx
on public.yacht_os_rate_recommendations (
  company_id,
  status,
  created_at desc
);


create index if not exists
  yacht_rate_recommendations_yacht_idx
on public.yacht_os_rate_recommendations (
  yacht_id,
  period_start,
  period_end
);


create unique index if not exists
  yacht_rate_recommendations_pending_unique_idx
on public.yacht_os_rate_recommendations (
  yacht_id,
  period_start,
  period_end
)
where status = 'pending';


drop trigger if exists
  yacht_rate_recommendations_updated_at
on public.yacht_os_rate_recommendations;

create trigger
  yacht_rate_recommendations_updated_at
before update
on public.yacht_os_rate_recommendations
for each row
execute function
  public.yacht_os_set_updated_at();


alter table public.yacht_os_rate_recommendations
enable row level security;


create policy yacht_rate_recommendations_company_access
on public.yacht_os_rate_recommendations
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


grant select
on public.yacht_os_rate_recommendations
to authenticated;


revoke insert, update, delete
on public.yacht_os_rate_recommendations
from authenticated;


-- ============================================================
-- REVENUE AUTHORITY HELPER
-- ============================================================

create or replace function
public.yacht_os_has_revenue_authority(
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where
      cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role in (
        'super_admin',
        'company_owner',
        'operation_manager',
        'accounting'
      )
  );
$$;


revoke execute
on function
  public.yacht_os_has_revenue_authority(uuid)
from public;

grant execute
on function
  public.yacht_os_has_revenue_authority(uuid)
to authenticated;


-- ============================================================
-- GENERATE INTELLIGENCE
-- 3 windows:
-- 0–14 days
-- 15–30 days
-- 31–90 days
-- ============================================================

create or replace function
public.yacht_os_generate_rate_recommendations(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  y public.yacht_os_yachts%rowtype;

  w record;

  v_start date;
  v_end date;

  v_total_days integer;
  v_blocked_days integer;
  v_sellable_days integer;

  v_booked_days integer;

  v_occupancy numeric;

  v_pace7 integer;

  v_current_rate numeric;

  v_multiplier numeric;

  v_adjustment numeric;

  v_suggested_weekday numeric;
  v_suggested_weekend numeric;

  v_confidence integer;

  v_reasons jsonb;

  v_reason_summary text;

  v_created integer := 0;
  v_updated integer := 0;
begin

  if not public.yacht_os_has_revenue_authority(
    p_company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  -- Old pending suggestions should not remain actionable forever.
  update public.yacht_os_rate_recommendations
  set status = 'expired'
  where
    company_id = p_company_id
    and status = 'pending'
    and created_at < now() - interval '24 hours';


  for y in
    select *
    from public.yacht_os_yachts
    where
      company_id = p_company_id
      and status <> 'passive'
  loop

    for w in
      select *
      from (
        values
          (0, 14),
          (15, 30),
          (31, 90)
      ) as windows(day_from, day_to)
    loop

      v_start :=
        current_date +
        w.day_from;

      v_end :=
        current_date +
        w.day_to;


      v_total_days :=
        (
          v_end -
          v_start
        ) + 1;


      select count(*)
      into v_blocked_days
      from public.yacht_os_availability a
      where
        a.yacht_id = y.id
        and a.day between
          v_start
          and v_end
        and a.status in (
          'maintenance',
          'blocked'
        );


      v_sellable_days :=
        greatest(
          v_total_days -
          v_blocked_days,
          0
        );


      -- Count occupied booking days directly from reservations.
      select
        coalesce(
          sum(
            (
              least(
                b.end_date,
                v_end
              )
              -
              greatest(
                b.start_date,
                v_start
              )
            ) + 1
          ),
          0
        )::integer

      into v_booked_days

      from public.yacht_os_bookings b

      where
        b.yacht_id = y.id
        and b.status in (
          'pending',
          'confirmed',
          'completed'
        )
        and b.start_date <= v_end
        and b.end_date >= v_start;


      v_booked_days :=
        least(
          greatest(
            v_booked_days,
            0
          ),
          v_sellable_days
        );


      v_occupancy :=
        case
          when v_sellable_days <= 0
          then 0
          else round(
            (
              v_booked_days::numeric /
              v_sellable_days::numeric
            ) * 100,
            2
          )
        end;


      select count(*)
      into v_pace7
      from public.yacht_os_bookings b
      where
        b.yacht_id = y.id
        and b.status <> 'cancelled'
        and b.created_at >=
          now() - interval '7 days'
        and b.start_date >=
          current_date;


      select
        coalesce(
          avg(a.price),
          y.base_daily_price
        )
      into v_current_rate
      from public.yacht_os_availability a
      where
        a.yacht_id = y.id
        and a.day between
          v_start
          and v_end
        and a.price is not null;


      v_current_rate :=
        coalesce(
          v_current_rate,
          y.base_daily_price,
          0
        );


      v_multiplier := 1.00;
      v_reasons := '[]'::jsonb;


      -- --------------------------------------------------------
      -- OCCUPANCY SIGNAL
      -- --------------------------------------------------------

      if v_occupancy >= 85 then

        v_multiplier :=
          v_multiplier + 0.18;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'very_high_occupancy'
          );

      elsif v_occupancy >= 70 then

        v_multiplier :=
          v_multiplier + 0.12;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'high_occupancy'
          );

      elsif v_occupancy >= 55 then

        v_multiplier :=
          v_multiplier + 0.06;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'healthy_occupancy'
          );

      elsif
        v_occupancy <= 20
        and w.day_to <= 14
      then

        v_multiplier :=
          v_multiplier - 0.12;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'low_last_minute_occupancy'
          );

      elsif
        v_occupancy <= 35
        and w.day_to <= 30
      then

        v_multiplier :=
          v_multiplier - 0.06;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'low_near_term_occupancy'
          );

      end if;


      -- --------------------------------------------------------
      -- BOOKING VELOCITY SIGNAL
      -- --------------------------------------------------------

      if v_pace7 >= 4 then

        v_multiplier :=
          v_multiplier + 0.08;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'strong_booking_velocity'
          );

      elsif v_pace7 >= 2 then

        v_multiplier :=
          v_multiplier + 0.04;

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'positive_booking_velocity'
          );

      elsif
        v_pace7 = 0
        and w.day_to <= 30
      then

        v_reasons :=
          v_reasons ||
          jsonb_build_array(
            'no_recent_booking_velocity'
          );

      end if;


      -- Protect against extreme automatic recommendations.
      v_multiplier :=
        greatest(
          0.80,
          least(
            1.30,
            v_multiplier
          )
        );


      v_adjustment :=
        round(
          (
            v_multiplier -
            1
          ) * 100,
          2
        );


      v_suggested_weekday :=
        round(
          v_current_rate *
          v_multiplier,
          2
        );


      -- Weekend premium remains visible and explicit.
      v_suggested_weekend :=
        round(
          v_suggested_weekday *
          1.05,
          2
        );


      v_confidence :=
        least(
          95,
          greatest(
            45,
            55
            +
            least(
              20,
              v_pace7 * 5
            )
            +
            case
              when v_sellable_days >= 30
              then 10
              when v_sellable_days >= 14
              then 5
              else 0
            end
            +
            case
              when v_booked_days > 0
              then 5
              else 0
            end
          )
        );


      v_reason_summary :=
        case
          when v_adjustment >= 12
          then
            'Güçlü talep ve doluluk nedeniyle fiyat artışı öneriliyor.'

          when v_adjustment > 0
          then
            'Talep göstergeleri mevcut fiyatın üzerinde kontrollü artışı destekliyor.'

          when v_adjustment <= -10
          then
            'Yakın dönem düşük doluluk nedeniyle satış hızlandırıcı fiyat öneriliyor.'

          when v_adjustment < 0
          then
            'Düşük yakın dönem talebi nedeniyle sınırlı fiyat düzeltmesi öneriliyor.'

          else
            'Mevcut fiyatın korunması öneriliyor.'
        end;


      -- Keep currently pending recommendation fresh.
      if exists (
        select 1
        from public.yacht_os_rate_recommendations r
        where
          r.yacht_id = y.id
          and r.period_start = v_start
          and r.period_end = v_end
          and r.status = 'pending'
      ) then

        update public.yacht_os_rate_recommendations
        set
          sellable_days =
            v_sellable_days,

          booked_days =
            v_booked_days,

          occupancy_percent =
            v_occupancy,

          bookings_last_7_days =
            v_pace7,

          current_average_price =
            v_current_rate,

          suggested_weekday_price =
            v_suggested_weekday,

          suggested_weekend_price =
            v_suggested_weekend,

          adjustment_percent =
            v_adjustment,

          minimum_days =
            y.minimum_days,

          confidence_score =
            v_confidence,

          reason_codes =
            v_reasons,

          reason_summary =
            v_reason_summary,

          currency =
            y.currency,

          created_by =
            auth.uid(),

          created_at =
            now()

        where
          yacht_id = y.id
          and period_start = v_start
          and period_end = v_end
          and status = 'pending';


        v_updated :=
          v_updated + 1;

      else

        insert into public.yacht_os_rate_recommendations (
          company_id,
          yacht_id,

          period_start,
          period_end,

          sellable_days,
          booked_days,
          occupancy_percent,

          bookings_last_7_days,

          current_average_price,

          suggested_weekday_price,
          suggested_weekend_price,

          adjustment_percent,

          minimum_days,

          confidence_score,

          reason_codes,
          reason_summary,

          currency,

          status,

          created_by
        )
        values (
          y.company_id,
          y.id,

          v_start,
          v_end,

          v_sellable_days,
          v_booked_days,
          v_occupancy,

          v_pace7,

          v_current_rate,

          v_suggested_weekday,
          v_suggested_weekend,

          v_adjustment,

          y.minimum_days,

          v_confidence,

          v_reasons,
          v_reason_summary,

          y.currency,

          'pending',

          auth.uid()
        );


        v_created :=
          v_created + 1;

      end if;

    end loop;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'created',
      v_created,

    'updated',
      v_updated
  );

end;
$$;


-- ============================================================
-- APPROVE / REJECT
-- ============================================================

create or replace function
public.yacht_os_review_rate_recommendation(
  p_recommendation_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.yacht_os_rate_recommendations%rowtype;
begin

  if p_decision not in (
    'approved',
    'rejected'
  ) then
    raise exception
      'Invalid recommendation decision';
  end if;


  select *
  into r
  from public.yacht_os_rate_recommendations
  where id = p_recommendation_id
  for update;


  if r.id is null then
    raise exception
      'Recommendation not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    r.company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  if r.status <> 'pending' then
    raise exception
      'Only pending recommendation can be reviewed';
  end if;


  update public.yacht_os_rate_recommendations
  set
    status =
      p_decision,

    approved_by =
      case
        when p_decision = 'approved'
        then auth.uid()
        else null
      end,

    approved_at =
      case
        when p_decision = 'approved'
        then now()
        else null
      end,

    rejected_by =
      case
        when p_decision = 'rejected'
        then auth.uid()
        else null
      end,

    rejected_at =
      case
        when p_decision = 'rejected'
        then now()
        else null
      end

  where id =
    r.id;


  return jsonb_build_object(
    'ok',
      true,

    'status',
      p_decision
  );

end;
$$;


-- ============================================================
-- EXPLICIT PUBLISH
-- Approved recommendation -> real rate plan -> calendar
-- ============================================================

create or replace function
public.yacht_os_publish_rate_recommendation(
  p_recommendation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.yacht_os_rate_recommendations%rowtype;

  y public.yacht_os_yachts%rowtype;

  v_rate_plan_id uuid;

  v_plan_name text;
begin

  select *
  into r
  from public.yacht_os_rate_recommendations
  where id = p_recommendation_id
  for update;


  if r.id is null then
    raise exception
      'Recommendation not found';
  end if;


  if not public.yacht_os_has_revenue_authority(
    r.company_id
  ) then
    raise exception
      'Revenue authority required';
  end if;


  if r.status <> 'approved' then
    raise exception
      'Recommendation must be approved before publishing';
  end if;


  select *
  into y
  from public.yacht_os_yachts
  where id = r.yacht_id;


  if y.id is null then
    raise exception
      'Yacht not found';
  end if;


  v_plan_name :=
    'Revenue Intelligence ' ||
    to_char(
      r.period_start,
      'DD.MM'
    ) ||
    '-' ||
    to_char(
      r.period_end,
      'DD.MM.YYYY'
    );


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
    r.company_id,
    r.yacht_id,

    v_plan_name,

    r.period_start,
    r.period_end,

    r.suggested_weekday_price,
    r.suggested_weekend_price,

    r.minimum_days,

    500,

    r.currency,

    'active',

    'Revenue Intelligence onaylı önerisi. ' ||
    coalesce(
      r.reason_summary,
      ''
    ),

    auth.uid()
  )
  returning id
  into v_rate_plan_id;


  -- Publish through the existing safe rate calendar engine.
  perform public.yacht_os_publish_rate_calendar(
    r.yacht_id,
    r.period_start,
    r.period_end
  );


  update public.yacht_os_rate_recommendations
  set
    status =
      'published',

    published_by =
      auth.uid(),

    published_at =
      now(),

    rate_plan_id =
      v_rate_plan_id

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
    v_rate_plan_id,

    'intelligence_recommendation_published',

    'Revenue Intelligence önerisi yayınlandı',

    r.period_start,
    r.period_end,

    jsonb_build_object(
      'recommendation_id',
        r.id,

      'old_average_price',
        r.current_average_price,

      'weekday_price',
        r.suggested_weekday_price,

      'weekend_price',
        r.suggested_weekend_price,

      'adjustment_percent',
        r.adjustment_percent,

      'occupancy_percent',
        r.occupancy_percent,

      'confidence_score',
        r.confidence_score
    ),

    auth.uid()
  );


  return jsonb_build_object(
    'ok',
      true,

    'rate_plan_id',
      v_rate_plan_id,

    'status',
      'published'
  );

end;
$$;


-- ============================================================
-- PERMISSIONS
-- ============================================================

revoke execute
on function
  public.yacht_os_generate_rate_recommendations(uuid)
from public;

revoke execute
on function
  public.yacht_os_review_rate_recommendation(uuid,text)
from public;

revoke execute
on function
  public.yacht_os_publish_rate_recommendation(uuid)
from public;


grant execute
on function
  public.yacht_os_generate_rate_recommendations(uuid)
to authenticated;

grant execute
on function
  public.yacht_os_review_rate_recommendation(uuid,text)
to authenticated;

grant execute
on function
  public.yacht_os_publish_rate_recommendation(uuid)
to authenticated;
