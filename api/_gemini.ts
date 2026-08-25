import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.');
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

export async function getImagePart(photoUrl?: string, base64Image?: string): Promise<{ mimeType: string; data: string }> {
  if (base64Image && base64Image.startsWith('data:')) {
    const matches = base64Image.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return {
        mimeType: matches[1],
        data: matches[2].replace(/[\r\n\s]/g, ''),
      };
    }
  }

  if (base64Image && base64Image.length > 50 && !base64Image.startsWith('http')) {
    return {
      mimeType: 'image/jpeg',
      data: base64Image.replace(/^data:image\/[a-zA-Z+.-]+;base64,/, '').replace(/[\r\n\s]/g, ''),
    };
  }

  if (photoUrl && photoUrl.startsWith('http') && !photoUrl.startsWith('blob:') && !photoUrl.includes('localhost:')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const imageRes = await fetch(photoUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);

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

  // Fallback 1x1 transparent png
  return {
    mimeType: 'image/png',
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  };
}

export function parseJsonFromModel<T = any>(text?: string | null, fallback?: T): T {
  if (!text || typeof text !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty response from model');
  }

  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // continue
      }
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }

    const firstBracket = trimmed.indexOf('[');
    const lastBracket = trimmed.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
      } catch {
        // continue
      }
    }

    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error('Unable to extract structured JSON from AI output');
  }
}

export async function callGeminiWithFallback(
  ai: any,
  generateParams: { contents: any; config?: any },
  primaryModel = 'gemini-2.5-flash'
): Promise<any> {
  const candidateModels = [
    primaryModel,
    'gemini-2.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
    'gemini-2.5-pro',
  ].filter((val, idx, self) => self.indexOf(val) === idx);

  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const response = await ai.models.generateContent({
        model,
        ...generateParams,
      });

      if (response) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.warn(`[Gemini Fallback] Model '${model}' call notice (${errMsg}). Attempting next candidate (${i + 1}/${candidateModels.length})...`);

      if (i < candidateModels.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  const finalErrMsg = lastError?.message || (typeof lastError === 'object' ? JSON.stringify(lastError) : String(lastError));
  throw new Error(finalErrMsg || 'All Gemini model endpoints temporarily unavailable. Please verify your GEMINI_API_KEY in Vercel settings.');
}
