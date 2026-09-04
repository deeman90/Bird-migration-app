import { supabase } from '../supabaseClient.js';
import { User } from '../types.js';
import { getSignedStorageUrl } from './storageService.js';

export function mapRowToUserProfile(row: any): User {
  return {
    id: String(row.id || ''),
    name: row.name || 'Observer',
    email: row.email || '',
    phone: row.phone || '',
    avatar: row.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    region: row.region || 'North America',
    tier: (row.tier === 'paid' || row.tier === 'pro_vip') ? 'paid' : 'free',
    sightingsCount: Number(row.sightings_count) || 0,
    rareSpeciesCount: Number(row.rare_species_count) || 0,
    points: Number(row.points) || 0,
    badges: Array.isArray(row.badges) ? row.badges : [],
    bio: row.bio || '',
    joinedDate: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'July 2026',
    
    // Address Details
    address: {
      street: row.address_street || '',
      city: row.address_city || '',
      state: row.address_state || '',
      postalCode: row.address_postal_code || '',
      country: row.address_country || '',
    },

    // Birder Gear & Details
    favoriteBird: row.favorite_bird || '',
    cameraGear: row.camera_gear || '',

    // Social Links
    socialWebsite: row.social_website || '',
    socialTwitter: row.social_twitter || '',
    socialInstagram: row.social_instagram || '',

    // Preferences
    emailNotifications: row.email_notifications || {
      migrationAlerts: true,
      communityActivity: true,
      weeklyDigest: false,
    },
    privacyMode: row.privacy_mode || 'public',

    // Referral Program
    referralCode: row.referral_code || undefined,
    referredCount: Number(row.referred_count) || 0,

    // Restrictions
    restrictedUntil: row.restricted_until || undefined,
    restrictionReason: row.restriction_reason || undefined,
    violationCount: Number(row.violation_count) || 0,
  };
}

export function mapUserToProfileRow(user: Partial<User>) {
  const row: Record<string, any> = {};
  if (user.id !== undefined) row.id = user.id;
  if (user.email !== undefined) row.email = user.email;
  if (user.name !== undefined) row.name = user.name;
  if (user.avatar !== undefined) row.avatar_url = user.avatar;
  if (user.phone !== undefined) row.phone = user.phone;
  if (user.region !== undefined) row.region = user.region;
  if (user.tier !== undefined) row.tier = user.tier;
  if (user.bio !== undefined) row.bio = user.bio;

  // Personal Address Details
  if (user.address !== undefined) {
    row.address_street = user.address.street || '';
    row.address_city = user.address.city || '';
    row.address_state = user.address.state || '';
    row.address_postal_code = user.address.postalCode || '';
    row.address_country = user.address.country || '';
  }

  // Birder Gear & Details
  if (user.favoriteBird !== undefined) row.favorite_bird = user.favoriteBird;
  if (user.cameraGear !== undefined) row.camera_gear = user.cameraGear;

  // Social Links
  if (user.socialWebsite !== undefined) row.social_website = user.socialWebsite;
  if (user.socialTwitter !== undefined) row.social_twitter = user.socialTwitter;
  if (user.socialInstagram !== undefined) row.social_instagram = user.socialInstagram;

  // Preferences
  if (user.emailNotifications !== undefined) row.email_notifications = user.emailNotifications;
  if (user.privacyMode !== undefined) row.privacy_mode = user.privacyMode;

  // Metrics
  if (user.points !== undefined) row.points = user.points;
  if (user.sightingsCount !== undefined) row.sightings_count = user.sightingsCount;
  if (user.rareSpeciesCount !== undefined) row.rare_species_count = user.rareSpeciesCount;
  if (user.badges !== undefined) row.badges = user.badges;
  if (user.referralCode !== undefined) row.referral_code = user.referralCode;
  if (user.referredCount !== undefined) row.referred_count = user.referredCount;

  // Restrictions
  if (user.restrictedUntil !== undefined) row.restricted_until = user.restrictedUntil;
  if (user.restrictionReason !== undefined) row.restriction_reason = user.restrictionReason;
  if (user.violationCount !== undefined) row.violation_count = user.violationCount;

  row.updated_at = new Date().toISOString();
  return row;
}

