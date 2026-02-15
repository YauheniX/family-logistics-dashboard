import { createClient } from '@supabase/supabase-js';
import { isMockMode } from '@/config/backend.config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!isMockMode()) {
  if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }

  if (import.meta.env.DEV) {
    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Anon Key:', supabaseAnonKey ? '***loaded***' : 'MISSING');
  }
}

export const supabase = isMockMode()
  ? createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storage: window.localStorage,
      },
    });
