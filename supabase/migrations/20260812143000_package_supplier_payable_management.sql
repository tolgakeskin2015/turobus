begin;

-- =========================================================
-- TUROBUS PACKAGE OS
-- PHASE 11I-F
-- SUPPLIER PAYABLE MANAGEMENT
-- =========================================================

create or replace function
public.record_package_supplier_payment(
  p_payable_id uuid,
  p_amount numeric,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid :=
    auth.uid();

  v_payable
    public.package_supplier_payables%rowtype;

  v_new_paid numeric(14,2);
  v_new_status text;
begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
  end if;


  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Ödeme tutarı sıfırdan büyük olmalıdır.';
  end if;


  select *
  into v_payable

  from public.package_supplier_payables

  where id =
    p_payable_id

  for update;


  if not found then
    raise exception
      'Hakediş kaydı bulunamadı.';
  end if;


  if not exists (
    select 1

    from public.company_members cm

    where cm.company_id =
      v_payable.company_id

      and cm.user_id =
        v_uid

      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu şirket için yetkiniz bulunmuyor.';
  end if;


  if v_payable.status =
    'cancelled'
  then
    raise exception
      'İptal edilmiş hakedişe ödeme girilemez.';
  end if;


  if v_payable.status =
    'paid'
  then
    raise exception
      'Bu hakediş zaten tamamen ödenmiş.';
  end if;


  v_new_paid :=
    coalesce(
      v_payable.paid_amount,
      0
    )
    +
    p_amount;


  if v_new_paid >
    v_payable.amount
  then
    raise exception
      'Ödeme kalan hakediş tutarından yüksek olamaz. Kalan: %',
      greatest(
        v_payable.amount -
        coalesce(
          v_payable.paid_amount,
          0
        ),
        0
      );
  end if;


  v_new_status :=
    case

      when v_new_paid >=
        v_payable.amount
      then 'paid'

      when v_new_paid > 0
      then 'partial'

      else 'open'

    end;


  update public.package_supplier_payables

  set
    paid_amount =
      v_new_paid,

    status =
      v_new_status,

    notes =
      case
        when nullif(
          trim(
            coalesce(
              p_notes,
              ''
            )
          ),
          ''
        ) is null
        then notes

        when nullif(
          trim(
            coalesce(
              notes,
              ''
            )
          ),
          ''
        ) is null
        then trim(
          p_notes
        )

        else
          notes
          ||
          E'\n'
          ||
          trim(
            p_notes
          )
      end,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'last_payment_amount',
          p_amount,

        'last_payment_at',
          now(),

        'last_payment_by',
          v_uid
      ),

    updated_at =
      now()

  where id =
    v_payable.id;


  return jsonb_build_object(
    'success',
      true,

    'payable_id',
      v_payable.id,

    'amount',
      v_payable.amount,

    'paid_amount',
      v_new_paid,

    'remaining_amount',
      greatest(
        v_payable.amount -
        v_new_paid,
        0
      ),

    'status',
      v_new_status
  );

end;
$$;


revoke all
on function public.record_package_supplier_payment(
  uuid,
  numeric,
  text
)
from public;


grant execute
on function public.record_package_supplier_payment(
  uuid,
  numeric,
  text
)
to authenticated;


commit;
