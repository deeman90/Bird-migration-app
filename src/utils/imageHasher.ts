import { Sighting } from '../types';
import { supabase } from '../supabaseClient.js';

/**
 * Computes a SHA-256 hash or canonical fingerprint for an image input
 * (File, Blob, ArrayBuffer, base64 Data URL, or HTTP URL).
 */
export async function computeImageHash(input: File | Blob | ArrayBuffer | string): Promise<string> {
  try {
    let arrayBuffer: ArrayBuffer | null = null;

    if (input instanceof File || input instanceof Blob) {
      arrayBuffer = await input.arrayBuffer();
    } else if (input instanceof ArrayBuffer) {
      arrayBuffer = input;
    } else if (typeof input === 'string') {
      const trimmed = input.trim();
      if (!trimmed) return '';

      if (trimmed.startsWith('data:')) {
        // Base64 Data URL
        const base64Data = trimmed.split(',')[1] || trimmed;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        // Canonicalize URL by stripping query parameters and signed tokens
        const canonicalUrl = trimmed.split('?')[0].trim().toLowerCase();
        const encoder = new TextEncoder();
        arrayBuffer = encoder.encode(canonicalUrl).buffer;
      }
    }

    if (arrayBuffer && typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback if ArrayBuffer or crypto.subtle is unavailable
    if (typeof input === 'string') {
      return input.split('?')[0].trim().toLowerCase();
    }
    return '';
  } catch (err) {
    console.warn('Error computing image hash:', err);
    if (typeof input === 'string') {
      return input.split('?')[0].trim().toLowerCase();
    }
    return '';
  }
}

/**
 * Extracts a clean canonical image identifier or URL string without signed query tokens.
 */
export function getCanonicalPhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  return url.split('?')[0].trim().toLowerCase();
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  message?: string;
  matchedSightingId?: string;
  matchedSpeciesName?: string;
}

/**
 * Checks if an image (by File, Data URL, or photo URL) has ALREADY been uploaded
 * by the user or exists in previous sightings.
 */
export async function checkDuplicateImage({
  imageInput,
  currentUserId,
  existingSightings = [],
}: {
  imageInput: File | Blob | string;
  currentUserId: string;
  existingSightings?: Sighting[];
}): Promise<DuplicateCheckResult> {
  try {
    // 1. Compute hash of incoming image
    const newHash = await computeImageHash(imageInput);
    const canonicalInputUrl = typeof imageInput === 'string' ? getCanonicalPhotoUrl(imageInput) : '';

    // 2. Check in-memory existing sightings
    for (const sighting of existingSightings) {
      const isSameUser =
        sighting.userId === currentUserId ||
        (sighting.userId && currentUserId && sighting.userId.toLowerCase() === currentUserId.toLowerCase());

      const existingCanonicalUrl = getCanonicalPhotoUrl(sighting.photoUrl || '');
      const existingHash = sighting.imageMetaData?.imageHash || sighting.imageHash;

      // Match by SHA-256 hash or canonical photo URL
      const hashMatch = newHash && existingHash && newHash === existingHash;
      const urlMatch =
        canonicalInputUrl &&
        existingCanonicalUrl &&
        canonicalInputUrl === existingCanonicalUrl &&
        canonicalInputUrl.length > 10;

      if (hashMatch || urlMatch) {
        return {
          isDuplicate: true,
          message: `Duplicate Image Detected: You have already uploaded this exact same image in a previous sighting log (${
            sighting.speciesName || 'Bird Sighting'
          }). Duplicate uploads are prohibited and no points will be recorded.`,
          matchedSightingId: sighting.id,
          matchedSpeciesName: sighting.speciesName,
        };
      }
    }

    // 3. Query Supabase database for persistent duplicate detection
    try {
      const { data: dbData, error } = await supabase
        .from('sighting_logs')
        .select('id, bird_species, bird_image, image_meta_data')
        .eq('user_id', currentUserId);

      if (!error && dbData && dbData.length > 0) {
        for (const row of dbData) {
          const dbCanonicalUrl = getCanonicalPhotoUrl(row.bird_image || '');
          const dbHash = row.image_meta_data?.imageHash;

          const hashMatch = newHash && dbHash && newHash === dbHash;
          const urlMatch =
            canonicalInputUrl &&
            dbCanonicalUrl &&
            canonicalInputUrl === dbCanonicalUrl &&
            canonicalInputUrl.length > 10;

          if (hashMatch || urlMatch) {
            return {
              isDuplicate: true,
              message: `Duplicate Image Detected: You have already uploaded this exact same image in a previous sighting log (${
                row.bird_species || 'Bird Sighting'
              }). Duplicate uploads are prohibited and no points will be recorded.`,
              matchedSightingId: String(row.id),
              matchedSpeciesName: row.bird_species,
            };
          }
        }
      }
    } catch (dbErr) {
      console.warn('Database duplicate check warning:', dbErr);
    }

    return { isDuplicate: false };
  } catch (err) {
    console.error('Error checking duplicate image:', err);
    return { isDuplicate: false };
  }
}
