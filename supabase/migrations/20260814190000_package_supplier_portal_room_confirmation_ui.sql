begin;

-- =========================================================
-- PHASE 6
-- TEDARIKCI PORTALI ODA BAZLI TEYIT
-- =========================================================


-- ---------------------------------------------------------
-- PUBLIC PORTAL V3
-- Mevcut V2 cevabını teyit alanlarıyla zenginleştirir.
-- ---------------------------------------------------------

create or replace function
public.get_package_supplier_portal_public_v3(
  p_token text,
  p_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base jsonb;
  v_operations jsonb := '[]'::jsonb;
  v_operation jsonb;
  v_item record;
  v_item_id uuid;
begin

  v_base :=
    public.get_package_supplier_portal_public_v2(
      p_token,
      p_date
    );

  if v_base is null then
    return null;
  end if;


  for v_operation in
    select value
    from jsonb_array_elements(
      coalesce(
        v_base -> 'operations',
        '[]'::jsonb
      )
    )
  loop

    v_item_id := null;

    begin
      v_item_id :=
        nullif(
          v_operation ->> 'item_id',
          ''
        )::uuid;
    exception
      when others then
        v_item_id := null;
    end;


    if
      v_item_id is not null
      and
      coalesce(
        v_operation ->> 'source',
        ''
      ) = 'package'
    then

      select
        i.supplier_confirmation_code,
        i.supplier_note,
        i.supplier_room_confirmation,
        i.supplier_confirmed_at
      into
        v_item
      from public.package_booking_items i
      where i.id = v_item_id
      limit 1;


      if found then

        v_operation :=
          v_operation
          ||
          jsonb_build_object(
            'supplier_confirmation_code',
              v_item.supplier_confirmation_code,

            'supplier_note',
              v_item.supplier_note,

            'supplier_room_confirmation',
              coalesce(
                v_item.supplier_room_confirmation,
                '[]'::jsonb
              ),

            'supplier_confirmed_at',
              v_item.supplier_confirmed_at
          );

      end if;

    end if;


    v_operations :=
      v_operations
      ||
      jsonb_build_array(
        v_operation
      );

  end loop;


  return
    jsonb_set(
      v_base,
      '{operations}',
      v_operations,
      true
    );

end;
$$;


revoke all
on function
public.get_package_supplier_portal_public_v3(
  text,
  date
)
from public;

grant execute
on function
public.get_package_supplier_portal_public_v3(
  text,
  date
)
to anon, authenticated;


-- ---------------------------------------------------------
-- PUBLIC ODA TEYIT RPC
-- Portal token + tarih + item doğrulaması yapar.
-- ---------------------------------------------------------

create or replace function
public.confirm_package_supplier_operation_public_v2(
  p_token text,
  p_date date,
  p_item_id uuid,
  p_confirmation_code text default null,
  p_note text default null,
  p_room_confirmation jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portal jsonb;
  v_operations jsonb;
  v_operation jsonb;

  v_allowed boolean := false;

  v_item
    public.package_booking_items%rowtype;

  v_room jsonb;
  v_room_index integer := 0;

  v_payable_id uuid;
begin

  if
    p_token is null
    or trim(p_token) = ''
  then
    raise exception
      'Portal tokenı geçersiz.';
  end if;


  v_portal :=
    public.get_package_supplier_portal_public_v2(
      p_token,
      p_date
    );


  if v_portal is null then
    raise exception
      'Tedarikçi portalı bulunamadı.';
  end if;


  v_operations :=
    coalesce(
      v_portal -> 'operations',
      '[]'::jsonb
    );


  for v_operation in
    select value
    from jsonb_array_elements(
      v_operations
    )
  loop

    if
      coalesce(
        v_operation ->> 'source',
        ''
      ) = 'package'
      and
      coalesce(
        v_operation ->> 'item_id',
        ''
      ) = p_item_id::text
    then

      v_allowed := true;
      exit;

    end if;

  end loop;


  if not v_allowed then
    raise exception
      'Bu operasyon bu tedarikçi portalına ait değil.';
  end if;


  if p_room_confirmation is null then
    p_room_confirmation :=
      '[]'::jsonb;
  end if;


  if
    jsonb_typeof(
      p_room_confirmation
    ) <> 'array'
  then
    raise exception
      'Oda teyit bilgisi geçersiz.';
  end if;


  -- Oda numarası/verisi boş olsa bile array güvenli olmalı.
  for v_room in
    select value
    from jsonb_array_elements(
      p_room_confirmation
    )
  loop

    v_room_index :=
      v_room_index + 1;

    if
      coalesce(
        nullif(
          trim(
            v_room ->> 'status'
          ),
          ''
        ),
        'confirmed'
      )
      not in (
        'confirmed',
        'pending',
        'rejected'
      )
    then
      raise exception
        '%. oda için teyit durumu geçersiz.',
        v_room_index;
    end if;

  end loop;


  select *
  into v_item
  from public.package_booking_items
  where id = p_item_id
  for update;


  if not found then
    raise exception
      'Hizmet bulunamadı.';
  end if;


  if v_item.supplier_status in (
    'completed',
    'cancelled'
  ) then
    raise exception
      'Tamamlanmış veya iptal edilmiş hizmet değiştirilemez.';
  end if;


  update public.package_booking_items
  set
    supplier_status =
      'confirmed',

    supplier_confirmed_at =
      coalesce(
        supplier_confirmed_at,
        now()
      ),

    supplier_confirmation_code =
      nullif(
        trim(
          coalesce(
            p_confirmation_code,
            ''
          )
        ),
        ''
      ),

    supplier_note =
      coalesce(
        nullif(
          trim(
            coalesce(
              p_note,
              ''
            )
          ),
          ''
        ),
        supplier_note
      ),

    supplier_room_confirmation =
      p_room_confirmation,

    metadata =
      coalesce(
        metadata,
        '{}'::jsonb
      )
      ||
      jsonb_build_object(
        'supplier_portal_confirmation',
          true,

        'supplier_portal_confirmation_at',
          now(),

        'supplier_room_confirmation',
          p_room_confirmation
      ),

    updated_at =
      now()

  where id =
    p_item_id;


  -- Hakediş yoksa güvenli şekilde oluştur.
  select id
  into v_payable_id
  from public.package_supplier_payables
  where booking_item_id =
    p_item_id
  order by created_at
  limit 1;


  if
    v_payable_id is null
    and v_item.supplier_id is not null
  then

    insert into public.package_supplier_payables (
      company_id,
      booking_id,
      booking_item_id,
      supplier_id,
      amount,
      currency,
      paid_amount,
      status,
      notes,
      metadata
    )
    values (
      v_item.company_id,
      v_item.booking_id,
      v_item.id,
      v_item.supplier_id,

      greatest(
        coalesce(
          v_item.total_cost,
          0
        ),
        0
      ),

      coalesce(
        v_item.currency,
        'TRY'
      ),

      0,
      'open',

      nullif(
        trim(
          coalesce(
            p_note,
            ''
          )
        ),
        ''
      ),

      jsonb_build_object(
        'source',
          'supplier_portal_confirmation',

        'confirmation_code',
          nullif(
            trim(
              coalesce(
                p_confirmation_code,
                ''
              )
            ),
            ''
          )
      )
    );

  end if;


  insert into public.package_booking_events (
    company_id,
    booking_id,
    booking_item_id,
    event_type,
    title,
    description,
    metadata,
    created_by
  )
  values (
    v_item.company_id,
    v_item.booking_id,
    v_item.id,

    'supplier_portal_confirmed',

    'Tedarikçi portalından teyit verildi',

    concat(
      v_item.name,
      ' hizmeti tedarikçi portalından teyit edildi.'
    ),

    jsonb_build_object(
      'confirmation_code',
        p_confirmation_code,

      'note',
        p_note,

      'room_confirmation',
        p_room_confirmation,

      'source',
        'supplier_portal'
    ),

    null
  );


  return
    jsonb_build_object(
      'success',
        true,

      'item_id',
        p_item_id,

      'status',
        'confirmed',

      'confirmation_code',
        p_confirmation_code,

      'room_confirmation',
        p_room_confirmation
    );

end;
$$;


revoke all
on function
public.confirm_package_supplier_operation_public_v2(
  text,
  date,
  uuid,
  text,
  text,
  jsonb
)
from public;

grant execute
on function
public.confirm_package_supplier_operation_public_v2(
  text,
  date,
  uuid,
  text,
  text,
  jsonb
)
to anon, authenticated;


commit;
