/**
 * Safe API Client for making JSON requests.
 * Prevents "Unexpected token 'T', 'The page c'... is not valid JSON" errors
 * by checking response statuses, content types, and safely parsing responses.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  noImageDetected?: boolean;
  [key: string]: any;
}

/**
 * Safely extracts a human-readable error message from any error type
 * (String, Error instance, Google GenAI error object, status payload, or unknown JSON).
 * Completely prevents "[object Object]" from appearing in UI.
 */
export function extractErrorMessage(err: any, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;
  if (typeof err === 'string') {
    const trimmed = err.trim();
    if (trimmed === '[object Object]' || trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return fallback;
    }
    return trimmed;
  }
  if (err instanceof Error) {
    if (err.message && err.message !== '[object Object]') {
      return err.message.trim();
    }
  }
  if (typeof err === 'object') {
    // Nested error structure common in Google APIs: { error: { message: "...", code: 400 } }
    if (err.error) {
      return extractErrorMessage(err.error, fallback);
    }
    if (typeof err.message === 'string' && err.message && err.message !== '[object Object]') {
      return err.message.trim();
    }
    if (typeof err.details === 'string' && err.details) {
      return err.details.trim();
    }
    if (typeof err.statusText === 'string' && err.statusText) {
      return err.statusText.trim();
    }
    try {
      const str = JSON.stringify(err);
      if (str && str !== '{}' && str.length < 200) {
        return str;
      }
    } catch {
      // ignore serialization failure
    }
  }
  const strVal = String(err);
  return strVal !== '[object Object]' ? strVal : fallback;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    const mergedHeaders = {
      ...defaultHeaders,
      ...(init?.headers || {}),
    };

    const response = await fetch(input, {
      ...init,
      headers: mergedHeaders,
    });
    const contentType = response.headers.get('content-type') || '';

    // Handle non-2xx status codes safely
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        try {
          const errData = await response.json();
          const cleanErrMsg = extractErrorMessage(
            errData?.error || errData?.message || errData,
            `Server returned status ${response.status}`
          );
          return {
            success: false,
            error: cleanErrMsg,
          };
        } catch {
          // ignore json parse error on error responses
        }
      }

      // If server returned an HTML error page (e.g. 404/502/503)
      const rawText = await response.text();
      let cleanError = `Server error (${response.status})`;
      if (rawText && rawText.length < 120 && !rawText.startsWith('<') && !rawText.toLowerCase().startsWith('the page')) {
        cleanError = rawText.trim();
      }
      return {
        success: false,
        error: cleanError,
      };
    }

    // Handle successful 2xx responses
    if (contentType.includes('application/json')) {
      const parsed = await response.json();
      if (parsed && typeof parsed === 'object') {
        if (parsed.error && typeof parsed.error !== 'string') {
          parsed.error = extractErrorMessage(parsed.error);
        }
      }
      return parsed;
    } else {
      const rawText = await response.text();
      try {
        const parsed = JSON.parse(rawText);
        if (parsed && typeof parsed === 'object') {
          if (parsed.error && typeof parsed.error !== 'string') {
            parsed.error = extractErrorMessage(parsed.error);
          }
        }
        return parsed;
      } catch {
        // Try extracting JSON substring
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            const parsed = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
            if (parsed && typeof parsed === 'object') {
              if (parsed.error && typeof parsed.error !== 'string') {
                parsed.error = extractErrorMessage(parsed.error);
              }
            }
            return parsed;
          } catch {
            // ignore
          }
        }
        return {
          success: false,
          error: 'The server returned an unexpected response format. Please try again.',
        };
      }
    }
  } catch (netErr: any) {
    console.warn(`Network fetch failed for ${input}:`, netErr);
    return {
      success: false,
      error: extractErrorMessage(netErr, 'Network connection unavailable. Please check your connection and retry.'),
    };
  }
}
