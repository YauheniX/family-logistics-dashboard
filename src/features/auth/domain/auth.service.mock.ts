/**
 * Mock auth service for frontend-only mode
 */

import type { ApiResponse } from '../../shared/domain/repository.interface';
import { createStorageAdapter } from '../../shared/infrastructure/mock-storage.adapter';

export interface AuthUser {
  id: string;
  email: string;
}

interface MockAuthData {
  users: Array<{ email: string; password: string; id: string }>;
  currentUser: AuthUser | null;
}

/**
 * Mock auth service - simulates authentication without backend
 */
export class MockAuthService {
  private storage = createStorageAdapter();
  private authChangeCallbacks: Array<(user: AuthUser | null) => void> = [];

  /**
   * Get mock auth data from storage
   */
  private async getAuthData(): Promise<MockAuthData> {
    const data = await this.storage.get<MockAuthData>('auth-data');
    return (
      data ?? {
        users: [],
        currentUser: null,
      }
    );
  }

  /**
   * Save mock auth data to storage
   */
  private async saveAuthData(data: MockAuthData): Promise<void> {
    await this.storage.set('auth-data', data);
  }

  /**
   * Notify auth state change listeners
   */
  private notifyAuthChange(user: AuthUser | null): void {
    this.authChangeCallbacks.forEach((callback) => callback(user));
  }

  /**
   * Sign in with email and password (mock)
   */
  async signIn(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const authData = await this.getAuthData();

      // Find user
      const user = authData.users.find((u) => u.email === email && u.password === password);

      if (!user) {
        return {
          data: null,
          error: { message: 'Invalid email or password' },
        };
      }

      // Set current user
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
      };

      authData.currentUser = authUser;
      await this.saveAuthData(authData);
      this.notifyAuthChange(authUser);

      return {
        data: authUser,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign in failed',
        },
      };
    }
  }

  /**
   * Sign up with email and password (mock)
   */
  async signUp(email: string, password: string): Promise<ApiResponse<AuthUser>> {
    try {
      const authData = await this.getAuthData();

      // Check if user already exists
      if (authData.users.some((u) => u.email === email)) {
        return {
          data: null,
          error: { message: 'User already exists' },
        };
      }

      // Create new user
      const userId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newUser = {
        id: userId,
        email,
        password,
      };

      authData.users.push(newUser);

      // Auto sign in
      const authUser: AuthUser = {
        id: userId,
        email,
      };

      authData.currentUser = authUser;
      await this.saveAuthData(authData);
      this.notifyAuthChange(authUser);

      return {
        data: authUser,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign up failed',
        },
      };
    }
  }

  /**
   * Sign out (mock)
   */
  async signOut(): Promise<ApiResponse<void>> {
    try {
      const authData = await this.getAuthData();
      authData.currentUser = null;
      await this.saveAuthData(authData);
      this.notifyAuthChange(null);

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Sign out failed',
        },
      };
    }
  }

  /**
   * Get current user (mock)
   */
  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    try {
      const authData = await this.getAuthData();

      if (!authData.currentUser) {
        return {
          data: null,
          error: { message: 'Not authenticated' },
        };
      }

      return {
        data: authData.currentUser,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to get user',
        },
      };
    }
  }

  /**
   * Subscribe to auth state changes (mock)
   */
  onAuthStateChange(callback: (user: AuthUser | null, session: unknown) => void) {
    // Create wrapper function to track for unsubscribe
    const wrapper = (user: AuthUser | null) => callback(user, user ? { user } : null);
    this.authChangeCallbacks.push(wrapper);

    // Immediately call with current user
    this.getCurrentUser().then((result) => {
      callback(result.data, result.data ? { user: result.data } : null);
    });

    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.authChangeCallbacks.indexOf(wrapper);
            if (index > -1) {
              this.authChangeCallbacks.splice(index, 1);
            }
          },
        },
      },
    };
  }

  /**
   * Sign in with OAuth (mock - skips OAuth, auto-creates user)
   */
  async signInWithOAuth(provider: string, _postAuthRedirect?: string): Promise<ApiResponse<AuthUser>> {
    try {
      // In mock mode, we'll auto-create a demo user for OAuth
      const demoEmail = `demo-${provider}@example.com`;
      const demoPassword = 'demo-password';

      const authData = await this.getAuthData();
      let user = authData.users.find((u) => u.email === demoEmail);

      if (!user) {
        // Create demo user
        const userId = `user-${provider}-demo`;
        user = {
          id: userId,
          email: demoEmail,
          password: demoPassword,
        };
        authData.users.push(user);
      }

      // Sign in
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
      };

      authData.currentUser = authUser;
      await this.saveAuthData(authData);
      this.notifyAuthChange(authUser);

      return {
        data: authUser,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'OAuth sign in failed',
        },
      };
    }
  }
}

// Singleton instance
export const mockAuthService = new MockAuthService();
