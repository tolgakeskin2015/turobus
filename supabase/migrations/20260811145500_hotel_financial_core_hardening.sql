-- TUROBUS Phase 8A
-- Hotel PMS financial integrity hardening


-- =========================================================
-- 1. FOLIO PAYMENT VOID
-- Finansal ödeme fiziksel olarak silinmez.
-- Nakit ödeme varsa açık kasa üzerinde ters hareket oluşturulur.
-- =========================================================

create or replace function public.cancel_hotel_folio_payment(
  p_company_id uuid,
  p_payment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.hotel_folio_payments%rowtype;
  v_movement public.hotel_cashier_movements%rowtype;
  v_shift_status text;
  v_reason text;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_payment
  from public.hotel_folio_payments
  where id = p_payment_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Ödeme hareketi bulunamadı.';
  end if;

  if v_payment.status = 'cancelled' then
    return;
  end if;

  if v_payment.status <> 'completed' then
    raise exception
      'Yalnız tamamlanmış ödeme hareketi iptal edilebilir.';
  end if;

  v_reason :=
    nullif(trim(coalesce(p_reason, '')), '');

  -- Nakit ödeme daha önce kasaya yansımışsa
  -- finansal izi silmeden ters hareket oluştur.
  if v_payment.payment_type = 'cash' then

    select movement.*
    into v_movement
    from public.hotel_cashier_movements movement
    where movement.company_id = v_payment.company_id
      and movement.hotel_id = v_payment.hotel_id
      and movement.reference_type = 'folio_payment'
      and movement.reference_id = v_payment.id
    order by movement.created_at desc
    limit 1
    for update;

    if found then

      select shift.status
      into v_shift_status
      from public.hotel_cashier_shifts shift
      where shift.id = v_movement.shift_id
        and shift.company_id = v_payment.company_id
        and shift.hotel_id = v_payment.hotel_id
      for update;

      if v_shift_status is distinct from 'open' then
        raise exception
          'Bu nakit ödeme kapatılmış bir kasa vardiyasına ait. '
          'Geçmiş kasa hareketi silinemez; bunun yerine iade işlemi oluşturun.';
      end if;

      if not exists (
        select 1
        from public.hotel_cashier_movements reverse_movement
        where reverse_movement.company_id = v_payment.company_id
          and reverse_movement.reference_type = 'folio_payment_void'
          and reverse_movement.reference_id = v_payment.id
      ) then

        insert into public.hotel_cashier_movements (
          company_id,
          hotel_id,
          shift_id,
          movement_type,
          amount,
          currency,
          description,
          reference_type,
          reference_id,
          created_by
        )
        values (
          v_payment.company_id,
          v_payment.hotel_id,
          v_movement.shift_id,
          case
            when v_payment.transaction_type = 'refund'
              then 'payment'
            else 'refund'
          end,
          v_movement.amount,
          v_movement.currency,
          case
            when v_payment.transaction_type = 'refund'
              then 'Folio nakit iadesi iptali'
            else 'Folio nakit tahsilatı iptali'
          end,
          'folio_payment_void',
          v_payment.id,
          auth.uid()
        );

        update public.hotel_cashier_shifts
        set
          expected_cash =
            expected_cash +
            case
              when v_payment.transaction_type = 'refund'
                then v_movement.amount
              else -v_movement.amount
            end,
          updated_at = now()
        where id = v_movement.shift_id;

      end if;
    end if;
  end if;

  update public.hotel_folio_payments
  set
    status = 'cancelled',
    notes =
      case
        when v_reason is null then
          coalesce(notes, '')
        when nullif(trim(coalesce(notes, '')), '') is null then
          'İptal nedeni: ' || v_reason
        else
          notes || E'\nİptal nedeni: ' || v_reason
      end,
    updated_at = now()
  where id = v_payment.id
    and company_id = p_company_id;

end;
$$;


revoke all
on function public.cancel_hotel_folio_payment(
  uuid,
  uuid,
  text
)
from public;

grant execute
on function public.cancel_hotel_folio_payment(
  uuid,
  uuid,
  text
)
to authenticated;

grant execute
on function public.cancel_hotel_folio_payment(
  uuid,
  uuid,
  text
)
to service_role;


-- =========================================================
-- 2. PAYMENT HARD DELETE PROTECTION
-- =========================================================

create or replace function
public.prevent_hotel_folio_payment_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception
    'Folio ödeme hareketleri silinemez. İptal/void işlemi kullanın.';
end;
$$;

drop trigger if exists
prevent_hotel_folio_payment_delete_trigger
on public.hotel_folio_payments;

create trigger
prevent_hotel_folio_payment_delete_trigger
before delete
on public.hotel_folio_payments
for each row
execute function
public.prevent_hotel_folio_payment_delete();


-- =========================================================
-- 3. INVOICE ITEM IMMUTABILITY
-- Issued/cancelled invoice kalemleri değiştirilemez.
-- =========================================================

create or replace function
public.guard_hotel_invoice_item_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_status text;
begin
  v_invoice_id :=
    case
      when tg_op = 'DELETE'
        then old.invoice_id
      else new.invoice_id
    end;

  select invoice.status
  into v_status
  from public.hotel_invoices invoice
  where invoice.id = v_invoice_id;

  if not found then
    raise exception 'Fatura bulunamadı.';
  end if;

  if v_status <> 'draft' then
    raise exception
      'Kesilmiş veya iptal edilmiş faturanın kalemleri değiştirilemez.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists
guard_hotel_invoice_item_mutation_trigger
on public.hotel_invoice_items;

create trigger
guard_hotel_invoice_item_mutation_trigger
before insert or update or delete
on public.hotel_invoice_items
for each row
execute function
public.guard_hotel_invoice_item_mutation();


-- =========================================================
-- 4. INVOICE HEADER IMMUTABILITY
-- Draft dışında mali alanlar değiştirilemez.
-- issued -> cancelled geçişine izin verilir.
-- =========================================================

create or replace function
public.guard_hotel_invoice_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception
        'Kesilmiş veya iptal edilmiş fatura silinemez.';
    end if;

    return old;
  end if;

  if old.status <> 'draft' then

    if
      (
        to_jsonb(new)
        - array[
            'status',
            'cancelled_at',
            'updated_at',
            'updated_by'
          ]
      )
      <>
      (
        to_jsonb(old)
        - array[
            'status',
            'cancelled_at',
            'updated_at',
            'updated_by'
          ]
      )
    then
      raise exception
        'Kesilmiş faturanın mali veya müşteri bilgileri değiştirilemez.';
    end if;

    if old.status = 'cancelled'
       and new.status <> 'cancelled' then
      raise exception
        'İptal edilmiş fatura yeniden aktif hale getirilemez.';
    end if;

    if old.status = 'issued'
       and new.status not in ('issued', 'cancelled') then
      raise exception
        'Kesilmiş faturanın durumu geriye alınamaz.';
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists
guard_hotel_invoice_mutation_trigger
on public.hotel_invoices;

create trigger
guard_hotel_invoice_mutation_trigger
before update or delete
on public.hotel_invoices
for each row
execute function
public.guard_hotel_invoice_mutation();


-- =========================================================
-- 5. MAINTENANCE / ROOM STATE SYNC
-- Oda çalışmaya başlanınca maintenance.
-- İş tamamlandığında başka aktif bakım yoksa geri açılır.
-- Occupied oda maintenance'a zorla çevrilmez.
-- =========================================================

create or replace function
public.update_hotel_maintenance_status(
  p_maintenance_id uuid,
  p_status text,
  p_notes text default null,
  p_actual_cost numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.hotel_maintenance_requests%rowtype;
  v_old_status text;
begin
  select *
  into v_request
  from public.hotel_maintenance_requests
  where id = p_maintenance_id
  for update;

  if not found then
    raise exception 'Bakım kaydı bulunamadı.';
  end if;

  if not public.is_company_member(v_request.company_id) then
    raise exception 'Bu kayıt için yetkiniz yok.';
  end if;

  if p_status not in (
    'open',
    'assigned',
    'in_progress',
    'waiting_parts',
    'completed',
    'cancelled'
  ) then
    raise exception 'Geçersiz bakım durumu.';
  end if;

  v_old_status := v_request.status;

  update public.hotel_maintenance_requests
  set
    status = p_status,

    actual_cost =
      coalesce(
        p_actual_cost,
        actual_cost
      ),

    started_at =
      case
        when p_status = 'in_progress'
          and started_at is null
        then now()
        else started_at
      end,

    completed_at =
      case
        when p_status = 'completed'
        then now()

        when p_status <> 'completed'
        then null

        else completed_at
      end,

    updated_by = auth.uid(),
    updated_at = now()

  where id = p_maintenance_id;


  if v_request.room_id is not null then

    if p_status in (
      'in_progress',
      'waiting_parts'
    ) then

      update public.hotel_rooms
      set
        room_status = 'maintenance',
        updated_at = now()
      where id = v_request.room_id
        and company_id = v_request.company_id
        and hotel_id = v_request.hotel_id
        and room_status <> 'occupied';

    elsif p_status in (
      'completed',
      'cancelled'
    ) then

      if not exists (
        select 1
        from public.hotel_maintenance_requests active_request
        where active_request.room_id = v_request.room_id
          and active_request.company_id =
            v_request.company_id
          and active_request.id <> p_maintenance_id
          and active_request.status in (
            'in_progress',
            'waiting_parts'
          )
      ) then

        update public.hotel_rooms
        set
          room_status =
            case
              when housekeeping_status in (
                'clean',
                'inspected'
              )
              then 'available'
              else 'dirty'
            end,
          updated_at = now()
        where id = v_request.room_id
          and company_id = v_request.company_id
          and hotel_id = v_request.hotel_id
          and room_status = 'maintenance';

      end if;
    end if;
  end if;


  insert into public.hotel_maintenance_logs (
    company_id,
    hotel_id,
    maintenance_id,
    action,
    old_status,
    new_status,
    notes,
    created_by
  )
  values (
    v_request.company_id,
    v_request.hotel_id,
    p_maintenance_id,
    'status_change',
    v_old_status,
    p_status,
    p_notes,
    auth.uid()
  );

end;
$$;


-- =========================================================
-- 6. NIGHT AUDIT REOPEN RPC
-- UI'nin güvenli şekilde yeniden açabilmesi için.
-- =========================================================

create or replace function
public.reopen_hotel_night_audit(
  p_company_id uuid,
  p_audit_id uuid,
  p_reason text default null
)
returns public.hotel_night_audits
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit public.hotel_night_audits%rowtype;
begin
  if not public.is_company_member(p_company_id) then
    raise exception
      'Bu işlem için şirket yetkiniz bulunmuyor.';
  end if;

  select *
  into v_audit
  from public.hotel_night_audits
  where id = p_audit_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception 'Gün sonu kaydı bulunamadı.';
  end if;

  if v_audit.status <> 'completed' then
    raise exception
      'Yalnız tamamlanmış gün sonu yeniden açılabilir.';
  end if;

  update public.hotel_night_audits
  set
    status = 'reopened',
    summary =
      coalesce(summary, '{}'::jsonb) ||
      jsonb_build_object(
        'reopened_at',
        now(),
        'reopened_by',
        auth.uid(),
        'reopen_reason',
        nullif(trim(coalesce(p_reason, '')), '')
      ),
    updated_at = now()
  where id = p_audit_id
    and company_id = p_company_id
  returning *
  into v_audit;

  return v_audit;
end;
$$;

revoke all
on function public.reopen_hotel_night_audit(
  uuid,
  uuid,
  text
)
from public;

grant execute
on function public.reopen_hotel_night_audit(
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
to service_role;

