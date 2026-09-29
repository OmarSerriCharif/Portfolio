/**
 * Single shared Supabase client.
 * supabase-js is loaded as an ES module from the jsDelivr CDN (pinned version).
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/** True once config.js has been filled in with real project values. */
export const isConfigured =
  /^https:\/\/.+/.test(SUPABASE_URL) &&
  !SUPABASE_URL.includes('YOUR-PROJECT-REF') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes('YOUR-PUBLIC-ANON-KEY');

export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://not-configured.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'not-configured-anon-key-placeholder-value',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
