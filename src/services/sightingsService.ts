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
    speciesName: row.species_name || row.bird_species || 'Migratory Bird',
    scientificName: row.scientific_name || '',
    latitude: Number(row.latitude) || 0,
    longitude: Number(row.longitude) || 0,
    locationName: row.location_name || row.place_name || 'Field Observation Site',
    region: row.region || 'Global',
    timestamp: row.timestamp || row.sighting_date || row.created_at || new Date().toISOString(),
    photoUrl: row.photo_url || row.bird_image || '',
    flockCount: Number(row.flock_count ?? row.number_of_birds ?? 1),
    behavior: row.behavior || 'flying',
    notes: row.notes || row.field_notes || '',
    verified: Boolean(row.verified),
    likesCount: Number(row.likes_count) || 0,
    comments: Array.isArray(row.comments) ? row.comments : [],
    isHotspotExclusive: Boolean(row.is_hotspot_exclusive),
    hotspotName: row.hotspot_name || '',
    weather: row.weather || '',
    imageMetaData: row.image_meta_data || undefined,
    imageHash: row.image_meta_data?.imageHash || row.image_hash || undefined,
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
  if (s.imageMetaData !== undefined || s.imageHash !== undefined) {
    row.image_meta_data = {
      ...(s.imageMetaData || {}),
      imageHash: s.imageHash || s.imageMetaData?.imageHash,
    };
  }
  if (s.deviceType !== undefined) row.device_type = s.deviceType;
  if (s.pointsEarned !== undefined) row.points_earned = s.pointsEarned;
  if (s.userSightingsCount !== undefined) row.user_sightings_count = s.userSightingsCount;
  return row;
}

function mapSightingToLogPayload(s: Partial<Sighting>) {
  const row: Record<string, any> = {};
  if (s.userId !== undefined) row.user_id = s.userId;
  if (s.userName !== undefined) row.user_name = s.userName;
  if (s.userAvatar !== undefined) row.user_avatar = s.userAvatar;
  if (s.userTier !== undefined) row.user_tier = s.userTier;
  if (s.speciesId !== undefined) row.species_id = s.speciesId;
  if (s.speciesName !== undefined) row.bird_species = s.speciesName;
  if (s.scientificName !== undefined) row.scientific_name = s.scientificName;
  if (s.latitude !== undefined) row.latitude = s.latitude;
  if (s.longitude !== undefined) row.longitude = s.longitude;
  if (s.locationName !== undefined) row.place_name = s.locationName;
  if (s.region !== undefined) row.region = s.region;
  if (s.timestamp !== undefined) row.sighting_date = s.timestamp;
  if (s.photoUrl !== undefined) row.bird_image = s.photoUrl;
  if (s.flockCount !== undefined) row.number_of_birds = s.flockCount;
  if (s.behavior !== undefined) row.behavior = s.behavior;
  if (s.notes !== undefined) row.field_notes = s.notes;
  if (s.verified !== undefined) row.verified = s.verified;
  if (s.likesCount !== undefined) row.likes_count = s.likesCount;
  if (s.comments !== undefined) row.comments = s.comments;
  if (s.weather !== undefined) row.weather = s.weather;
  if (s.imageMetaData !== undefined || s.imageHash !== undefined) {
    row.image_meta_data = {
      ...(s.imageMetaData || {}),
      imageHash: s.imageHash || s.imageMetaData?.imageHash,
    };
  }
  if (s.deviceType !== undefined) row.device_type = s.deviceType;
  if (s.pointsEarned !== undefined) row.points_earned = s.pointsEarned;
  if (s.userSightingsCount !== undefined) row.user_sightings_count = s.userSightingsCount;
  return row;
}

