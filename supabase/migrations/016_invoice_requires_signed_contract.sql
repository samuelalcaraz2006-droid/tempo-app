-- ============================================================================
-- Migration 016 — Facture obligatoirement liée à un contrat signé
-- ============================================================================
-- Objectif légal : empêcher la création d'une facture tant que le contrat
-- associé n'est pas signé par les deux parties (worker + company).
--
-- Droit du travail français : un travailleur ne peut pas être payé sans
-- contrat signé, sinon requalification automatique en salariat déguisé
-- (URSSAF + tribunal).
--
-- Défense en profondeur :
--   1. `invoices.contract_id` devient NOT NULL → plus de facture orpheline
--   2. Trigger BEFORE INSERT/UPDATE → bloque si statut contrat != active/completed
--   3. Couche DB = ni l'admin, ni un bug client, ni une Edge Function ne peut
--      contourner. C'est la source de vérité légale.
--
-- Pré-requis : les factures orphelines existantes (contract_id IS NULL) ont
-- été nettoyées avant l'application de cette migration.
-- ============================================================================

-- Étape 1 : fonction trigger
create or replace function tempo_check_invoice_contract_signed()
returns trigger
language plpgsql
as $$
declare
  v_contract_status contract_status;
begin
  -- Une facture DOIT être liée à un contrat
  if NEW.contract_id is null then
    raise exception 'invoice_requires_contract: une facture doit être liée à un contrat signé'
      using errcode = 'check_violation';
  end if;

  -- Récupération du statut du contrat lié
  select status into v_contract_status
  from contracts
  where id = NEW.contract_id;

  if v_contract_status is null then
    raise exception 'invoice_contract_not_found: contrat % introuvable', NEW.contract_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Whitelist des statuts autorisés :
  --   - active    = signé par les deux parties, mission en cours
  --   - completed = signé + mission terminée
  -- Rejetés : draft, sent, signed_worker, signed_company (pas encore bilatéral),
  --           disputed (litige en cours, pas de nouvelle facture)
  if v_contract_status not in ('active', 'completed') then
    raise exception 'invoice_contract_not_signed: contrat non signé par les deux parties (statut: %)', v_contract_status
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

comment on function tempo_check_invoice_contract_signed() is
  'Garde légale : refuse toute facture dont le contrat lié n''est pas signé par les deux parties (active/completed). Conformité droit du travail français.';

-- Étape 2 : trigger sur invoices
drop trigger if exists trg_invoices_check_contract_signed on invoices;
create trigger trg_invoices_check_contract_signed
  before insert or update of contract_id on invoices
  for each row
  execute function tempo_check_invoice_contract_signed();

-- Étape 3 : contract_id devient NOT NULL (défense en profondeur)
-- Pré-requis validé : 0 factures orphelines avant migration
alter table invoices alter column contract_id set not null;
