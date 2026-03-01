import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/config/backend.config', () => ({
  isMockMode: () => false,
}));

const { handleSupabaseAuthRedirect } = await import('@/utils/supabaseAuthRedirect');

describe('handleSupabaseAuthRedirect', () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    originalLocation = window.location;
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  function setLocation(href: string) {
    const url = new URL(href);
    Object.defineProperty(window, 'location', {
      value: {
        href: url.href,
        origin: url.origin,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      },
      writable: true,
      configurable: true,
    });
  }

  describe('PKCE flow error recovery', () => {
    it('calls signOut to clean up when exchangeCodeForSession fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      setLocation('https://example.com/app/?code=test-code');
      vi.mocked(supabase.auth.exchangeCodeForSession).mockRejectedValue(
        new Error('exchange failed'),
      );
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

      await handleSupabaseAuthRedirect();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('implicit flow error recovery', () => {
    it('calls signOut to clean up when setSession fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      setLocation('https://example.com/app/#access_token=tok&refresh_token=ref');
      vi.mocked(supabase.auth.setSession).mockRejectedValue(new Error('set session failed'));
      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);

      await handleSupabaseAuthRedirect();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('does not throw even if signOut also fails', async () => {
      const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
      setLocation('https://example.com/app/#access_token=tok&refresh_token=ref');
      vi.mocked(supabase.auth.setSession).mockRejectedValue(new Error('set failed'));
      vi.mocked(supabase.auth.signOut).mockRejectedValue(new Error('signOut failed'));

      await expect(handleSupabaseAuthRedirect()).resolves.not.toThrow();
    });
  });

  it('does nothing when no auth params present', async () => {
    const { supabase } = await import('@/features/shared/infrastructure/supabase.client');
    setLocation('https://example.com/app/#/dashboard');

    await handleSupabaseAuthRedirect();

    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(supabase.auth.setSession).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
