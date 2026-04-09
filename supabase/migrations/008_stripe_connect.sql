-- 008: Stripe Connect integration
-- Adds Stripe-related fields to workers and companies tables

-- Worker: Stripe Connect Express account
ALTER TABLE workers ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE;

-- Company: Stripe customer for payments
ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Contracts: link to Stripe PaymentIntent
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS stripe_payment_status TEXT DEFAULT 'none'
  CHECK (stripe_payment_status IN ('none', 'requires_payment_method', 'requires_confirmation', 'requires_capture', 'succeeded', 'canceled', 'failed'));
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS stripe_captured_at TIMESTAMPTZ;

-- Invoices: Stripe payment tracking
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_payout_status TEXT DEFAULT 'pending'
  CHECK (stripe_payout_status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled'));

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) NOT NULL,
  mission_id UUID REFERENCES missions(id) NOT NULL,
  opened_by UUID REFERENCES profiles(id) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_worker', 'resolved_company', 'escalated')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  stripe_dispute_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own disputes" ON disputes
  FOR SELECT USING (
    opened_by = auth.uid()
    OR EXISTS (SELECT 1 FROM contracts c WHERE c.id = contract_id AND (c.worker_id = auth.uid() OR c.company_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Authenticated users can create disputes" ON disputes
  FOR INSERT WITH CHECK (auth.uid() = opened_by);

CREATE POLICY "Admins can update disputes" ON disputes
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workers_stripe_account ON workers(stripe_account_id) WHERE stripe_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_payment_intent ON contracts(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status) WHERE status = 'open';
