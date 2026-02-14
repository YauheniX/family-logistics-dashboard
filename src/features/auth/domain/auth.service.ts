import { supabase } from '../../shared/infrastructure/supabase.client';
import type { User, Session } from '@supabase/supabase-js';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Auth service - handles authentication operations
 */
export class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      if (!data.user) {
        return {
          data: null,
          error: { message: 'Sign in failed' },
        };
      }

      return {
        data: this.mapUser(data.user),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign in failed',
          details: error,
        },
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      if (!data.user) {
        return {
          data: null,
          error: { message: 'Sign up failed' },
        };
      }

      return {
        data: this.mapUser(data.user),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign up failed',
          details: error,
        },
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign out failed',
          details: error,
        },
      };
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      if (!data.user) {
        return {
          data: null,
          error: { message: 'Not authenticated' },
        };
      }

      return {
        data: this.mapUser(data.user),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get user',
          details: error,
        },
      };
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        callback(this.mapUser(session.user), session);
      } else {
        callback(null, null);
      }
    });
  }

  /**
   * Sign in with OAuth provider (Google, etc.)
   */
  async signInWithOAuth(provider: string): Promise<ApiResponse<AuthUser>> {
    try {
      // Get the base path from Vite config, ensuring proper URL construction
      const basePath = import.meta.env.BASE_URL || '/';
      const redirectTo = `${window.location.origin}${basePath}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'github' | 'gitlab',
        options: {
          redirectTo,
        },
      });

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      // OAuth redirects, so we won't get user data immediately
      // Return null data to indicate redirect in progress
      return {
        data: null,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'OAuth sign in failed',
          details: error,
        },
      };
    }
  }

  /**
   * Map Supabase User to our AuthUser
   */
  private mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
    };
  }
}

// Singleton instance
export const authService = new AuthService();
