/**
 * Image optimization utility for browser-to-backend API transfers and storage uploads.
 * Downscales ultra-high resolution photos (e.g. 48MP phone captures)
 * to a lightweight, crisp JPEG to prevent slow uploads, payload overflows,
 * and high network latency.
 */

export async function compressImageForUpload(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<File> {
  // If not an image or is SVG/GIF, return original
  if (
    !file ||
    !file.type ||
    !file.type.startsWith('image/') ||
    file.type.includes('svg') ||
    file.type.includes('gif')
  ) {
    return file;
  }

  // If file is already small (e.g. <= 300KB), return as is without recompression
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const processBitmap = async () => {
      try {
        let sourceWidth: number = 0;
        let sourceHeight: number = 0;
        let drawable: ImageBitmap | HTMLImageElement | null = null;

        // Fast path: try createImageBitmap for asynchronous, hardware-accelerated decode
        if (typeof createImageBitmap !== 'undefined') {
          try {
            const bitmap = await createImageBitmap(file);
            sourceWidth = bitmap.width;
            sourceHeight = bitmap.height;
            drawable = bitmap;
          } catch {
            drawable = null;
          }
        }

        if (!drawable) {
          // Fallback to Image element
          const img = new Image();
          const objUrl = URL.createObjectURL(file);
          await new Promise<void>((imgResolve, imgReject) => {
            img.onload = () => {
              URL.revokeObjectURL(objUrl);
              imgResolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(objUrl);
              imgReject(new Error('Image decode failed'));
            };
            img.src = objUrl;
          });
          sourceWidth = img.naturalWidth || img.width;
          sourceHeight = img.naturalHeight || img.height;
          drawable = img;
        }

        if (!sourceWidth || !sourceHeight) {
          return resolve(file);
        }

        // Calculate aspect-ratio scaled dimensions
        let targetWidth = sourceWidth;
        let targetHeight = sourceHeight;

        if (sourceWidth > maxDimension || sourceHeight > maxDimension) {
          if (sourceWidth > sourceHeight) {
            targetHeight = Math.round((sourceHeight * maxDimension) / sourceWidth);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((sourceWidth * maxDimension) / sourceHeight);
            targetHeight = maxDimension;
          }
        }

        // If dimensions didn't need scaling and file is < 600KB, return original
        if (targetWidth === sourceWidth && targetHeight === sourceHeight && file.size < 600 * 1024) {
          return resolve(file);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);

        // Convert to optimized JPEG Blob
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // If compression didn't reduce size, keep original
              return resolve(file);
            }
            const cleanBase = file.name.replace(/\.[^/.]+$/, '');
            const optimizedFile = new File([blob], `${cleanBase}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        console.warn('[compressImageForUpload] Notice, using original file:', err);
        resolve(file);
      }
    };

    processBitmap();
  });
}

export async function optimizeImageForApi(
  source: string | File | Blob,
  maxDimension = 800,
  quality = 0.78
): Promise<string> {
  // If it's an external web URL (and not a local blob/data URL), return as is
  if (typeof source === 'string' && source.startsWith('http') && !source.startsWith('blob:')) {
    return source;
  }

  // Helper to read File/Blob to Data URL as infallible baseline
  const readBlobToDataUrl = (b: Blob | File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(b);
    });
  };

  try {
    let sourceDataUrl = '';

    if (source instanceof File || source instanceof Blob) {
      sourceDataUrl = await readBlobToDataUrl(source);
    } else if (typeof source === 'string') {
      if (source.startsWith('data:')) {
        sourceDataUrl = source;
      } else if (source.startsWith('blob:')) {
        try {
          const res = await fetch(source);
          const blob = await res.blob();
          sourceDataUrl = await readBlobToDataUrl(blob);
        } catch (fetchErr) {
          console.warn('Could not fetch blob URL directly:', fetchErr);
        }
      }
    }

    if (!sourceDataUrl) {
      return typeof source === 'string' ? source : '';
    }

    // Try canvas downscaling to ensure compact payload
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width <= 0 || height <= 0) return resolve(sourceDataUrl);

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(sourceDataUrl);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(sourceDataUrl);
        }
      };
      img.onerror = () => resolve(sourceDataUrl);
      img.src = sourceDataUrl;
    });
  } catch (err) {
    console.warn('optimizeImageForApi encountered exception:', err);
    return typeof source === 'string' ? source : '';
  }
}
