import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const missingSupabaseEnvKeys = [
  configuredSupabaseUrl ? null : 'VITE_SUPABASE_URL',
  configuredSupabaseAnonKey ? null : 'VITE_SUPABASE_ANON_KEY',
].filter((key): key is string => Boolean(key));

export const isSupabaseConfigured = missingSupabaseEnvKeys.length === 0;

// Keep app bootable to show setup guidance instead of crashing at import time.
const supabaseUrl = isSupabaseConfigured ? configuredSupabaseUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? configuredSupabaseAnonKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
