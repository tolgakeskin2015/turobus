-- TUR-014C — true departure-level Tour OS state engine
--
-- Additive migration.
-- Existing applied migrations remain untouched.
-- Existing tour_departures.operation_status remains untouched.
-- Existing tours.operation_stage remains available for legacy callers.
-- Existing departure rows are NOT backfilled with guessed state.
--
-- Legacy fallback:
--   departure.operation_stage NULL -> tours.operation_stage
--   until the first departure-scoped transition.
--

alter table public.tour_departures
  add column if not exists
    operation_stage text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where
      conname =
        'tour_departures_operation_stage_check'
      and
      conrelid =
        'public.tour_departures'::regclass
  ) then
    alter table public.tour_departures
      add constraint
        tour_departures_operation_stage_check
      check (
        operation_stage is null
        or
        operation_stage in (
          'draft',
          'sales',
          'confirmed',
          'preparing',
          'ready',
          'on_the_way',
          'in_progress',
          'returning',
          'completed',
          'cancelled'
        )
      );
  end if;
end
$$;

alter table public.tour_departures
  alter column operation_stage
  set default 'draft';

create index if not exists
tour_departures_tour_operation_stage_idx
on public.tour_departures (
  tour_id,
  operation_stage
);

create index if not exists
tour_operation_state_history_departure_idx
on public.tour_operation_state_history (
  company_id,
  tour_id,
  departure_id,
  created_at desc
);

create or replace function
public.transition_tour_operation_stage_by_departure(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid,
  p_target_stage text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_current_stage text;
  v_legacy_status text;
  v_readiness jsonb;
  v_allowed boolean := false;

begin

  if not public.is_active_company_member(
    p_company_id
  ) then

    raise exception
      'COMPANY_ACCESS_DENIED';

  end if;


  select
    coalesce(
      d.operation_stage,
      t.operation_stage,
      'draft'
    )
  into
    v_current_stage
  from public.tour_departures d
  join public.tours t
    on t.id = d.tour_id
  where
    d.id = p_departure_id
    and
    d.tour_id = p_tour_id
    and
    t.company_id = p_company_id
  for update of d;


  if not found then
    raise exception
      'DEPARTURE_SCOPE_INVALID';
  end if;


  if
    p_target_stage not in (
      'draft',
      'sales',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'in_progress',
      'returning',
      'completed',
      'cancelled'
    )
  then

    raise exception
      'INVALID_TARGET_STAGE';

  end if;


  if
    p_target_stage =
      v_current_stage
  then

    return jsonb_build_object(
      'ok',
      true,
      'stage',
      v_current_stage,
      'unchanged',
      true
    );

  end if;


  v_allowed :=
    case v_current_stage

      when 'draft'
        then p_target_stage in (
          'sales',
          'cancelled'
        )

      when 'sales'
        then p_target_stage in (
          'confirmed',
          'cancelled'
        )

      when 'confirmed'
        then p_target_stage in (
          'preparing',
          'cancelled'
        )

      when 'preparing'
        then p_target_stage in (
          'ready',
          'cancelled'
        )

      when 'ready'
        then p_target_stage in (
          'on_the_way',
          'cancelled'
        )

      when 'on_the_way'
        then p_target_stage in (
          'in_progress',
          'cancelled'
        )

      when 'in_progress'
        then p_target_stage in (
          'returning',
          'cancelled'
        )

      when 'returning'
        then p_target_stage in (
          'completed',
          'cancelled'
        )

      else false

    end;


  if not v_allowed then

    raise exception
      'INVALID_STAGE_TRANSITION:%->%',
      v_current_stage,
      p_target_stage;

  end if;


  v_readiness :=
    public.get_tour_operation_readiness_by_departure(
      p_company_id,
      p_tour_id,
      p_departure_id
    );


  if
    p_target_stage = 'ready'
    and
    coalesce(
      (
        v_readiness ->
        'blockers'
      )::text::integer,
      0
    ) > 0
  then

    raise exception
      'READINESS_BLOCKED:%',
      v_readiness::text;

  end if;


  if
    p_target_stage = 'completed'
    and
    coalesce(
      (
        v_readiness ->
        'critical_tasks'
      )::text::integer,
      0
    ) > 0
  then

    raise exception
      'CRITICAL_TASKS_OPEN';

  end if;


  v_legacy_status :=
    case p_target_stage

      when 'draft'
        then 'draft'

      when 'sales'
        then 'sales'

      when 'confirmed'
        then 'confirmed'

      when 'preparing'
        then 'preparing'

      when 'ready'
        then 'ready'

      when 'on_the_way'
        then 'active'

      when 'in_progress'
        then 'active'

      when 'returning'
        then 'returning'

      when 'completed'
        then 'completed'

      when 'cancelled'
        then 'cancelled'

    end;


  update public.tour_departures
  set
    operation_stage =
      p_target_stage
  where
    id = p_departure_id
    and
    tour_id = p_tour_id;


  insert into
  public.tour_operation_state_history (

    company_id,
    tour_id,
    departure_id,
    from_stage,
    to_stage,
    transition_type,
    readiness_snapshot,
    transition_note,
    changed_by

  )
  values (

    p_company_id,
    p_tour_id,
    p_departure_id,
    v_current_stage,
    p_target_stage,

    case
      when
        p_target_stage =
          'cancelled'
      then
        'cancel'
      else
        'manual'
    end,

    v_readiness,

    nullif(
      trim(p_note),
      ''
    ),

    auth.uid()

  );


  return jsonb_build_object(

    'ok',
      true,

    'departure_id',
      p_departure_id,

    'from_stage',
      v_current_stage,

    'to_stage',
      p_target_stage,

    'legacy_status',
      v_legacy_status,

    'readiness',
      v_readiness

  );

end;
$$;

revoke all
on function
public.transition_tour_operation_stage_by_departure(
  uuid,
  uuid,
  uuid,
  text,
  text
)
from public;

grant execute
on function
public.transition_tour_operation_stage_by_departure(
  uuid,
  uuid,
  uuid,
  text,
  text
)
to authenticated;

comment on column
public.tour_departures.operation_stage
is
'Departure-specific Tour OS lifecycle stage. NULL on legacy rows means use the preserved tour-level lifecycle only as fallback until first scoped transition.';

comment on function
public.transition_tour_operation_stage_by_departure(
  uuid,
  uuid,
  uuid,
  text,
  text
)
is
'Controlled departure-scoped Tour OS transition using departure-scoped readiness gates and immutable scoped history.';

