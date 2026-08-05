create table if not exists public.hotel_reservations (
    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references public.companies(id)
        on delete cascade,

    hotel_id uuid not null
        references public.hotels(id)
        on delete cascade,

    room_type_id uuid not null
        references public.hotel_room_types(id)
        on delete cascade,

    room_id uuid
        references public.hotel_rooms(id)
        on delete set null,

    reservation_no text not null,

    source text not null default 'direct'
        check (
            source in (
                'direct',
                'website',
                'booking',
                'expedia',
                'hotelbeds',
                'ets',
                'jolly',
                'tatilliyoruz',
                'manual'
            )
        ),

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'confirmed',
                'checked_in',
                'checked_out',
                'cancelled',
                'no_show'
            )
        ),

    check_in date not null,

    check_out date not null,

    adults integer not null default 2,

    children integer not null default 0,

    nights integer not null,

    currency text not null default 'TRY',

    base_price numeric(14,2) not null default 0,

    total_price numeric(14,2) not null default 0,

    balance numeric(14,2) not null default 0,

    notes text,

    created_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz default now(),

    updated_at timestamptz default now(),

    unique(company_id,reservation_no)
);

create index if not exists reservations_company_idx
on public.hotel_reservations(company_id);

create index if not exists reservations_dates_idx
on public.hotel_reservations(check_in,check_out);

alter table public.hotel_reservations
enable row level security;

drop policy if exists
"Members manage reservations"
on public.hotel_reservations;

create policy
"Members manage reservations"
on public.hotel_reservations
for all
to authenticated
using (
    public.is_company_member(company_id)
)
with check (
    public.is_company_member(company_id)
);
