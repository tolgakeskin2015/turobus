-- ============================================================
-- TUROBUS TOUR OS
-- PHASE 12 — TOUR DOCUMENT & VOUCHER CENTER
--
-- Existing systems preserved:
--   reservation voucher pages
--   reservation QR
--   tour flights / PNR
--   supplier commitment voucher references
--   manifest
--
-- This table is a document registry.
-- It does NOT replace existing voucher engines.
-- ============================================================

create table if not exists
public.tour_documents (

  id uuid
    primary key
    default gen_random_uuid(),

  company_id uuid
    not null,

  tour_id uuid
    not null
    references public.tours(id)
    on delete cascade,

  departure_id uuid
    references public.tour_departures(id)
    on delete cascade,

  reservation_id uuid
    references public.reservations(id)
    on delete set null,

  supplier_commitment_id uuid
    references public.tour_supplier_commitments(id)
    on delete set null,

  document_type text
    not null
    default 'other'
    check (
      document_type in (
        'flight_ticket',
        'pnr_document',
        'hotel_voucher',
        'transfer_voucher',
        'activity_voucher',
        'restaurant_voucher',
        'insurance',
        'manifest',
        'rooming',
        'guide_document',
        'bus_document',
        'supplier_confirmation',
        'customer_voucher',
        'identity_list',
        'other'
      )
    ),

  title text
    not null,

  document_status text
    not null
    default 'draft'
    check (
      document_status in (
        'draft',
        'pending',
        'ready',
        'sent',
        'expired',
        'cancelled'
      )
    ),

  recipient_scope text
    not null
    default 'internal'
    check (
      recipient_scope in (
        'internal',
        'customer',
        'guide',
        'supplier',
        'customer_guide',
        'all'
      )
    ),

  source_kind text
    not null
    default 'manual'
    check (
      source_kind in (
        'manual',
        'reservation_voucher',
        'flight',
        'supplier_commitment',
        'manifest',
        'rooming'
      )
    ),

  source_reference text,

  external_url text,

  is_required boolean
    not null
    default false,

  issued_at timestamptz,

  expires_at timestamptz,

  sent_at timestamptz,

  note text,

  created_by uuid,

  updated_by uuid,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


create index if not exists
  tour_documents_company_tour_idx
on public.tour_documents (
  company_id,
  tour_id
);


create index if not exists
  tour_documents_departure_idx
on public.tour_documents (
  company_id,
  departure_id
);


create index if not exists
  tour_documents_status_idx
on public.tour_documents (
  company_id,
  document_status
);


create index if not exists
  tour_documents_required_idx
on public.tour_documents (
  company_id,
  is_required,
  document_status
);


create index if not exists
  tour_documents_reservation_idx
on public.tour_documents (
  company_id,
  reservation_id
);


alter table
public.tour_documents
enable row level security;


drop policy if exists
  tour_documents_select_company
on public.tour_documents;


create policy
  tour_documents_select_company
on public.tour_documents
for select
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_documents_insert_company
on public.tour_documents;


create policy
  tour_documents_insert_company
on public.tour_documents
for insert
to authenticated
with check (
  public.is_active_company_member(
    company_id
  )
);


drop policy if exists
  tour_documents_update_company
on public.tour_documents;


create policy
  tour_documents_update_company
on public.tour_documents
for update
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


drop policy if exists
  tour_documents_delete_company
on public.tour_documents;


create policy
  tour_documents_delete_company
on public.tour_documents
for delete
to authenticated
using (
  public.is_active_company_member(
    company_id
  )
);


create or replace function
public.touch_tour_documents()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  new.updated_at =
    now();

  new.updated_by =
    coalesce(
      auth.uid(),
      new.updated_by
    );

  if
    new.document_status =
      'sent'
    and
    old.document_status <>
      'sent'
    and
    new.sent_at
      is null
  then

    new.sent_at =
      now();

  end if;

  return new;

end;
$$;


drop trigger if exists
  trg_touch_tour_documents
on public.tour_documents;


create trigger
  trg_touch_tour_documents
before update
on public.tour_documents
for each row
execute function
public.touch_tour_documents();


revoke all
on function
public.touch_tour_documents()
from public;


revoke all
on public.tour_documents
from anon;


grant
  select,
  insert,
  update,
  delete
on public.tour_documents
to authenticated;


comment on table
public.tour_documents
is
'Tour OS operational document registry. Existing reservation vouchers, PNR and manifest engines remain authoritative.';
