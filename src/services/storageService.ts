import { supabase } from '../supabaseClient.js';

export const BUCKET_NAME = 'app-files';

export interface UploadResult {
  filePath: string | null;
  signedUrl: string | null;
  error: any;
}

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB limit
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
  'image/tiff',
  'image/svg+xml',
];

/**
 * Uploads a file to Supabase Storage in bucket 'app-files'.
 * Follows folder structure: `${userId}/${featureName}/${itemId}/${uuid}.${extension}`
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
    // 1. Strict 100MB file size limit check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const errorMsg = `File size (${sizeMB}MB) exceeds the maximum allowed limit of 100MB.`;
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

    // 2. Allowed image MIME types check
    if (file.type && !ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
      const errorMsg = `Invalid image type (${file.type}). Allowed image types: JPEG, PNG, WebP, HEIC, GIF, TIFF, SVG.`;
      console.warn(errorMsg);
      return { filePath: null, signedUrl: null, error: new Error(errorMsg) };
    }

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
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const filePath = `${activeUserId}/${featureName}/${itemId}/${uuid}.${fileExt}`;

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

    return {
      filePath,
      signedUrl: signedUrlData?.signedUrl || null,
      error: signedUrlError,
    };
  } catch (err) {
    console.warn('Storage upload catch error:', err);
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
