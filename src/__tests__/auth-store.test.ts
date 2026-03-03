import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/features/auth/presentation/auth.store';

vi.mock('@/features/auth', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    onAuthStateChange: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  },
}));

vi.mock('@/stores/toast', () => ({
  useToastStore: () => ({
    error: vi.fn(),
  }),
}));

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(false);
    expect(store.isAuthenticated).toBe(false);
    expect(store.userId).toBeNull();
  });

  it('returns isAuthenticated true when user exists', () => {
    const store = useAuthStore();
    store.user = { id: 'u1', email: 'test@test.com' };
    expect(store.isAuthenticated).toBe(true);
    expect(store.userId).toBe('u1');
  });

  it('initializes and sets user on success', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com' },
      error: null,
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      data: {
        subscription: {
          id: 'mock-sub-1',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    }));

    const store = useAuthStore();
    await store.initialize();

    expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(store.initialized).toBe(true);
    expect(store.loading).toBe(false);
  });

  it('initializes without user on error', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: null,
      error: { message: 'Not authenticated' },
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      data: {
        subscription: {
          id: 'mock-sub-2',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    }));

    const store = useAuthStore();
    await store.initialize();

    expect(store.user).toBeNull();
    expect(store.initialized).toBe(true);
  });

  it('does not re-initialize if already initialized', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      data: {
        subscription: {
          id: 'mock-sub-3',
          callback: vi.fn(),
          unsubscribe: vi.fn(),
        },
      },
    }));

    const store = useAuthStore();
    await store.initialize();
    await store.initialize();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('signs in successfully', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signIn).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com' },
      error: null,
    });

    const store = useAuthStore();
    const result = await store.signIn('a@b.com', 'password');

    expect(result.data).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });
    expect(store.loading).toBe(false);
  });

  it('handles sign in error', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signIn).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    const store = useAuthStore();
    const result = await store.signIn('a@b.com', 'wrong');

    expect(result.error?.message).toBe('Invalid credentials');
    expect(store.user).toBeNull();
  });

  it('signs up successfully', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signUp).mockResolvedValue({
      data: { id: 'u2', email: 'new@b.com' },
      error: null,
    });

    const store = useAuthStore();
    const result = await store.signUp('new@b.com', 'password');

    expect(result.data).toEqual({ id: 'u2', email: 'new@b.com' });
    expect(store.user).toEqual({ id: 'u2', email: 'new@b.com' });
  });

  it('handles sign up error', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signUp).mockResolvedValue({
      data: null,
      error: { message: 'Email taken' },
    });

    const store = useAuthStore();
    const result = await store.signUp('taken@b.com', 'password');

    expect(result.error?.message).toBe('Email taken');
    expect(store.user).toBeNull();
  });

  it('signs out successfully', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signOut).mockResolvedValue({
      data: undefined,
      error: null,
    });

    const store = useAuthStore();
    store.user = { id: 'u1', email: 'a@b.com' };

    await store.signOut();

    expect(store.user).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('handles sign out error', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signOut).mockResolvedValue({
      data: null,
      error: { message: 'Sign out failed' },
    });

    const store = useAuthStore();
    store.user = { id: 'u1', email: 'a@b.com' };

    await store.signOut();

    expect(store.user).not.toBeNull();
  });

  it('initializes with null error state', () => {
    const store = useAuthStore();
    expect(store.error).toBeNull();
  });

  it('sets error on sign in failure', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signIn).mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    const store = useAuthStore();
    await store.signIn('a@b.com', 'wrong');

    expect(store.error).toBe('Invalid credentials');
  });

  it('clears error on successful sign in', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.signIn).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com' },
      error: null,
    });

    const store = useAuthStore();
    store.error = 'previous error';
    await store.signIn('a@b.com', 'password');

    expect(store.error).toBeNull();
  });

  describe('loginWithGoogle', () => {
    it('calls signInWithOAuth and handles success', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signInWithOAuth).mockResolvedValue({
        data: null,
        error: null,
      });

      const store = useAuthStore();
      await store.loginWithGoogle();

      expect(authService.signInWithOAuth).toHaveBeenCalledWith('google');
      expect(store.error).toBeNull();
      expect(store.loading).toBe(false);
    });

    it('sets error and throws on OAuth failure', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signInWithOAuth).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed' },
      });

      const store = useAuthStore();

      await expect(store.loginWithGoogle()).rejects.toThrow('OAuth failed');
      expect(store.error).toBe('OAuth failed');
      expect(store.loading).toBe(false);
    });

    it('handles unexpected errors', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signInWithOAuth).mockRejectedValue(new Error('Network error'));

      const store = useAuthStore();

      await expect(store.loginWithGoogle()).rejects.toThrow('Network error');
      expect(store.error).toBe('Network error');
    });
  });

  describe('logout', () => {
    it('clears user on successful logout', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signOut).mockResolvedValue({
        data: null,
        error: null,
      });

      const store = useAuthStore();
      store.user = { id: 'u1', email: 'a@b.com' };

      await store.logout();

      expect(store.user).toBeNull();
      expect(authService.signOut).toHaveBeenCalled();
    });

    it('throws on logout failure', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signOut).mockResolvedValue({
        data: null,
        error: { message: 'Logout failed' },
      });

      const store = useAuthStore();

      await expect(store.logout()).rejects.toThrow('Logout failed');
    });
  });

  it('resets all state via $reset', () => {
    const store = useAuthStore();
    store.user = { id: 'u1', email: 'a@b.com' };
    store.loading = true;
    store.initialized = true;
    store.error = 'some error';

    store.$reset();

    expect(store.user).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(false);
    expect(store.error).toBeNull();
  });

  describe('onAuthStateChange event filtering', () => {
    // Helper: capture the callback passed to onAuthStateChange during initialize()
    async function initWithCallback() {
      const { authService } = await import('@/features/auth');
      let capturedCallback: (event: string, user: unknown, session: unknown) => void = () => {};
      vi.mocked(authService.getCurrentUser).mockResolvedValue({
        data: { id: 'u1', email: 'a@b.com' },
        error: null,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(authService.onAuthStateChange).mockImplementation((cb: any) => {
        capturedCallback = cb as typeof capturedCallback;
        return {
          data: { subscription: { id: 'sub', callback: vi.fn(), unsubscribe: vi.fn() } },
        };
      });

      const store = useAuthStore();
      await store.initialize();
      return { store, capturedCallback };
    }

    it('ignores INITIAL_SESSION events (handled by getCurrentUser)', async () => {
      const { store, capturedCallback } = await initWithCallback();
      expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });

      // INITIAL_SESSION with null should NOT clear user
      capturedCallback('INITIAL_SESSION', null, null);
      expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });
    });

    it('clears user on SIGNED_OUT', async () => {
      const { store, capturedCallback } = await initWithCallback();
      expect(store.user).not.toBeNull();

      capturedCallback('SIGNED_OUT', null, null);
      expect(store.user).toBeNull();
    });

    it('updates user on TOKEN_REFRESHED', async () => {
      const { store, capturedCallback } = await initWithCallback();

      capturedCallback('TOKEN_REFRESHED', { id: 'u1', email: 'refreshed@b.com' }, {});
      expect(store.user).toEqual({ id: 'u1', email: 'refreshed@b.com' });
    });

    it('updates user on SIGNED_IN', async () => {
      const { store, capturedCallback } = await initWithCallback();
      store.user = null;

      capturedCallback('SIGNED_IN', { id: 'u2', email: 'new@b.com' }, {});
      expect(store.user).toEqual({ id: 'u2', email: 'new@b.com' });
    });

    it('does not clear user on TOKEN_REFRESHED with null user', async () => {
      const { store, capturedCallback } = await initWithCallback();
      expect(store.user).not.toBeNull();

      // TOKEN_REFRESHED with null user (transient state) should NOT clear user
      capturedCallback('TOKEN_REFRESHED', null, null);
      expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });
    });
  });
});
