import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportProblem, type ReportProblemInput } from '@/services/issueReporter';
import * as backendConfig from '@/config/backend.config';
import { supabase } from '@/services/supabaseClient';

vi.mock('@/config/backend.config', () => ({
  isMockMode: vi.fn(),
}));

vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('Issue Reporter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('sends correct payload to Supabase function', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { issueUrl: 'https://github.com/test/repo/issues/1' },
      error: null,
    });

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    const result = await reportProblem(input);

    expect(supabase.functions.invoke).toHaveBeenCalledWith('report-issue', {
      body: {
        title: 'Test Issue',
        description: 'Test description',
        screenshot: null,
        appVersion: expect.any(String),
        browser: expect.any(String),
        userId: 'user-123',
      },
    });

    expect(result).toEqual({
      issueUrl: 'https://github.com/test/repo/issues/1',
    });
  });

  it('includes screenshot in payload when provided', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { issueUrl: 'https://github.com/test/repo/issues/2' },
      error: null,
    });

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

    expect(supabase.functions.invoke).toHaveBeenCalledWith('report-issue', {
      body: expect.objectContaining({
        screenshot,
      }),
    });
  });

  it('includes app version and browser in payload', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {},
      error: null,
    });

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    await reportProblem(input);

    const call = vi.mocked(supabase.functions.invoke).mock.calls[0];
    expect(call[1]?.body).toHaveProperty('appVersion');
    expect(call[1]?.body).toHaveProperty('browser');
    expect(call[1]?.body.browser).toBe(navigator.userAgent);
  });

  it('throws error when Supabase function fails', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Network error' },
    });

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    await expect(reportProblem(input)).rejects.toThrow('Network error');
  });

  it('throws default error message when error has no message', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {},
    });

    const input: ReportProblemInput = {
      title: 'Test Issue',
      description: 'Test description',
      screenshot: null,
      userId: 'user-123',
    };

    await expect(reportProblem(input)).rejects.toThrow('Failed to create GitHub issue.');
  });

  it('returns empty object when data is null', async () => {
    vi.mocked(backendConfig.isMockMode).mockReturnValue(false);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: null,
    });

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
