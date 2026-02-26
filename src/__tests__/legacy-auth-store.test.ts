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

describe('Legacy Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('isAuthenticated is true when user is set even without session', async () => {
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

    // User is set from getCurrentUser, but session is still null
    // isAuthenticated should be true based on user alone
    expect(store.user).not.toBeNull();
    expect(store.session).toBeNull();
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
});
