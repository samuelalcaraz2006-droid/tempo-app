-- ============================================================================
-- Migration 040 — Auto-transition contract → active + auto-calc invoice
--                   respecte les montants fournis si non-nuls
-- ============================================================================
-- Contexte bug :
--  - Mission Léa/LogisTec : contrat signé par les 2 parties mais resté
--    à 'signed_company' (le dernier qui signe écrase le status). Trigger
--    016 refuse alors la facture (contract_not_signed).
--  - `tempo_auto_calculate_invoice` override systématiquement amount_ht
--    depuis mission_time_entries. Si la mission n'a pas encore commencé
--    ou n'a pas de time entries, l'app créait une facture à 0€ — d'où
--    l'erreur côté code qui tente ensuite de réconcilier.
--
-- Fix 1 : trigger BEFORE UPDATE sur contracts qui force status = 'active'
--         dès que les 2 signatures sont présentes et que le status est
--         encore 'signed_worker' ou 'signed_company'. Côté DB = garantie.
--
-- Fix 2 : `tempo_auto_calculate_invoice` :
--           - si le caller a passé amount_ht > 0 → NE PAS écraser
--           - sinon, auto-calc depuis mission_time_entries (comportement
--             actuel conservé)
--         Permet au flux « Terminer mission » de créer une facture
--         cohérente même sans time entries (cas mission annulée, mission
--         non commencée mais à facturer, backfill, etc.)
-- ============================================================================

-- ─── Fix 1 : auto-transition contract ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tempo_contract_auto_activate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Dès que les 2 signatures sont présentes et que le contrat n'est pas
  -- encore activé/complété, on le passe à 'active'. C'est la source de
  -- vérité légale : contrat bilatéralement signé = actif.
  IF NEW.signed_worker_at IS NOT NULL
     AND NEW.signed_company_at IS NOT NULL
     AND NEW.status IN ('signed_worker', 'signed_company', 'draft', 'sent')
  THEN
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tempo_contract_auto_activate() IS
  'Force contract.status = active dès que les 2 signatures sont présentes. Évite que le dernier signataire écrase un status déjà bilatéral.';

DROP TRIGGER IF EXISTS trg_contract_auto_activate ON contracts;
CREATE TRIGGER trg_contract_auto_activate
  BEFORE INSERT OR UPDATE OF signed_worker_at, signed_company_at, status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION tempo_contract_auto_activate();


-- ─── Fix 2 : auto-calc invoice ne force plus si montants fournis ──────────
CREATE OR REPLACE FUNCTION public.tempo_auto_calculate_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_hourly_rate      decimal;
  v_commission_rate  decimal;
  v_total_minutes    integer;
  v_amount_ht        decimal;
BEGIN
  -- Short-circuit : si le caller a déjà fourni un amount_ht > 0, on lui
  -- fait confiance (flux « Terminer mission » qui calcule depuis la
  -- mission, flux admin, flux backfill, etc.). Les time entries restent
  -- la source canonique pour les factures générées automatiquement en
  -- fin de période.
  IF NEW.amount_ht IS NOT NULL AND NEW.amount_ht > 0 THEN
    -- Assure la cohérence commission/payout si le caller a été cohérent
    IF NEW.amount_ttc IS NULL OR NEW.amount_ttc = 0 THEN
      NEW.amount_ttc := NEW.amount_ht;
    END IF;
    RETURN NEW;
  END IF;

  -- Sinon : auto-calcul depuis les time entries validées du contrat
  SELECT hourly_rate, commission_rate
    INTO v_hourly_rate, v_commission_rate
  FROM contracts
  WHERE id = NEW.contract_id;

  IF v_hourly_rate IS NULL THEN
    RAISE EXCEPTION 'contract_not_found: contrat % introuvable pour calcul de facture', NEW.contract_id
      USING errcode = 'foreign_key_violation';
  END IF;

  SELECT COALESCE(SUM(worked_minutes), 0)
    INTO v_total_minutes
  FROM mission_time_entries
  WHERE contract_id = NEW.contract_id
    AND status IN ('validated', 'billed');

  v_amount_ht := ROUND((v_total_minutes / 60.0) * v_hourly_rate, 2);

  NEW.amount_ht     := v_amount_ht;
  NEW.amount_ttc    := v_amount_ht;
  NEW.commission    := ROUND(v_amount_ht * (v_commission_rate / 100.0), 2);
  NEW.worker_payout := v_amount_ht - ROUND(v_amount_ht * (v_commission_rate / 100.0), 2);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tempo_auto_calculate_invoice() IS
  'Auto-calcul d''une facture depuis les time entries validées. Respecte les montants du caller si amount_ht > 0 (flux « Terminer mission » côté app).';
