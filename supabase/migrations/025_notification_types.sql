-- 025 — Add missing notification types for messaging & anti-fraud alerts
-- ────────────────────────────────────────────────────────────────────────

alter type notif_type add value if not exists 'new_message';
alter type notif_type add value if not exists 'fraud_signal_detected';
alter type notif_type add value if not exists 'trust_score_critical';
