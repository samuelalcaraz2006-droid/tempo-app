-- 009: SIRET validation fields + attestation + RGPD support
-- Applied to Supabase via MCP on 2026-04-09

ALTER TABLE workers ADD COLUMN IF NOT EXISTS siret_denomination TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS siret_code_ape TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS attestation_honneur_signed_at TIMESTAMPTZ;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS attestation_vigilance_url TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS attestation_vigilance_verified BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'downloaded', 'expired')),
  file_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own export requests" ON data_export_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create export requests" ON data_export_requests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  anonymized_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deletion requests" ON account_deletion_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create deletion requests" ON account_deletion_requests FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cookie_consent_version TEXT;

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE INDEX IF NOT EXISTS idx_data_exports_user ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON account_deletion_requests(user_id);
