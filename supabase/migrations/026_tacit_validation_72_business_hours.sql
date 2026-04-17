-- ============================================================================
-- Migration 026 — Validation tacite : 7 jours → 72 heures ouvrables
-- ============================================================================
-- Raison : 7 heures était trop court pour des équipes RH non connectées en
-- permanence. 72 heures ouvrables (= 3 jours ouvrables, week-ends exclus)
-- donne un délai raisonnable tout en évitant les blocages de facturation.
--
-- Changements :
--   1. Fonction helper business_hours_elapsed(timestamptz) → numeric
--   2. tacit_validate_time_entries() mise à jour avec la nouvelle condition
--   3. Notification submit_time_entries() mise à jour (texte "7 jours" → "72h")
--   4. Commentaires SQL mis à jour
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Helper : nombre d'heures ouvrables écoulées depuis p_from
-- ────────────────────────────────────────────
-- Compte les heures sur les jours lun-ven uniquement (24h/jour ouvrable).
-- Utilisé dans le cron tacite et potentiellement dans les notifications.
create or replace function business_hours_elapsed(p_from timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(
      case
        -- Lun (1) → Ven (5) dans PostgreSQL DOW (0=dim, 1=lun … 6=sam)
        when extract(dow from d.day) between 1 and 5 then
          extract(epoch from (
            least(now(), d.day + interval '1 day') -
            greatest(p_from, d.day)
          )) / 3600.0
        else 0
      end
    ),
    0
  )
  from generate_series(
    date_trunc('day', p_from),
    date_trunc('day', now()),
    interval '1 day'
  ) as d(day)
  -- Ne considérer que les jours qui chevauchent [p_from, now()]
  where d.day + interval '1 day' > p_from
    and d.day <= now()
$$;

comment on function business_hours_elapsed(timestamptz) is
  'Retourne le nombre d''heures ouvrables (lun-ven, 24h/jour) écoulées depuis p_from jusqu''à now(). '
  'Utilisé par tacit_validate_time_entries() pour le délai de 72h ouvrables.';

grant execute on function business_hours_elapsed(timestamptz) to service_role;
revoke execute on function business_hours_elapsed(timestamptz) from public;
revoke execute on function business_hours_elapsed(timestamptz) from authenticated;

-- ────────────────────────────────────────────
-- 2. tacit_validate_time_entries() — 72h ouvrables
-- ────────────────────────────────────────────
create or replace function tacit_validate_time_entries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record    record;
  v_total     integer := 0;
  v_contracts uuid[]  := array[]::uuid[];
begin
  -- Pas d'auth check : la fonction est SECURITY DEFINER, appelée par cron.
  -- Les GRANT sont restreints à pg_cron owner et service_role.

  for v_record in
    select id, contract_id, worker_id
      from mission_time_entries
     where status = 'submitted'
       -- 72 heures ouvrables (lun-ven) : équivaut à 3 jours ouvrables complets.
       -- On filtre d'abord les candidats avec un plancher calendaire de 3 jours
       -- pour éviter d'appeler business_hours_elapsed() sur chaque ligne.
       and submitted_at < now() - interval '3 days'
       and business_hours_elapsed(submitted_at) >= 72
     order by contract_id
  loop
    update mission_time_entries
       set status          = 'validated',
           validated_at    = now(),
           validation_kind = 'tacit',
           updated_at      = now()
     where id = v_record.id;
    v_total := v_total + 1;
    if not (v_record.contract_id = any(v_contracts)) then
      v_contracts := array_append(v_contracts, v_record.contract_id);
      -- Notification worker
      insert into notifications (user_id, type, title, body, payload)
      values (
        v_record.worker_id,
        'time_entries_validated',
        'Heures validées (tacite)',
        'Ton client n''a pas répondu sous 72 heures ouvrables, tes heures sont validées automatiquement.',
        jsonb_build_object('contract_id', v_record.contract_id, 'kind', 'tacit')
      );
    end if;
  end loop;

  -- Bascule les contrats concernés en active
  if array_length(v_contracts, 1) > 0 then
    update contracts
       set status = 'active'
     where id = any(v_contracts)
       and status = 'awaiting_hours_validation';
  end if;

  return v_total;
end;
$$;

comment on function tacit_validate_time_entries() is
  'Job nocturne : valide tacitement toute entry submitted depuis plus de 72 heures ouvrables (lun-ven). '
  'Appelée par pg_cron à 03h00 UTC. Remplace le délai initial de 7 jours (migration 018).';

revoke execute on function tacit_validate_time_entries() from public;
revoke execute on function tacit_validate_time_entries() from authenticated;

-- ────────────────────────────────────────────
-- 3. submit_time_entries() — mettre à jour le texte de notification
-- ────────────────────────────────────────────
create or replace function submit_time_entries(p_contract_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id  uuid;
  v_company_id uuid;
  v_count      integer;
begin
  select worker_id, company_id into v_worker_id, v_company_id
  from contracts
  where id = p_contract_id;

  if v_worker_id is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  if auth.uid() <> v_worker_id and not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update mission_time_entries
     set status       = 'submitted',
         submitted_at = now(),
         updated_at   = now()
   where contract_id = p_contract_id
     and status      = 'draft';
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'no_draft_entries' using errcode = 'P0001';
  end if;

  update contracts
     set status = 'awaiting_hours_validation'
   where id = p_contract_id
     and status in ('active','awaiting_hours_validation');

  -- Texte mis à jour : 72 heures ouvrables (était "7 jours")
  insert into notifications (user_id, type, title, body, payload)
  values (
    v_company_id,
    'time_entries_submitted',
    'Heures à valider',
    'Un travailleur a soumis ses heures. Vous disposez de 72 heures ouvrables pour valider ou contester.',
    jsonb_build_object('contract_id', p_contract_id, 'count', v_count)
  );

  return v_count;
end;
$$;

grant execute on function submit_time_entries(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 4. Mise à jour du commentaire validation_kind
-- ────────────────────────────────────────────
comment on column mission_time_entries.validation_kind is
  'explicit = company a cliqué validate ; tacit = 72h ouvrables de silence (lun-ven) ; amended = issue d''un amendement bilatéral.';

-- ────────────────────────────────────────────
-- 5. pg_cron — réenregistrement du job (inchangé : 03h00 UTC quotidien)
-- ────────────────────────────────────────────
-- Le cron_schedule reste identique (quotidien 03h00 UTC), seule la fonction
-- appelée a changé de logique. On réenregistre pour forcer la mise à jour.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('tempo_tacit_validate_time_entries')
      where exists (select 1 from cron.job where jobname = 'tempo_tacit_validate_time_entries');
    perform cron.schedule(
      'tempo_tacit_validate_time_entries',
      '0 3 * * *',
      $cron$ select tacit_validate_time_entries(); $cron$
    );
  end if;
exception when others then
  null;
end $$;
