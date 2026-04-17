-- ============================================================================
-- Migration 021 — Avenants bilatéraux aux contrats
-- ============================================================================
-- Objectif : permettre la modification d'un contrat signé UNIQUEMENT si les
-- deux parties sont d'accord (accord bilatéral = 2FA par double
-- authentification distincte).
--
-- Flux :
--   1. Partie A propose un avenant (propose_contract_amendment)
--   2. Partie B approuve (approve_contract_amendment)  ← SECURITY DEFINER
--   3. Les modifications sont appliquées au contrat
--   4. Le trigger de gel (migration 020) est contourné via session variable
--
-- Champs modifiables par avenant : hourly_rate, total_hours
-- Champs recalculés automatiquement : total_amount_ht, commission_amount
-- Champs NON modifiables : worker_id, company_id, mission_id, commission_rate
--
-- Dépend de : 020_anti_fraud_blindage_contrats.sql
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Type enum pour le statut d'avenant
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'amendment_status') then
    create type amendment_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'expired');
  end if;
end $$;

alter type notif_type add value if not exists 'amendment_proposed';
alter type notif_type add value if not exists 'amendment_approved';
alter type notif_type add value if not exists 'amendment_rejected';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table des avenants
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists contract_amendments (
  id                    uuid             primary key default uuid_generate_v4(),
  contract_id           uuid             not null references contracts(id),
  proposer_id           uuid             not null references profiles(id),
  proposed_hourly_rate  decimal(8,2),
  proposed_total_hours  decimal(6,1),
  reason                text             not null check (length(reason) >= 10),
  status                amendment_status not null default 'pending',
  proposer_confirmed_at timestamptz      not null default now(),
  approver_id           uuid             references profiles(id),
  approver_confirmed_at timestamptz,
  applied_at            timestamptz,
  created_at            timestamptz      not null default now(),
  updated_at            timestamptz      not null default now()
);

comment on table contract_amendments is
  'Avenants bilatéraux : toute modification d''un contrat signé requiert l''accord des deux parties.';

create trigger trg_contract_amendments_updated_at
  before update on contract_amendments
  for each row execute function update_updated_at();

-- RLS : seules les parties du contrat voient leurs avenants
alter table contract_amendments enable row level security;

create policy "amendments_parties_select" on contract_amendments
  for select using (
    proposer_id = auth.uid()
    or approver_id = auth.uid()
    or exists (
      select 1 from contracts c
      where c.id = contract_amendments.contract_id
        and (c.worker_id = auth.uid() or c.company_id = auth.uid())
    )
  );

