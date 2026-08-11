-- TUROBUS Phase 8A.1
-- Sensitive hotel RPC / trigger function execute cleanup.

revoke execute
on function public.cancel_hotel_folio_payment(
  uuid,
  uuid,
  text
)
from anon;

revoke execute
on function public.reopen_hotel_night_audit(
  uuid,
  uuid,
  text
)
from anon;

-- Trigger fonksiyonları kullanıcı tarafından doğrudan
-- çağrılmamalı.
revoke execute
on function public.prevent_hotel_folio_payment_delete()
from anon;

revoke execute
on function public.guard_hotel_invoice_mutation()
from anon;

revoke execute
on function public.guard_hotel_invoice_item_mutation()
from anon;


-- Authenticated gerekli RPC erişimleri açık kalır.
grant execute
on function public.cancel_hotel_folio_payment(
  uuid,
  uuid,
  text
)
to authenticated;

grant execute
on function public.reopen_hotel_night_audit(
  uuid,
  uuid,
  text
)
to authenticated;
