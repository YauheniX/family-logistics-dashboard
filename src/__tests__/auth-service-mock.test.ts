import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock createStorageAdapter to use InMemoryAdapter so tests are isolated
vi.mock('@/features/shared/infrastructure/mock-storage.adapter', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/features/shared/infrastructure/mock-storage.adapter')>();
  return {
    ...original,
    createStorageAdapter: () => new original.InMemoryAdapter(),
  };
});

const { MockAuthService } = await import('@/features/auth/domain/auth.service.mock');

describe('MockAuthService', () => {
  let service: InstanceType<typeof MockAuthService>;

  beforeEach(() => {
    service = new MockAuthService();
  });

  describe('signUp', () => {
    it('creates a new user and signs them in', async () => {
      const result = await service.signUp('user@example.com', 'password123');

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
      expect(result.data?.email).toBe('user@example.com');
      expect(result.data?.id).toBeDefined();
    });

    it('returns error when user already exists', async () => {
      await service.signUp('existing@example.com', 'password');
      const result = await service.signUp('existing@example.com', 'password2');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('User already exists');
    });
  });

  describe('signIn', () => {
    it('signs in with valid credentials', async () => {
      await service.signUp('user@example.com', 'password123');
      const result = await service.signIn('user@example.com', 'password123');

      expect(result.error).toBeNull();
      expect(result.data?.email).toBe('user@example.com');
    });

    it('returns error with invalid credentials', async () => {
      await service.signUp('user@example.com', 'password123');
      const result = await service.signIn('user@example.com', 'wrong');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid email or password');
    });

    it('returns error when user does not exist', async () => {
      const result = await service.signIn('noone@example.com', 'pass');

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Invalid email or password');
    });
  });

  describe('signOut', () => {
    it('signs out the current user', async () => {
      await service.signUp('user@example.com', 'password');
      const result = await service.signOut();

      expect(result.error).toBeNull();
    });

    it('clears current user after sign out', async () => {
      await service.signUp('user@example.com', 'password');
      await service.signOut();
      const current = await service.getCurrentUser();

      expect(current.data).toBeNull();
      expect(current.error?.message).toBe('Not authenticated');
    });
  });

  describe('getCurrentUser', () => {
    it('returns current user when signed in', async () => {
      await service.signUp('user@example.com', 'password');
      const result = await service.getCurrentUser();

      expect(result.data?.email).toBe('user@example.com');
      expect(result.error).toBeNull();
    });

    it('returns not-authenticated error when no user', async () => {
      const result = await service.getCurrentUser();

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Not authenticated');
    });
  });

  describe('onAuthStateChange', () => {
    it('immediately invokes callback with current user state', async () => {
      await service.signUp('user@example.com', 'password');

      return new Promise<void>((resolve) => {
        service.onAuthStateChange((user) => {
          if (user) {
            expect(user.email).toBe('user@example.com');
            resolve();
          }
        });
      });
    });

    it('notifies listeners synchronously after sign in', async () => {
      await service.signUp('user@example.com', 'password');
      await service.signOut();

      const notifications: Array<string | null> = [];
      service.onAuthStateChange((user) => {
        if (user) notifications.push(user.email);
      });

      await service.signIn('user@example.com', 'password');

      expect(notifications).toContain('user@example.com');
    });

    it('returns unsubscribe function', async () => {
      const subscription = service.onAuthStateChange(() => {});

      expect(subscription.data.subscription.unsubscribe).toBeTypeOf('function');
    });

    it('unsubscribe prevents future notifications', async () => {
      const received: string[] = [];
      const subscription = service.onAuthStateChange((user) => {
        if (user) received.push(user.email);
      });

      subscription.data.subscription.unsubscribe();
      await service.signUp('new@example.com', 'password');

      expect(received).not.toContain('new@example.com');
    });
  });

  describe('signInWithOAuth', () => {
    it('creates demo user for provider and signs them in', async () => {
      const result = await service.signInWithOAuth('google');

      expect(result.error).toBeNull();
      expect(result.data?.email).toBe('demo-google@example.com');
    });

    it('reuses existing demo user on subsequent OAuth sign-ins', async () => {
      await service.signInWithOAuth('github');
      const result = await service.signInWithOAuth('github');

      expect(result.data?.email).toBe('demo-github@example.com');
      expect(result.error).toBeNull();
    });
  });
});
