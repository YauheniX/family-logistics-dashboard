import { defineStore } from 'pinia';
import { authService, type AuthUser } from '@/features/auth';
import { useToastStore } from '@/stores/toast';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

/**
 * Canonical auth store – owns all authentication state and actions.
 *
 * Imported throughout the app via the re-export at `@/stores/auth` for
 * backward compatibility, or directly from this module.
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    loading: false,
    initialized: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    userId: (state) => state.user?.id || null,
  },

  actions: {
    async initialize() {
      if (this.initialized) return;

      this.loading = true;
      try {
        // Register the auth-state-change listener FIRST so that any session
        // events fired by Supabase during the (potentially slow) getCurrentUser
        // call are not missed – e.g. the client finishing its own
        // `detectSessionInUrl` processing on a slow mobile connection.
        //
        // We filter by event type to avoid acting on transient events:
        // - INITIAL_SESSION is skipped because getCurrentUser() handles it below.
        // - SIGNED_OUT explicitly clears the user.
        // - SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED update the user.
        authService.onAuthStateChange((event, user) => {
          if (event === 'INITIAL_SESSION') return;
          if (event === 'SIGNED_OUT') {
            this.user = null;
            return;
          }
          // SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED – keep user in sync
          if (user) {
            this.user = user;
          }
        });

        const response = await authService.getCurrentUser();
        if (!response.error && response.data) {
          this.user = response.data;
        }

        this.initialized = true;
      } finally {
        this.loading = false;
      }
    },

    async signIn(email: string, password: string): Promise<ApiResponse<AuthUser>> {
      this.error = null;
      this.loading = true;
      try {
        const response = await authService.signIn(email, password);
        if (!response.error && response.data) {
          this.user = response.data;
        } else if (response.error) {
          this.error = response.error.message;
        }
        return response;
      } finally {
        this.loading = false;
      }
    },

    async signUp(email: string, password: string): Promise<ApiResponse<AuthUser>> {
      this.loading = true;
      try {
        const response = await authService.signUp(email, password);
        if (!response.error && response.data) {
          this.user = response.data;
        }
        return response;
      } finally {
        this.loading = false;
      }
    },

    async signOut() {
      this.loading = true;
      try {
        const response = await authService.signOut();
        if (!response.error) {
          this._resetAppState();
        }
        return response;
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
          throw new Error(response.error.message);
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
        this._resetAppState();
      } finally {
        this.loading = false;
      }
    },

    /**
     * Shared teardown: clears user and resets dependent stores to prevent
     * data leakage between sessions.  Called by both signOut() and logout().
     */
    _resetAppState() {
      this.user = null;
      useHouseholdStore().$reset();
      useShoppingStore().$reset();
      useWishlistStore().$reset();
    },
  },
});
