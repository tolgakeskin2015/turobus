begin;

alter table public.package_hotel_rates
add column if not exists pricing_basis text not null default 'per_room';

alter table public.package_hotel_rates
add column if not exists occupancy_1_factor numeric not null default 1.50;

alter table public.package_hotel_rates
add column if not exists occupancy_2_factor numeric not null default 2.00;

alter table public.package_hotel_rates
add column if not exists occupancy_3_factor numeric not null default 2.70;

alter table public.package_hotel_rates
add column if not exists extra_person_factor numeric not null default 0.90;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'package_hotel_rates_pricing_basis_check'
  ) then
    alter table public.package_hotel_rates
    add constraint package_hotel_rates_pricing_basis_check
    check (
      pricing_basis in (
        'per_room',
        'per_person',
        'occupancy_factor'
      )
    );
  end if;
end;
$$;

alter table public.package_quotes
add column if not exists hotel_cost numeric not null default 0;

alter table public.package_quotes
add column if not exists activity_cost numeric not null default 0;

alter table public.package_quotes
add column if not exists expense_cost numeric not null default 0;

alter table public.package_quotes
add column if not exists profit_mode text not null default 'percent';

alter table public.package_quotes
add column if not exists profit_value numeric not null default 0;

alter table public.package_quotes
add column if not exists profit_amount numeric not null default 0;

alter table public.package_quotes
add column if not exists subtotal_before_tax numeric not null default 0;

alter table public.package_quotes
add column if not exists vat_rate numeric not null default 0;

alter table public.package_quotes
add column if not exists vat_amount numeric not null default 0;

alter table public.package_quotes
add column if not exists installment_rate numeric not null default 0;

alter table public.package_quotes
add column if not exists installment_amount numeric not null default 0;

alter table public.package_quotes
add column if not exists pricing_breakdown jsonb not null default '{}'::jsonb;

create table if not exists public.package_quote_cost_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  quote_id uuid not null,
  name text not null,
  pricing_unit text not null default 'fixed',
  unit_cost numeric not null default 0,
  quantity numeric not null default 1,
  total_cost numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint package_quote_cost_lines_unit_check
  check (
    pricing_unit in (
      'fixed',
      'per_person',
      'per_night',
      'per_person_per_night'
    )
  )
);

create index if not exists idx_package_quote_cost_lines_quote
on public.package_quote_cost_lines (
  company_id,
  quote_id
);

alter table public.package_quote_cost_lines
enable row level security;

drop policy if exists package_quote_cost_lines_member
on public.package_quote_cost_lines;

create policy package_quote_cost_lines_member
on public.package_quote_cost_lines
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_quote_cost_lines.company_id
      and cm.user_id = auth.uid()
      and coalesce(cm.is_active, true) = true
  )
);

drop policy if exists package_quote_cost_lines_admin_write
on public.package_quote_cost_lines;

create policy package_quote_cost_lines_admin_write
on public.package_quote_cost_lines
for all
to authenticated
using (
  public.package_user_can_view_costs(
    company_id
  )
)
with check (
  public.package_user_can_view_costs(
    company_id
  )
);