/**
 * Fetches a user's personal profile data from the Supabase database.
 * Supports both 'profiles' and 'users' table names.
 */
export async function fetchUserProfile(userId: string): Promise<{ data: User | null; error: any }> {
  if (!userId) return { data: null, error: new Error('User ID is required') };

  try {
    // Attempt 1: query 'profiles' table
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Fallback: query 'users' view/table if 'profiles' returned a schema cache error
    if (error && error.code === 'PGRST205') {
      const fallbackResult = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.warn('Supabase fetchUserProfile notice:', error.message);
      return { data: null, error };
    }

    if (data) {
      const mappedUser = mapRowToUserProfile(data);
      // Resolve avatar signed URL if it's a private storage path
      if (mappedUser.avatar && !mappedUser.avatar.startsWith('http') && !mappedUser.avatar.startsWith('data:')) {
        mappedUser.avatar = await getSignedStorageUrl(mappedUser.avatar);
      }
      return { data: mappedUser, error: null };
    }

    return { data: null, error: null };
  } catch (err) {
    console.warn('Supabase fetchUserProfile exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Upserts a user's personal profile (profile picture, name, address, bio, gear) into Supabase.
 */
export async function saveUserProfile(user: User): Promise<{ data: User | null; error: any; isTableMissing?: boolean }> {
  if (!user || !user.id) {
    return { data: null, error: new Error('Cannot save user profile without user ID') };
  }

  try {
    const payload = mapUserToProfileRow(user);

    // Attempt 1: upsert into 'profiles'
    let { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    // Fallback: upsert into 'users'
    if (error && error.code === 'PGRST205') {
      const fallbackResult = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .maybeSingle();
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      const isMissing = error.code === 'PGRST205' || error.message?.includes('Could not find the table');
      if (isMissing) {
        console.warn('Notice: Supabase "profiles" table not yet created in PostgreSQL schema. Run create_user_profiles_table.sql in Supabase SQL editor.');
      } else {
        console.warn('Supabase saveUserProfile error:', error.message);
      }
      return { data: null, error, isTableMissing: isMissing };
    }

    if (data) {
      const savedUser = mapRowToUserProfile(data);
      return { data: savedUser, error: null };
    }

    return { data: user, error: null };
  } catch (err: any) {
    console.warn('Supabase saveUserProfile exception:', err);
    return { data: null, error: err, isTableMissing: false };
  }
}

export const CREATE_USER_PROFILES_SQL = `-- ============================================================================
-- BIRD MIGRATION APP (BMA): USER PROFILES TABLE & PERSONAL DATA SCHEMA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/cgqsmdnwzrazyyhkdibn/sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT NOT NULL DEFAULT 'Observer',
  avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
  phone TEXT,
  region TEXT DEFAULT 'North America',
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'pro_vip', 'supporter')),
  bio TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_postal_code TEXT,
  address_country TEXT,
  favorite_bird TEXT,
  camera_gear TEXT,
  social_website TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  privacy_mode TEXT DEFAULT 'public',
  email_notifications JSONB DEFAULT '{"migrationAlerts": true, "communityActivity": true, "weeklyDigest": false}'::jsonb,
  points INT DEFAULT 0,
  sightings_count INT DEFAULT 0,
  rare_species_count INT DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  referral_code TEXT,
  referred_count INT DEFAULT 0,
  restricted_until TIMESTAMPTZ,
  restriction_reason TEXT,
  violation_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Profiles Read" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users Can Insert Own Profile" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "Users Can Update Own Profile" ON public.profiles FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Compatibility View
CREATE OR REPLACE VIEW public.users AS SELECT * FROM public.profiles;
`;
