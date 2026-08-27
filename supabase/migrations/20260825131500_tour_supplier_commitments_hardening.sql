-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-010B — SUPPLIER COMMITMENT HISTORY + SCOPE HARDENING
--
-- Goals:
--   * preserve historical supplier operations
--   * prevent cross-company / cross-tour / cross-departure scope
--   * prevent physical DELETE for authenticated users
--   * change operational parent FKs from CASCADE to RESTRICT
--
-- No backfill.
-- No fake data.
-- No business-row mutation.
-- Existing supplier and expense ledger architecture preserved.
-- ============================================================


-- ============================================================
-- 1. PRE-FLIGHT INTEGRITY
-- Stop migration if existing scope is inconsistent.
-- ============================================================

do $$
declare
  v_bad_tour integer;
  v_bad_departure integer;
  v_bad_supplier integer;
begin

  select count(*)
  into v_bad_tour
  from public.tour_supplier_commitments c
  left join public.tours t
    on t.id = c.tour_id
  where
    t.id is null
    or t.company_id <> c.company_id;

  if v_bad_tour > 0 then
    raise exception
      'TUR-010B PRE-FLIGHT FAILED: % supplier commitment row(s) have invalid tour/company scope.',
      v_bad_tour;
  end if;


  select count(*)
  into v_bad_departure
  from public.tour_supplier_commitments c
  left join public.tour_departures d
    on d.id = c.departure_id
  where
    c.departure_id is not null
    and (
      d.id is null
      or d.tour_id <> c.tour_id
    );

  if v_bad_departure > 0 then
    raise exception
      'TUR-010B PRE-FLIGHT FAILED: % supplier commitment row(s) have invalid departure/tour scope.',
      v_bad_departure;
  end if;


  select count(*)
  into v_bad_supplier
  from public.tour_supplier_commitments c
  left join public.suppliers s
    on s.id = c.supplier_id
  where
    s.id is null
    or s.company_id <> c.company_id;

  if v_bad_supplier > 0 then
    raise exception
      'TUR-010B PRE-FLIGHT FAILED: % supplier commitment row(s) have invalid supplier/company scope.',
      v_bad_supplier;
  end if;

end
$$;


-- ============================================================
-- 2. HISTORICAL FK SAFETY
--
-- Existing:
--   tour_id      -> tours             ON DELETE CASCADE
--   departure_id -> tour_departures   ON DELETE CASCADE
--
-- New:
--   RESTRICT
--
-- Existing supplier_id RESTRICT is preserved.
-- Existing operation_expense_id SET NULL is preserved.
-- ============================================================

alter table public.tour_supplier_commitments
  drop constraint if exists
    tour_supplier_commitments_tour_id_fkey;

alter table public.tour_supplier_commitments
  add constraint
    tour_supplier_commitments_tour_id_fkey
  foreign key (tour_id)
  references public.tours(id)
  on delete restrict;


alter table public.tour_supplier_commitments
  drop constraint if exists
    tour_supplier_commitments_departure_id_fkey;

alter table public.tour_supplier_commitments
  add constraint
    tour_supplier_commitments_departure_id_fkey
  foreign key (departure_id)
  references public.tour_departures(id)
  on delete restrict;


-- ============================================================
-- 3. SCOPE VALIDATION TRIGGER
--
-- Do NOT assume tour_departures has company_id.
-- Canonical validation:
--   commitment.company_id -> tours.company_id
--   departure.tour_id     -> commitment.tour_id
--   supplier.company_id   -> commitment.company_id
-- ============================================================

create or replace function
public.validate_tour_supplier_commitment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select 1
    from public.tours t
    where
      t.id = new.tour_id
      and t.company_id = new.company_id
  ) then
    raise exception
      'Supplier commitment tour/company scope mismatch.';
  end if;


  if
    new.departure_id is not null
    and not exists (
      select 1
      from public.tour_departures d
      where
        d.id = new.departure_id
        and d.tour_id = new.tour_id
    )
  then
    raise exception
      'Supplier commitment departure/tour scope mismatch.';
  end if;


  if not exists (
    select 1
    from public.suppliers s
    where
      s.id = new.supplier_id
      and s.company_id = new.company_id
  ) then
    raise exception
      'Supplier commitment supplier/company scope mismatch.';
  end if;


  return new;

end
$$;


revoke all
on function
public.validate_tour_supplier_commitment_scope()
from public;


drop trigger if exists
  trg_validate_tour_supplier_commitment_scope
on public.tour_supplier_commitments;


create trigger
  trg_validate_tour_supplier_commitment_scope
before insert or update
on public.tour_supplier_commitments
for each row
execute function
  public.validate_tour_supplier_commitment_scope();


-- ============================================================
-- 4. REMOVE ALL DELETE RLS POLICIES
-- Future-proof: remove any DELETE policy regardless of name.
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select policyname
    from pg_policies
    where
      schemaname = 'public'
      and tablename =
        'tour_supplier_commitments'
      and cmd = 'DELETE'
  loop

    execute format(
      'drop policy if exists %I on public.tour_supplier_commitments',
      r.policyname
    );

  end loop;

end
$$;


-- ============================================================
-- 5. BLOCK PHYSICAL DELETE FOR NORMAL APP USERS
-- Keep SELECT / INSERT / UPDATE operational.
-- ============================================================

revoke delete
on public.tour_supplier_commitments
from authenticated;

revoke delete
on public.tour_supplier_commitments
from anon;


grant select, insert, update
on public.tour_supplier_commitments
to authenticated;


comment on table
public.tour_supplier_commitments
is
'Tour OS supplier operational commitments. Historical records are preserved; normal authenticated users cancel records by status instead of physical deletion.';


comment on function
public.validate_tour_supplier_commitment_scope()
is
'Validates supplier commitment company, tour, departure and supplier scope before insert/update.';
