import { defineStore } from 'pinia';
import { authService, type AuthUser } from '@/features/auth';
import type { ApiResponse } from '@/features/shared/domain/repository.interface';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
}

export const useAuthStore = defineStore('auth', {
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
        const response = await authService.getCurrentUser();
        if (!response.error && response.data) {
          this.user = response.data;
        }

        // Set up auth state change listener
        authService.onAuthStateChange((user) => {
          this.user = user;
        });

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
