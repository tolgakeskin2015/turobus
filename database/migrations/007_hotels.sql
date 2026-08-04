create table if not exists public.hotels (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  hotel_code text,
  name text not null,

  star_rating smallint
    check (star_rating between 0 and 5),

  hotel_type text not null default 'hotel'
    check (
      hotel_type in (
        'hotel',
        'boutique_hotel',
        'apart_hotel',
        'resort',
        'hostel',
        'bungalow',
        'holiday_village',
        'other'
      )
    ),

  country_code text not null default 'TR',
  city text,
  district text,
  address text,

  phone text,
  email text,
  website text,

  latitude numeric(10,7),
  longitude numeric(10,7),

  check_in_time time not null default '14:00',
  check_out_time time not null default '12:00',

  currency text not null default 'TRY',

  tax_number text,
  tax_office text,

  contact_person text,
  contact_phone text,
  contact_email text,

  description text,
  notes text,

  is_active boolean not null default true,
  is_verified boolean not null default false,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(company_id, hotel_code)
);

create index if not exists hotels_company_idx
on public.hotels(company_id);
