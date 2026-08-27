begin;

-- ============================================================
-- TUR-016 — AI OPERATION ASSISTANT
-- Proposal -> Human decision -> Audit
--
-- IMPORTANT:
-- This migration does NOT execute operational/financial actions.
-- No refund/payment/state/cancellation/task mutation is performed.
-- ============================================================

create table if not exists
public.tour_ai_action_proposals (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null
    references public.companies(id)
    on delete restrict,

  tour_id uuid
    not null
    references public.tours(id)
    on delete restrict,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  snapshot_id uuid
    not null
    references public.tour_ai_operation_snapshots(id)
    on delete restrict,

  proposal_key text
    not null,

  proposal_type text
    not null
    default 'advisory'
    check (
      proposal_type in (
        'advisory',
        'review',
        'follow_up'
      )
    ),

  priority text
    not null
    default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high',
        'critical'
      )
    ),

  title text
    not null,

  description text,

  source_engine text
    not null
    default 'rules_v1',

  source_data jsonb
    not null
    default '{}'::jsonb,

  proposed_action jsonb
    not null
    default '{}'::jsonb,

  human_approval_required boolean
    not null
    default true
    check (
      human_approval_required = true
    ),

  status text
    not null
    default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'superseded'
      )
    ),

  proposed_by uuid
    references auth.users(id)
    on delete set null,

  proposed_at timestamptz
    not null
    default now(),

  decided_by uuid
    references auth.users(id)
    on delete set null,

  decided_at timestamptz,

  decision_note text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  unique (
    snapshot_id,
    proposal_key
  )
);


create index if not exists
tour_ai_action_proposals_scope_idx
on public.tour_ai_action_proposals (
  company_id,
  tour_id,
  departure_id,
  status,
  created_at desc
);


