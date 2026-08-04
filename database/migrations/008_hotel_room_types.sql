create table if not exists public.hotel_room_types (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_code text,
  name text not null,
  description text,

  max_adults integer not null default 2,
  max_children integer not null default 0,
  max_infants integer not null default 0,
  max_occupancy integer not null default 2,

  bed_type text,
  room_size_m2 numeric(8,2),

  total_rooms integer not null default 0,

  amenities jsonb not null default '[]'::jsonb,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, room_type_code)
);

create index if not exists hotel_room_types_hotel_idx
on public.hotel_room_types(hotel_id);
