import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

const { AuthService } = await import('@/features/auth/domain/auth.service');

describe('AuthService', () => {
  let service: InstanceType<typeof AuthService>;

  beforeEach(() => {
    service = new AuthService();
    vi.clearAllMocks();
  });

  describe('signIn', () => {
    it('returns user data on success', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} }, session: null },
        error: null,
      } as never);

      const result = await service.signIn('a@b.com', 'password');

      expect(result.data).toEqual({ id: 'u1', email: 'a@b.com', user_metadata: {} });
      expect(result.error).toBeNull();
    });

    it('returns error when sign in fails with supabase error', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      } as never);

      const result = await service.signIn('a@b.com', 'wrong');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid credentials');
    });

    it('normalizes email not confirmed error message', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      } as never);

      const result = await service.signIn('a@b.com', 'password');

      expect(result.error?.message).toContain('Email not confirmed');
      expect(result.error?.message).toContain('confirmation link');
    });

    it('returns error when no user is returned', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never);

      const result = await service.signIn('a@b.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Sign in failed');
    });

    it('handles thrown exception with Error instance', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(new Error('Network error'));

      const result = await service.signIn('a@b.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
    });

    it('handles thrown exception with non-Error value', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue('string error');

      const result = await service.signIn('a@b.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Sign in failed');
    });
  });

  describe('signUp', () => {
    it('returns user data on success', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} }, session: null },
        error: null,
      } as never);

      const result = await service.signUp('a@b.com', 'password');

      expect(result.data?.id).toBe('u1');
      expect(result.error).toBeNull();
    });

    it('returns error on sign up failure', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email taken' },
      } as never);

      const result = await service.signUp('taken@b.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Email taken');
    });

    it('normalizes email not confirmed on sign up', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed. Please check your inbox.' },
      } as never);

      const result = await service.signUp('a@b.com', 'password');

      expect(result.error?.message).toContain('Email not confirmed');
    });

    it('returns error when no user returned', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      } as never);

      const result = await service.signUp('a@b.com', 'password');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Sign up failed');
    });

    it('handles thrown exception with Error instance', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockRejectedValue(new Error('Network'));

      const result = await service.signUp('a@b.com', 'password');

      expect(result.error?.message).toBe('Network');
    });

    it('handles thrown exception with non-Error value', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signUp).mockRejectedValue('unexpected');

      const result = await service.signUp('a@b.com', 'password');

      expect(result.error?.message).toBe('Sign up failed');
    });
  });

  describe('signOut', () => {
    it('returns success on sign out', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

      const result = await service.signOut();

      expect(result.error).toBeNull();
    });

    it('returns error when sign out fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed' },
      } as never);

      const result = await service.signOut();

      expect(result.error?.message).toBe('Sign out failed');
    });

    it('handles thrown exception with Error instance', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('Crash'));

      const result = await service.signOut();

      expect(result.error?.message).toBe('Crash');
    });

    it('handles thrown exception with non-Error value', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signOut).mockRejectedValue(42);

      const result = await service.signOut();

      expect(result.error?.message).toBe('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('returns user when session and user exist', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com', user_metadata: {} } },
        error: null,
      } as never);

      const result = await service.getCurrentUser();

      expect(result.data?.id).toBe('u1');
      expect(result.error).toBeNull();
    });

    it('returns error when getSession returns error', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      } as never);

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Session error');
    });

    it('returns error when no session exists', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as never);

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('returns error when getUser returns error', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'User error' },
      } as never);

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('User error');
    });

    it('cleans up invalid session when getUser fails (prevents white-screen-on-mobile)', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'bad-token' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      } as never);
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

      await service.getCurrentUser();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('cleans up session when getUser returns no user', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('still returns original error even if signOut cleanup throws', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'bad' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Expired' },
      } as never);
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('signOut failed'));

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Expired');
    });

    it('returns error when no user returned from getUser', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      } as never);
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as never);

      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });

    it('handles thrown exception with Error instance', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockRejectedValue(new Error('Network'));

      const result = await service.getCurrentUser();

      expect(result.error?.message).toBe('Network');
    });

    it('handles thrown exception with non-Error value', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.getSession).mockRejectedValue(null);

      const result = await service.getCurrentUser();

      expect(result.error?.message).toBe('Failed to get user');
    });
  });

  describe('onAuthStateChange', () => {
    it('calls callback with user when session has user', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const mockCallback = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        cb('SIGNED_IN', {
          user: { id: 'u1', email: 'a@b.com', user_metadata: {} },
        } as never);
        return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
      });

      service.onAuthStateChange(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1' }),
        expect.anything(),
      );
    });

    it('calls callback with null when no session', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      const mockCallback = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((cb) => {
        cb('SIGNED_OUT', null);
        return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
      });

      service.onAuthStateChange(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith(null, null);
    });
  });

  describe('signInWithOAuth', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com', pathname: '/' },
        writable: true,
        configurable: true,
      });
    });

    it('returns null data on successful OAuth redirect', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com' },
        error: null,
      } as never);

      const result = await service.signInWithOAuth('google');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });

    it('returns error when OAuth fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: '' },
        error: { message: 'OAuth error' },
      } as never);

      const result = await service.signInWithOAuth('google');

      expect(result.error?.message).toBe('OAuth error');
    });

    it('handles thrown exception with Error instance', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(new Error('Failed'));

      const result = await service.signInWithOAuth('google');

      expect(result.error?.message).toBe('Failed');
    });

    it('handles thrown exception with non-Error value', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockRejectedValue(undefined);

      const result = await service.signInWithOAuth('google');

      expect(result.error?.message).toBe('OAuth sign in failed');
    });

    it('stores redirect path when valid internal path provided', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com' },
        error: null,
      } as never);

      await service.signInWithOAuth('google', '/households/123');

      expect(window.sessionStorage.getItem('postAuthRedirect')).toBe('/households/123');
    });

    it('removes redirect when invalid path provided', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com' },
        error: null,
      } as never);
      window.sessionStorage.setItem('postAuthRedirect', '/old-path');

      await service.signInWithOAuth('google', 'https://evil.com/steal');

      expect(window.sessionStorage.getItem('postAuthRedirect')).toBeNull();
    });

    it('appends trailing slash to pathname when missing', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com' },
        error: null,
      } as never);
      Object.defineProperty(window, 'location', {
        value: { origin: 'https://example.com', pathname: '/app' },
        writable: true,
        configurable: true,
      });

      const result = await service.signInWithOAuth('github');

      expect(result.error).toBeNull();
    });
  });
});
