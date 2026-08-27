-- TUR-013 — Incident history hardening
--
-- Purpose:
-- - Preserve operational incident history when a tour deletion is attempted.
-- - Existing incidents must block parent tour physical deletion.
-- - Departure deletion behavior remains SET NULL to preserve incident history.
-- - Incident events remain immutable through the existing event guards.
-- - No backfill.
-- - No business data mutation.
-- - Existing applied migrations are not edited.

do $$
declare
  v_delete_action "char";
begin
  select c.confdeltype
  into v_delete_action
  from pg_constraint c
  join pg_class t
    on t.oid = c.conrelid
  join pg_namespace n
    on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'tour_operation_incidents'
    and c.contype = 'f'
    and c.conname = 'tour_operation_incidents_tour_id_fkey';

  if v_delete_action is null then
    raise exception
      'TUR-013 preflight failed: incident tour foreign key not found';
  end if;

  if v_delete_action not in ('c', 'r', 'a') then
    raise exception
      'TUR-013 preflight failed: unexpected incident tour FK delete action: %',
      v_delete_action;
  end if;
end
$$;

alter table public.tour_operation_incidents
  drop constraint tour_operation_incidents_tour_id_fkey;

alter table public.tour_operation_incidents
  add constraint tour_operation_incidents_tour_id_fkey
  foreign key (tour_id)
  references public.tours(id)
  on delete restrict;

-- Defense in depth:
-- authenticated/anon application roles must not physically delete
-- incident history. Existing RPC/status-based lifecycle remains untouched.
revoke delete
on table public.tour_operation_incidents
from authenticated, anon;

revoke delete
on table public.tour_operation_incident_events
from authenticated, anon;

comment on constraint
  tour_operation_incidents_tour_id_fkey
on public.tour_operation_incidents
is
  'TUR-013: operational incident history blocks physical deletion of its parent tour.';
