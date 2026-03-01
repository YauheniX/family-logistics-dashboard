import { defineStore } from 'pinia';
import { authService, type AuthUser } from '@/features/auth';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

/**
 * Feature-based auth store for isolated testing.
 * NOTE: For application code, use @/stores/auth instead.
 * This store has a different ID ('auth-feature') to avoid Pinia ID collision.
 */
export const useAuthStore = defineStore('auth-feature', {
  state: (): AuthState => ({
    user: null,
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
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
        authService.onAuthStateChange((user) => {
          this.user = user;
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
      this.loading = true;
      try {
        const response = await authService.signIn(email, password);
        if (!response.error && response.data) {
          this.user = response.data;
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
          this.user = null;
        }
        return response;
      } finally {
        this.loading = false;
      }
    },
  },
});
