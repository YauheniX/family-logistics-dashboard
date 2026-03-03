import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

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

vi.mock('@/stores/household', () => ({
  useHouseholdStore: () => ({ $reset: vi.fn() }),
}));
vi.mock('@/features/shopping/presentation/shopping.store', () => ({
  useShoppingStore: () => ({ $reset: vi.fn() }),
}));
vi.mock('@/features/wishlist/presentation/wishlist.store', () => ({
  useWishlistStore: () => ({ $reset: vi.fn() }),
}));

describe('Auth Store (via @/stores/auth re-export)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('isAuthenticated is true when user is set', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com' },
      error: null,
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { subscription: { unsubscribe: () => {} } as any },
    }));

    const store = useAuthStore();
    await store.initialize();

    expect(store.user).not.toBeNull();
    expect(store.isAuthenticated).toBe(true);
  });

  it('isAuthenticated is false when user is null', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
  });

  it('initializes and sets user on successful getCurrentUser', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com' },
      error: null,
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { subscription: { unsubscribe: () => {} } as any },
    }));

    const store = useAuthStore();
    await store.initialize();

    expect(store.user).toEqual(expect.objectContaining({ id: 'u1', email: 'a@b.com' }));
    expect(store.initialized).toBe(true);
    expect(store.loading).toBe(false);
  });

  it('initializes without user when not authenticated', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: null,
      error: { message: 'Not authenticated' },
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { subscription: { unsubscribe: () => {} } as any },
    }));

    const store = useAuthStore();
    await store.initialize();

    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.initialized).toBe(true);
  });

  it('does not re-initialize if already initialized', async () => {
    const { authService } = await import('@/features/auth');
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      data: null,
      error: null,
    });
    vi.mocked(authService.onAuthStateChange).mockImplementation(() => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { subscription: { unsubscribe: () => {} } as any },
    }));

    const store = useAuthStore();
    await store.initialize();
    await store.initialize();

    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  describe('signIn', () => {
    it('sets user on successful sign in', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signIn).mockResolvedValue({
        data: { id: 'u1', email: 'a@b.com' },
        error: null,
      });

      const store = useAuthStore();
      const result = await store.signIn('a@b.com', 'password');

      expect(result.data).toEqual({ id: 'u1', email: 'a@b.com' });
      expect(store.user).toEqual({ id: 'u1', email: 'a@b.com' });
      expect(store.isAuthenticated).toBe(true);
      expect(store.loading).toBe(false);
    });

    it('does not set user on failed sign in', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signIn).mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      const store = useAuthStore();
      const result = await store.signIn('a@b.com', 'wrong');

      expect(result.error?.message).toBe('Invalid credentials');
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.error).toBe('Invalid credentials');
      expect(store.loading).toBe(false);
    });
  });

  describe('loginWithGoogle', () => {
    it('should call signInWith OAuth and handle success', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signInWithOAuth).mockResolvedValue({
        data: null, // OAuth redirects, no user data returned immediately
        error: null,
      });

      const store = useAuthStore();
      await store.loginWithGoogle();

      expect(authService.signInWithOAuth).toHaveBeenCalledWith('google');
      expect(store.error).toBeNull();
      expect(store.loading).toBe(false);
    });

    it('should handle OAuth error', async () => {
      const { authService } = await import('@/features/auth');
      const mockError = { message: 'OAuth failed' };
      vi.mocked(authService.signInWithOAuth).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const store = useAuthStore();

      await expect(store.loginWithGoogle()).rejects.toThrow('OAuth failed');
      expect(store.error).toBe('OAuth failed');
      expect(store.loading).toBe(false);
    });

    it('should handle unexpected errors', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signInWithOAuth).mockRejectedValue(new Error('Network error'));

      const store = useAuthStore();

      await expect(store.loginWithGoogle()).rejects.toThrow('Network error');
      expect(store.error).toBe('Network error');
    });
  });

  describe('logout', () => {
    it('should clear user on logout', async () => {
      const { authService } = await import('@/features/auth');
      vi.mocked(authService.signOut).mockResolvedValue({
        data: null,
        error: null,
      });

      const store = useAuthStore();
      store.$patch({ user: { id: 'u1', email: 'a@b.com' } });

      await store.logout();

      expect(store.user).toBeNull();
      expect(authService.signOut).toHaveBeenCalled();
    });

    it('should handle logout errors', async () => {
      const { authService } = await import('@/features/auth');
      const mockError = { message: 'Logout failed' };
      vi.mocked(authService.signOut).mockResolvedValue({
        data: null,
        error: mockError,
      });

      const store = useAuthStore();

      await expect(store.logout()).rejects.toThrow('Logout failed');
    });
  });
});
