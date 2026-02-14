import { createClient } from '@supabase/supabase-js';
import { isMockMode } from '@/config/backend.config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Only throw error if not in mock mode
if (!isMockMode() && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = isMockMode()
  ? createClient('https://mock.supabase.co', 'mock-key')
  : createClient(supabaseUrl, supabaseAnonKey);
