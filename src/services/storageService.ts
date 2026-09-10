import { supabase } from '../supabaseClient';

export const BUCKET_NAME = 'app-files';

export interface UploadResult {
  filePath: string | null;
  signedUrl: string | null;
  error: any;
}

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB limit
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
  'image/tiff',
  'image/svg+xml',
];

// In-memory cache to guarantee single-image upload policy:
// If there are two or more sightings on one image, do NOT upload multiple photos; upload only one image.
const uploadedImageCache = new Map<string, UploadResult>();
const inFlightUploads = new Map<string, Promise<UploadResult>>();

/**
 * Computes a robust fingerprint/hash for a File to ensure idempotency
 */
async function getFileFingerprint(file: File): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Sample first 1MB of file for fast SHA-256 fingerprinting
      const slice = file.slice(0, 1024 * 1024);
      const arrayBuffer = await slice.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      return `${file.size}_${hex}`;
    }
  } catch (err) {
    console.warn('Fingerprint subtle crypto error:', err);
  }
  const cleanName = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${cleanName}_${file.size}_${file.lastModified}`;
}

/**
 * Checks session storage or in-memory cache for an existing upload of this file
 */
function getCachedUpload(fingerprint: string): UploadResult | null {
  if (uploadedImageCache.has(fingerprint)) {
    return uploadedImageCache.get(fingerprint)!;
  }
  try {
    const sessionItem = sessionStorage.getItem(`aerotrack_upload_${fingerprint}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (parsed && parsed.filePath && parsed.signedUrl) {
        uploadedImageCache.set(fingerprint, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore session storage errors
  }
  return null;
}

function setCachedUpload(fingerprint: string, result: UploadResult) {
  if (!result.filePath || !result.signedUrl) return;
  uploadedImageCache.set(fingerprint, result);
  try {
    sessionStorage.setItem(
      `aerotrack_upload_${fingerprint}`,
      JSON.stringify({
        filePath: result.filePath,
        signedUrl: result.signedUrl,
        error: null,
      })
    );
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Uploads a file to Supabase Storage in bucket 'app-files'.
 * Enforces single-image upload policy: If multiple sightings use the same photo,
 * only ONE image file is uploaded and reused across all sightings.
 */
export async function uploadFileToSupabaseStorage({
  file,
  userId,
  featureName,
  itemId = 'default',
}: {
  file: File;
  userId?: string;
  featureName: string;
  itemId?: string;
}): Promise<UploadResult> {
  try {
    // 0. Strict Null & Empty Image Checks
    if (!file) {
      const errorMsg = 'A null or empty image cannot be uploaded.';
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

    if (file.size === 0) {
      const errorMsg = 'An empty image file (0 bytes) cannot be uploaded.';
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

    // 1. Strict 50MB file size limit check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errorMsg = `File size (${sizeMB}MB) exceeds the maximum allowed limit of 50MB.`;
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

    // 2. Allowed image MIME types check
    if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
      const errorMsg = `Invalid image type (${file.type}). Allowed image types: JPEG, PNG, WebP, HEIC, GIF, TIFF, SVG.`;
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

    // 3. Single-image deduplication check:
    // If this image was already uploaded or is currently in flight, reuse it!
    const fingerprint = await getFileFingerprint(file);
    const existingCache = getCachedUpload(fingerprint);
    if (existingCache && existingCache.signedUrl) {
      console.log(`[Storage] Single-image policy enforced: Reusing existing uploaded photo for fingerprint ${fingerprint}. No duplicate upload performed.`);
      return existingCache;
    }

    // If an upload for this exact image is already in flight, await it
    if (inFlightUploads.has(fingerprint)) {
      console.log(`[Storage] In-flight upload detected for image. Awaiting single photo upload...`);
      return await inFlightUploads.get(fingerprint)!;
    }

    const uploadPromise = (async (): Promise<UploadResult> => {
      let activeUserId = userId;
      if (!activeUserId || activeUserId === 'anonymous') {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          activeUserId = authData.user.id;
        } else {
          activeUserId = 'usr_001';
        }
      }

      const fileExt = file.name.split('.').pop() || 'jpg';
      // Deterministic path based on active user and image fingerprint to prevent duplicate file objects
      const safeFingerprint = fingerprint.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `${activeUserId}/${featureName}/shared/${safeFingerprint}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error:', uploadError.message);
        return { filePath: null, signedUrl: null, error: uploadError };
      }

      // Generate signed URL since bucket 'app-files' is private
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 604800); // 7 days

      const finalResult: UploadResult = {
        filePath,
        signedUrl: signedUrlData?.signedUrl || null,
        error: signedUrlError,
      };

      if (finalResult.signedUrl) {
        setCachedUpload(fingerprint, finalResult);
      }

      return finalResult;
    })();

    inFlightUploads.set(fingerprint, uploadPromise);
    try {
      const res = await uploadPromise;
      return res;
    } finally {
      inFlightUploads.delete(fingerprint);
    }
  } catch (err) {
    console.warn('Storage upload catch error:', err);
    return { filePath: null, signedUrl: null, error: err };
  }
}

/**
 * Uploads a base64 Data URL string to Supabase Storage bucket 'app-files'.
 */
export async function uploadBase64ToSupabaseStorage({
  base64Data,
  userId,
  featureName = 'sightings',
  itemId = 'default',
}: {
  base64Data: string;
  userId?: string;
  featureName?: string;
  itemId?: string;
}): Promise<UploadResult> {
  try {
    if (!base64Data || !base64Data.trim() || base64Data === 'data:' || base64Data.length < 50) {
      return { filePath: null, signedUrl: null, error: new Error('A null or empty image cannot be uploaded.') };
    }
    if (!base64Data.startsWith('data:')) {
      return { filePath: null, signedUrl: base64Data || null, error: null };
    }
    const [header, data] = base64Data.split(',');
    if (!data) {
      return { filePath: null, signedUrl: null, error: new Error('Invalid base64 payload') };
    }
    const mimeMatch = header.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const binary = atob(data);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([array], { type: mimeType });
    const ext = mimeType.includes('/') ? mimeType.split('/')[1] : 'jpg';
    const file = new File([blob], `photo_${Date.now()}.${ext}`, { type: mimeType });

    return await uploadFileToSupabaseStorage({
      file,
      userId,
      featureName,
      itemId,
    });
  } catch (err) {
    console.warn('[Storage] Base64 upload catch notice:', err);
    return { filePath: null, signedUrl: null, error: err };
  }
}

/**
 * Returns a signed URL for a file path or URL.
 * If input is already an external URL or data URI, returns as-is.
 */
export async function getSignedStorageUrl(filePathOrUrl: string, expiresInSeconds = 604800): Promise<string> {
  if (!filePathOrUrl) return '';
  if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://') || filePathOrUrl.startsWith('data:')) {
    return filePathOrUrl;
  }

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePathOrUrl, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.warn('Error creating signed URL for path:', filePathOrUrl, error?.message);
      return filePathOrUrl;
    }

    return data.signedUrl;
  } catch (err) {
    return filePathOrUrl;
  }
}

/**
 * Deletes a file from Supabase Storage by file path or signed URL.
 */
export async function deleteFileFromSupabaseStorage(filePathOrUrl: string): Promise<{ success: boolean; error: any }> {
  if (!filePathOrUrl) return { success: true, error: null };

  let filePath = filePathOrUrl;
  if (filePath.includes(`${BUCKET_NAME}/`)) {
    filePath = filePath.split(`${BUCKET_NAME}/`)[1].split('?')[0];
  } else if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.warn('Supabase storage delete error:', error.message);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err };
  }
}
