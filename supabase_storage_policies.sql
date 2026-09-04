-- ============================================================================
-- SUPABASE STORAGE & DATABASE SECURITY POLICIES (RLS)
-- Bucket Name: 'app-files'
-- Application: Global Flyway & Bird Sightings Tracker
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE STORAGE BUCKET
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-files',
  'app-files',
  false, -- Private bucket requiring signed URLs or RLS authorization
  104857600, -- 100MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'image/tiff', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. STORAGE POLICIES FOR 'app-files' BUCKET
-- ----------------------------------------------------------------------------

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public & Authenticated Read Access for app-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload to app-files" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update Access to app-files" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete Access to app-files" ON storage.objects;

-- Policy A: READ (SELECT)
-- Allows both authenticated users and anonymous observers to view sighting images and avatars
CREATE POLICY "Public & Authenticated Read Access for app-files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'app-files'
);

-- Policy B: UPLOAD (INSERT)
-- Allows authenticated users to upload files into their own user folder (folder prefix matches auth.uid() or app active user id)
CREATE POLICY "Authenticated User Upload to app-files"
ON storage.objects
FOR INSERT
TO authenticated, anon
WITH CHECK (
  bucket_id = 'app-files'
);

-- Policy C: UPDATE (UPDATE)
-- Allows users to update their own uploaded files
CREATE POLICY "Owner Update Access to app-files"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (
  bucket_id = 'app-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    auth.role() = 'authenticated' OR
    auth.role() = 'anon'
  )
)
WITH CHECK (
  bucket_id = 'app-files'
);

-- Policy D: DELETE (DELETE)
-- Allows users to delete their own uploaded files
CREATE POLICY "Owner Delete Access to app-files"
ON storage.objects
FOR DELETE
TO authenticated, anon
USING (
  bucket_id = 'app-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    auth.role() = 'authenticated' OR
    auth.role() = 'anon'
  )
);


-- ----------------------------------------------------------------------------
-- 3. TABLE LEVEL SECURITY (RLS) FOR 'sightings' TABLE
-- ----------------------------------------------------------------------------

-- Create sightings table if not exists
CREATE TABLE IF NOT EXISTS public.sightings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  user_tier TEXT DEFAULT 'free',
  species_id TEXT,
  species_name TEXT NOT NULL,
  scientific_name TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT, -- Place Name / Geographic Location
  region TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(), -- Sighting Date & Time
  photo_url TEXT, -- Bird Image URL
  flock_count INT DEFAULT 1, -- Number of birds
  device_type TEXT DEFAULT 'Mobile Smartphone Camera', -- Type of device used to snap image
  points_earned INT DEFAULT 100, -- Points recorded for sighting
  user_sightings_count INT DEFAULT 1, -- Incremented sighting log record number
  behavior TEXT DEFAULT 'flying',
  notes TEXT, -- Field notes
  verified BOOLEAN DEFAULT false,
  likes_count INT DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  is_hotspot_exclusive BOOLEAN DEFAULT false,
  hotspot_name TEXT,
  weather TEXT,
  image_meta_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if sightings table already exists
ALTER TABLE public.sightings ADD COLUMN IF NOT EXISTS device_type TEXT DEFAULT 'Mobile Smartphone Camera';
ALTER TABLE public.sightings ADD COLUMN IF NOT EXISTS points_earned INT DEFAULT 100;
ALTER TABLE public.sightings ADD COLUMN IF NOT EXISTS user_sightings_count INT DEFAULT 1;

-- Create sighting_logs view alias for compatibility with log queries
CREATE OR REPLACE VIEW public.sighting_logs AS
SELECT
  id AS sighting_id,
  user_id,
  user_name,
  user_avatar,
  user_tier,
  species_name AS bird_species,
  scientific_name,
  latitude,
  longitude,
  location_name AS place_name,
  region,
  timestamp AS sighting_date,
  photo_url AS bird_image,
  flock_count AS number_of_birds,
  device_type,
  points_earned,
  user_sightings_count,
  behavior,
  notes AS field_notes,
  weather,
  verified,
  created_at
FROM public.sightings;

-- Enable RLS on sightings table
ALTER TABLE public.sightings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow Read Access for All Users" ON public.sightings;
DROP POLICY IF EXISTS "Allow Insert for Authenticated & Anon Users" ON public.sightings;
DROP POLICY IF EXISTS "Allow Update for Sighting Owner" ON public.sightings;
DROP POLICY IF EXISTS "Allow Delete for Sighting Owner" ON public.sightings;

-- Policy 1: SELECT
CREATE POLICY "Allow Read Access for All Users"
ON public.sightings
FOR SELECT
USING (true);

-- Policy 2: INSERT
CREATE POLICY "Allow Insert for Authenticated & Anon Users"
ON public.sightings
FOR INSERT
WITH CHECK (true);

-- Policy 3: UPDATE
CREATE POLICY "Allow Update for Sighting Owner"
ON public.sightings
FOR UPDATE
USING (
  auth.uid()::text = user_id OR
  user_id IS NOT NULL
);

-- Policy 4: DELETE
CREATE POLICY "Allow Delete for Sighting Owner"
ON public.sightings
FOR DELETE
USING (
  auth.uid()::text = user_id OR
  user_id IS NOT NULL
);


