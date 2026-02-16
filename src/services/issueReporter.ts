import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { isMockMode } from '@/config/backend.config';
import { APP_VERSION } from '@/utils/appMeta';

export type ScreenshotPayload = {
  name: string;
  type: string;
  dataBase64: string;
};

export type IssueLabel = 'bug' | 'enhancement' | 'super buba issue';

export type ReportProblemInput = {
  title: string;
  description: string;
  screenshot: ScreenshotPayload | null;
  userId: string | null;
  label: IssueLabel;
};

export type ReportProblemResult = {
  issueUrl?: string;
};

function base64UrlDecodeToString(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  // atob expects standard base64
  return atob(normalized + pad);
}

function tryParseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = base64UrlDecodeToString(parts[1] ?? '');
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    return payload;
  } catch {
    return null;
  }
}

function getJwtExpMs(payload: Record<string, unknown> | null): number | null {
  const exp = payload?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

function isIssuerLikelyForProject(
  payload: Record<string, unknown> | null,
  supabaseOrigin: string,
): boolean {
  const iss = payload?.iss;
  if (typeof iss !== 'string') return true; // can't verify; don't block
  // Typical: https://<ref>.supabase.co/auth/v1
  return iss.startsWith(`${supabaseOrigin}/auth/v1`);
}

export async function reportProblem(input: ReportProblemInput): Promise<ReportProblemResult> {
  if (isMockMode()) {
    throw new Error('Issue reporting requires a backend (Supabase) to be enabled.');
  }

  const enableAuthDebug = import.meta.env.DEV || import.meta.env.VITE_ENABLE_AUTH_DEBUG === 'true';

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
    );
  }

  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    // Surface the underlying auth/storage problem instead of misreporting it as "not signed in".
    const message = sessionError.message || 'Failed to retrieve authentication session.';
    throw new Error(message);
  }

  const { session } = data ?? {};

  if (!session?.access_token) {
    throw new Error('You must be signed in to report a problem.');
  }

  const initialPayload = tryParseJwtPayload(session.access_token);
  if (!initialPayload) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    throw new Error('Your authentication session is invalid. Please sign out and sign back in.');
  }

  if (!isIssuerLikelyForProject(initialPayload, new URL(supabaseUrl).origin)) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // ignore
    }
    throw new Error(
      'Your session appears to be for a different Supabase project. Please sign out and sign back in.',
    );
  }

  // If the access token is expired/near-expiry, refresh to avoid intermittent 401s.
  const expiresAtMs = typeof session.expires_at === 'number' ? session.expires_at * 1000 : null;
  const jwtExpMs = getJwtExpMs(initialPayload);
  const effectiveExpMs = expiresAtMs ?? jwtExpMs;
  if (effectiveExpMs && effectiveExpMs <= Date.now() + 30_000) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw new Error(refreshError.message || 'Your session has expired. Please sign in again.');
    }
  }

  // Re-read session after refresh attempt.
  const { data: refreshed, error: refreshedError } = await supabase.auth.getSession();
  if (refreshedError) {
    throw new Error(refreshedError.message || 'Failed to retrieve authentication session.');
  }

  const accessToken = refreshed?.session?.access_token ?? session.access_token;
  const refreshedPayload = tryParseJwtPayload(accessToken);
  if (!refreshedPayload) {
    throw new Error('Your authentication session is invalid. Please sign out and sign back in.');
  }

  if (enableAuthDebug) {
    const tokenPreview = `${accessToken.slice(0, 12)}...${accessToken.slice(-12)}`;
    const iss = typeof refreshedPayload.iss === 'string' ? refreshedPayload.iss : undefined;
    const exp = typeof refreshedPayload.exp === 'number' ? refreshedPayload.exp : undefined;
    // eslint-disable-next-line no-console
    console.info('[reportProblem] auth debug', {
      supabaseUrl,
      issuer: iss,
      expIso: exp ? new Date(exp * 1000).toISOString() : undefined,
      tokenPreview,
    });
  }

  const payload = {
    title: input.title,
    description: input.description,
    screenshot: input.screenshot,
    appVersion: APP_VERSION,
    browser: navigator.userAgent,
    userId: input.userId,
    label: input.label,
  };

  if (enableAuthDebug) {
    try {
      const authCheck = await fetch(`${new URL(supabaseUrl).origin}/auth/v1/user`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const authCheckText = await authCheck.text();
      // eslint-disable-next-line no-console
      console.info('[reportProblem] /auth/v1/user check', {
        status: authCheck.status,
        bodySnippet: authCheckText.slice(0, 200),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[reportProblem] /auth/v1/user check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const functionsBaseUrl = new URL(supabaseUrl);
  // Hosted: https://<ref>.supabase.co -> https://<ref>.functions.supabase.co/report-issue
  // Local:  http://localhost:54321   -> http://localhost:54321/functions/v1/report-issue
  const endpoint = functionsBaseUrl.origin.endsWith('.supabase.co')
    ? `${functionsBaseUrl.origin.replace('.supabase.co', '.functions.supabase.co')}/report-issue`
    : `${functionsBaseUrl.origin}/functions/v1/report-issue`;

  if (enableAuthDebug) {
    // eslint-disable-next-line no-console
    console.info('[reportProblem] endpoint', { endpoint });
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (enableAuthDebug) {
      const snippet =
        body == null
          ? ''
          : typeof body === 'string'
            ? body.slice(0, 300)
            : JSON.stringify(body).slice(0, 300);
      // eslint-disable-next-line no-console
      console.warn('[reportProblem] non-2xx', { status: response.status, bodySnippet: snippet });
    }

    if (response.status === 401) {
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message?: unknown }).message)
          : typeof body === 'string'
            ? body
            : '';
      if (message.toLowerCase().includes('invalid jwt')) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // ignore
        }
        throw new Error(
          'Your session token is invalid or expired. Please sign out and sign back in, then try again.',
        );
      }
    }

    const details =
      body == null
        ? ''
        : ` Response: ${typeof body === 'string' ? body.slice(0, 800) : JSON.stringify(body).slice(0, 800)}`;
    throw new Error(`[${response.status}] Edge Function request failed.${details}`);
  }

  const json = (await response.json().catch(() => ({}))) as ReportProblemResult;
  return json ?? {};
}