export async function fetchSightingsFromSupabase(): Promise<{ data: Sighting[] | null; error: any }> {
  try {
    let { data, error } = await supabase
      .from('sightings')
      .select('*')
      .order('timestamp', { ascending: false });

    // Fallback: query 'sighting_logs' if 'sightings' view is missing or errors
    if (error) {
      console.warn('Sightings view query notice, checking "sighting_logs":', error.message);
      const fallbackResult = await supabase
        .from('sighting_logs')
        .select('*')
        .order('sighting_date', { ascending: false });
      
      if (!fallbackResult.error && fallbackResult.data) {
        data = fallbackResult.data;
        error = null;
      }
    }

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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sighting.id);

    // Ensure non-null required fields
    const safeSighting: Sighting = {
      ...sighting,
      speciesName: sighting.speciesName || 'Migratory Bird',
      locationName: sighting.locationName || 'Field Observation Site',
      photoUrl: sighting.photoUrl || 'https://images.unsplash.com/photo-1551085254-e96b210df58a',
      timestamp: sighting.timestamp || new Date().toISOString(),
      userId: sighting.userId || 'usr_anon',
    };

    // Attempt 1: Insert into 'sightings' (view/table)
    const viewPayload = mapSightingToRow(safeSighting);
    if (isUuid) {
      viewPayload.id = safeSighting.id;
    }

    let { data, error } = await supabase
      .from('sightings')
      .insert([viewPayload])
      .select('*')
      .maybeSingle();

    // Fallback 1: If 'sightings' view is missing or rejected, insert into 'sighting_logs' directly
    if (error) {
      console.warn('Supabase insert into sightings notice, falling back to sighting_logs:', error.message);
      const logPayload = mapSightingToLogPayload(safeSighting);
      if (isUuid) {
        logPayload.id = safeSighting.id;
      }
      const fallbackResult = await supabase
        .from('sighting_logs')
        .insert([logPayload])
        .select('*')
        .maybeSingle();

      if (!fallbackResult.error && fallbackResult.data) {
        data = fallbackResult.data;
        error = null;
      } else if (fallbackResult.error) {
        console.warn('Supabase insert into sighting_logs also errored:', fallbackResult.error.message);
        error = fallbackResult.error;
      }
    }

    if (error) {
      console.warn('Supabase insert error:', error.message);
      return { data: null, error };
    }

    if (!data) {
      return { data: safeSighting, error: null };
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
    const viewPayload = mapSightingToRow(updates);
    let { data, error } = await supabase
      .from('sightings')
      .update(viewPayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    // Fallback: update 'sighting_logs' table directly
    if (error) {
      const logPayload = mapSightingToLogPayload(updates);
      const fallbackResult = await supabase
        .from('sighting_logs')
        .update(logPayload)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      
      if (!fallbackResult.error) {
        data = fallbackResult.data;
        error = null;
      }
    }

    if (error) {
      console.warn('Supabase update error:', error.message);
      return { data: null, error };
    }

    if (data) {
      const updated = mapRowToSighting(data);
      if (updated.photoUrl && !updated.photoUrl.startsWith('http') && !updated.photoUrl.startsWith('data:')) {
        updated.photoUrl = await getSignedStorageUrl(updated.photoUrl);
      }
      return { data: updated, error: null };
    }

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

export async function deleteSightingInSupabase(id: string): Promise<{ success: boolean; error: any }> {
  try {
    // 1. Fetch existing photo_url to delete from Supabase Storage 'app-files' bucket
    let existingPhoto: string | null = null;
    const { data: existingView } = await supabase
      .from('sightings')
      .select('photo_url')
      .eq('id', id)
      .maybeSingle();

    if (existingView?.photo_url) {
      existingPhoto = existingView.photo_url;
    } else {
      const { data: existingLog } = await supabase
        .from('sighting_logs')
        .select('bird_image')
        .eq('id', id)
        .maybeSingle();
      if (existingLog?.bird_image) {
        existingPhoto = existingLog.bird_image;
      }
    }

    if (existingPhoto) {
      await deleteFileFromSupabaseStorage(existingPhoto).catch(() => {});
    }

    // 2. Remove record reference from database (both view and base table)
    let { error } = await supabase
      .from('sightings')
      .delete()
      .eq('id', id);

    if (error) {
      const fallbackResult = await supabase
        .from('sighting_logs')
        .delete()
        .eq('id', id);
      error = fallbackResult.error;
    } else {
      // Also ensure deletion on base table if view doesn't have an INSTEAD OF trigger
      try {
        await supabase
          .from('sighting_logs')
          .delete()
          .eq('id', id);
      } catch (logErr) {
        // Ignored if base table already deleted via cascade/view
      }
    }

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

