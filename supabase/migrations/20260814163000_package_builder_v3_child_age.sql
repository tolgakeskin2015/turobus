begin;

alter table
public.package_quote_guests

add column if not exists
child_age integer;


alter table
public.package_booking_guests

add column if not exists
child_age integer;


alter table
public.package_quote_guests

drop constraint if exists
package_quote_guests_child_age_check;


alter table
public.package_quote_guests

add constraint
package_quote_guests_child_age_check

check (
  child_age is null
  or
  (
    child_age >= 0
    and
    child_age <= 17
  )
);


alter table
public.package_booking_guests

drop constraint if exists
package_booking_guests_child_age_check;


alter table
public.package_booking_guests

add constraint
package_booking_guests_child_age_check

check (
  child_age is null
  or
  (
    child_age >= 0
    and
    child_age <= 17
  )
);


create or replace function
public.save_package_quote_guest_child_ages(
  p_quote_id uuid,
  p_guests jsonb
)
returns void

language plpgsql
security definer
set search_path = public

as $$
declare
  v_company_id uuid;

  v_guest jsonb;

  v_order integer := 1;

  v_age integer;
begin

  select
    q.company_id
  into
    v_company_id

  from
    public.package_quotes q

  where
    q.id =
      p_quote_id;


  if
    v_company_id
    is null
  then
    raise exception
      'Teklif bulunamadı.';
  end if;


  if not exists (
    select 1
    from public.company_members cm
    where cm.company_id =
      v_company_id
      and cm.user_id =
        auth.uid()
      and coalesce(
        cm.is_active,
        true
      ) = true
  )
  then
    raise exception
      'Yetkisiz işlem.';
  end if;


  for v_guest in

    select value
    from jsonb_array_elements(
      coalesce(
        p_guests,
        '[]'::jsonb
      )
    )

  loop

    v_age :=
      case

        when
          (
            v_guest ->>
            'guestType'
          ) =
          'child'

        then
          greatest(
            0,
            least(
              17,
              coalesce(
                nullif(
                  v_guest ->>
                  'childAge',
                  ''
                )::integer,
                0
              )
            )
          )

        else
          null

      end;


    update
      public.package_quote_guests

    set
      child_age =
        v_age

    where
      quote_id =
        p_quote_id
      and
      guest_order =
        v_order;


    v_order :=
      v_order +
      1;

  end loop;

end;
$$;


revoke all
on function
public.save_package_quote_guest_child_ages(
  uuid,
  jsonb
)
from public;


grant execute
on function
public.save_package_quote_guest_child_ages(
  uuid,
  jsonb
)
to authenticated;


commit;
