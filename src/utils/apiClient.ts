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
          return {
            success: false,
            error: errData.error || errData.message || `Server request returned status ${response.status}`,
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
      return parsed;
    } else {
      const rawText = await response.text();
      try {
        const parsed = JSON.parse(rawText);
        return parsed;
      } catch {
        // Try extracting JSON substring
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            return JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
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
      error: netErr?.message || 'Network connection unavailable. Please check your connection and retry.',
    };
  }
}