create table if not exists
public.tour_ai_action_audit (
  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null
    references public.companies(id)
    on delete restrict,

  tour_id uuid
    not null
    references public.tours(id)
    on delete restrict,

  departure_id uuid
    references public.tour_departures(id)
    on delete set null,

  proposal_id uuid
    references public.tour_ai_action_proposals(id)
    on delete restrict,

  actor_id uuid
    references auth.users(id)
    on delete set null,

  event_type text
    not null
    check (
      event_type in (
        'proposed',
        'approved',
        'rejected',
        'superseded'
      )
    ),

  request_data jsonb
    not null
    default '{}'::jsonb,

  result_data jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


create index if not exists
tour_ai_action_audit_scope_idx
on public.tour_ai_action_audit (
  company_id,
  tour_id,
  departure_id,
  created_at desc
);


-- ============================================================
-- IMMUTABLE AUDIT
-- ============================================================

create or replace function
public.prevent_tour_ai_action_audit_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Tour AI action audit is immutable';
end;
$$;


drop trigger if exists
tour_ai_action_audit_no_update
on public.tour_ai_action_audit;

create trigger
tour_ai_action_audit_no_update
before update
on public.tour_ai_action_audit
for each row
execute function
public.prevent_tour_ai_action_audit_mutation();


drop trigger if exists
tour_ai_action_audit_no_delete
on public.tour_ai_action_audit;

create trigger
tour_ai_action_audit_no_delete
before delete
on public.tour_ai_action_audit
for each row
execute function
public.prevent_tour_ai_action_audit_mutation();


-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function
public.touch_tour_ai_action_proposal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists
tour_ai_action_proposals_touch
on public.tour_ai_action_proposals;

create trigger
tour_ai_action_proposals_touch
before update
on public.tour_ai_action_proposals
for each row
execute function
public.touch_tour_ai_action_proposal_updated_at();


-- ============================================================
-- GENERATE PROPOSALS FROM EXISTING REAL SNAPSHOT
-- Does NOT call external AI.
-- Does NOT execute recommendations.
-- ============================================================

create or replace function
public.generate_tour_ai_action_proposals(
  p_company_id uuid,
  p_tour_id uuid,
  p_departure_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();

  v_snapshot
    public.tour_ai_operation_snapshots%rowtype;

  v_departure_company uuid;
  v_departure_tour uuid;

  v_action jsonb;
  v_index integer := 0;

  v_priority text;
  v_title text;
  v_key text;

  v_proposal_id uuid;
  v_created integer := 0;
  v_existing integer := 0;
begin

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_active_company_member(
      p_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if not exists (
    select 1
    from public.tours t
    where
      t.id = p_tour_id
      and
      t.company_id = p_company_id
  )
  then
    raise exception
      'Tour scope mismatch';
  end if;


  if p_departure_id is not null then

    select
      d.company_id,
      d.tour_id
    into
      v_departure_company,
      v_departure_tour
    from public.tour_departures d
    where
      d.id = p_departure_id;


    if not found then
      raise exception
        'Departure not found';
    end if;


    if
      v_departure_company <>
        p_company_id
      or
      v_departure_tour <>
        p_tour_id
    then
      raise exception
        'Departure scope mismatch';
    end if;

  end if;


  select *
  into v_snapshot
  from public.tour_ai_operation_snapshots s
  where
    s.company_id =
      p_company_id
    and
    s.tour_id =
      p_tour_id
    and
    (
      (
        p_departure_id is null
        and
        s.departure_id is null
      )
      or
      s.departure_id =
        p_departure_id
    )
  order by
    s.generated_at desc
  limit 1;


  if v_snapshot.id is null then
    raise exception
      'Risk snapshot required before AI proposals';
  end if;


  for v_action in
    select value
    from jsonb_array_elements(
      coalesce(
        v_snapshot.recommended_actions,
        '[]'::jsonb
      )
    )
  loop

    v_index :=
      v_index + 1;


    v_priority :=
      lower(
        coalesce(
          nullif(
            btrim(
              v_action ->> 'priority'
            ),
            ''
          ),
          'medium'
        )
      );


    if v_priority not in (
      'low',
      'medium',
      'high',
      'critical'
    )
    then
      v_priority := 'medium';
    end if;


    v_title :=
      coalesce(
        nullif(
          btrim(
            v_action ->> 'action'
          ),
          ''
        ),
        'Operasyon önerisini incele'
      );


    v_key :=
      encode(
        digest(
          concat_ws(
            '|',
            v_snapshot.id::text,
            v_index::text,
            v_priority,
            v_title
          ),
          'sha256'
        ),
        'hex'
      );


    insert into
      public.tour_ai_action_proposals (
        company_id,
        tour_id,
        departure_id,
        snapshot_id,
        proposal_key,
        proposal_type,
        priority,
        title,
        description,
        source_engine,
        source_data,
        proposed_action,
        human_approval_required,
        status,
        proposed_by
      )
    values (
      p_company_id,
      p_tour_id,
      p_departure_id,
      v_snapshot.id,
      v_key,
      'advisory',
      v_priority,
      v_title,
      'AI/rules operasyon önerisi. Uygulamadan önce insan kararı zorunludur.',
      coalesce(
        v_snapshot.engine,
        'rules_v1'
      ),
      v_action,
      jsonb_build_object(
        'mode',
        'proposal_only',
        'business_mutation_allowed',
        false
      ),
      true,
      'pending',
      v_actor
    )
    on conflict (
      snapshot_id,
      proposal_key
    )
    do nothing
    returning id
    into v_proposal_id;


    if v_proposal_id is null then

      v_existing :=
        v_existing + 1;

    else

      v_created :=
        v_created + 1;


      insert into
        public.tour_ai_action_audit (
          company_id,
          tour_id,
          departure_id,
          proposal_id,
          actor_id,
          event_type,
          request_data,
          result_data
        )
      values (
        p_company_id,
        p_tour_id,
        p_departure_id,
        v_proposal_id,
        v_actor,
        'proposed',
        jsonb_build_object(
          'snapshot_id',
          v_snapshot.id,
          'source_action',
          v_action
        ),
        jsonb_build_object(
          'status',
          'pending',
          'human_approval_required',
          true,
          'business_mutation_executed',
          false
        )
      );

    end if;


    v_proposal_id := null;

  end loop;


  return jsonb_build_object(
    'ok',
      true,

    'snapshot_id',
      v_snapshot.id,

    'created',
      v_created,

    'existing',
      v_existing,

    'human_approval_required',
      true,

    'business_mutation_executed',
      false
  );

end;
$$;


-- ============================================================
-- HUMAN DECISION
-- Approval only records approval.
-- It still DOES NOT execute the proposed action.
-- ============================================================

create or replace function
public.decide_tour_ai_action_proposal(
  p_company_id uuid,
  p_proposal_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();

  v_proposal
    public.tour_ai_action_proposals%rowtype;

  v_decision text :=
    lower(
      btrim(
        coalesce(
          p_decision,
          ''
        )
      )
    );

  v_status text;
begin

  if v_actor is null then
    raise exception
      'Authentication required';
  end if;


  if not
    public.is_active_company_member(
      p_company_id
    )
  then
    raise exception
      'Active company membership required';
  end if;


  if v_decision not in (
    'approve',
    'reject'
  )
  then
    raise exception
      'Decision must be approve or reject';
  end if;


  select *
  into v_proposal
  from public.tour_ai_action_proposals p
  where
    p.id =
      p_proposal_id
    and
    p.company_id =
      p_company_id
  for update;


  if v_proposal.id is null then
    raise exception
      'AI proposal not found';
  end if;


  if v_proposal.status <> 'pending' then

    return jsonb_build_object(
      'ok',
        true,

      'already_decided',
        true,

      'status',
        v_proposal.status,

      'business_mutation_executed',
        false
    );

  end if;


  v_status :=
    case
      when v_decision = 'approve'
      then 'approved'
      else 'rejected'
    end;


  update
    public.tour_ai_action_proposals
  set
    status =
      v_status,

    decided_by =
      v_actor,

    decided_at =
      now(),

    decision_note =
      nullif(
        btrim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      )

  where
    id =
      v_proposal.id;


  insert into
    public.tour_ai_action_audit (
      company_id,
      tour_id,
      departure_id,
      proposal_id,
      actor_id,
      event_type,
      request_data,
      result_data
    )
  values (
    v_proposal.company_id,
    v_proposal.tour_id,
    v_proposal.departure_id,
    v_proposal.id,
    v_actor,
    case
      when v_status = 'approved'
      then 'approved'
      else 'rejected'
    end,
    jsonb_build_object(
      'decision',
      v_decision,
      'note',
      p_note
    ),
    jsonb_build_object(
      'status',
      v_status,
      'human_decision_recorded',
      true,
      'business_mutation_executed',
      false
    )
  );


  return jsonb_build_object(
    'ok',
      true,

    'proposal_id',
      v_proposal.id,

    'status',
      v_status,

    'human_decision_recorded',
      true,

    'business_mutation_executed',
      false
  );

end;
$$;


-- ============================================================
-- RLS
-- ============================================================

alter table
public.tour_ai_action_proposals
enable row level security;


alter table
public.tour_ai_action_audit
enable row level security;


create policy
tour_ai_action_proposals_select_company
on public.tour_ai_action_proposals
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create policy
tour_ai_action_audit_select_company
on public.tour_ai_action_audit
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


revoke insert, update, delete
on public.tour_ai_action_proposals
from authenticated;


revoke insert, update, delete
on public.tour_ai_action_audit
from authenticated;


grant select
on public.tour_ai_action_proposals
to authenticated;


grant select
on public.tour_ai_action_audit
to authenticated;


revoke all
on function
public.generate_tour_ai_action_proposals(
  uuid,
  uuid,
  uuid
)
from public;


grant execute
on function
public.generate_tour_ai_action_proposals(
  uuid,
  uuid,
  uuid
)
to authenticated;


revoke all
on function
public.decide_tour_ai_action_proposal(
  uuid,
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.decide_tour_ai_action_proposal(
  uuid,
  uuid,
  text,
  text
)
to authenticated;


comment on table
public.tour_ai_action_proposals
is
'Tour OS AI/rules action proposals. Human approval is mandatory and approval alone does not execute business mutations.';


comment on table
public.tour_ai_action_audit
is
'Immutable audit trail for Tour OS AI action proposal and human decision events.';


commit;
