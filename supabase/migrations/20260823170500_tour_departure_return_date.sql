-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-001 — Departure-level real return date
--
-- Purpose:
-- - Each tour_departures row may have its own return date.
-- - Existing rows remain valid because return_date is nullable.
-- - Return date, when present, cannot be before departure_date.
-- - No existing data is rewritten or backfilled.
-- ============================================================

alter table public.tour_departures
  add column if not exists return_date date;

comment on column public.tour_departures.return_date is
  'Canonical return day for this specific tour departure. Nullable when not yet planned.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tour_departures_return_date_not_before_departure_chk'
      and conrelid = 'public.tour_departures'::regclass
  ) then
    alter table public.tour_departures
      add constraint tour_departures_return_date_not_before_departure_chk
      check (
        return_date is null
        or return_date >= departure_date
      );
  end if;
end
$$;
