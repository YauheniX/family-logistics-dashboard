import { createClient } from '@supabase/supabase-js';
import { isMockMode } from '@/config/backend.config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = isMockMode()
  ? createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storage: window.localStorage,
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
