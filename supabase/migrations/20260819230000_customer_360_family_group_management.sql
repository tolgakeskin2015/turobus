-- ============================================================
-- TUROBUS CUSTOMER 360
-- PHASE 1.8
-- TRAVELER / FAMILY / GROUP MANAGEMENT
--
-- Existing operational tables remain untouched.
-- Existing Customer 360 migrations are not modified.
-- ============================================================


-- ============================================================
-- SNAPSHOT
-- One professional read model for traveler/family/group UI.
-- ============================================================

create or replace function
public.customer_360_family_group_snapshot(
  p_customer_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.is_active_company_member(
    c.company_id
  ) then
    raise exception
      'Company membership required';
  end if;


  return jsonb_build_object(

    'customer',
      jsonb_build_object(
        'id',
          c.id,

        'customer_code',
          c.customer_code,

        'full_name',
          c.full_name
      ),


    'travelers',

      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                t.id,

              'full_name',
                t.full_name,

              'relationship_label',
                t.relationship_label,

              'phone',
                t.phone,

              'email',
                t.email,

              'birth_date',
                t.birth_date,

              'gender',
                t.gender,

              'nationality',
                t.nationality,

              'identity_type',
                t.identity_type,

              'identity_number',
                t.identity_number,

              'is_primary',
                t.is_primary,

              'created_at',
                t.created_at
            )
            order by
              t.created_at
          )

          from public.customer_360_travelers t

          where
            t.company_id =
              c.company_id

            and t.customer_id =
              c.id
        ),
        '[]'::jsonb
      ),


    'relationships',

      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                r.id,

              'relation_type',
                r.relation_type,

              'note',
                r.note,

              'direction',
                case
                  when r.customer_id =
                    c.id
                  then 'outbound'
                  else 'inbound'
                end,

              'other_customer_id',
                other_customer.id,

              'other_customer_code',
                other_customer.customer_code,

              'other_customer_name',
                other_customer.full_name,

              'other_customer_phone',
                other_customer.phone,

              'other_customer_email',
                other_customer.email,

              'other_customer_segment',
                other_customer.segment,

              'created_at',
                r.created_at
            )
            order by
              r.created_at desc
          )

          from public.customer_360_relationships r

          join public.customer_360_customers
            other_customer
          on other_customer.id =
            case
              when r.customer_id =
                c.id
              then r.related_customer_id
              else r.customer_id
            end

          where
            r.company_id =
              c.company_id

            and (
              r.customer_id =
                c.id

              or r.related_customer_id =
                c.id
            )
        ),
        '[]'::jsonb
      ),


    'groups',

      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id',
                g.id,

              'name',
                g.name,

              'group_type',
                g.group_type,

              'note',
                g.note,

              'member_role',
                gm.member_role,

              'created_at',
                g.created_at,

              'member_count',
                (
                  select count(*)

                  from public.customer_360_group_members
                    count_member

                  where
                    count_member.group_id =
                      g.id
                ),

              'members',
                coalesce(
                  (
                    select jsonb_agg(
                      jsonb_build_object(
                        'membership_id',
                          member.id,

                        'customer_id',
                          member_customer.id,

                        'customer_code',
                          member_customer.customer_code,

                        'full_name',
                          member_customer.full_name,

                        'phone',
                          member_customer.phone,

                        'email',
                          member_customer.email,

                        'segment',
                          member_customer.segment,

                        'member_role',
                          member.member_role
                      )
                      order by
                        member.created_at
                    )

                    from public.customer_360_group_members
                      member

                    join public.customer_360_customers
                      member_customer
                    on member_customer.id =
                      member.customer_id

                    where
                      member.group_id =
                        g.id

                      and member.company_id =
                        c.company_id
                  ),
                  '[]'::jsonb
                )
            )
            order by
              g.created_at desc
          )

          from public.customer_360_group_members gm

          join public.customer_360_groups g
            on g.id =
              gm.group_id

          where
            gm.company_id =
              c.company_id

            and gm.customer_id =
              c.id
        ),
        '[]'::jsonb
      )
  );

end;
$$;


revoke execute
on function
  public.customer_360_family_group_snapshot(uuid)
from public;


grant execute
on function
  public.customer_360_family_group_snapshot(uuid)
to authenticated;


-- ============================================================
-- ADD TRAVELER
-- ============================================================

