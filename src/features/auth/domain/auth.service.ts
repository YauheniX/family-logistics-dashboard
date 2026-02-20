import { supabase } from '../../shared/infrastructure/supabase.client';
import type { User, Session } from '@supabase/supabase-js';
import type { ApiResponse } from '../../shared/domain/repository.interface';
import { isSafeInternalPath, normalizeHashPath } from '@/utils/pathValidation';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
    [key: string]: any;
  };
}

/**
 * Auth service - handles authentication operations
 */
export class AuthService {
  private normalizeAuthErrorMessage(message: string): string {
    const normalized = message.toLowerCase();

    if (normalized.includes('email not confirmed')) {
      return 'Email not confirmed. Please check your inbox (and spam folder) and click the confirmation link.';
    }

    return message;
  }

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
          error: { message: this.normalizeAuthErrorMessage(error.message), details: error },
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
          error: { message: this.normalizeAuthErrorMessage(error.message), details: error },
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
   * Uses getSession() first to check local storage, then validates with getUser()
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      // First check for session in local storage (no network call)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        return {
          data: null,
          error: { message: sessionError.message, details: sessionError },
        };
      }

      if (!sessionData.session) {
        return {
          data: null,
          error: { message: 'Not authenticated' },
        };
      }

      // Session exists, now validate it with getUser()
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
  async signInWithOAuth(
    provider: string,
    postAuthRedirect?: string,
  ): Promise<ApiResponse<AuthUser>> {
    try {
      // Persist intended in-app route across full-page OAuth redirects.
      // Must be a hash-router path like '/households/123' (no origin).
      if (postAuthRedirect && isSafeInternalPath(postAuthRedirect)) {
        window.sessionStorage.setItem('postAuthRedirect', normalizeHashPath(postAuthRedirect));
      } else {
        window.sessionStorage.removeItem('postAuthRedirect');
      }

      // IMPORTANT:
      // - Google OAuth redirect URIs cannot contain URL fragments (#), so we must not use hash routes here.
      // - Using window.location.pathname makes this work for sub-path deployments (e.g. GitHub Pages)
      //   even if Vite BASE_URL / env config is incorrect.
      // Example on GitHub Pages: https://example.com/family-logistics-dashboard/#/login
      // pathname => /family-logistics-dashboard/
      const path = window.location.pathname.endsWith('/')
        ? window.location.pathname
        : `${window.location.pathname}/`;
      const redirectTo = `${window.location.origin}${path}`;

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
      user_metadata: user.user_metadata,
    };
  }
}

// Singleton instance
export const authService = new AuthService();
