-- ============================================================
-- TUROBÜS TOUR OS
-- TUR-011B — OPERATION EXPENSE HISTORY HARDENING
--
-- Existing shared finance ledger is preserved.
-- Normal app users cancel ledger rows through payment_status
-- instead of physically deleting financial history.
--
-- No backfill.
-- No fake data.
-- No business-row mutation.
-- Service role is not restricted by these client grants.
-- ============================================================


-- ============================================================
-- 1. DROP EVERY DELETE POLICY ON OPERATION_EXPENSES
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select policyname
    from pg_policies
    where
      schemaname = 'public'
      and tablename = 'operation_expenses'
      and cmd = 'DELETE'
  loop

    execute format(
      'drop policy if exists %I on public.operation_expenses',
      r.policyname
    );

  end loop;

end
$$;


-- ============================================================
-- 2. BLOCK PHYSICAL DELETE FOR NORMAL CLIENT ROLES
-- ============================================================

revoke delete
on public.operation_expenses
from authenticated;

revoke delete
on public.operation_expenses
from anon;


comment on table
public.operation_expenses
is
'Shared operational finance ledger. Application users preserve expense history by setting payment_status=cancelled instead of physically deleting rows.';