create policy "amendments_parties_insert" on contract_amendments
  for insert with check (
    proposer_id = auth.uid()
    and exists (
      select 1 from contracts c
      where c.id = contract_amendments.contract_id
        and (c.worker_id = auth.uid() or c.company_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Modifier le trigger de gel pour respecter les avenants approuvés
-- ────────────────────────────────────────────────────────────────────────────
create or replace function tempo_freeze_contract_after_signature()
returns trigger
language plpgsql
as $$
begin
  if OLD.signed_worker_at is not null and OLD.signed_company_at is not null then

    -- Bypass autorisé uniquement par la fonction approve_contract_amendment
    -- qui pose cette variable de session dans la même transaction.
    if coalesce(current_setting('tempo.amendment_approved', true), '') <> '' then
      return NEW;
    end if;

    if NEW.hourly_rate       is distinct from OLD.hourly_rate
       or NEW.total_hours       is distinct from OLD.total_hours
       or NEW.total_amount_ht   is distinct from OLD.total_amount_ht
       or NEW.commission_rate   is distinct from OLD.commission_rate
       or NEW.commission_amount is distinct from OLD.commission_amount
    then
      raise exception 'contract_frozen: les termes financiers d''un contrat signé ne peuvent plus être modifiés. Utilisez un avenant bilatéral.'
        using errcode = 'check_violation';
    end if;

    if NEW.worker_id  is distinct from OLD.worker_id
       or NEW.company_id is distinct from OLD.company_id
       or NEW.mission_id is distinct from OLD.mission_id
    then
      raise exception 'contract_frozen: les parties d''un contrat signé ne peuvent pas être changées'
        using errcode = 'check_violation';
    end if;
  end if;

  return NEW;
end;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC : proposer un avenant
-- ────────────────────────────────────────────────────────────────────────────
create or replace function propose_contract_amendment(
  p_contract_id      uuid,
  p_hourly_rate      decimal default null,
  p_total_hours      decimal default null,
  p_reason           text    default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_contract    contracts;
  v_caller      uuid := auth.uid();
  v_other_party uuid;
  v_amendment_id uuid;
begin
  -- Vérifier le contrat
  select * into v_contract from contracts where id = p_contract_id;
  if v_contract is null then
    raise exception 'contract_not_found: contrat introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  -- Vérifier que le contrat est signé
  if v_contract.signed_worker_at is null or v_contract.signed_company_at is null then
    raise exception 'amendment_not_needed: le contrat n''est pas encore signé, modifiez-le directement'
      using errcode = 'check_violation';
  end if;

  -- Vérifier que l'appelant est une partie du contrat
  if v_caller = v_contract.worker_id then
    v_other_party := v_contract.company_id;
  elsif v_caller = v_contract.company_id then
    v_other_party := v_contract.worker_id;
  else
    raise exception 'forbidden: seules les parties du contrat peuvent proposer un avenant'
      using errcode = 'insufficient_privilege';
  end if;

  -- Au moins un champ doit être modifié
  if p_hourly_rate is null and p_total_hours is null then
    raise exception 'amendment_empty: au moins un champ doit être modifié'
      using errcode = 'check_violation';
  end if;

  -- Vérifier qu'il n'y a pas déjà un avenant en attente
  if exists (
    select 1 from contract_amendments
    where contract_id = p_contract_id and status = 'pending'
  ) then
    raise exception 'amendment_already_pending: un avenant est déjà en attente d''approbation sur ce contrat'
      using errcode = 'check_violation';
  end if;

  -- Créer l'avenant
  insert into contract_amendments (contract_id, proposer_id, proposed_hourly_rate, proposed_total_hours, reason)
  values (p_contract_id, v_caller, p_hourly_rate, p_total_hours, p_reason)
  returning id into v_amendment_id;

  -- Notifier l'autre partie
  insert into notifications (user_id, type, title, body)
  values (
    v_other_party,
    'amendment_proposed',
    'Avenant proposé',
    'Une modification du contrat a été proposée. Consultez les détails et approuvez ou refusez.'
  );

  return v_amendment_id;
end;
$$;

comment on function propose_contract_amendment is
  'Propose un avenant bilatéral. Requiert que le contrat soit signé et que l''appelant soit une partie.';


-- ────────────────────────────────────────────────────────────────────────────
-- 5. RPC : approuver un avenant (2FA = double authentification distincte)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function approve_contract_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_amendment  contract_amendments;
  v_contract   contracts;
  v_caller     uuid := auth.uid();
  v_new_rate   decimal;
  v_new_hours  decimal;
begin
  -- Récupérer l'avenant
  select * into v_amendment from contract_amendments where id = p_amendment_id;
  if v_amendment is null then
    raise exception 'amendment_not_found: avenant introuvable'
      using errcode = 'foreign_key_violation';
  end if;
  if v_amendment.status <> 'pending' then
    raise exception 'amendment_not_pending: cet avenant n''est plus en attente'
      using errcode = 'check_violation';
  end if;

  -- Récupérer le contrat
  select * into v_contract from contracts where id = v_amendment.contract_id;

  -- 2FA : l'approbateur doit être l'AUTRE partie (pas le proposeur)
  if v_caller = v_amendment.proposer_id then
    raise exception 'amendment_self_approve: vous ne pouvez pas approuver votre propre avenant'
      using errcode = 'check_violation';
  end if;
  if v_caller <> v_contract.worker_id and v_caller <> v_contract.company_id then
    raise exception 'forbidden: seules les parties du contrat peuvent approuver'
      using errcode = 'insufficient_privilege';
  end if;

  -- Marquer comme approuvé
  update contract_amendments set
    status = 'approved',
    approver_id = v_caller,
    approver_confirmed_at = now(),
    applied_at = now()
  where id = p_amendment_id;

  -- Calculer les nouvelles valeurs
  v_new_rate  := coalesce(v_amendment.proposed_hourly_rate, v_contract.hourly_rate);
  v_new_hours := coalesce(v_amendment.proposed_total_hours, v_contract.total_hours);

  -- Poser la variable de session pour bypass le trigger de gel
  perform set_config('tempo.amendment_approved', p_amendment_id::text, true);

  -- Appliquer les modifications au contrat
  update contracts set
    hourly_rate       = v_new_rate,
    total_hours       = v_new_hours,
    total_amount_ht   = round(v_new_rate * coalesce(v_new_hours, 0), 2),
    commission_amount = round(v_new_rate * coalesce(v_new_hours, 0) * (commission_rate / 100.0), 2)
  where id = v_amendment.contract_id;

  -- Notifier le proposeur que l'avenant est accepté
  insert into notifications (user_id, type, title, body)
  values (
    v_amendment.proposer_id,
    'amendment_approved',
    'Avenant accepté',
    'Votre proposition de modification du contrat a été approuvée. Les nouveaux termes sont en vigueur.'
  );
end;
$$;

comment on function approve_contract_amendment is
  'Approuve un avenant bilatéral (2FA = deux authentifications distinctes). Applique les modifications au contrat en contournant le gel.';


-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC : rejeter un avenant
-- ────────────────────────────────────────────────────────────────────────────
create or replace function reject_contract_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_amendment contract_amendments;
  v_contract  contracts;
  v_caller    uuid := auth.uid();
begin
  select * into v_amendment from contract_amendments where id = p_amendment_id;
  if v_amendment is null then
    raise exception 'amendment_not_found: avenant introuvable'
      using errcode = 'foreign_key_violation';
  end if;
  if v_amendment.status <> 'pending' then
    raise exception 'amendment_not_pending: cet avenant n''est plus en attente'
      using errcode = 'check_violation';
  end if;

  select * into v_contract from contracts where id = v_amendment.contract_id;

  -- Seule l'autre partie peut rejeter
  if v_caller = v_amendment.proposer_id then
    raise exception 'amendment_self_reject: utilisez annuler plutôt que rejeter pour votre propre avenant'
      using errcode = 'check_violation';
  end if;
  if v_caller <> v_contract.worker_id and v_caller <> v_contract.company_id then
    raise exception 'forbidden: seules les parties du contrat peuvent rejeter'
      using errcode = 'insufficient_privilege';
  end if;

  update contract_amendments set
    status = 'rejected',
    approver_id = v_caller,
    approver_confirmed_at = now()
  where id = p_amendment_id;

  -- Notifier le proposeur
  insert into notifications (user_id, type, title, body)
  values (
    v_amendment.proposer_id,
    'amendment_rejected',
    'Avenant refusé',
    'Votre proposition de modification du contrat a été refusée par l''autre partie.'
  );
end;
$$;

comment on function reject_contract_amendment is
  'Rejette un avenant proposé. Seule l''autre partie (pas le proposeur) peut rejeter.';


-- ────────────────────────────────────────────────────────────────────────────
-- 7. RPC : annuler son propre avenant
-- ────────────────────────────────────────────────────────────────────────────
create or replace function cancel_contract_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_amendment contract_amendments;
  v_caller    uuid := auth.uid();
begin
  select * into v_amendment from contract_amendments where id = p_amendment_id;
  if v_amendment is null then
    raise exception 'amendment_not_found: avenant introuvable'
      using errcode = 'foreign_key_violation';
  end if;
  if v_amendment.status <> 'pending' then
    raise exception 'amendment_not_pending: cet avenant n''est plus en attente'
      using errcode = 'check_violation';
  end if;

  -- Seul le proposeur peut annuler
  if v_caller <> v_amendment.proposer_id then
    raise exception 'forbidden: seul l''auteur de l''avenant peut l''annuler'
      using errcode = 'insufficient_privilege';
  end if;

  update contract_amendments set
    status = 'cancelled'
  where id = p_amendment_id;
end;
$$;

comment on function cancel_contract_amendment is
  'Annule un avenant en attente. Seul le proposeur peut annuler.';
