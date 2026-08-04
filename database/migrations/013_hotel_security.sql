alter table public.hotels enable row level security;
alter table public.hotel_room_types enable row level security;
alter table public.hotel_rooms enable row level security;
alter table public.hotel_rate_plans enable row level security;
alter table public.hotel_inventory enable row level security;
alter table public.hotel_daily_rates enable row level security;

grant select, insert, update, delete
on
  public.hotels,
  public.hotel_room_types,
  public.hotel_rooms,
  public.hotel_rate_plans,
  public.hotel_inventory,
  public.hotel_daily_rates
to authenticated;

drop policy if exists "Members manage hotels"
on public.hotels;

create policy "Members manage hotels"
on public.hotels
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists "Members manage hotel room types"
on public.hotel_room_types;

create policy "Members manage hotel room types"
on public.hotel_room_types
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists "Members manage hotel rooms"
on public.hotel_rooms;

create policy "Members manage hotel rooms"
on public.hotel_rooms
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists "Members manage hotel rate plans"
on public.hotel_rate_plans;

create policy "Members manage hotel rate plans"
on public.hotel_rate_plans
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists "Members manage hotel inventory"
on public.hotel_inventory;

create policy "Members manage hotel inventory"
on public.hotel_inventory
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

drop policy if exists "Members manage hotel daily rates"
on public.hotel_daily_rates;

create policy "Members manage hotel daily rates"
on public.hotel_daily_rates
for all
to authenticated
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
