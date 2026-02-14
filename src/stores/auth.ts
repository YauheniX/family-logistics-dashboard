/**
 * Legacy auth store - redirects to new feature-based auth store
 * This file maintains backward compatibility while using the new architecture
 * @deprecated Import from @/features/auth/presentation/auth.store instead
 */

import { defineStore } from 'pinia';
import type { Session, User } from '@supabase/supabase-js';
import { authService } from '@/features/auth';
import { useToastStore } from '@/stores/toast';

interface LegacyAuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

/**
 * Legacy auth store - uses new auth service under the hood
 */
export const useAuthStore = defineStore('auth', {
  state: (): LegacyAuthState => ({
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
        const response = await authService.getCurrentUser();
        if (!response.error && response.data) {
          this.user = { id: response.data.id, email: response.data.email } as User;
          // Session will be set via onAuthStateChange callback
        }

        // Set up auth state change listener
        authService.onAuthStateChange((user, session) => {
          if (user && session) {
            this.user = { id: user.id, email: user.email } as User;
            this.session = session as Session;
          } else {
            this.user = null;
            this.session = null;
          }
        });

        this.initialized = true;
      } finally {
        this.loading = false;
      }
    },

    async loginWithGoogle() {
      this.error = null;
      this.loading = true;
      try {
        const response = await authService.signInWithOAuth('google');
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(this.error);
          throw new Error(this.error);
        }

        // In real OAuth, data is null (redirect happens)
        // User and session will be set via onAuthStateChange after redirect
      } catch (err: unknown) {
        this.error = err instanceof Error ? err.message : 'Unable to sign in with Google';
        useToastStore().error(this.error);
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      try {
        const response = await authService.signOut();
        if (response.error) {
          useToastStore().error(`Logout failed: ${response.error.message}`);
          throw new Error(response.error.message);
        }
        this.session = null;
        this.user = null;
      } finally {
        this.loading = false;
      }
    },
  },
});
