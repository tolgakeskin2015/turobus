-- TurOS CRM <-> Hotel Reservation link safety migration
-- Run in Supabase SQL Editor once if 028 migration has not been applied.

alter table public.hotel_reservations
add column if not exists customer_id uuid
references public.crm_customers(id)
on delete set null;

create index if not exists hotel_reservations_customer_idx
on public.hotel_reservations(company_id, customer_id);