create or replace function
public.customer_360_add_traveler(
  p_customer_id uuid,
  p_full_name text,
  p_relationship_label text default null,
  p_phone text default null,
  p_email text default null,
  p_birth_date date default null,
  p_nationality text default null,
  p_identity_type text default null,
  p_identity_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;

  v_id uuid;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id
  for update;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_full_name
    ),
    ''
  ) is null then
    raise exception
      'Traveler name required';
  end if;


  if
    p_identity_type is not null

    and p_identity_type not in (
      'tc',
      'passport',
      'other'
    )
  then
    raise exception
      'Invalid identity type';
  end if;


  insert into
    public.customer_360_travelers (
      company_id,
      customer_id,

      full_name,

      relationship_label,

      phone,
      email,

      birth_date,

      nationality,

      identity_type,
      identity_number,

      created_by
    )
  values (
    c.company_id,
    c.id,

    trim(
      p_full_name
    ),

    nullif(
      trim(
        p_relationship_label
      ),
      ''
    ),

    nullif(
      trim(
        p_phone
      ),
      ''
    ),

    nullif(
      lower(
        trim(
          p_email
        )
      ),
      ''
    ),

    p_birth_date,

    nullif(
      trim(
        p_nationality
      ),
      ''
    ),

    p_identity_type,

    nullif(
      trim(
        p_identity_number
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'traveler_id',
      v_id
  );

end;
$$;


revoke execute
on function
public.customer_360_add_traveler(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text
)
from public;


grant execute
on function
public.customer_360_add_traveler(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text
)
to authenticated;


-- ============================================================
-- DELETE TRAVELER
-- ============================================================

create or replace function
public.customer_360_delete_traveler(
  p_traveler_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.customer_360_travelers%rowtype;
begin

  select *
  into t
  from public.customer_360_travelers
  where id =
    p_traveler_id
  for update;


  if t.id is null then
    raise exception
      'Traveler not found';
  end if;


  if not public.customer_360_has_write_authority(
    t.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  delete from
    public.customer_360_travelers
  where id =
    t.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


revoke execute
on function
  public.customer_360_delete_traveler(uuid)
from public;


grant execute
on function
  public.customer_360_delete_traveler(uuid)
to authenticated;


-- ============================================================
-- ADD CUSTOMER RELATIONSHIP
-- ============================================================

create or replace function
public.customer_360_add_relationship(
  p_customer_id uuid,
  p_related_customer_id uuid,
  p_relation_type text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;

  r_customer public.customer_360_customers%rowtype;

  v_id uuid;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  select *
  into r_customer
  from public.customer_360_customers
  where id =
    p_related_customer_id;


  if
    c.id is null
    or r_customer.id is null
  then
    raise exception
      'Customer not found';
  end if;


  if c.company_id <>
    r_customer.company_id
  then
    raise exception
      'Cross-company relationship denied';
  end if;


  if c.id =
    r_customer.id
  then
    raise exception
      'Customer cannot be related to itself';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_relation_type
    ),
    ''
  ) is null then
    raise exception
      'Relation type required';
  end if;


  insert into
    public.customer_360_relationships (
      company_id,

      customer_id,
      related_customer_id,

      relation_type,

      note,

      created_by
    )
  values (
    c.company_id,

    c.id,
    r_customer.id,

    left(
      trim(
        p_relation_type
      ),
      80
    ),

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  on conflict (
    customer_id,
    related_customer_id,
    relation_type
  )
  do update
  set
    note =
      excluded.note

  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'relationship_id',
      v_id
  );

end;
$$;


revoke execute
on function
public.customer_360_add_relationship(
  uuid,
  uuid,
  text,
  text
)
from public;


grant execute
on function
public.customer_360_add_relationship(
  uuid,
  uuid,
  text,
  text
)
to authenticated;


-- ============================================================
-- DELETE RELATIONSHIP
-- ============================================================

create or replace function
public.customer_360_delete_relationship(
  p_relationship_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.customer_360_relationships%rowtype;
begin

  select *
  into r
  from public.customer_360_relationships
  where id =
    p_relationship_id
  for update;


  if r.id is null then
    raise exception
      'Relationship not found';
  end if;


  if not public.customer_360_has_write_authority(
    r.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  delete from
    public.customer_360_relationships
  where id =
    r.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


revoke execute
on function
  public.customer_360_delete_relationship(uuid)
from public;


grant execute
on function
  public.customer_360_delete_relationship(uuid)
to authenticated;


-- ============================================================
-- CREATE GROUP
-- The current customer becomes the first member.
-- ============================================================

create or replace function
public.customer_360_create_group(
  p_customer_id uuid,
  p_name text,
  p_group_type text default 'travel',
  p_note text default null,
  p_member_role text default 'primary'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.customer_360_customers%rowtype;

  v_group_id uuid;
begin

  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if c.id is null then
    raise exception
      'Customer not found';
  end if;


  if not public.customer_360_has_write_authority(
    c.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  if nullif(
    trim(
      p_name
    ),
    ''
  ) is null then
    raise exception
      'Group name required';
  end if;


  if p_group_type not in (
    'travel',
    'family',
    'corporate',
    'event',
    'other'
  ) then
    raise exception
      'Invalid group type';
  end if;


  insert into
    public.customer_360_groups (
      company_id,

      name,
      group_type,
      note,

      created_by
    )
  values (
    c.company_id,

    trim(
      p_name
    ),

    p_group_type,

    nullif(
      trim(
        p_note
      ),
      ''
    ),

    auth.uid()
  )
  returning id
  into v_group_id;


  insert into
    public.customer_360_group_members (
      company_id,

      group_id,
      customer_id,

      member_role
    )
  values (
    c.company_id,

    v_group_id,
    c.id,

    nullif(
      trim(
        p_member_role
      ),
      ''
    )
  );


  return jsonb_build_object(
    'ok',
      true,

    'group_id',
      v_group_id
  );

end;
$$;


revoke execute
on function
public.customer_360_create_group(
  uuid,
  text,
  text,
  text,
  text
)
from public;


grant execute
on function
public.customer_360_create_group(
  uuid,
  text,
  text,
  text,
  text
)
to authenticated;


-- ============================================================
-- ADD GROUP MEMBER
-- ============================================================

create or replace function
public.customer_360_add_group_member(
  p_group_id uuid,
  p_customer_id uuid,
  p_member_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.customer_360_groups%rowtype;

  c public.customer_360_customers%rowtype;

  v_id uuid;
begin

  select *
  into g
  from public.customer_360_groups
  where id =
    p_group_id;


  select *
  into c
  from public.customer_360_customers
  where id =
    p_customer_id;


  if
    g.id is null
    or c.id is null
  then
    raise exception
      'Group or customer not found';
  end if;


  if g.company_id <>
    c.company_id
  then
    raise exception
      'Cross-company group member denied';
  end if;


  if not public.customer_360_has_write_authority(
    g.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  insert into
    public.customer_360_group_members (
      company_id,

      group_id,
      customer_id,

      member_role
    )
  values (
    g.company_id,

    g.id,
    c.id,

    nullif(
      trim(
        p_member_role
      ),
      ''
    )
  )
  on conflict (
    group_id,
    customer_id
  )
  do update
  set
    member_role =
      excluded.member_role

  returning id
  into v_id;


  return jsonb_build_object(
    'ok',
      true,

    'membership_id',
      v_id
  );

end;
$$;


revoke execute
on function
public.customer_360_add_group_member(
  uuid,
  uuid,
  text
)
from public;


grant execute
on function
public.customer_360_add_group_member(
  uuid,
  uuid,
  text
)
to authenticated;


-- ============================================================
-- REMOVE GROUP MEMBER
-- ============================================================

create or replace function
public.customer_360_remove_group_member(
  p_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.customer_360_group_members%rowtype;
begin

  select *
  into m
  from public.customer_360_group_members
  where id =
    p_membership_id
  for update;


  if m.id is null then
    raise exception
      'Group membership not found';
  end if;


  if not public.customer_360_has_write_authority(
    m.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  delete from
    public.customer_360_group_members
  where id =
    m.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


revoke execute
on function
  public.customer_360_remove_group_member(uuid)
from public;


grant execute
on function
  public.customer_360_remove_group_member(uuid)
to authenticated;


-- ============================================================
-- DELETE GROUP
-- ============================================================

create or replace function
public.customer_360_delete_group(
  p_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.customer_360_groups%rowtype;
begin

  select *
  into g
  from public.customer_360_groups
  where id =
    p_group_id
  for update;


  if g.id is null then
    raise exception
      'Group not found';
  end if;


  if not public.customer_360_has_write_authority(
    g.company_id
  ) then
    raise exception
      'Customer write authority required';
  end if;


  delete from
    public.customer_360_groups
  where id =
    g.id;


  return jsonb_build_object(
    'ok',
      true
  );

end;
$$;


revoke execute
on function
  public.customer_360_delete_group(uuid)
from public;


grant execute
on function
  public.customer_360_delete_group(uuid)
to authenticated;


-- ============================================================
-- FINAL SECURITY DEFINER CHECK
-- ============================================================

do $$
declare
  r record;
begin

  for r in
    select p.oid

    from pg_proc p

    join pg_namespace n
      on n.oid =
        p.pronamespace

    where
      n.nspname =
        'public'

      and p.prosecdef =
        true

      and p.proname like
        'customer_360_%'

  loop

    execute format(
      'revoke execute on function %s from public',
      r.oid::regprocedure
    );

  end loop;

end;
$$;


-- Restore exact authenticated grants for Phase 1.8.

grant execute
on function
  public.customer_360_family_group_snapshot(uuid)
to authenticated;


grant execute
on function
public.customer_360_add_traveler(
  uuid,
  text,
  text,
  text,
  text,
  date,
  text,
  text,
  text
)
to authenticated;


grant execute
on function
  public.customer_360_delete_traveler(uuid)
to authenticated;


grant execute
on function
public.customer_360_add_relationship(
  uuid,
  uuid,
  text,
  text
)
to authenticated;


grant execute
on function
  public.customer_360_delete_relationship(uuid)
to authenticated;


grant execute
on function
public.customer_360_create_group(
  uuid,
  text,
  text,
  text,
  text
)
to authenticated;


grant execute
on function
public.customer_360_add_group_member(
  uuid,
  uuid,
  text
)
to authenticated;


grant execute
on function
  public.customer_360_remove_group_member(uuid)
to authenticated;


grant execute
on function
  public.customer_360_delete_group(uuid)
to authenticated;
