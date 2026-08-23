/**
 * Image optimization utility for browser-to-backend API transfers.
 * Downscales ultra-high resolution photos (e.g. 48MP phone captures)
 * to a lightweight JPEG (<500KB) to prevent network payload overflows,
 * socket disconnects, and "Failed to fetch" errors.
 */

export async function optimizeImageForApi(
  source: string | File,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  // If it's an external web URL (and not a local blob/data URL), we don't need to convert to data URL unless desired
  if (typeof source === 'string' && source.startsWith('http') && !source.startsWith('blob:')) {
    return source;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let { width, height } = img;

        if (width <= 0 || height <= 0) {
          if (typeof source === 'string') return resolve(source);
          return resolve('');
        }

        // Calculate target dimensions
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
        if (!ctx) {
          if (typeof source === 'string') return resolve(source);
          return resolve('');
        }

        // Draw and compress to lightweight JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(optimizedDataUrl);
      } catch (err) {
        console.warn('Image optimization canvas error, using fallback:', err);
        if (typeof source === 'string') {
          resolve(source);
        } else {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(source);
        }
      }
    };

    img.onerror = () => {
      console.warn('Image load error during optimization');
      if (typeof source === 'string') {
        resolve(source);
      } else {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(source);
      }
    };

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const objectUrl = URL.createObjectURL(source);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          let { width, height } = img;
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
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
            return;
          }
        } catch (e) {
          console.warn('Optimization canvas error:', e);
        }
        // Fallback
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(source);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(source);
      };
      img.src = objectUrl;
    }
  });
}
