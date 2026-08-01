import ExifReader from 'exifreader';

export interface ExtractedExifData {
  hasExif: boolean;
  make?: string;
  model?: string;
  software?: string;
  dateTimeOriginal?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  rawTags?: Record<string, string>;
}

export async function extractImageExif(fileOrArrayBuffer: File | ArrayBuffer): Promise<ExtractedExifData> {
  try {
    const tags = await ExifReader.load(fileOrArrayBuffer as any, { expanded: true });
    
    let make = tags.exif?.Make?.description || tags.file?.['Device Make']?.description;
    let model = tags.exif?.Model?.description || tags.file?.['Device Model']?.description;
    let software = tags.exif?.Software?.description;
    let dateTimeOriginal = tags.exif?.DateTimeOriginal?.description || tags.exif?.DateTime?.description;

    let gpsLatitude: number | undefined;
    let gpsLongitude: number | undefined;

    if (tags.gps && typeof tags.gps.Latitude === 'number' && typeof tags.gps.Longitude === 'number') {
      gpsLatitude = tags.gps.Latitude;
      gpsLongitude = tags.gps.Longitude;
    }

    const hasCameraMetadata = Boolean(make || model || (gpsLatitude !== undefined && gpsLongitude !== undefined));

    return {
      hasExif: hasCameraMetadata,
      make,
      model,
      software,
      dateTimeOriginal,
      gpsLatitude,
      gpsLongitude,
    };
  } catch (err) {
    console.warn('Exif extraction notice: No EXIF tags found in image file buffer.', err);
    return {
      hasExif: false,
    };
  }
}