create or replace function
public.package_pricing_v2_internal(
  p_company_id uuid,
  p_rate_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
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
  v_rate record;
  v_settings record;
  v_nights integer;
  v_people integer;
  v_occupancy integer;

  v_hotel_factor numeric := 1;
  v_hotel_nightly_cost numeric := 0;
  v_hotel_cost numeric := 0;

  v_activity jsonb;
  v_activity_row record;
  v_activity_quantity numeric := 0;
  v_activity_line_cost numeric := 0;
  v_activity_cost numeric := 0;
  v_activity_lines jsonb := '[]'::jsonb;

  v_expense jsonb;
  v_expense_name text;
  v_expense_unit text;
  v_expense_unit_cost numeric := 0;
  v_expense_quantity numeric := 0;
  v_expense_total numeric := 0;
  v_expense_cost numeric := 0;
  v_expense_lines jsonb := '[]'::jsonb;

  v_total_cost numeric := 0;
  v_profit_amount numeric := 0;
  v_subtotal numeric := 0;
  v_vat_amount numeric := 0;
  v_after_vat numeric := 0;
  v_installment_amount numeric := 0;
  v_final_total numeric := 0;
  v_per_person numeric := 0;
  v_rounding numeric := 1;
begin

  if p_company_id is null then
    raise exception 'Şirket bilgisi bulunamadı.';
  end if;

  if p_check_in is null
     or p_check_out is null
     or p_check_out <= p_check_in
  then
    raise exception 'Geçerli giriş ve çıkış tarihi seçin.';
  end if;

  if coalesce(p_adults, 0) < 1 then
    raise exception 'En az 1 yetişkin olmalıdır.';
  end if;

  if coalesce(p_children, 0) < 0 then
    raise exception 'Çocuk sayısı geçersiz.';
  end if;

  if p_profit_mode not in (
    'percent',
    'fixed'
  ) then
    raise exception 'Geçersiz kâr modeli.';
  end if;

  v_nights :=
    p_check_out -
    p_check_in;

  v_people :=
    greatest(
      coalesce(p_adults, 0) +
      coalesce(p_children, 0),
      1
    );

  v_occupancy :=
    greatest(
      coalesce(p_adults, 0),
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
     or v_rate.valid_to < p_check_out
  then
    raise exception 'Konaklama tarihleri seçilen fiyat dönemine uygun değil.';
  end if;

  if v_rate.minimum_stay > v_nights then
    raise exception 'Minimum konaklama şartı sağlanmıyor.';
  end if;

  if v_rate.occupancy_adults < p_adults
     or v_rate.occupancy_children < p_children
  then
    raise exception 'Oda kapasitesi kişi sayısına uygun değil.';
  end if;

  if v_rate.allotment is not null
     and v_rate.allotment <= 0
  then
    raise exception 'Bu oda için kontenjan bulunmuyor.';
  end if;

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

  v_hotel_nightly_cost :=
    greatest(
      coalesce(
        v_rate.nightly_cost,
        0
      ),
      0
    );

  if v_rate.pricing_basis =
     'per_person'
  then

    v_hotel_factor :=
      v_people;

  elsif v_rate.pricing_basis =
        'occupancy_factor'
  then

    if v_occupancy = 1 then
      v_hotel_factor :=
        greatest(
          coalesce(
            v_rate.occupancy_1_factor,
            1.50
          ),
          0
        );

    elsif v_occupancy = 2 then
      v_hotel_factor :=
        greatest(
          coalesce(
            v_rate.occupancy_2_factor,
            2.00
          ),
          0
        );

    elsif v_occupancy = 3 then
      v_hotel_factor :=
        greatest(
          coalesce(
            v_rate.occupancy_3_factor,
            2.70
          ),
          0
        );

    else
      v_hotel_factor :=
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
            v_occupancy - 3,
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
    v_hotel_factor := 1;
  end if;

  v_hotel_cost :=
    v_hotel_nightly_cost
    *
    v_hotel_factor
    *
    v_nights;

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
      and a.company_id =
        p_company_id
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
        v_activity_cost
        +
        v_activity_line_cost;

      v_activity_lines :=
        v_activity_lines
        ||
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

    if v_expense_unit =
       'per_person'
    then
      v_expense_quantity :=
        v_people;

    elsif v_expense_unit =
          'per_night'
    then
      v_expense_quantity :=
        v_nights;

    elsif v_expense_unit =
          'per_person_per_night'
    then
      v_expense_quantity :=
        v_people *
        v_nights;

    else
      v_expense_quantity := 1;
    end if;

    v_expense_total :=
      v_expense_unit_cost
      *
      v_expense_quantity;

    if v_expense_name <> ''
       and v_expense_total >= 0
    then

      v_expense_cost :=
        v_expense_cost
        +
        v_expense_total;

      v_expense_lines :=
        v_expense_lines
        ||
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
    v_hotel_cost
    +
    v_activity_cost
    +
    v_expense_cost;

  if p_profit_mode =
     'fixed'
  then
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
      v_total_cost
      *
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
    v_total_cost
    +
    v_profit_amount;

  v_vat_amount :=
    v_subtotal
    *
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
    v_subtotal
    +
    v_vat_amount;

  v_installment_amount :=
    v_after_vat
    *
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
    v_after_vat
    +
    v_installment_amount;

  v_final_total :=
    ceil(
      v_final_total
      /
      v_rounding
    )
    *
    v_rounding;

  v_per_person :=
    case
      when v_people > 0
      then
        v_final_total
        /
        v_people
      else
        v_final_total
    end;

  return jsonb_build_object(
    'nights',
      v_nights,

    'people',
      v_people,

    'adults',
      p_adults,

    'children',
      p_children,

    'hotel_pricing_basis',
      v_rate.pricing_basis,

    'hotel_base_nightly_cost',
      v_hotel_nightly_cost,

    'hotel_factor',
      v_hotel_factor,

    'hotel_cost',
      round(
        v_hotel_cost,
        2
      ),

    'activity_cost',
      round(
        v_activity_cost,
        2
      ),

    'activity_lines',
      v_activity_lines,

    'expense_cost',
      round(
        v_expense_cost,
        2
      ),

    'expense_lines',
      v_expense_lines,

    'total_cost',
      round(
        v_total_cost,
        2
      ),

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
      round(
        v_profit_amount,
        2
      ),

    'subtotal_before_tax',
      round(
        v_subtotal,
        2
      ),

    'vat_rate',
      greatest(
        coalesce(
          p_vat_rate,
          0
        ),
        0
      ),

    'vat_amount',
      round(
        v_vat_amount,
        2
      ),

    'installment_rate',
      greatest(
        coalesce(
          p_installment_rate,
          0
        ),
        0
      ),

    'installment_amount',
      round(
        v_installment_amount,
        2
      ),

    'sale_price',
      round(
        v_final_total,
        2
      ),

    'per_person_sale_price',
      round(
        v_per_person,
        2
      ),

    'currency',
      'TRY'
  );
end;
$$;

revoke all
on function public.package_pricing_v2_internal(
  uuid,
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
from public;

create or replace function
public.get_package_builder_catalog_v2(
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_can_view_cost boolean := false;
  v_result jsonb;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      p_company_id
      and cm.user_id =
        v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Bu şirket için aktif üyeliğiniz bulunmuyor.';
  end if;

  v_can_view_cost :=
    public.package_user_can_view_costs(
      p_company_id
    );

  select jsonb_build_object(

    'company_id',
      p_company_id,

    'can_view_costs',
      v_can_view_cost,

    'hotels',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                h.id,
              'name',
                h.name,
              'city',
                h.city,
              'district',
                h.district,
              'star_rating',
                h.star_rating,
              'cover_image_url',
                h.cover_image_url
            )
            order by h.name
          )
          from public.package_catalog_hotels h
          where h.company_id =
            p_company_id
            and h.is_active = true
        ),
        '[]'::jsonb
      ),

    'rates',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                r.id,
              'package_hotel_id',
                r.package_hotel_id,
              'room_type_name',
                r.room_type_name,
              'board_type',
                r.board_type,
              'valid_from',
                r.valid_from,
              'valid_to',
                r.valid_to,
              'occupancy_adults',
                r.occupancy_adults,
              'occupancy_children',
                r.occupancy_children,
              'allotment',
                r.allotment,
              'minimum_stay',
                r.minimum_stay,
              'stop_sale',
                r.stop_sale,
              'pricing_basis',
                r.pricing_basis,
              'occupancy_1_factor',
                r.occupancy_1_factor,
              'occupancy_2_factor',
                r.occupancy_2_factor,
              'occupancy_3_factor',
                r.occupancy_3_factor,
              'extra_person_factor',
                r.extra_person_factor,
              'nightly_cost',
                case
                  when v_can_view_cost
                  then r.nightly_cost
                  else null
                end
            )
            order by
              r.valid_from desc,
              r.room_type_name
          )
          from public.package_hotel_rates r
          where r.company_id =
            p_company_id
            and r.is_active = true
        ),
        '[]'::jsonb
      ),

    'activities',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                a.id,
              'name',
                a.name,
              'pricing_unit',
                a.pricing_unit,
              'requires_slot',
                a.requires_slot,
              'default_cost',
                case
                  when v_can_view_cost
                  then a.default_cost
                  else null
                end
            )
            order by a.name
          )
          from public.package_activities a
          where a.company_id =
            p_company_id
            and a.is_active = true
        ),
        '[]'::jsonb
      )

  )
  into v_result;

  return v_result;
