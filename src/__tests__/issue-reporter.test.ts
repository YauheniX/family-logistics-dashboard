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
      screenshot: null,
      userId: 'user-123',
    };

    await expect(reportProblem(input)).rejects.toThrow(
      'Issue reporting requires a backend (Supabase) to be enabled.',
    );
  });

  it('sends correct payload to Edge Function', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    const result = await reportProblem(input);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe('https://titgbwnsclhzxlfflpho.functions.supabase.co/report-issue');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(
      expect.objectContaining({
        apikey: expect.any(String),
        Authorization: expect.stringMatching(/^Bearer\s+.+\..+\..+$/),
        'Content-Type': 'application/json',
      }),
    );
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({
        title: 'Test Issue',
        description: 'Test description',
        screenshot: null,
        appVersion: expect.any(String),
        browser: expect.any(String),
        userId: 'user-123',
      }),
    );

    expect(result).toEqual({
      issueUrl: 'https://github.com/test/repo/issues/1',
    });
  });

  it('includes screenshot in payload when provided', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

    const screenshot = {
      name: 'screenshot.png',
      type: 'image/png',
      dataBase64: 'base64data',
    };

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot,
      userId: 'user-123',
    };

    await reportProblem(input);

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual(
      expect.objectContaining({
        screenshot,
      }),
    );
  });

  it('includes app version and browser in payload', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    await reportProblem(input);

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    const body = JSON.parse(String(init?.body));
    expect(body).toHaveProperty('appVersion');
    expect(body).toHaveProperty('browser');
    expect(body.browser).toBe(navigator.userAgent);
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
      screenshot: null,
      userId: 'user-123',
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
      screenshot: null,
      userId: 'user-123',
    };

    const result = await reportProblem(input);
    expect(result).toEqual({});
  });
});
