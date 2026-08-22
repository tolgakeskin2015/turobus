-- ============================================================
-- TUROBÜS TOUR OS
-- 15.1D-B — REAL PROVIDER REFUND ADAPTER
-- ============================================================

alter table public.tour_change_refunds
  add column if not exists provider_attempt_id text,
  add column if not exists provider_started_at timestamptz,
  add column if not exists provider_error text;

create unique index if not exists tour_change_refunds_provider_attempt_unique_idx
  on public.tour_change_refunds (company_id, provider_attempt_id)
  where provider_attempt_id is not null;

create or replace function public.finalize_provider_tour_change_refund(
  p_refund_id uuid,
  p_attempt_id text,
  p_actor_id uuid,
  p_provider_reference text,
  p_external_payment_reference text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.tour_change_refunds%rowtype;
  v_case public.tour_change_cases%rowtype;
  v_total_paid numeric(14,2);
begin
  select * into v_refund
  from public.tour_change_refunds
  where id = p_refund_id
  for update;

  if not found then
    raise exception 'Refund not found';
  end if;

  if v_refund.status = 'paid' then
    return jsonb_build_object(
      'refund_id', v_refund.id,
      'status', 'paid',
      'amount', v_refund.amount
    );
  end if;

  if v_refund.method <> 'provider' then
    raise exception 'Refund is not provider based';
  end if;

  if v_refund.status <> 'processing' then
    raise exception 'Refund is not processing';
  end if;

  if v_refund.provider_attempt_id is null
     or v_refund.provider_attempt_id <> p_attempt_id then
    raise exception 'Provider refund attempt mismatch';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = v_refund.company_id
      and cm.user_id = p_actor_id
      and cm.is_active = true
      and cm.role in ('super_admin','company_owner','operation_manager','accounting')
  ) then
    raise exception 'Refund actor is not finance authorized';
  end if;

  select * into v_case
  from public.tour_change_cases
  where id = v_refund.case_id
  for update;

  if not found then
    raise exception 'Change case not found';
  end if;

  update public.tour_change_refunds
  set status = 'paid',
      provider_reference = nullif(btrim(coalesce(p_provider_reference,'')),''),
      external_payment_reference = nullif(btrim(coalesce(p_external_payment_reference,'')),''),
      provider_error = null,
      completed_by = p_actor_id,
      completed_at = now(),
      metadata = coalesce(metadata,'{}'::jsonb)
        || coalesce(p_metadata,'{}'::jsonb)
        || jsonb_build_object(
          'provider_attempt_id', p_attempt_id,
          'provider_finalized_at', now()
        )
  where id = v_refund.id;

  select coalesce(sum(r.amount),0)
  into v_total_paid
  from public.tour_change_refunds r
  where r.company_id = v_refund.company_id
    and r.case_id = v_refund.case_id
    and r.status = 'paid';

  if v_total_paid > v_case.approved_refund_amount + 0.01 then
    raise exception 'Paid refunds exceed approved refund amount';
  end if;

  update public.tour_change_cases
  set result_snapshot = coalesce(result_snapshot,'{}'::jsonb)
    || jsonb_build_object(
      'refund_paid_total', v_total_paid,
      'refund_remaining', greatest(approved_refund_amount - v_total_paid,0),
      'refund_last_provider', v_refund.provider,
      'refund_last_completed_at', now()
    )
  where id = v_case.id;

  insert into public.tour_change_case_events(
    company_id, case_id, event_type, actor_id, note, payload
  ) values (
    v_refund.company_id,
    v_refund.case_id,
    'refund_completed',
    p_actor_id,
    'Ödeme sağlayıcısı üzerinden iade tamamlandı.',
    jsonb_build_object(
      'refund_id', v_refund.id,
      'amount', v_refund.amount,
      'provider', v_refund.provider,
      'provider_reference', p_provider_reference,
      'external_payment_reference', p_external_payment_reference,
      'provider_attempt_id', p_attempt_id,
      'total_paid', v_total_paid
    )
  );

  return jsonb_build_object(
    'refund_id', v_refund.id,
    'status', 'paid',
    'amount', v_refund.amount,
    'total_paid', v_total_paid,
    'remaining', greatest(v_case.approved_refund_amount - v_total_paid,0)
  );
end;
$$;

revoke all on function public.finalize_provider_tour_change_refund(uuid,text,uuid,text,text,jsonb) from public;
revoke all on function public.finalize_provider_tour_change_refund(uuid,text,uuid,text,text,jsonb) from authenticated;
grant execute on function public.finalize_provider_tour_change_refund(uuid,text,uuid,text,text,jsonb) to service_role;

create or replace function public.fail_provider_tour_change_refund(
  p_refund_id uuid,
  p_attempt_id text,
  p_actor_id uuid,
  p_error text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.tour_change_refunds%rowtype;
begin
  select * into v_refund
  from public.tour_change_refunds
  where id = p_refund_id
  for update;

  if not found then
    raise exception 'Refund not found';
  end if;

  if v_refund.status = 'paid' then
    return;
  end if;

  if v_refund.status <> 'processing'
     or v_refund.provider_attempt_id <> p_attempt_id then
    raise exception 'Provider refund attempt mismatch';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = v_refund.company_id
      and cm.user_id = p_actor_id
      and cm.is_active = true
      and cm.role in ('super_admin','company_owner','operation_manager','accounting')
  ) then
    raise exception 'Refund actor is not finance authorized';
  end if;

  update public.tour_change_refunds
  set status = 'failed',
      provider_error = nullif(btrim(coalesce(p_error,'')),''),
      metadata = coalesce(metadata,'{}'::jsonb)
        || coalesce(p_metadata,'{}'::jsonb)
        || jsonb_build_object(
          'provider_attempt_id', p_attempt_id,
          'provider_failed_at', now()
        )
  where id = v_refund.id;

  insert into public.tour_change_case_events(
    company_id, case_id, event_type, actor_id, note, payload
  ) values (
    v_refund.company_id,
    v_refund.case_id,
    'case_updated',
    p_actor_id,
    'Ödeme sağlayıcısı iade işlemi başarısız oldu.',
    jsonb_build_object(
      'event_category','provider_refund_failed',
      'refund_id',v_refund.id,
      'provider',v_refund.provider,
      'provider_attempt_id',p_attempt_id,
      'error',p_error
    )
  );
end;
$$;

revoke all on function public.fail_provider_tour_change_refund(uuid,text,uuid,text,jsonb) from public;
revoke all on function public.fail_provider_tour_change_refund(uuid,text,uuid,text,jsonb) from authenticated;
grant execute on function public.fail_provider_tour_change_refund(uuid,text,uuid,text,jsonb) to service_role;
