import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://cgqsmdnwzrazyyhkdibn.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_9vdeAtSD1Cbt_NxV-xHtoQ_igQCL2RZ";

const env = (import.meta && import.meta.env) || {};
const SUPABASE_URL = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;

let rawKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
if (!rawKey || rawKey.startsWith("sb_secret_") || rawKey.includes("YOUR_SUPABASE")) {
  rawKey = DEFAULT_SUPABASE_ANON_KEY;
}

const SUPABASE_PUBLIC_KEY = rawKey;

const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(cleanUrl, SUPABASE_PUBLIC_KEY, {
  auth: {
    persistSession: typeof window !== "undefined",
    detectSessionInUrl: false,
  },
});

export default supabase;
