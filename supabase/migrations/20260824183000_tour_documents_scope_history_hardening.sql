-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-009 — DOCUMENT REGISTRY SCOPE / HISTORY HARDENING
--
-- Goals:
--   * preserve historical operational documents
--   * prevent cross-company / cross-tour / cross-departure links
--   * validate reservation and supplier links
--   * prohibit physical document delete for authenticated app users
--
-- Existing voucher engines remain authoritative.
-- No backfill.
-- No fake data.
-- ============================================================


-- ============================================================
-- 1. PREFLIGHT
-- Stop if existing live rows contain scope inconsistencies.
-- No automatic repair.
-- ============================================================

do $$
begin

  -- Tour must belong to document company.
  if exists (
    select 1
    from public.tour_documents document
    left join public.tours tour
      on tour.id = document.tour_id
    where
      tour.id is null
      or
      tour.company_id <> document.company_id
  ) then
    raise exception
      'TUR009_PREFLIGHT_DOCUMENT_TOUR_SCOPE_MISMATCH';
  end if;


  -- Departure, when present, must belong to same company + tour.
  if exists (
    select 1
    from public.tour_documents document
    left join public.tour_departures departure
      on departure.id = document.departure_id
    where
      document.departure_id is not null
      and (
        departure.id is null
        or
        departure.company_id <> document.company_id
        or
        departure.tour_id <> document.tour_id
      )
  ) then
    raise exception
      'TUR009_PREFLIGHT_DOCUMENT_DEPARTURE_SCOPE_MISMATCH';
  end if;


  -- Reservation must belong to same company.
  -- If document has a canonical departure, reservation must be
  -- attached to that same departure.
  if exists (
    select 1
    from public.tour_documents document
    left join public.reservations reservation
      on reservation.id = document.reservation_id
    where
      document.reservation_id is not null
      and (
        reservation.id is null
        or
        reservation.company_id <> document.company_id
        or
        (
          document.departure_id is not null
          and
          reservation.departure_id is distinct from
            document.departure_id
        )
      )
  ) then
    raise exception
      'TUR009_PREFLIGHT_DOCUMENT_RESERVATION_SCOPE_MISMATCH';
  end if;


  -- Supplier commitment must belong to exact operational scope.
  if exists (
    select 1
    from public.tour_documents document
    left join public.tour_supplier_commitments commitment
      on commitment.id =
        document.supplier_commitment_id
    where
      document.supplier_commitment_id is not null
      and (
        commitment.id is null
        or
        commitment.company_id <> document.company_id
        or
        commitment.tour_id <> document.tour_id
        or
        (
          document.departure_id is not null
          and
          commitment.departure_id is distinct from
            document.departure_id
        )
      )
  ) then
    raise exception
      'TUR009_PREFLIGHT_DOCUMENT_SUPPLIER_SCOPE_MISMATCH';
  end if;

end;
$$;


-- ============================================================
-- 2. HISTORICAL FK PRESERVATION
--
-- Operational document history must not disappear because a
-- tour or departure is deleted.
--
-- Reservation / supplier references remain SET NULL so the
-- document registry itself survives source-record removal.
-- ============================================================

alter table
  public.tour_documents
drop constraint if exists
  tour_documents_tour_id_fkey;

alter table
  public.tour_documents
add constraint
  tour_documents_tour_id_fkey
foreign key (
  tour_id
)
references public.tours(id)
on delete restrict;


alter table
  public.tour_documents
drop constraint if exists
  tour_documents_departure_id_fkey;

alter table
  public.tour_documents
add constraint
  tour_documents_departure_id_fkey
foreign key (
  departure_id
)
references public.tour_departures(id)
on delete restrict;


-- Preserve source compatibility:
-- deleting a reservation must not delete the document row.
alter table
  public.tour_documents
drop constraint if exists
  tour_documents_reservation_id_fkey;

alter table
  public.tour_documents
add constraint
  tour_documents_reservation_id_fkey
foreign key (
  reservation_id
)
references public.reservations(id)
on delete set null;


-- Supplier commitment may disappear independently;
-- document history remains.
alter table
  public.tour_documents
drop constraint if exists
  tour_documents_supplier_commitment_id_fkey;

alter table
  public.tour_documents
add constraint
  tour_documents_supplier_commitment_id_fkey
foreign key (
  supplier_commitment_id
)
references public.tour_supplier_commitments(id)
on delete set null;


-- ============================================================
-- 3. CANONICAL DOCUMENT SCOPE VALIDATOR
-- ============================================================

create or replace function
public.validate_tour_document_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if not exists (
    select 1
    from public.tours tour
    where
      tour.id = new.tour_id
      and
      tour.company_id = new.company_id
  ) then
    raise exception
      'DOCUMENT_TOUR_SCOPE_MISMATCH';
  end if;


  if
    new.departure_id is not null
  then

    if not exists (
      select 1
      from public.tour_departures departure
      where
        departure.id = new.departure_id
        and
        departure.company_id = new.company_id
        and
        departure.tour_id = new.tour_id
    ) then
      raise exception
        'DOCUMENT_DEPARTURE_SCOPE_MISMATCH';
    end if;

  end if;


  if
    new.reservation_id is not null
  then

    if not exists (
      select 1
      from public.reservations reservation
      where
        reservation.id = new.reservation_id
        and
        reservation.company_id = new.company_id
        and (
          new.departure_id is null
          or
          reservation.departure_id = new.departure_id
        )
    ) then
      raise exception
        'DOCUMENT_RESERVATION_SCOPE_MISMATCH';
    end if;

  end if;


  if
    new.supplier_commitment_id is not null
  then

    if not exists (
      select 1
      from public.tour_supplier_commitments commitment
      where
        commitment.id =
          new.supplier_commitment_id
        and
        commitment.company_id =
          new.company_id
        and
        commitment.tour_id =
          new.tour_id
        and (
          new.departure_id is null
          or
          commitment.departure_id =
            new.departure_id
        )
    ) then
      raise exception
        'DOCUMENT_SUPPLIER_SCOPE_MISMATCH';
    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  trg_validate_tour_document_scope
on public.tour_documents;


create trigger
  trg_validate_tour_document_scope
before insert or update of
  company_id,
  tour_id,
  departure_id,
  reservation_id,
  supplier_commitment_id
on public.tour_documents
for each row
execute function
  public.validate_tour_document_scope();


revoke all
on function
  public.validate_tour_document_scope()
from public;


-- ============================================================
-- 4. PHYSICAL DELETE PROTECTION
--
-- App lifecycle:
--   draft -> pending -> ready -> sent
--   cancelled = historical cancellation
--
-- Physical delete is not part of normal authenticated workflow.
-- ============================================================

drop policy if exists
  tour_documents_delete_company
on public.tour_documents;


revoke delete
on public.tour_documents
from authenticated;


grant
  select,
  insert,
  update
on public.tour_documents
to authenticated;


comment on table
public.tour_documents
is
'Tour OS operational document registry. Existing voucher, PNR and manifest engines remain authoritative. Historical document rows are preserved; normal lifecycle uses document_status including cancelled rather than physical delete.';
