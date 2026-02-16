import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportProblem, type ReportProblemInput } from '@/services/issueReporter';
import * as backendConfig from '@/config/backend.config';
import { supabase } from '@/features/shared/infrastructure/supabase.client';

function base64UrlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value);
  const base64 = Buffer.from(json, 'utf8').toString('base64');
  return base64.replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeTestJwt(overrides?: Record<string, unknown>): string {
  const header = base64UrlEncodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncodeJson({
    iss: 'https://titgbwnsclhzxlfflpho.supabase.co/auth/v1',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
    ...overrides,
  });
  return `${header}.${payload}.signature`;
}

vi.mock('@/config/backend.config', () => ({
  isMockMode: vi.fn(),
}));

vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

describe('Issue Reporter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv('VITE_SUPABASE_URL', 'https://titgbwnsclhzxlfflpho.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => ({ issueUrl: 'https://github.com/test/repo/issues/1' }),
        } as unknown as Response;
      }),
    );

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: makeTestJwt(),
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

    vi.mocked(supabase.auth.refreshSession).mockResolvedValue({
      data: null,
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.refreshSession>>);
  });

  it('throws error in mock mode', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(true);

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      userId: 'user-123',
      label: 'bug',
    };

    await expect(reportProblem(input)).rejects.toThrow(
      'Issue reporting requires a backend (Supabase) to be enabled.',
    );
  });


  it('throws error when Edge Function returns non-2xx', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ error: 'boom' }),
          json: async () => ({ error: 'boom' }),
        } as unknown as Response;
      }),
    );

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      userId: 'user-123',
      label: 'bug',
    };

    await expect(reportProblem(input)).rejects.toThrow('[500] Edge Function request failed');
  });

  it('returns empty object when response JSON is null', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return {
          ok: true,
          status: 200,
          text: async () => '',
          json: async () => null,
        } as unknown as Response;
      }),
    );

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      userId: 'user-123',
      label: 'bug',
    };

    const result = await reportProblem(input);
    expect(result).toEqual({});
  });

  describe('JWT validation', () => {
    it('throws error when JWT payload parsing fails', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // Invalid JWT with only 2 parts instead of 3
      const invalidJwt = 'header.payload';
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: invalidJwt,
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const signOutMock = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth).signOut = signOutMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow(
        'Your authentication session is invalid. Please sign out and sign back in.',
      );
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('throws error when JWT payload has invalid base64', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // Invalid JWT with malformed base64 payload
      const invalidJwt = 'header.!!!invalid!!!.signature';
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: invalidJwt,
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const signOutMock = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth).signOut = signOutMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow(
        'Your authentication session is invalid. Please sign out and sign back in.',
      );
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('throws error when JWT issuer is for different project', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // JWT with wrong issuer
      const wrongIssuerJwt = makeTestJwt({
        iss: 'https://wrongproject.supabase.co/auth/v1',
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: wrongIssuerJwt,
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const signOutMock = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.auth).signOut = signOutMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow(
        'Your session appears to be for a different Supabase project. Please sign out and sign back in.',
      );
      expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    });

    it('refreshes session when token is expired', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // JWT that expired 1 hour ago
      const expiredJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      const refreshedJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      vi.mocked(supabase.auth.getSession)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: expiredJwt,
              expires_at: Math.floor(Date.now() / 1000) - 3600,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: refreshedJwt,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const refreshMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(supabase.auth).refreshSession = refreshMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await reportProblem(input);

      expect(refreshMock).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${refreshedJwt}`,
          }),
        }),
      );
    });

    it('throws error when refresh fails', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // JWT that expired
      const expiredJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            access_token: expiredJwt,
            expires_at: Math.floor(Date.now() / 1000) - 3600,
          },
        },
        error: null,
      } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const refreshMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Refresh failed' },
      });
      vi.mocked(supabase.auth).refreshSession = refreshMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow('Refresh failed');
      expect(refreshMock).toHaveBeenCalled();
    });

    it('throws error when refreshed session is invalid', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      const expiredJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      const invalidRefreshedJwt = 'invalid.jwt.token';

      vi.mocked(supabase.auth.getSession)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: expiredJwt,
              expires_at: Math.floor(Date.now() / 1000) - 3600,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: invalidRefreshedJwt,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const refreshMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(supabase.auth).refreshSession = refreshMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow(
        'Your authentication session is invalid. Please sign out and sign back in.',
      );
    });

    it('throws error when getSession fails after refresh', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      const expiredJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) - 3600,
      });

      vi.mocked(supabase.auth.getSession)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: expiredJwt,
              expires_at: Math.floor(Date.now() / 1000) - 3600,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Failed to get session after refresh' },
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const refreshMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(supabase.auth).refreshSession = refreshMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await expect(reportProblem(input)).rejects.toThrow('Failed to get session after refresh');
    });

    it('handles token near expiry (within 30 seconds)', async () => {
      vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

      // JWT expiring in 20 seconds
      const nearExpiryJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) + 20,
      });

      const refreshedJwt = makeTestJwt({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });

      vi.mocked(supabase.auth.getSession)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: nearExpiryJwt,
              expires_at: Math.floor(Date.now() / 1000) + 20,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
        .mockResolvedValueOnce({
          data: {
            session: {
              access_token: refreshedJwt,
            },
          },
          error: null,
        } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>);

      const refreshMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });
      vi.mocked(supabase.auth).refreshSession = refreshMock;

      const input: ReportProblemInput = {
        title: 'Test Issue',
        description: 'Test description',
        userId: 'user-123',
        label: 'bug',
      };

      await reportProblem(input);

      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
