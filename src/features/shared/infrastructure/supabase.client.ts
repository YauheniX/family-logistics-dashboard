import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
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

/**
 * Typed Supabase client with database schema
 * Note: In mock mode, this client won't be used but we still export it for type compatibility
 */
export const supabase: SupabaseClient<Database> = isMockMode()
  ? (createClient<Database>('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    }) as SupabaseClient<Database>)
  : createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
        storage: window.localStorage,
      },
    });

/**
 * Type helper for typed Supabase client
 */
export type TypedSupabaseClient = typeof supabase;
