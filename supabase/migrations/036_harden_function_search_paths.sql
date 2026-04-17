-- ============================================================================
-- Migration 036 — Durcissement search_path sur 21 fonctions SECURITY DEFINER
-- ============================================================================
-- Contexte : l'advisor Supabase signalait 21 fonctions sans search_path fixé.
-- Sans search_path explicite, un attaquant qui arrive à créer des objets
-- dans un schéma accessible peut faire du function hijacking via shadowing.
-- Fix : ALTER FUNCTION ... SET search_path = public sur chacune.
-- ============================================================================

ALTER FUNCTION public.acknowledge_fraud_signal(uuid) SET search_path = public;
ALTER FUNCTION public.admin_unsuspend_account(uuid) SET search_path = public;
ALTER FUNCTION public.approve_contract_amendment(uuid) SET search_path = public;
ALTER FUNCTION public.check_fraud_case_suspension() SET search_path = public;
ALTER FUNCTION public.compute_trust_score(uuid) SET search_path = public;
ALTER FUNCTION public.detect_recurring_dispute_signals() SET search_path = public;
ALTER FUNCTION public.detect_role_alternation_signals() SET search_path = public;
ALTER FUNCTION public.detect_shared_ip_signals() SET search_path = public;
ALTER FUNCTION public.get_trust_score(uuid) SET search_path = public;
ALTER FUNCTION public.notify_kyc_decision(uuid, boolean, text) SET search_path = public;
ALTER FUNCTION public.propose_contract_amendment(uuid, numeric, numeric, text) SET search_path = public;
ALTER FUNCTION public.purge_old_fingerprints() SET search_path = public;
ALTER FUNCTION public.recompute_all_trust_scores() SET search_path = public;
ALTER FUNCTION public.reject_contract_amendment(uuid) SET search_path = public;
ALTER FUNCTION public.run_fraud_detection() SET search_path = public;
ALTER FUNCTION public.tempo_auto_calculate_invoice() SET search_path = public;
ALTER FUNCTION public.tempo_cap_time_entry_hours() SET search_path = public;
ALTER FUNCTION public.tempo_deadline_time_entry_submission() SET search_path = public;
ALTER FUNCTION public.tempo_dispatch_push_notification() SET search_path = public;
ALTER FUNCTION public.tempo_freeze_contract_after_signature() SET search_path = public;
ALTER FUNCTION public.tempo_send_requalification_reminders() SET search_path = public;
