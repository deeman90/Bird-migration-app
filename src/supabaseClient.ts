import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ============================================================================
// SUPABASE CLIENT (BACKEND CONFIGURATION PROXY)
// Credentials are managed securely in backend server environment variables.
// No private API keys or sensitive secrets are stored in this repository file.
// ============================================================================

const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const initialUrl = (env.VITE_SUPABASE_URL || "https://placeholder-project.supabase.co").replace(/\/rest\/v1\/?$/, "");
const initialKey = env.VITE_SUPABASE_ANON_KEY || "supabase-anon-unconfigured";

let clientInstance: SupabaseClient = createClient(initialUrl, initialKey, {
  auth: {
    persistSession: typeof window !== "undefined",
    detectSessionInUrl: false,
  },
});

export function updateSupabaseConfig(url: string, key: string): void {
  if (url && key && !key.includes("unconfigured") && !key.includes("placeholder") && !key.includes("example") && !key.includes("your_")) {
    const cleanUrl = url.replace(/\/rest\/v1\/?$/, "");
    clientInstance = createClient(cleanUrl, key, {
      auth: {
        persistSession: typeof window !== "undefined",
        detectSessionInUrl: false,
      },
    });
  }
}

// Automatically fetch public configuration from backend server on startup
if (typeof window !== "undefined") {
  fetch("/api/config")
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (cfg?.supabaseUrl && cfg?.supabaseAnonKey) {
        updateSupabaseConfig(cfg.supabaseUrl, cfg.supabaseAnonKey);
      }
    })
    .catch(() => {});
}

// Proxied client ensures immediate and dynamic binding across all services
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const val = (clientInstance as any)[prop];
    if (typeof val === "function") {
      return val.bind(clientInstance);
    }
    return val;
  },
});

