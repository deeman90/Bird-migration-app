import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy init for Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper function to extract or fetch base64 image data
async function getImagePart(photoUrl?: string, base64Image?: string): Promise<{ mimeType: string; data: string }> {
  if (base64Image && base64Image.startsWith('data:')) {
    const matches = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return {
        mimeType: matches[1],
        data: matches[2],
      };
    }
  }

  if (photoUrl) {
    try {
      // Fetch remote image URL with user agent
      const imageRes = await fetch(photoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      if (imageRes.ok) {
        const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuffer = await imageRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return {
          mimeType: contentType.split(';')[0],
          data: buffer.toString('base64'),
        };
      }
    } catch (err) {
      console.warn(`Fetch image failed for ${photoUrl}:`, err);
    }
  }

  throw new Error(`Failed to fetch image from URL: ${photoUrl}`);
}

// 1. AI Bird Identification Endpoint
app.post('/api/identify-bird', async (req, res) => {
  try {
    const { photoUrl, base64Image, appSpeciesList } = req.body;

    if (!photoUrl && !base64Image) {
      return res.status(400).json({ error: 'Please provide either a photoUrl or base64Image.' });
    }

    const ai = getGeminiClient();
    const imagePart = await getImagePart(photoUrl, base64Image);

    // Prepare prompt with species matching instructions
    const speciesContext = appSpeciesList && Array.isArray(appSpeciesList)
      ? `Check if this bird matches one of our tracked species in our database: ${JSON.stringify(appSpeciesList)}. If it matches, set matchedSpeciesId to its ID.`
      : '';

    const promptText = `Analyze this bird image with high ornithological precision.
Identify:
1. Common Name of the bird species
2. Scientific Name (Latin binomial)
3. Confidence Score percentage (between 50 and 99)
4. Primary taxonomic category (e.g. Crane, Raptor, Shorebird, Songbird, Seabird, Wader, Waterfowl, Owl, Hummingbird)
5. 3-4 key visual diagnostic markings (e.g., plumage colors, eye patch, bill shape, crest, wing pattern)
6. Suggested flock count visible or typical (number)
7. Observed/Likely behavior: resting, feeding, flying, nesting, or calling
8. Conservation Status (e.g. Least Concern, Near Threatened, Vulnerable, Endangered)
9. Description / habitat notes
10. A fascinating fun fact about this bird species.

${speciesContext}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: imagePart,
        },
        {
          text: promptText,
        },
      ],
      config: {
        systemInstruction:
          'You are a world-class AI Ornithologist and Avian Identification Expert. Your responses must strictly adhere to the requested JSON schema with accurate, field-guide-level details.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commonName: { type: Type.STRING, description: 'Common name of the bird species' },
            scientificName: { type: Type.STRING, description: 'Scientific Latin name of the bird' },
            confidenceScore: { type: Type.NUMBER, description: 'Confidence score percentage between 50 and 99' },
            category: { type: Type.STRING, description: 'Category (Raptor, Crane, Songbird, Wader, etc)' },
            diagnosticFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key visual markings identified in the photo',
            },
            matchedSpeciesId: {
              type: Type.STRING,
              description: 'ID of the matched species from the app species list if applicable, or null',
            },
            suggestedFlockCount: { type: Type.NUMBER, description: 'Estimated flock count' },
            suggestedBehavior: {
              type: Type.STRING,
              description: 'One of: resting, feeding, flying, nesting, calling',
            },
            conservationStatus: { type: Type.STRING, description: 'IUCN conservation status' },
            description: { type: Type.STRING, description: 'Habitat and identification summary' },
            funFact: { type: Type.STRING, description: 'A fascinating ornithological fact' },
          },
          required: ['commonName', 'scientificName', 'confidenceScore', 'diagnosticFeatures', 'category'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('No analysis generated from AI model');
    }

    const resultJson = JSON.parse(resultText);
    return res.json({ success: true, data: resultJson });
  } catch (error: any) {
    console.error('Error in /api/identify-bird:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to identify bird image using AI Vision',
    });
  }
});

// 2. AI Bird Species Search & API Lookup Endpoint
app.post('/api/bird-species-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Provide complete bird species information for: "${query}". Return structured JSON details including commonName, scientificName, category, flywayRegion, description, averageFlockSize, wingspanCm, conservationStatus, and keyMarkings.`,
      config: {
        systemInstruction: 'You are an eBird & ornithology database API service. Return accurate bird species specifications.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commonName: { type: Type.STRING },
            scientificName: { type: Type.STRING },
            category: { type: Type.STRING },
            flywayRegion: { type: Type.STRING },
            description: { type: Type.STRING },
            averageFlockSize: { type: Type.STRING },
            wingspanCm: { type: Type.NUMBER },
            conservationStatus: { type: Type.STRING },
            keyMarkings: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['commonName', 'scientificName', 'category', 'description'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error('No species data returned');

    return res.json({ success: true, data: JSON.parse(resultText) });
  } catch (error: any) {
    console.error('Error in /api/bird-species-search:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Search failed' });
  }
});

// 3. AI Image Authenticity & EXIF Metadata Endpoint
app.post('/api/verify-image-authenticity', async (req, res) => {
  try {
    const { photoUrl, base64Image, clientExif } = req.body;

    if (!photoUrl && !base64Image) {
      return res.json({
        success: false,
        noImageDetected: true,
        error: 'No image detected. Please upload or add a bird image before submitting.',
      });
    }

    // Check 1: Known web stock URLs & sample presets
    const stockDomains = [
      'unsplash.com',
      'shutterstock.com',
      'stock.adobe.com',
      'wikimedia.org',
      'pixabay.com',
      'pexels.com',
      'freepik.com',
      'gettyimages.com',
      'depositphotos.com',
      '123rf.com',
      'dreamstime.com',
    ];

    const isStockUrl = photoUrl && stockDomains.some((domain) => photoUrl.toLowerCase().includes(domain));

    // Check 2: EXIF client metadata
    const hasMakeModel = clientExif && (clientExif.make || clientExif.model);
    const hasGps = clientExif && (clientExif.gpsLatitude !== undefined || clientExif.gpsLongitude !== undefined);

    // Early exit for known stock photo URLs (e.g., Unsplash) without native mobile hardware EXIF metadata
    if (isStockUrl && !hasMakeModel) {
      return res.json({
        success: true,
        data: {
          isGenuinePhoto: false,
          authenticityStatus: 'web_download_detected',
          failureReason: 'Downloaded web image detected from Unsplash/Stock web source. Missing authentic phone camera hardware EXIF metadata.',
          confidenceScore: 99,
        },
      });
    }

    // Call Gemini AI Vision to verify authenticity
    const ai = getGeminiClient();
    let imagePart;
    try {
      imagePart = await getImagePart(photoUrl, base64Image);
    } catch (fetchErr: any) {
      // If image fetching failed, flag as no image detected so user can re-upload photo
      return res.json({
        success: false,
        noImageDetected: true,
        error: 'No valid image detected. Please upload or add a clear bird image.',
      });
    }

    const verificationPrompt = `Analyze this image for a birding platform that requires genuine original camera/phone field photos.
Determine if this image is:
A) A genuine original mobile phone or camera photo captured in the field.
B) A downloaded web image, stock photo, scraped internet photo, or screenshot.

Context:
- Provided URL: ${photoUrl || 'Uploaded file'}
- Client EXIF Device Make: ${clientExif?.make || 'None detected'}
- Client EXIF Device Model: ${clientExif?.model || 'None detected'}
- Client EXIF GPS Location: ${hasGps ? `Lat ${clientExif.gpsLatitude}, Lng ${clientExif.gpsLongitude}` : 'None'}

Rules:
1. If the photo URL is from a known web photo hosting site (e.g. Unsplash, Shutterstock) AND lacks native mobile camera EXIF metadata, classify as web_download_detected.
2. If the photo is a downloaded web image or stock graphic, set isGenuinePhoto to false, authenticityStatus to "web_download_detected", and give a clear failureReason explaining terms violation (e.g., "Downloaded web image detected. Missing authentic mobile camera metadata").
3. If it is a genuine field photo taken by a smartphone or camera, set isGenuinePhoto to true, authenticityStatus to "authentic_camera_photo", and extract deviceMake (e.g. Apple, Samsung, Google, Sony, Canon) and deviceModel if available.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { inlineData: imagePart },
        { text: verificationPrompt },
      ],
      config: {
        systemInstruction:
          'You are an expert digital forensics analyst specialized in image metadata, EXIF validation, and stock photo detection.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isGenuinePhoto: { type: Type.BOOLEAN, description: 'True if genuine field camera photo, false if downloaded web photo' },
            authenticityStatus: {
              type: Type.STRING,
              description: 'Either "authentic_camera_photo" or "web_download_detected"',
            },
            failureReason: { type: Type.STRING, description: 'Explanation if rejected as web download' },
            deviceMake: { type: Type.STRING, description: 'Camera or phone brand if identified (e.g., Apple, Samsung, Google, Sony)' },
            deviceModel: { type: Type.STRING, description: 'Camera or phone model (e.g., iPhone 15 Pro, Pixel 8, Galaxy S24)' },
            confidenceScore: { type: Type.NUMBER, description: 'Confidence percentage (50-99)' },
          },
          required: ['isGenuinePhoto', 'authenticityStatus'],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error('No forensic output from AI');

    const resultJson = JSON.parse(resultText);

    // Override if stock URL was explicitly matched or missing EXIF hardware metadata
    if (isStockUrl && !hasMakeModel) {
      resultJson.isGenuinePhoto = false;
      resultJson.authenticityStatus = 'web_download_detected';
      resultJson.failureReason = 'Downloaded web image detected from Unsplash/Stock web source. Missing authentic phone camera hardware EXIF metadata.';
    }

    // Include client EXIF if available and genuine
    if (resultJson.isGenuinePhoto) {
      if (clientExif?.make) resultJson.deviceMake = clientExif.make;
      if (clientExif?.model) resultJson.deviceModel = clientExif.model;
      if (clientExif?.gpsLatitude) resultJson.gpsLatitude = clientExif.gpsLatitude;
      if (clientExif?.gpsLongitude) resultJson.gpsLongitude = clientExif.gpsLongitude;
      if (clientExif?.dateTimeOriginal) resultJson.dateTimeCaptured = clientExif.dateTimeOriginal;
    }

    return res.json({ success: true, data: resultJson });
  } catch (error: any) {
    console.error('Error in /api/verify-image-authenticity:', error);
    return res.json({
      success: false,
      noImageDetected: true,
      error: error?.message || 'No valid image detected. Please upload or attach a clear bird photo.',
    });
  }
});

// Start Express Server & Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bird Tracker Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
