begin;

alter table public.package_quotes
add column if not exists room_plan jsonb not null default '[]'::jsonb;


create or replace function public.calculate_package_builder_price_v3(
  p_company_id uuid,
  p_rate_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_room_plan jsonb,
  p_activities jsonb default '[]'::jsonb,
  p_expenses jsonb default '[]'::jsonb,
  p_profit_mode text default 'percent',
  p_profit_value numeric default 20,
  p_vat_rate numeric default 0,
  p_installment_rate numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_rate record;

  v_nights integer;
  v_people integer;

  v_room jsonb;
  v_room_adults integer;
  v_room_children integer;
  v_room_people integer;
  v_room_factor numeric;
  v_room_cost numeric;

  v_room_adults_total integer := 0;
  v_room_children_total integer := 0;

  v_hotel_cost numeric := 0;
  v_room_lines jsonb := '[]'::jsonb;

  v_activity jsonb;
  v_activity_row record;
  v_activity_quantity numeric;
  v_activity_line_cost numeric;
  v_activity_cost numeric := 0;
  v_activity_lines jsonb := '[]'::jsonb;

  v_expense jsonb;
  v_expense_name text;
  v_expense_unit text;
  v_expense_unit_cost numeric;
  v_expense_quantity numeric;
  v_expense_total numeric;
  v_expense_cost numeric := 0;
  v_expense_lines jsonb := '[]'::jsonb;

  v_total_cost numeric;
  v_profit_amount numeric;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_after_vat numeric;
  v_installment_amount numeric;
  v_final_total numeric;
  v_per_person numeric;

  v_rounding numeric := 1;
  v_settings record;
  v_can_view_cost boolean := false;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  ) then
    raise exception 'Şirket üyeliği bulunamadı.';
  end if;

  if p_check_out <= p_check_in then
    raise exception 'Çıkış tarihi giriş tarihinden sonra olmalıdır.';
  end if;

  v_nights := p_check_out - p_check_in;

  v_people :=
    greatest(
      coalesce(p_adults, 0) +
      coalesce(p_children, 0),
      1
    );

  select *
  into v_rate
  from public.package_hotel_rates r
  where r.id = p_rate_id
    and r.company_id = p_company_id
    and r.is_active = true
  limit 1;

  if not found then
    raise exception 'Otel fiyat dönemi bulunamadı.';
  end if;

  if v_rate.stop_sale then
    raise exception 'Bu otel fiyat dönemi Stop Sale durumunda.';
  end if;

  if v_rate.valid_from > p_check_in
     or v_rate.valid_to < (p_check_out - 1)
  then
    raise exception 'Konaklama tarihleri seçilen fiyat dönemine uygun değil.';
  end if;

  if v_rate.minimum_stay > v_nights then
    raise exception 'Minimum konaklama şartı sağlanmıyor.';
  end if;

  if jsonb_typeof(coalesce(p_room_plan, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_room_plan, '[]'::jsonb)) = 0
  then
    raise exception 'En az bir oda planı girilmelidir.';
  end if;

  if v_rate.allotment is not null
     and v_rate.allotment < jsonb_array_length(p_room_plan)
  then
    raise exception
      'Yeterli oda kontenjanı yok. Gerekli oda: %, mevcut kontenjan: %.',
      jsonb_array_length(p_room_plan),
      v_rate.allotment;
  end if;

  for v_room in
    select value
    from jsonb_array_elements(p_room_plan)
  loop

    v_room_adults :=
      greatest(
        coalesce(
          nullif(v_room ->> 'adults', '')::integer,
          0
        ),
        0
      );

    v_room_children :=
      greatest(
        coalesce(
          nullif(v_room ->> 'children', '')::integer,
          0
        ),
        0
      );

    v_room_people :=
      v_room_adults +
      v_room_children;

    if v_room_people <= 0 then
      raise exception 'Boş oda eklenemez.';
    end if;

    if v_room_adults > v_rate.occupancy_adults
       or v_room_children > v_rate.occupancy_children
    then
      raise exception
        'Odalardan biri seçilen oda tipinin kapasitesini aşıyor. Yetişkin: %, Çocuk: %.',
        v_room_adults,
        v_room_children;
    end if;

    v_room_adults_total :=
      v_room_adults_total +
      v_room_adults;

    v_room_children_total :=
      v_room_children_total +
      v_room_children;

    if v_rate.pricing_basis = 'per_person' then

      v_room_factor :=
        v_room_people;

    elsif v_rate.pricing_basis = 'occupancy_factor' then

      if v_room_people = 1 then
        v_room_factor :=
          greatest(
            coalesce(
              v_rate.occupancy_1_factor,
              1.50
            ),
            0
          );

      elsif v_room_people = 2 then
        v_room_factor :=
          greatest(
            coalesce(
              v_rate.occupancy_2_factor,
              2.00
            ),
            0
          );

      elsif v_room_people = 3 then
        v_room_factor :=
          greatest(
            coalesce(
              v_rate.occupancy_3_factor,
              2.70
            ),
            0
          );

      else
        v_room_factor :=
          greatest(
            coalesce(
              v_rate.occupancy_3_factor,
              2.70
            ),
            0
          )
          +
          (
            greatest(
              v_room_people - 3,
              0
            )
            *
            greatest(
              coalesce(
                v_rate.extra_person_factor,
                0.90
              ),
              0
            )
          );
      end if;

    else

      v_room_factor := 1;

    end if;

    v_room_cost :=
      greatest(
        coalesce(
          v_rate.nightly_cost,
          0
        ),
        0
      )
      *
      v_room_factor
      *
      v_nights;

    v_hotel_cost :=
      v_hotel_cost +
      v_room_cost;

    v_room_lines :=
      v_room_lines ||
      jsonb_build_array(
        jsonb_build_object(
          'room_order',
            jsonb_array_length(v_room_lines) + 1,
          'adults',
            v_room_adults,
          'children',
            v_room_children,
          'occupancy',
            v_room_people,
          'factor',
            v_room_factor,
          'nightly_base_cost',
            v_rate.nightly_cost,
          'nights',
            v_nights,
          'room_total_cost',
            round(v_room_cost, 2)
        )
      );

  end loop;

  if v_room_adults_total <> p_adults
     or v_room_children_total <> p_children
  then
    raise exception
      'Oda dağılımı paket kişi sayısıyla uyuşmuyor. Oda planı: % yetişkin + % çocuk. Paket: % yetişkin + % çocuk.',
      v_room_adults_total,
      v_room_children_total,
      p_adults,
      p_children;
  end if;


  for v_activity in
    select value
    from jsonb_array_elements(
      coalesce(
        p_activities,
        '[]'::jsonb
      )
    )
  loop

    select *
    into v_activity_row
    from public.package_activities a
    where a.id =
      nullif(
        v_activity ->> 'activityId',
        ''
      )::uuid
      and a.company_id = p_company_id
      and a.is_active = true
    limit 1;

    if found then

      v_activity_quantity :=
        greatest(
          coalesce(
            nullif(
              v_activity ->> 'quantity',
              ''
            )::numeric,
            1
          ),
          1
        );

      v_activity_line_cost :=
        greatest(
          coalesce(
            v_activity_row.default_cost,
            0
          ),
          0
        )
        *
        v_activity_quantity;

      v_activity_cost :=
        v_activity_cost +
        v_activity_line_cost;

      v_activity_lines :=
        v_activity_lines ||
        jsonb_build_array(
          jsonb_build_object(
            'id',
              v_activity_row.id,
            'name',
              v_activity_row.name,
            'pricing_unit',
              v_activity_row.pricing_unit,
            'unit_cost',
              v_activity_row.default_cost,
            'quantity',
              v_activity_quantity,
            'total_cost',
              v_activity_line_cost
          )
        );

    end if;
  end loop;


  for v_expense in
    select value
    from jsonb_array_elements(
      coalesce(
        p_expenses,
        '[]'::jsonb
      )
    )
  loop

    v_expense_name :=
      trim(
        coalesce(
          v_expense ->> 'name',
          ''
        )
      );

    v_expense_unit :=
      coalesce(
        nullif(
          v_expense ->> 'pricingUnit',
          ''
        ),
        'fixed'
      );

    if v_expense_unit not in (
      'fixed',
      'per_person',
      'per_night',
      'per_person_per_night'
    ) then
      v_expense_unit := 'fixed';
    end if;

    v_expense_unit_cost :=
      greatest(
        coalesce(
          nullif(
            v_expense ->> 'amount',
            ''
          )::numeric,
          0
        ),
        0
      );

    if v_expense_unit = 'per_person' then
      v_expense_quantity := v_people;

    elsif v_expense_unit = 'per_night' then
      v_expense_quantity := v_nights;

    elsif v_expense_unit = 'per_person_per_night' then
      v_expense_quantity :=
        v_people *
        v_nights;

    else
      v_expense_quantity := 1;
    end if;

    v_expense_total :=
      v_expense_unit_cost *
      v_expense_quantity;

    if v_expense_name <> '' then

      v_expense_cost :=
        v_expense_cost +
        v_expense_total;

      v_expense_lines :=
        v_expense_lines ||
        jsonb_build_array(
          jsonb_build_object(
            'name',
              v_expense_name,
            'pricing_unit',
              v_expense_unit,
            'unit_cost',
              v_expense_unit_cost,
            'quantity',
              v_expense_quantity,
            'total_cost',
              v_expense_total
          )
        );

    end if;

  end loop;


  v_total_cost :=
    v_hotel_cost +
    v_activity_cost +
    v_expense_cost;


  if p_profit_mode = 'fixed' then

    v_profit_amount :=
      greatest(
        coalesce(
          p_profit_value,
          0
        ),
        0
      );

  else

    v_profit_amount :=
      v_total_cost *
      greatest(
        coalesce(
          p_profit_value,
          0
        ),
        0
      )
      /
      100;

  end if;


  v_subtotal :=
    v_total_cost +
    v_profit_amount;


  v_vat_amount :=
    v_subtotal *
    greatest(
      coalesce(
        p_vat_rate,
        0
      ),
      0
    )
    /
    100;


  v_after_vat :=
    v_subtotal +
    v_vat_amount;


  v_installment_amount :=
    v_after_vat *
    greatest(
      coalesce(
        p_installment_rate,
        0
      ),
      0
    )
    /
    100;


  v_final_total :=
    v_after_vat +
    v_installment_amount;


  select *
  into v_settings
  from public.package_pricing_settings ps
  where ps.company_id = p_company_id
  limit 1;


  v_rounding :=
    greatest(
      coalesce(
        v_settings.rounding_step,
        1
      ),
      1
    );


  v_final_total :=
    ceil(
      v_final_total /
      v_rounding
    )
    *
    v_rounding;


  v_per_person :=
    case
      when v_people > 0
      then
        v_final_total /
        v_people
      else
        v_final_total
    end;


  v_can_view_cost :=
    public.package_user_can_view_costs(
      p_company_id
    );


  if not v_can_view_cost then

    return jsonb_build_object(
      'sale_price',
        round(v_final_total, 2),
      'per_person_sale_price',
        round(v_per_person, 2),
      'nights',
        v_nights,
      'people',
        v_people,
      'vat_rate',
        greatest(
          coalesce(
            p_vat_rate,
            0
          ),
          0
        ),
      'installment_rate',
        greatest(
          coalesce(
            p_installment_rate,
            0
          ),
          0
        ),
      'currency',
        'TRY',
      'can_view_costs',
        false
    );

  end if;


  return jsonb_build_object(
    'sale_price',
      round(v_final_total, 2),

    'per_person_sale_price',
      round(v_per_person, 2),

    'currency',
      'TRY',

    'nights',
      v_nights,

    'people',
      v_people,

    'can_view_costs',
      true,

    'hotel_pricing_basis',
      v_rate.pricing_basis,

    'hotel_base_nightly_cost',
      v_rate.nightly_cost,

    'hotel_factor',
      null,

    'hotel_room_count',
      jsonb_array_length(p_room_plan),

    'hotel_room_lines',
      v_room_lines,

    'hotel_cost',
      round(v_hotel_cost, 2),

    'activity_cost',
      round(v_activity_cost, 2),

    'activity_lines',
      v_activity_lines,

    'expense_cost',
      round(v_expense_cost, 2),

    'expense_lines',
      v_expense_lines,

    'total_cost',
      round(v_total_cost, 2),

    'profit_mode',
      p_profit_mode,

    'profit_value',
      greatest(
        coalesce(
          p_profit_value,
          0
        ),
        0
      ),

    'profit_amount',
      round(v_profit_amount, 2),

    'subtotal_before_tax',
      round(v_subtotal, 2),

    'vat_rate',
      greatest(
        coalesce(
          p_vat_rate,
          0
        ),
        0
      ),

    'vat_amount',
      round(v_vat_amount, 2),

    'installment_rate',
      greatest(
        coalesce(
          p_installment_rate,
          0
        ),
        0
      ),

    'installment_amount',
      round(v_installment_amount, 2)
  );