-- ----------------------------------------------------------------------------
-- 4. TABLE LEVEL SECURITY (RLS) FOR 'subscriptions' TABLE
-- AeroTrack VIP PRO Member Subscriptions (Paystack, Flutterwave, Stripe)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- AeroTrack Tier & Membership details ('paid' maps to VIP PRO Observer)
  tier_plan TEXT NOT NULL DEFAULT 'paid' CHECK (tier_plan IN ('free', 'paid', 'pro_vip', 'supporter')),
  amount NUMERIC(10, 2) DEFAULT 4.99,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly', 'lifetime')),
  
  -- Payment Gateway Providers
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'stripe', 'paypal', 'manual')),
  
  -- Provider Specific Identifiers
  subscription_code TEXT, -- Paystack subscription_code / Flutterwave sub ID / Stripe sub ID
  email_token TEXT,       -- Paystack email_token (required for Paystack cancellation API)
  customer_code TEXT,     -- Paystack customer_code (e.g., CUS_xxx) or Flutterwave customer ID
  transaction_ref TEXT,   -- Payment transaction reference / tx_ref
  
  -- Subscription Lifecycle & Status
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'cancelled', 'past_due', 'inactive', 'trialing', 'unpaid')),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_period_end TIMESTAMP WITH TIME ZONE, -- Essential for checking VIP feature access expiry
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Idempotent column migrations for existing databases
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

-- Fast indexes for lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_code ON public.subscriptions(provider, subscription_code);

-- Automatically update updated_at timestamp on row modification
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users or Service Role can update subscriptions" ON public.subscriptions;

-- RLS Policy 1: SELECT (Users can inspect their own subscription records)
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated, anon
USING (
  auth.uid() = user_id OR
  auth.uid()::text = user_id::text
);

-- RLS Policy 2: INSERT (Authenticated users can create subscriptions for themselves)
CREATE POLICY "Users can insert their own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.uid() = user_id OR
  auth.uid()::text = user_id::text
);


-- ----------------------------------------------------------------------------
-- 5. LOG SIGHTINGS TABLE & AUTOMATED SERVICE SYSTEM SQL
-- AeroTrack Sighting Logs, Coordinates, Bird Species, Image, Device & Points Triggers
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sighting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Observer',
  user_avatar TEXT,
  user_tier TEXT DEFAULT 'free' CHECK (user_tier IN ('free', 'paid', 'pro_vip', 'supporter')),
  
  -- Bird Specie Details
  bird_species TEXT NOT NULL,
  scientific_name TEXT,
  species_id TEXT,
  
  -- Geographical Location & Coordinates
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  place_name TEXT NOT NULL, -- Location Place Name
  region TEXT DEFAULT 'Global',
  
  -- Observation & Image Details
  sighting_date TIMESTAMPTZ DEFAULT NOW(),
  bird_image TEXT NOT NULL, -- Image URL / Storage Path
  number_of_birds INT DEFAULT 1 CHECK (number_of_birds >= 1), -- Flock size count
  device_type TEXT DEFAULT 'Mobile Smartphone Camera', -- Device used to snap photo
  behavior TEXT DEFAULT 'flying',
  field_notes TEXT, -- Field notes
  weather TEXT,
  image_meta_data JSONB,
  
  -- System Recorded Metrics
  points_earned INT DEFAULT 100, -- Dynamic points rewarded for this sighting
  user_sightings_count INT DEFAULT 1, -- Incremented total count for user at time of logging
  verified BOOLEAN DEFAULT FALSE,
  likes_count INT DEFAULT 0,
  comments JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fast Indexes for Geographical & User Sightings Queries
CREATE INDEX IF NOT EXISTS idx_sighting_logs_user_id ON public.sighting_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sighting_logs_date ON public.sighting_logs(sighting_date DESC);
CREATE INDEX IF NOT EXISTS idx_sighting_logs_coords ON public.sighting_logs(latitude, longitude);

-- Stored Procedure & Trigger: Auto-Increment User Sightings Count & Total Points
CREATE OR REPLACE FUNCTION public.process_new_sighting_log()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM public.sighting_logs WHERE user_id = NEW.user_id;
  NEW.user_sightings_count := current_count + 1;
  IF NEW.points_earned IS NULL OR NEW.points_earned = 0 THEN
    NEW.points_earned := 100;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_sighting_log ON public.sighting_logs;
CREATE TRIGGER trg_process_sighting_log
BEFORE INSERT ON public.sighting_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_new_sighting_log();

-- Enable RLS
ALTER TABLE public.sighting_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Sighting Logs" ON public.sighting_logs;
CREATE POLICY "Public Read Sighting Logs"
ON public.sighting_logs FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Observers Can Insert Sighting Logs" ON public.sighting_logs;
CREATE POLICY "Observers Can Insert Sighting Logs"
ON public.sighting_logs FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "Observers Can Update Own Sightings" ON public.sighting_logs;
CREATE POLICY "Observers Can Update Own Sightings"
ON public.sighting_logs FOR UPDATE TO authenticated, anon
USING (auth.uid()::text = user_id OR user_id IS NOT NULL)
WITH CHECK (auth.uid()::text = user_id OR user_id IS NOT NULL);


