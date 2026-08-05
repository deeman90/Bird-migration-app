import { supabase } from '../supabaseClient.js';
import { Sighting } from '../types';
import { uploadFileToSupabaseStorage, getSignedStorageUrl, deleteFileFromSupabaseStorage } from './storageService.js';

function mapRowToSighting(row: any): Sighting {
  return {
    id: String(row.id),
    userId: row.user_id || '',
    userName: row.user_name || 'Anonymous Observer',
    userAvatar: row.user_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    userTier: row.user_tier || 'free',
    speciesId: row.species_id || '',
    speciesName: row.species_name || '',
    scientificName: row.scientific_name || '',
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    locationName: row.location_name || '',
    region: row.region || '',
    timestamp: row.timestamp || new Date().toISOString(),
    photoUrl: row.photo_url || '',
    flockCount: Number(row.flock_count) || 1,
    behavior: row.behavior || 'flying',
    notes: row.notes || '',
    verified: Boolean(row.verified),
    likesCount: Number(row.likes_count) || 0,
    comments: Array.isArray(row.comments) ? row.comments : [],
    isHotspotExclusive: Boolean(row.is_hotspot_exclusive),
    hotspotName: row.hotspot_name || '',
    weather: row.weather || '',
    imageMetaData: row.image_meta_data || undefined,
    deviceType: row.device_type || 'Mobile Smartphone Camera',
    pointsEarned: Number(row.points_earned) || 100,
    userSightingsCount: Number(row.user_sightings_count) || 1,
  };
}

function mapSightingToRow(s: Partial<Sighting>) {
  const row: Record<string, any> = {};
  if (s.userId !== undefined) row.user_id = s.userId;
  if (s.userName !== undefined) row.user_name = s.userName;
  if (s.userAvatar !== undefined) row.user_avatar = s.userAvatar;
  if (s.userTier !== undefined) row.user_tier = s.userTier;
  if (s.speciesId !== undefined) row.species_id = s.speciesId;
  if (s.speciesName !== undefined) row.species_name = s.speciesName;
  if (s.scientificName !== undefined) row.scientific_name = s.scientificName;
  if (s.latitude !== undefined) row.latitude = s.latitude;
  if (s.longitude !== undefined) row.longitude = s.longitude;
  if (s.locationName !== undefined) row.location_name = s.locationName;
  if (s.region !== undefined) row.region = s.region;
  if (s.timestamp !== undefined) row.timestamp = s.timestamp;
  if (s.photoUrl !== undefined) row.photo_url = s.photoUrl;
  if (s.flockCount !== undefined) row.flock_count = s.flockCount;
  if (s.behavior !== undefined) row.behavior = s.behavior;
  if (s.notes !== undefined) row.notes = s.notes;
  if (s.verified !== undefined) row.verified = s.verified;
  if (s.likesCount !== undefined) row.likes_count = s.likesCount;
  if (s.comments !== undefined) row.comments = s.comments;
  if (s.isHotspotExclusive !== undefined) row.is_hotspot_exclusive = s.isHotspotExclusive;
  if (s.hotspotName !== undefined) row.hotspot_name = s.hotspotName;
  if (s.weather !== undefined) row.weather = s.weather;
  if (s.imageMetaData !== undefined) row.image_meta_data = s.imageMetaData;
  if (s.deviceType !== undefined) row.device_type = s.deviceType;
  if (s.pointsEarned !== undefined) row.points_earned = s.pointsEarned;
  if (s.userSightingsCount !== undefined) row.user_sightings_count = s.userSightingsCount;
  return row;
}

export async function fetchSightingsFromSupabase(): Promise<{ data: Sighting[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('sightings')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error or table does not exist yet:', error.message);
      return { data: null, error };
    }

    if (data) {
      const sightings = await Promise.all(
        data.map(async (row) => {
          const sighting = mapRowToSighting(row);
          if (sighting.photoUrl && !sighting.photoUrl.startsWith('http') && !sighting.photoUrl.startsWith('data:')) {
            sighting.photoUrl = await getSignedStorageUrl(sighting.photoUrl);
          }
          if (sighting.userAvatar && !sighting.userAvatar.startsWith('http') && !sighting.userAvatar.startsWith('data:')) {
            sighting.userAvatar = await getSignedStorageUrl(sighting.userAvatar);
          }
          return sighting;
        })
      );
      return { data: sightings, error: null };
    }
    return { data: [], error: null };
  } catch (err) {
    console.warn('Supabase client error:', err);
    return { data: null, error: err };
  }
}

export async function createSightingInSupabase(sighting: Sighting): Promise<{ data: Sighting | null; error: any }> {
  try {
    const payload = mapSightingToRow(sighting);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sighting.id);
    if (isUuid) {
      payload.id = sighting.id;
    }

    const { data, error } = await supabase
      .from('sightings')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase insert error:', error.message);
      return { data: null, error };
    }

    const createdSighting = mapRowToSighting(data);
    if (createdSighting.photoUrl && !createdSighting.photoUrl.startsWith('http') && !createdSighting.photoUrl.startsWith('data:')) {
      createdSighting.photoUrl = await getSignedStorageUrl(createdSighting.photoUrl);
    }
    return { data: createdSighting, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function updateSightingInSupabase(id: string, updates: Partial<Sighting>): Promise<{ data: Sighting | null; error: any }> {
  try {
    const payload = mapSightingToRow(updates);
    const { data, error } = await supabase
      .from('sightings')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.warn('Supabase update error:', error.message);
      return { data: null, error };
    }

    const updated = mapRowToSighting(data);
    if (updated.photoUrl && !updated.photoUrl.startsWith('http') && !updated.photoUrl.startsWith('data:')) {
      updated.photoUrl = await getSignedStorageUrl(updated.photoUrl);
    }
    return { data: updated, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteSightingInSupabase(id: string): Promise<{ success: boolean; error: any }> {
  try {
    // 1. Fetch existing photo_url to delete from Supabase Storage 'app-files' bucket
    const { data: existing } = await supabase
      .from('sightings')
      .select('photo_url')
      .eq('id', id)
      .single();

    if (existing?.photo_url) {
      await deleteFileFromSupabaseStorage(existing.photo_url);
    }

    // 2. Remove record reference from database
    const { error } = await supabase
      .from('sightings')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase delete error:', error.message);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err };
  }
}

export async function fetchUserSightingsCountFromSupabase(): Promise<number> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return 0;
    }
    const { count, error } = await supabase
      .from('sightings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.warn('Supabase count error:', error.message);
      return 0;
    }
    return count ?? 0;
  } catch (err) {
    console.warn('Supabase count catch error:', err);
    return 0;
  }
}

export async function uploadSightingPhotoToSupabase(file: File, userId: string, sightingId = 'new'): Promise<{ filePath: string | null; signedUrl: string | null; error: any }> {
  const result = await uploadFileToSupabaseStorage({
    file,
    userId,
    featureName: 'sightings',
    itemId: sightingId,
  });
  return {
    filePath: result.filePath,
    signedUrl: result.signedUrl,
    error: result.error,
  };
}

