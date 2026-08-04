create table if not exists public.hotel_rate_plans (
    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references public.companies(id)
        on delete cascade,

    hotel_id uuid not null
        references public.hotels(id)
        on delete cascade,

    room_type_id uuid
        references public.hotel_room_types(id)
        on delete cascade,

    rate_code text,

    name text not null,

    meal_plan text not null default 'room_only',

    cancellation_policy text,

    minimum_stay integer not null default 1,

    maximum_stay integer,

    currency text not null default 'TRY',

    is_refundable boolean not null default true,

    is_active boolean not null default true,

    created_at timestamptz default now(),

    updated_at timestamptz default now(),

    unique(hotel_id, rate_code)
);

create index if not exists hotel_rate_plans_hotel_idx
on public.hotel_rate_plans(hotel_id);
