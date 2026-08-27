-- TUR-012 — Refund departure scope hardening
--
-- Purpose:
-- - Preserve legacy change cases whose departure_id is NULL.
-- - When a change case has a canonical departure_id, every refund row
--   for that case must carry exactly the same departure_id.
-- - No backfill.
-- - No fake data.
-- - No business-row repair.
-- - Existing applied migrations are not edited.

do $$
begin
  if exists (
    select 1
    from public.tour_change_refunds r
    join public.tour_change_cases c
      on c.id = r.case_id
    where c.departure_id is not null
      and r.departure_id is distinct from c.departure_id
  ) then
    raise exception
      'TUR-012 preflight failed: existing refund departure scope mismatch';
  end if;
end
$$;

create or replace function
  public.validate_tour_change_refund_departure_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_case public.tour_change_cases%rowtype;
begin
  select *
  into v_case
  from public.tour_change_cases
  where id = new.case_id;

  if not found then
    raise exception
      'Refund change case not found';
  end if;

  if v_case.company_id <> new.company_id then
    raise exception
      'Refund company does not match change case';
  end if;

  if v_case.tour_id <> new.tour_id then
    raise exception
      'Refund tour does not match change case';
  end if;

  -- Preserve legacy unscoped cases.
  -- But if the case has a canonical departure, refund must match it exactly.
  if v_case.departure_id is not null
     and new.departure_id is distinct from v_case.departure_id then
    raise exception
      'Refund departure does not match change case departure';
  end if;

  return new;
end;
$$;

drop trigger if exists
  tour_change_refunds_departure_scope_hardening
on public.tour_change_refunds;

create trigger
  tour_change_refunds_departure_scope_hardening
before insert or update of
  company_id,
  case_id,
  tour_id,
  departure_id
on public.tour_change_refunds
for each row
execute function
  public.validate_tour_change_refund_departure_scope();

comment on function
  public.validate_tour_change_refund_departure_scope()
is
  'TUR-012: when change case has canonical departure_id, refund must use the same departure; legacy NULL cases remain supported.';
