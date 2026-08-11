-- TUROBUS Phase 7E6
-- Public tracking artık yalnız RPC üzerinden çalışır.

drop policy if exists
"reservations_public_tracking_read"
on public.reservations;

drop policy if exists
"tour_checkins_public_read"
on public.tour_checkins;

drop policy if exists
"tour_status_history_public_read"
on public.tour_status_history;

drop policy if exists
"tour_live_locations_public_read"
on public.tour_live_locations;


revoke select
on public.reservations
from anon;

revoke select
on public.tour_checkins
from anon;

revoke select
on public.tour_status_history
from anon;

revoke select
on public.tour_live_locations
from anon;
