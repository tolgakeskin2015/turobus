-- ============================================================
-- TUROBUS
-- TOUR MANIFEST <-> CHECKIN / OPERATION STATUS BRIDGE
-- Phase 3
-- ============================================================

create or replace function
public.update_tour_manifest_status(
  p_company_id uuid,
  p_manifest_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_old_status text;
  v_checkin_status text;
  v_checkin_exists boolean := false;
begin

  if not public.is_company_member(
    p_company_id
  ) then
    raise exception
      'Company membership required';
  end if;

  if p_status not in (
    'waiting',
    'pickup_waiting',
    'checked_in',
    'in_vehicle',
    'no_show',
    'completed',
    'cancelled'
  ) then
    raise exception
      'Invalid manifest status';
  end if;

  select
    reservation_id,
    manifest_status
  into
    v_reservation_id,
    v_old_status
  from public.tour_manifest_entries
  where id = p_manifest_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception
      'Manifest entry not found';
  end if;

  update public.tour_manifest_entries
  set
    manifest_status = p_status,

    checked_in_at =
      case
        when p_status in (
          'checked_in',
          'in_vehicle',
          'completed'
        )
        then coalesce(
          checked_in_at,
          now()
        )
        else checked_in_at
      end,

    boarded_at =
      case
        when p_status = 'in_vehicle'
        then coalesce(
          boarded_at,
          now()
        )
        else boarded_at
      end,

    no_show_at =
      case
        when p_status = 'no_show'
        then coalesce(
          no_show_at,
          now()
        )
        else no_show_at
      end,

    updated_by = auth.uid(),
    updated_at = now()

  where id = p_manifest_id
    and company_id = p_company_id;


  -- Manifest cancelled mevcut tour_checkins
  -- CHECK constraint'inde olmadığı için checkin tablosuna
  -- yanlış bir statü yazmıyoruz.
  if p_status <> 'cancelled' then

    v_checkin_status :=
      case p_status
        when 'waiting'
          then 'waiting'

        when 'pickup_waiting'
          then 'transfer_waiting'

        when 'checked_in'
          then 'waiting'

        when 'in_vehicle'
          then 'in_vehicle'

        when 'no_show'
          then 'no_show'

        when 'completed'
          then 'completed'

        else 'waiting'
      end;


    select exists(
      select 1
      from public.tour_checkins
      where reservation_id =
        v_reservation_id
        and company_id =
          p_company_id
    )
    into v_checkin_exists;


    if v_checkin_exists then

      update public.tour_checkins
      set
        checked_in =
          case
            when p_status in (
              'checked_in',
              'in_vehicle',
              'completed'
            )
            then true

            when p_status in (
              'waiting',
              'pickup_waiting',
              'no_show'
            )
            then false

            else checked_in
          end,

        checked_in_at =
          case
            when p_status in (
              'checked_in',
              'in_vehicle',
              'completed'
            )
            then coalesce(
              checked_in_at,
              now()
            )

            when p_status in (
              'waiting',
              'pickup_waiting',
              'no_show'
            )
            then null

            else checked_in_at
          end,

        checked_in_by =
          case
            when p_status in (
              'checked_in',
              'in_vehicle',
              'completed'
            )
            then coalesce(
              checked_in_by,
              'Manifest'
            )

            when p_status in (
              'waiting',
              'pickup_waiting',
              'no_show'
            )
            then null

            else checked_in_by
          end,

        current_status =
          v_checkin_status,

        status_note =
          'Manifest senkronizasyonu: '
          || p_status,

        last_updated_at = now(),
        updated_at = now()

      where reservation_id =
        v_reservation_id
        and company_id =
          p_company_id;

    else

      insert into public.tour_checkins (
        reservation_id,
        company_id,
        checked_in,
        checked_in_at,
        checked_in_by,
        current_status,
        status_note,
        last_updated_at,
        created_at,
        updated_at
      )
      values (
        v_reservation_id,
        p_company_id,

        p_status in (
          'checked_in',
          'in_vehicle',
          'completed'
        ),

        case
          when p_status in (
            'checked_in',
            'in_vehicle',
            'completed'
          )
          then now()
          else null
        end,

        case
          when p_status in (
            'checked_in',
            'in_vehicle',
            'completed'
          )
          then 'Manifest'
          else null
        end,

        v_checkin_status,

        'Manifest senkronizasyonu: '
          || p_status,

        now(),
        now(),
        now()
      );

    end if;

  end if;


  -- Sadece gerçekten durum değiştiyse history oluştur.
  if v_old_status is distinct from p_status then

    insert into public.tour_status_history (
      reservation_id,
      status,
      note,
      updated_by,
      company_id,
      created_at
    )
    values (
      v_reservation_id,
      p_status,
      'Manifest üzerinden güncellendi',
      coalesce(
        auth.uid()::text,
        'system'
      ),
      p_company_id,
      now()
    );

  end if;

end;
$$;


revoke all on function
public.update_tour_manifest_status(
  uuid,
  uuid,
  text
)
from public;

grant execute on function
public.update_tour_manifest_status(
  uuid,
  uuid,
  text
)
to authenticated;


-- ============================================================
-- OPERATION / CHECKIN -> MANIFEST
-- ============================================================

create or replace function
public.sync_tour_checkin_to_manifest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_manifest_status text;
begin

  v_manifest_status :=
    case

      when NEW.current_status =
        'no_show'
      then 'no_show'

      when NEW.current_status =
        'completed'
      then 'completed'

      when NEW.current_status =
        'in_vehicle'
      then 'in_vehicle'

      when NEW.current_status =
        'transfer_waiting'
      then 'pickup_waiting'

      when NEW.checked_in = true
      then 'checked_in'

      else 'waiting'

    end;


  update public.tour_manifest_entries
  set
    manifest_status =
      v_manifest_status,

    checked_in_at =
      case
        when NEW.checked_in = true
        then coalesce(
          checked_in_at,
          NEW.checked_in_at,
          now()
        )
        else checked_in_at
      end,

    boarded_at =
      case
        when NEW.current_status =
          'in_vehicle'
        then coalesce(
          boarded_at,
          now()
        )
        else boarded_at
      end,

    no_show_at =
      case
        when NEW.current_status =
          'no_show'
        then coalesce(
          no_show_at,
          now()
        )
        else no_show_at
      end,

    updated_at = now()

  where reservation_id =
    NEW.reservation_id

    and company_id =
      NEW.company_id

    -- Manifestte iptal edilmiş kayıt,
    -- operasyon ekranındaki başka bir değişiklikle
    -- yanlışlıkla tekrar aktif olmasın.
    and manifest_status <>
      'cancelled';


  return NEW;

end;
$$;


drop trigger if exists
trg_sync_tour_checkin_to_manifest
on public.tour_checkins;


create trigger
trg_sync_tour_checkin_to_manifest
after insert or update of
  checked_in,
  checked_in_at,
  current_status
on public.tour_checkins
for each row
execute function
public.sync_tour_checkin_to_manifest();


-- ============================================================
-- INDEX
-- ============================================================

create index if not exists
idx_tour_checkins_company_reservation
on public.tour_checkins (
  company_id,
  reservation_id
);

create index if not exists
idx_tour_status_history_company_reservation
on public.tour_status_history (
  company_id,
  reservation_id,
  created_at desc
);
