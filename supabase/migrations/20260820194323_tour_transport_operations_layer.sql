-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 1 — AIR / BUS TOUR CLASSIFICATION
--
-- Existing tours preserved.
-- No destructive changes.
-- ============================================================

alter table
  public.tours
add column if not exists
  transport_mode text
  not null
  default 'other'
  check (
    transport_mode in (
      'air',
      'bus',
      'other'
    )
  );


alter table
  public.tours
add column if not exists
  departure_city text;


alter table
  public.tours
add column if not exists
  arrival_city text;


alter table
  public.tours
add column if not exists
  capacity integer
  check (
    capacity is null
    or capacity >= 0
  );


alter table
  public.tours
add column if not exists
  operation_status text
  not null
  default 'draft'
  check (
    operation_status in (
      'draft',
      'sales',
      'confirmed',
      'preparing',
      'ready',
      'active',
      'returning',
      'completed',
      'cancelled'
    )
  );


alter table
  public.tours
add column if not exists
  departure_date date;


alter table
  public.tours
add column if not exists
  return_date date;


create index if not exists
  tours_company_transport_idx
on public.tours (
  company_id,
  transport_mode
);


create index if not exists
  tours_company_operation_status_idx
on public.tours (
  company_id,
  operation_status
);


create index if not exists
  tours_company_departure_date_idx
on public.tours (
  company_id,
  departure_date
);
