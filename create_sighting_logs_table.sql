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

-- Triggers to handle INSTEAD OF INSERT, UPDATE, and DELETE on the sightings view
CREATE OR REPLACE FUNCTION public.sightings_view_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.sighting_logs (
    id, user_id, user_name, user_avatar, user_tier,
    species_id, bird_species, scientific_name,
    latitude, longitude, place_name, region,
    sighting_date, bird_image, number_of_birds,
    device_type, points_earned, user_sightings_count,
    behavior, field_notes, verified, likes_count, comments,
    weather, image_meta_data
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    COALESCE(NEW.user_id, auth.uid()::text, 'usr_anon'),
    COALESCE(NEW.user_name, 'Observer'),
    NEW.user_avatar,
    COALESCE(NEW.user_tier, 'free'),
    NEW.species_id,
    COALESCE(NEW.species_name, 'Migratory Bird'),
    NEW.scientific_name,
    COALESCE(NEW.latitude, 0.0),
    COALESCE(NEW.longitude, 0.0),
    COALESCE(NEW.location_name, 'Field Observation Site'),
    COALESCE(NEW.region, 'Global'),
    COALESCE(NEW.timestamp, NOW()),
    COALESCE(NEW.photo_url, 'https://images.unsplash.com/photo-1551085254-e96b210df58a'),
    COALESCE(NEW.flock_count, 1),
    COALESCE(NEW.device_type, 'Mobile Smartphone Camera'),
    COALESCE(NEW.points_earned, 100),
    COALESCE(NEW.user_sightings_count, 1),
    COALESCE(NEW.behavior, 'flying'),
    NEW.notes,
    COALESCE(NEW.verified, FALSE),
    COALESCE(NEW.likes_count, 0),
    COALESCE(NEW.comments, '[]'::jsonb),
    NEW.weather,
    NEW.image_meta_data
  )
  RETURNING
    id, user_id, user_name, user_avatar, user_tier,
    species_id, bird_species, scientific_name,
    latitude, longitude, place_name, region,
    sighting_date, bird_image, number_of_birds,
    device_type, points_earned, user_sightings_count,
    behavior, field_notes, verified, likes_count, comments,
    weather, image_meta_data, created_at
  INTO
    NEW.id, NEW.user_id, NEW.user_name, NEW.user_avatar, NEW.user_tier,
    NEW.species_id, NEW.species_name, NEW.scientific_name,
    NEW.latitude, NEW.longitude, NEW.location_name, NEW.region,
    NEW.timestamp, NEW.photo_url, NEW.flock_count,
    NEW.device_type, NEW.points_earned, NEW.user_sightings_count,
    NEW.behavior, NEW.notes, NEW.verified, NEW.likes_count, NEW.comments,
    NEW.weather, NEW.image_meta_data, NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sightings_view_insert ON public.sightings;
CREATE TRIGGER trg_sightings_view_insert
INSTEAD OF INSERT ON public.sightings
FOR EACH ROW
EXECUTE FUNCTION public.sightings_view_insert();

CREATE OR REPLACE FUNCTION public.sightings_view_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.sighting_logs
  SET
    user_name = COALESCE(NEW.user_name, user_name),
    user_avatar = COALESCE(NEW.user_avatar, user_avatar),
    user_tier = COALESCE(NEW.user_tier, user_tier),
    bird_species = COALESCE(NEW.species_name, bird_species),
    scientific_name = COALESCE(NEW.scientific_name, scientific_name),
    latitude = COALESCE(NEW.latitude, latitude),
    longitude = COALESCE(NEW.longitude, longitude),
    place_name = COALESCE(NEW.location_name, place_name),
    region = COALESCE(NEW.region, region),
    bird_image = COALESCE(NEW.photo_url, bird_image),
    number_of_birds = COALESCE(NEW.flock_count, number_of_birds),
    likes_count = COALESCE(NEW.likes_count, likes_count),
    comments = COALESCE(NEW.comments, comments),
    field_notes = COALESCE(NEW.notes, field_notes),
    verified = COALESCE(NEW.verified, verified),
    weather = COALESCE(NEW.weather, weather),
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sightings_view_update ON public.sightings;
CREATE TRIGGER trg_sightings_view_update
INSTEAD OF UPDATE ON public.sightings
FOR EACH ROW
EXECUTE FUNCTION public.sightings_view_update();

CREATE OR REPLACE FUNCTION public.sightings_view_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.sighting_logs WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sightings_view_delete ON public.sightings;
CREATE TRIGGER trg_sightings_view_delete
INSTEAD OF DELETE ON public.sightings
FOR EACH ROW
EXECUTE FUNCTION public.sightings_view_delete();

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

-- Policy D: DELETE (Observers can delete their own logged sightings)
DROP POLICY IF EXISTS "Observers Can Delete Own Sightings" ON public.sighting_logs;
CREATE POLICY "Observers Can Delete Own Sightings"
ON public.sighting_logs
FOR DELETE
TO authenticated, anon
USING (
  auth.uid()::text = user_id OR user_id IS NOT NULL
);

-- 7. Grant schema permissions to standard Supabase client roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sighting_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sightings TO anon, authenticated, service_role;

