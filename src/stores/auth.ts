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

    async login(email: string, password: string) {
      this.error = null;
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.session = data.session;
        this.user = data.user;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to login';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async register(email: string, password: string) {
      this.error = null;
      this.loading = true;
      try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        this.session = data.session;
        this.user = data.user;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to register';
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
