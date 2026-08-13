begin;

alter table public.package_quotes
add column if not exists primary_guest_email text;

alter table public.package_quotes
add column if not exists primary_guest_address text;

create table if not exists public.package_quote_guests (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  quote_id uuid not null,

  guest_order integer not null default 1,

  guest_type text not null default 'adult',

  full_name text not null,

  phone text,

  email text,

  address text,

  is_primary boolean not null default false,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint package_quote_guests_type_check
  check (
    guest_type in (
      'adult',
      'child'
    )
  )
);

create index if not exists idx_package_quote_guests_quote
on public.package_quote_guests (
  company_id,
  quote_id,
  guest_order
);

alter table public.package_quote_guests
enable row level security;

drop policy if exists package_quote_guests_member
on public.package_quote_guests;

create policy package_quote_guests_member
on public.package_quote_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      package_quote_guests.company_id
      and cm.user_id =
        auth.uid()
      and coalesce(
        cm.is_active,
        true
      ) = true
  )
);

drop policy if exists package_quote_guests_admin_write
on public.package_quote_guests;

create policy package_quote_guests_admin_write
on public.package_quote_guests
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
public.create_package_quote_v3(
  p_company_id uuid,
  p_guests jsonb,
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

  v_guest_count integer := 0;

  v_expected_count integer := 0;

  v_primary jsonb;

  v_primary_name text;

  v_primary_phone text;

  v_primary_email text;

  v_primary_address text;

  v_result jsonb;

  v_quote_id uuid;

  v_guest jsonb;

  v_guest_order integer := 1;

  v_guest_type text;

  v_full_name text;

  v_phone text;

  v_email text;

  v_address text;
begin

  if v_uid is null then
    raise exception
      'Oturum bulunamadı.';
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

  if jsonb_typeof(
    coalesce(
      p_guests,
      '[]'::jsonb
    )
  ) <> 'array'
  then
    raise exception
      'Misafir listesi geçersiz.';
  end if;

  v_guest_count :=
    jsonb_array_length(
      coalesce(
        p_guests,
        '[]'::jsonb
      )
    );

  v_expected_count :=
    greatest(
      coalesce(
        p_adults,
        0
      ) +
      coalesce(
        p_children,
        0
      ),
      1
    );

  if v_guest_count = 0 then
    raise exception
      'En az bir misafir girilmelidir.';
  end if;

  if v_guest_count <>
     v_expected_count
  then
    raise exception
      'Misafir listesi ile paket kişi sayısı aynı olmalıdır. Paket kişi sayısı: %, kayıtlı misafir: %.',
      v_expected_count,
      v_guest_count;
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

  for v_guest in
    select value
    from jsonb_array_elements(
      p_guests
    )
  loop

    v_full_name :=
      trim(
        coalesce(
          v_guest ->> 'fullName',
          ''
        )
      );

    if v_full_name = '' then
      raise exception
        'Tüm misafirlerin adı ve soyadı girilmelidir.';
    end if;

  end loop;

  v_result :=
    public.create_package_quote_v2(
      p_company_id,
      v_primary_name,
      coalesce(
        v_primary_phone,
        ''
      ),
      p_check_in,
      p_check_out,
      p_adults,
      p_children,
      p_hotel_id,
      p_rate_id,
      p_activities,
      p_expenses,
      p_profit_mode,
      p_profit_value,
      p_vat_rate,
      p_installment_rate
    );

  v_quote_id :=
    (
      v_result ->>
      'quote_id'
    )::uuid;

  if v_quote_id is null then
    raise exception
      'Teklif kaydı oluşturulamadı.';
  end if;

  update public.package_quotes
  set
    primary_guest_email =
      v_primary_email,

    primary_guest_address =
      v_primary_address

  where id =
    v_quote_id
    and company_id =
      p_company_id;

  for v_guest in
    select value
    from jsonb_array_elements(
      p_guests
    )
  loop

    v_full_name :=
      trim(
        coalesce(
          v_guest ->> 'fullName',
          ''
        )
      );

    v_phone :=
      nullif(
        trim(
          coalesce(
            v_guest ->> 'phone',
            ''
          )
        ),
        ''
      );

    v_email :=
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
      );

    v_address :=
      nullif(
        trim(
          coalesce(
            v_guest ->> 'address',
            ''
          )
        ),
        ''
      );

    v_guest_type :=
      coalesce(
        nullif(
          v_guest ->> 'guestType',
          ''
        ),
        'adult'
      );

    if v_guest_type not in (
      'adult',
      'child'
    ) then
      v_guest_type :=
        'adult';
    end if;

    insert into public.package_quote_guests (
      company_id,
      quote_id,
      guest_order,
      guest_type,
      full_name,
      phone,
      email,
      address,
      is_primary
    )
    values (
      p_company_id,
      v_quote_id,
      v_guest_order,
      v_guest_type,
      v_full_name,
      v_phone,
      v_email,
      v_address,
      v_guest_order = 1
    );

    v_guest_order :=
      v_guest_order + 1;

  end loop;

  return
    v_result
    ||
    jsonb_build_object(
      'guest_count',
        v_guest_count,

      'primary_guest',
        jsonb_build_object(
          'full_name',
            v_primary_name,

          'phone',
            v_primary_phone,

          'email',
            v_primary_email,

          'address',
            v_primary_address
        )
    );

end;
$$;

revoke all
on function
public.create_package_quote_v3(
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
  text,
  numeric,
  numeric,
  numeric
)
from public;

grant execute
on function
public.create_package_quote_v3(
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
  text,
  numeric,
  numeric,
  numeric
)
to authenticated;

commit;
