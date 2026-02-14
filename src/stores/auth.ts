import { defineStore } from 'pinia';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabaseClient';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    session: null,
    user: null,
    loading: false,
    initialized: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user && state.session),
  },
  actions: {
    async initialize() {
      if (this.initialized) return;
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        this.session = data.session;
        this.user = data.session?.user ?? null;
      } finally {
        this.loading = false;
        this.initialized = true;
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session;
        this.user = session?.user ?? null;
      });
    },

    async loginWithGoogle() {
      this.error = null;
      this.loading = true;
      try {
        // OAuth redirects the browser to Google's consent screen.
        // After the user approves, Supabase redirects back and the
        // onAuthStateChange listener (set up in initialize()) updates
        // session/user automatically.
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
        });
        if (error) throw error;
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Unable to sign in with Google';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        this.session = null;
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
