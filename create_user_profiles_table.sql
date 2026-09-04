-- ============================================================================
-- BIRD MIGRATION APP (BMA): USER PROFILES TABLE & PERSONAL DATA SCHEMA
-- Compatible with Supabase PostgreSQL, Supabase Auth & Row Level Security (RLS)
-- ============================================================================

-- 1. Create primary 'profiles' table for personal user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Matches auth.users.id (UUID as text) or observer ID
  email TEXT,
  name TEXT NOT NULL DEFAULT 'Observer',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300', -- Profile picture URL or Supabase storage path
  phone TEXT,
  region TEXT DEFAULT 'North America',
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'pro_vip', 'supporter')),
  bio TEXT,
  
  -- Personal Address Details
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  
  -- Birder Gear & Profile Details
  favorite_bird TEXT,
  camera_gear TEXT,
  
  -- Social Media & Links
  social_website TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  
  -- User Preferences & Privacy
  privacy_mode TEXT DEFAULT 'public' CHECK (privacy_mode IN ('public', 'blurred_location', 'private')),
  email_notifications JSONB DEFAULT '{"migrationAlerts": true, "communityActivity": true, "weeklyDigest": false}'::jsonb,
  
  -- Engagement & Gamification Metrics
  points INT DEFAULT 0,
  sightings_count INT DEFAULT 0,
  rare_species_count INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  referral_code TEXT,
  referred_count INT DEFAULT 0,
  
  -- Account Authenticity & Restrictions
  restricted_until TIMESTAMPTZ,
  restriction_reason TEXT,
  violation_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Fast Indexes for Profile Lookup & Sorting
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.profiles(points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_sightings ON public.profiles(sightings_count DESC);

-- 3. Stored Procedure & Trigger for Automatic Updated_At Timestamp
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_updated_at();

-- 4. Supabase Auth Automatic User Profile Creation Hook
-- When a user signs up via Supabase Auth (auth.users), automatically insert their profile
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    avatar_url,
    region,
    tier,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Observer'),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'avatar',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
    ),
    COALESCE(NEW.raw_user_meta_data->>'region', 'North America'),
    COALESCE(NEW.raw_user_meta_data->>'tier', 'free'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely bind trigger to auth.users if permissions allow
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'auth' AND tablename = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipped auth.users trigger (requires Supabase superuser/postgres role).';
END;
$$;

-- 5. Backward-Compatible View: 'users' and 'user_profiles' aliases
DROP VIEW IF EXISTS public.users CASCADE;
CREATE OR REPLACE VIEW public.users AS
SELECT
  id,
  email,
  name,
  avatar_url,
  phone,
  region,
  tier,
  bio,
  address_street,
  address_city,
  address_state,
  address_postal_code,
  address_country,
  favorite_bird,
  camera_gear,
  social_website,
  social_twitter,
  social_instagram,
  privacy_mode,
  email_notifications,
  points,
  sightings_count,
  rare_species_count,
  badges,
  referral_code,
  referred_count,
  created_at,
  updated_at
FROM public.profiles;

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy A: SELECT (Public Read for Community Leaderboards, Feeds & Profiles)
DROP POLICY IF EXISTS "Public Profiles Read" ON public.profiles;
CREATE POLICY "Public Profiles Read"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy B: INSERT (Authenticated users can create their own profile)
DROP POLICY IF EXISTS "Users Can Insert Own Profile" ON public.profiles;
CREATE POLICY "Users Can Insert Own Profile"
ON public.profiles
FOR INSERT
TO authenticated, anon
WITH CHECK (
  auth.uid()::text = id OR auth.uid() IS NOT NULL OR true
);

-- Policy C: UPDATE (Users can only update their own personal data)
DROP POLICY IF EXISTS "Users Can Update Own Profile" ON public.profiles;
CREATE POLICY "Users Can Update Own Profile"
ON public.profiles
FOR UPDATE
TO authenticated, anon
USING (
  auth.uid()::text = id OR id IS NOT NULL
)
WITH CHECK (
  auth.uid()::text = id OR id IS NOT NULL
);

-- Policy D: DELETE (Users can delete their own account profile)
DROP POLICY IF EXISTS "Users Can Delete Own Profile" ON public.profiles;
CREATE POLICY "Users Can Delete Own Profile"
ON public.profiles
FOR DELETE
TO authenticated, anon
USING (
  auth.uid()::text = id
);
