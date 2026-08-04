create table if not exists public.hotel_inventory (
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

    inventory_date date not null,

    total_inventory integer not null default 0,

    reserved_inventory integer not null default 0,

    blocked_inventory integer not null default 0,

    stop_sale boolean not null default false,

    minimum_stay integer not null default 1,

    closed_to_arrival boolean not null default false,

    closed_to_departure boolean not null default false,

    notes text,

    created_at timestamptz default now(),

    updated_at timestamptz default now(),

    unique(
        hotel_id,
        room_type_id,
        inventory_date
    )
);

create index if not exists hotel_inventory_date_idx
on public.hotel_inventory(
    hotel_id,
    inventory_date,
    room_type_id
);
