-- ============================================================================
-- Migration 043 — indexes sur les foreign keys restantes
-- ============================================================================
-- Complément à la migration 042. Supabase advisors avait encore 12 FK sans
-- index après 042 (parce que je n'avais ciblé que les plus évidentes).
-- Cette migration ajoute le reste. Zéro impact fonctionnel, juste perf.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contract_offers_message_id ON contract_offers(message_id);
CREATE INDEX IF NOT EXISTS idx_contract_offers_responder_id ON contract_offers(responder_id);
CREATE INDEX IF NOT EXISTS idx_sig_envelopes_initiator_id ON contract_signature_envelopes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_sig_envelopes_signer_company_id ON contract_signature_envelopes(signer_company_id);
CREATE INDEX IF NOT EXISTS idx_sig_envelopes_signer_worker_id ON contract_signature_envelopes(signer_worker_id);
CREATE INDEX IF NOT EXISTS idx_disputes_mission_id ON disputes(mission_id);
CREATE INDEX IF NOT EXISTS idx_disputes_resolved_by ON disputes(resolved_by);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_decided_by ON fraud_cases(decided_by);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_mission_id ON fraud_cases(mission_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_suspended_profile_id ON fraud_cases(suspended_profile_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_acknowledged_by ON fraud_signals(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_related_user_id ON fraud_signals(related_user_id);