end;
$$;


revoke all
on function public.calculate_package_builder_price_v3(
  uuid,
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function public.calculate_package_builder_price_v3(
  uuid,
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;


create or replace function public.create_package_quote_v4(
  p_company_id uuid,
  p_guests jsonb,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_hotel_id uuid,
  p_rate_id uuid,
  p_room_plan jsonb,
  p_activities jsonb default '[]'::jsonb,
  p_expenses jsonb default '[]'::jsonb,
  p_profit_mode text default 'percent',
  p_profit_value numeric default 20,
  p_vat_rate numeric default 0,
  p_installment_rate numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();

  v_calc jsonb;

  v_hotel record;
  v_rate record;

  v_quote_id uuid;
  v_quote_code text;

  v_primary jsonb;
  v_primary_name text;
  v_primary_phone text;
  v_primary_email text;
  v_primary_address text;

  v_guest jsonb;
  v_guest_order integer := 1;
  v_guest_type text;
  v_child_age integer;

  v_hotel_cost numeric;
  v_activity_cost numeric;
  v_expense_cost numeric;
  v_total_cost numeric;
  v_profit_amount numeric;
  v_subtotal numeric;
  v_vat_amount numeric;
  v_installment_amount numeric;
  v_sale_price numeric;

  v_factor numeric;
  v_hotel_sale numeric;

  v_activity jsonb;
  v_activity_row record;
  v_activity_quantity numeric;
  v_activity_line_cost numeric;
  v_activity_sale numeric;

  v_expense jsonb;

  v_sort integer := 1;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = v_uid
      and coalesce(cm.is_active, true) = true
  ) then
    raise exception 'Şirket üyeliği bulunamadı.';
  end if;

  if jsonb_array_length(
    coalesce(
      p_guests,
      '[]'::jsonb
    )
  ) <> (p_adults + p_children)
  then
    raise exception
      'Misafir listesi paket kişi sayısıyla aynı olmalıdır.';
  end if;

  v_primary :=
    p_guests -> 0;

  v_primary_name :=
    trim(
      coalesce(
        v_primary ->> 'fullName',
        ''
      )
    );

  v_primary_phone :=
    nullif(
      trim(
        coalesce(
          v_primary ->> 'phone',
          ''
        )
      ),
      ''
    );

  v_primary_email :=
    nullif(
      lower(
        trim(
          coalesce(
            v_primary ->> 'email',
            ''
          )
        )
      ),
      ''
    );

  v_primary_address :=
    nullif(
      trim(
        coalesce(
          v_primary ->> 'address',
          ''
        )
      ),
      ''
    );

  if v_primary_name = '' then
    raise exception
      'Ana misafirin adı ve soyadı zorunludur.';
  end if;

  if v_primary_phone is null then
    raise exception
      'Ana misafirin telefon numarası zorunludur.';
  end if;


  select *
  into v_hotel
  from public.package_catalog_hotels h
  where h.id = p_hotel_id
    and h.company_id = p_company_id
    and h.is_active = true
  limit 1;

  if not found then
    raise exception 'Otel bulunamadı.';
  end if;


  select *
  into v_rate
  from public.package_hotel_rates r
  where r.id = p_rate_id
    and r.package_hotel_id = p_hotel_id
    and r.company_id = p_company_id
    and r.is_active = true
  limit 1;

  if not found then
    raise exception 'Oda fiyatı bulunamadı.';
  end if;


  v_calc :=
    public.calculate_package_builder_price_v3(
      p_company_id,
      p_rate_id,
      p_check_in,
      p_check_out,
      p_adults,
      p_children,
      p_room_plan,
      p_activities,
      p_expenses,
      p_profit_mode,
      p_profit_value,
      p_vat_rate,
      p_installment_rate
    );


  v_hotel_cost :=
    coalesce(
      (v_calc ->> 'hotel_cost')::numeric,
      0
    );

  v_activity_cost :=
    coalesce(
      (v_calc ->> 'activity_cost')::numeric,
      0
    );

  v_expense_cost :=
    coalesce(
      (v_calc ->> 'expense_cost')::numeric,
      0
    );

  v_total_cost :=
    coalesce(
      (v_calc ->> 'total_cost')::numeric,
      0
    );

  v_profit_amount :=
    coalesce(
      (v_calc ->> 'profit_amount')::numeric,
      0
    );

  v_subtotal :=
    coalesce(
      (v_calc ->> 'subtotal_before_tax')::numeric,
      0
    );

  v_vat_amount :=
    coalesce(
      (v_calc ->> 'vat_amount')::numeric,
      0
    );

  v_installment_amount :=
    coalesce(
      (v_calc ->> 'installment_amount')::numeric,
      0
    );

  v_sale_price :=
    coalesce(
      (v_calc ->> 'sale_price')::numeric,
      0
    );


  if v_total_cost <= 0 then
    raise exception
      'Paket maliyeti sıfır olamaz.';
  end if;


  v_factor :=
    case
      when v_total_cost > 0
      then
        v_subtotal /
        v_total_cost
      else
        1
    end;


  v_hotel_sale :=
    v_hotel_cost *
    v_factor;


  v_quote_code :=
    'PKT-' ||
    right(
      (
        extract(
          epoch from clock_timestamp()
        )
        *
        1000
      )::bigint::text,
      8
    );


  insert into public.package_quotes (
    company_id,
    quote_code,
    customer_name,
    customer_phone,
    primary_guest_email,
    primary_guest_address,
    sales_user_id,
    package_type,
    destination,
    check_in,
    check_out,
    adults,
    children,
    nights,
    currency,
    total_cost,
    hotel_cost,
    activity_cost,
    expense_cost,
    gross_profit,
    profit_mode,
    profit_value,
    profit_amount,
    subtotal_before_tax,
    vat_rate,
    vat_amount,
    installment_rate,
    installment_amount,
    sale_price,
    margin_percent,
    pricing_mode,
    pricing_value,
    pricing_breakdown,
    room_plan,
    status
  )
  values (
    p_company_id,
    v_quote_code,
    v_primary_name,
    v_primary_phone,
    v_primary_email,
    v_primary_address,
    v_uid,
    'holiday',
    v_hotel.city,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    p_check_out - p_check_in,
    'TRY',
    v_total_cost,
    v_hotel_cost,
    v_activity_cost,
    v_expense_cost,
    v_profit_amount,
    p_profit_mode,
    p_profit_value,
    v_profit_amount,
    v_subtotal,
    p_vat_rate,
    v_vat_amount,
    p_installment_rate,
    v_installment_amount,
    v_sale_price,
    case
      when v_subtotal > 0
      then
        (
          v_profit_amount /
          v_subtotal
        )
        *
        100
      else
        0
    end,
    p_profit_mode,
    p_profit_value,
    v_calc,
    p_room_plan,
    'draft'
  )
  returning id
  into v_quote_id;


  insert into public.package_quote_items (
    company_id,
    quote_id,
    item_type,
    reference_id,
    supplier_id,
    name,
    service_date,
    quantity,
    unit_cost,
    total_cost,
    unit_sale_price,
    total_sale_price,
    currency,
    cost_snapshot,
    sort_order
  )
  values (
    p_company_id,
    v_quote_id,
    'hotel',
    v_hotel.id,
    v_hotel.supplier_id,
    v_hotel.name ||
      ' · ' ||
      v_rate.room_type_name ||
      ' · ' ||
      v_rate.board_type,
    p_check_in,
    p_check_out - p_check_in,
    v_rate.nightly_cost,
    v_hotel_cost,
    case
      when (p_check_out - p_check_in) > 0
      then
        v_hotel_sale /
        (p_check_out - p_check_in)
      else
        v_hotel_sale
    end,
    v_hotel_sale,
    'TRY',
    jsonb_build_object(
      'hotel',
        v_hotel.name,
      'room_type',
        v_rate.room_type_name,
      'board',
        v_rate.board_type,
      'pricing_basis',
        v_rate.pricing_basis,
      'room_plan',
        p_room_plan,
      'room_lines',
        v_calc -> 'hotel_room_lines',
      'room_count',
        jsonb_array_length(p_room_plan),
      'nights',
        p_check_out - p_check_in
    ),
    0
  );


  for v_activity in
    select value
    from jsonb_array_elements(
      coalesce(
        p_activities,
        '[]'::jsonb
      )
    )
  loop

    select *
    into v_activity_row
    from public.package_activities a
    where a.id =
      nullif(
        v_activity ->> 'activityId',
        ''
      )::uuid
      and a.company_id = p_company_id
      and a.is_active = true
    limit 1;

    if found then

      v_activity_quantity :=
        greatest(
          coalesce(
            nullif(
              v_activity ->> 'quantity',
              ''
            )::numeric,
            1
          ),
          1
        );

      v_activity_line_cost :=
        greatest(
          coalesce(
            v_activity_row.default_cost,
            0
          ),
          0
        )
        *
        v_activity_quantity;

      v_activity_sale :=
        v_activity_line_cost *
        v_factor;

      insert into public.package_quote_items (
        company_id,
        quote_id,
        item_type,
        reference_id,
        supplier_id,
        name,
        service_date,
        quantity,
        unit_cost,
        total_cost,
        unit_sale_price,
        total_sale_price,
        currency,
        cost_snapshot,
        sort_order
      )
      values (
        p_company_id,
        v_quote_id,
        'activity',
        v_activity_row.id,
        v_activity_row.supplier_id,
        v_activity_row.name,
        p_check_in,
        v_activity_quantity,
        v_activity_row.default_cost,
        v_activity_line_cost,
        case
          when v_activity_quantity > 0
          then
            v_activity_sale /
            v_activity_quantity
          else
            v_activity_sale
        end,
        v_activity_sale,
        'TRY',
        jsonb_build_object(
          'pricing_unit',
            v_activity_row.pricing_unit,
          'quantity',
            v_activity_quantity
        ),
        v_sort
      );

      v_sort :=
        v_sort +
        1;

    end if;

  end loop;


  for v_expense in
    select value
    from jsonb_array_elements(
      coalesce(
        v_calc -> 'expense_lines',
        '[]'::jsonb
      )
    )
  loop

    insert into public.package_quote_cost_lines (
      company_id,
      quote_id,
      name,
      pricing_unit,
      unit_cost,
      quantity,
      total_cost,
      metadata
    )
    values (
      p_company_id,
      v_quote_id,
      coalesce(
        v_expense ->> 'name',
        'Diğer Gider'
      ),
      coalesce(
        v_expense ->> 'pricing_unit',
        'fixed'
      ),
      coalesce(
        (
          v_expense ->>
          'unit_cost'
        )::numeric,
        0
      ),
      coalesce(
        (
          v_expense ->>
          'quantity'
        )::numeric,
        1
      ),
      coalesce(
        (
          v_expense ->>
          'total_cost'
        )::numeric,
        0
      ),
      '{}'::jsonb
    );

  end loop;


  for v_guest in
    select value
    from jsonb_array_elements(
      p_guests
    )
  loop

    v_guest_type :=
      coalesce(
        nullif(
          v_guest ->> 'guestType',
          ''
        ),
        'adult'
      );

    v_child_age :=
      case
        when v_guest_type = 'child'
        then
          greatest(
            0,
            least(
              17,
              coalesce(
                nullif(
                  v_guest ->> 'childAge',
                  ''
                )::integer,
                0
              )
            )
          )
        else
          null
      end;

    insert into public.package_quote_guests (
      company_id,
      quote_id,
      guest_order,
      guest_type,
      full_name,
      phone,
      email,
      address,
      child_age,
      is_primary
    )
    values (
      p_company_id,
      v_quote_id,
      v_guest_order,
      v_guest_type,
      trim(
        coalesce(
          v_guest ->> 'fullName',
          ''
        )
      ),
      nullif(
        trim(
          coalesce(
            v_guest ->> 'phone',
            ''
          )
        ),
        ''
      ),
      nullif(
        lower(
          trim(
            coalesce(
              v_guest ->> 'email',
              ''
            )
          )
        ),
        ''
      ),
      nullif(
        trim(
          coalesce(
            v_guest ->> 'address',
            ''
          )
        ),
        ''
      ),
      v_child_age,
      v_guest_order = 1
    );

    v_guest_order :=
      v_guest_order +
      1;

  end loop;


  return jsonb_build_object(
    'quote_id',
      v_quote_id,

    'quote_code',
      v_quote_code,

    'sale_price',
      v_sale_price,

    'per_person_sale_price',
      v_calc -> 'per_person_sale_price',

    'room_plan',
      p_room_plan,

    'pricing_breakdown',
      v_calc
  );

end;
$$;


revoke all
on function public.create_package_quote_v4(
  uuid,
  jsonb,
  date,
  date,
  integer,
  integer,
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
from public;


grant execute
on function public.create_package_quote_v4(
  uuid,
  jsonb,
  date,
  date,
  integer,
  integer,
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;

commit;
