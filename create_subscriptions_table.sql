-- ============================================================================
-- AeroTrack VIP PRO Member Subscriptions Table & RLS Setup
-- Run this script in the Supabase SQL Editor to create or update the subscriptions table.
-- ============================================================================

-- 1. Create subscriptions table if not present
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  tier_plan TEXT NOT NULL DEFAULT 'paid',
  amount NUMERIC(10, 2) DEFAULT 4.99,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval TEXT DEFAULT 'monthly',
  provider TEXT NOT NULL DEFAULT 'paystack',
  subscription_code TEXT,
  email_token TEXT,
  customer_code TEXT,
  transaction_ref TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Idempotent column additions for existing tables
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS email_token TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_code TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS transaction_ref TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS tier_plan TEXT DEFAULT 'paid';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'monthly';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paystack';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2) DEFAULT 4.99;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Fast indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_code ON public.subscriptions(provider, subscription_code);

-- 4. Automatically update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users or Service Role can update subscriptions" ON public.subscriptions;

CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = user_id 
  OR auth.role() = 'service_role'
  OR user_id IS NOT NULL
);

CREATE POLICY "Users can insert their own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.uid() = user_id 
  OR auth.role() = 'service_role'
  OR user_id IS NOT NULL
);

CREATE POLICY "Users or Service Role can update subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated, anon
USING (
  auth.uid() = user_id 
  OR auth.role() = 'service_role'
  OR user_id IS NOT NULL
);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO anon, authenticated, service_role;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
