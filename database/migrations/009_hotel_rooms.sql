create table if not exists public.hotel_rooms (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_id uuid not null
    references public.hotels(id)
    on delete cascade,

  room_type_id uuid not null
    references public.hotel_room_types(id)
    on delete restrict,

  room_number text not null,
  floor_number text,

  room_status text not null default 'available'
    check (
      room_status in (
        'available',
        'occupied',
        'dirty',
        'cleaning',
        'inspection',
        'maintenance',
        'out_of_order',
        'blocked'
      )
    ),

  housekeeping_status text not null default 'clean'
    check (
      housekeeping_status in (
        'clean',
        'dirty',
        'cleaning',
        'inspected'
      )
    ),

  notes text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(hotel_id, room_number)
);

create index if not exists hotel_rooms_hotel_idx
on public.hotel_rooms(hotel_id);

create index if not exists hotel_rooms_status_idx
on public.hotel_rooms(
  hotel_id,
  room_status,
  housekeeping_status
);
