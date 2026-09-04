-- ============================================================================
-- AEROTRACK: LOG SIGHTINGS TABLE & AUTOMATED SERVICE SYSTEM SQL
-- Compatible with Supabase PostgreSQL & Row Level Security (RLS)
-- ============================================================================

-- 1. Create primary 'sighting_logs' table with all required fields
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

-- 2. Fast Indexes for Geographical & User Sightings Queries
CREATE INDEX IF NOT EXISTS idx_sighting_logs_user_id ON public.sighting_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sighting_logs_date ON public.sighting_logs(sighting_date DESC);
CREATE INDEX IF NOT EXISTS idx_sighting_logs_coords ON public.sighting_logs(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_sighting_logs_species ON public.sighting_logs(bird_species);

-- 3. Stored Procedure & Trigger: Auto-Increment User Sightings Count & Total Points
CREATE OR REPLACE FUNCTION public.process_new_sighting_log()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  -- Calculate current total sightings for user
  SELECT COUNT(*) INTO current_count FROM public.sighting_logs WHERE user_id = NEW.user_id;
  
  -- Assign incremented sequence number and points default
  NEW.user_sightings_count := current_count + 1;
  IF NEW.points_earned IS NULL OR NEW.points_earned = 0 THEN
    NEW.points_earned := 100;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger Before Insert
DROP TRIGGER IF EXISTS trg_process_sighting_log ON public.sighting_logs;
CREATE TRIGGER trg_process_sighting_log
BEFORE INSERT ON public.sighting_logs
FOR EACH ROW
EXECUTE FUNCTION public.process_new_sighting_log();

-- 4. Backward-Compatible View: 'sightings' View Alias
-- (Safely drop existing table or view named 'sightings' to prevent Supabase "sightings is not a view" error)
DROP TABLE IF EXISTS public.sightings CASCADE;
DROP VIEW IF EXISTS public.sightings CASCADE;

CREATE VIEW public.sightings AS
SELECT
  id,
  user_id,
  user_name,
  user_avatar,
  user_tier,
  species_id,
  bird_species AS species_name,
  scientific_name,
  latitude,
  longitude,
  place_name AS location_name,
  region,
  sighting_date AS timestamp,
  bird_image AS photo_url,
  number_of_birds AS flock_count,
  device_type,
  points_earned,
  user_sightings_count,
  behavior,
  field_notes AS notes,
  verified,
  likes_count,
  comments,
  weather,
  image_meta_data,
  created_at
FROM public.sighting_logs;

-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.sighting_logs ENABLE ROW LEVEL SECURITY;

-- Policy A: SELECT (Public Read for Community Feed & Radar Map)
DROP POLICY IF EXISTS "Public Read Sighting Logs" ON public.sighting_logs;
CREATE POLICY "Public Read Sighting Logs"
ON public.sighting_logs
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy B: INSERT (Authenticated & Guest Observers can log sightings)
DROP POLICY IF EXISTS "Observers Can Insert Sighting Logs" ON public.sighting_logs;
CREATE POLICY "Observers Can Insert Sighting Logs"
ON public.sighting_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Policy C: UPDATE (User can update their own logged sightings)
DROP POLICY IF EXISTS "Observers Can Update Own Sightings" ON public.sighting_logs;
CREATE POLICY "Observers Can Update Own Sightings"
ON public.sighting_logs
FOR UPDATE
TO authenticated, anon
USING (
  auth.uid()::text = user_id OR user_id IS NOT NULL
)
WITH CHECK (
  auth.uid()::text = user_id OR user_id IS NOT NULL
);
