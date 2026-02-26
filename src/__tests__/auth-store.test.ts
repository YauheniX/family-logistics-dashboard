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
  },
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
      data: { subscription: { unsubscribe: () => {} } as any },
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
      data: { subscription: { unsubscribe: () => {} } as any },
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
      data: { subscription: { unsubscribe: () => {} } as any },
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
});