end;
$$;

revoke all
on function
public.get_package_builder_catalog_v2(uuid)
from public;

grant execute
on function
public.get_package_builder_catalog_v2(uuid)
to authenticated;

create or replace function
public.calculate_package_builder_price_v2(
  p_company_id uuid,
  p_rate_id uuid,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
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
  v_can_view_cost boolean := false;
  v_result jsonb;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      p_company_id
      and cm.user_id =
        v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Şirket üyeliği bulunamadı.';
  end if;

  v_result :=
    public.package_pricing_v2_internal(
      p_company_id,
      p_rate_id,
      p_check_in,
      p_check_out,
      p_adults,
      p_children,
      p_activities,
      p_expenses,
      p_profit_mode,
      p_profit_value,
      p_vat_rate,
      p_installment_rate
    );

  v_can_view_cost :=
    public.package_user_can_view_costs(
      p_company_id
    );

  if v_can_view_cost then
    return
      v_result
      ||
      jsonb_build_object(
        'can_view_costs',
        true
      );
  end if;

  return
    jsonb_build_object(
      'sale_price',
        v_result -> 'sale_price',

      'per_person_sale_price',
        v_result -> 'per_person_sale_price',

      'nights',
        v_result -> 'nights',

      'people',
        v_result -> 'people',

      'vat_rate',
        v_result -> 'vat_rate',

      'installment_rate',
        v_result -> 'installment_rate',

      'currency',
        'TRY',

      'can_view_costs',
        false
    );
end;
$$;

revoke all
on function
public.calculate_package_builder_price_v2(
  uuid,
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function
public.calculate_package_builder_price_v2(
  uuid,
  uuid,
  date,
  date,
  integer,
  integer,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;

create or replace function
public.create_package_quote_v2(
  p_company_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_check_in date,
  p_check_out date,
  p_adults integer,
  p_children integer,
  p_hotel_id uuid,
  p_rate_id uuid,
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
  v_hotel record;
  v_rate record;
  v_calc jsonb;

  v_quote_id uuid;
  v_quote_code text;

  v_hotel_cost numeric := 0;
  v_activity_cost numeric := 0;
  v_expense_cost numeric := 0;
  v_total_cost numeric := 0;
  v_profit_amount numeric := 0;
  v_subtotal numeric := 0;
  v_vat_amount numeric := 0;
  v_installment_amount numeric := 0;
  v_sale_price numeric := 0;

  v_factor numeric := 1;
  v_hotel_sale numeric := 0;

  v_activity jsonb;
  v_activity_row record;
  v_activity_quantity numeric;
  v_activity_cost_line numeric;
  v_activity_sale numeric;
  v_sort integer := 1;

  v_expense jsonb;
begin

  if v_uid is null then
    raise exception 'Oturum bulunamadı.';
  end if;

  if coalesce(
    trim(
      p_customer_name
    ),
    ''
  ) = '' then
    raise exception 'Müşteri adı zorunludur.';
  end if;

  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      p_company_id
      and cm.user_id =
        v_uid
      and coalesce(
        cm.is_active,
        true
      ) = true
  ) then
    raise exception
      'Şirket üyeliği bulunamadı.';
  end if;

  select *
  into v_hotel
  from public.package_catalog_hotels h
  where h.id =
    p_hotel_id
    and h.company_id =
      p_company_id
    and h.is_active = true
  limit 1;

  if not found then
    raise exception 'Otel bulunamadı.';
  end if;

  select *
  into v_rate
  from public.package_hotel_rates r
  where r.id =
    p_rate_id
    and r.package_hotel_id =
      p_hotel_id
    and r.company_id =
      p_company_id
    and r.is_active = true
  limit 1;

  if not found then
    raise exception 'Oda fiyatı bulunamadı.';
  end if;

  v_calc :=
    public.package_pricing_v2_internal(
      p_company_id,
      p_rate_id,
      p_check_in,
      p_check_out,
      p_adults,
      p_children,
      p_activities,
      p_expenses,
      p_profit_mode,
      p_profit_value,
      p_vat_rate,
      p_installment_rate
    );

  v_hotel_cost :=
    coalesce(
      (
        v_calc ->>
        'hotel_cost'
      )::numeric,
      0
    );

  v_activity_cost :=
    coalesce(
      (
        v_calc ->>
        'activity_cost'
      )::numeric,
      0
    );

  v_expense_cost :=
    coalesce(
      (
        v_calc ->>
        'expense_cost'
      )::numeric,
      0
    );

  v_total_cost :=
    coalesce(
      (
        v_calc ->>
        'total_cost'
      )::numeric,
      0
    );

  v_profit_amount :=
    coalesce(
      (
        v_calc ->>
        'profit_amount'
      )::numeric,
      0
    );

  v_subtotal :=
    coalesce(
      (
        v_calc ->>
        'subtotal_before_tax'
      )::numeric,
      0
    );

  v_vat_amount :=
    coalesce(
      (
        v_calc ->>
        'vat_amount'
      )::numeric,
      0
    );

  v_installment_amount :=
    coalesce(
      (
        v_calc ->>
        'installment_amount'
      )::numeric,
      0
    );

  v_sale_price :=
    coalesce(
      (
        v_calc ->>
        'sale_price'
      )::numeric,
      0
    );

  if v_total_cost <= 0 then
    raise exception
      'Paket maliyeti sıfır olamaz.';
  end if;

  if v_sale_price <= 0 then
    raise exception
      'Paket satış tutarı hesaplanamadı.';
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
          epoch
          from clock_timestamp()
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
    status
  )
  values (
    p_company_id,
    v_quote_code,
    trim(
      p_customer_name
    ),
    nullif(
      trim(
        coalesce(
          p_customer_phone,
          ''
        )
      ),
      ''
    ),
    v_uid,
    'holiday',
    v_hotel.city,
    p_check_in,
    p_check_out,
    p_adults,
    p_children,
    p_check_out -
      p_check_in,
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
    p_check_out -
      p_check_in,
    v_rate.nightly_cost,
    v_hotel_cost,
    case
      when (
        p_check_out -
        p_check_in
      ) > 0
      then
        v_hotel_sale /
        (
          p_check_out -
          p_check_in
        )
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
      'occupancy_1_factor',
        v_rate.occupancy_1_factor,
      'occupancy_2_factor',
        v_rate.occupancy_2_factor,
      'occupancy_3_factor',
        v_rate.occupancy_3_factor,
      'extra_person_factor',
        v_rate.extra_person_factor,
      'calculated_factor',
        v_calc -> 'hotel_factor',
      'nights',
        p_check_out -
        p_check_in
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
      and a.company_id =
        p_company_id
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

      v_activity_cost_line :=
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
        v_activity_cost_line *
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
        v_activity_cost_line,
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
        v_sort + 1;

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

  return jsonb_build_object(
    'quote_id',
      v_quote_id,

    'quote_code',
      v_quote_code,

    'sale_price',
      v_sale_price,

    'per_person_sale_price',
      v_calc -> 'per_person_sale_price',

    'pricing_breakdown',
      v_calc
  );
end;
$$;

revoke all
on function
public.create_package_quote_v2(
  uuid,
  text,
  text,
  date,
  date,
  integer,
  integer,
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function
public.create_package_quote_v2(
  uuid,
  text,
  text,
  date,
  date,
  integer,
  integer,
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;

commit;
