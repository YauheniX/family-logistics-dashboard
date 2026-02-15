import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { isMockMode } from '@/config/backend.config';
import { APP_VERSION } from '@/utils/appMeta';

export type ScreenshotPayload = {
  name: string;
  type: string;
  dataBase64: string;
};

export type ReportProblemInput = {
  title: string;
  description: string;
  screenshot: ScreenshotPayload | null;
  userId: string | null;
};

export type ReportProblemResult = {
  issueUrl?: string;
};

export async function reportProblem(input: ReportProblemInput): Promise<ReportProblemResult> {
  if (isMockMode()) {
    throw new Error('Issue reporting requires a backend (Supabase) to be enabled.');
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

  const payload = {
    title: input.title,
    description: input.description,
    screenshot: input.screenshot,
    appVersion: APP_VERSION,
    browser: navigator.userAgent,
    userId: input.userId,
  };

  const { data: responseData, error } = await supabase.functions.invoke('report-issue', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    // Supabase may wrap edge errors; surface a readable message.
    // Common case: browser blocked request due to CORS / function not deployed.
    const raw = error.message || '';

    // Best-effort extraction of status/body from supabase-js error.
    const anyError = error as unknown as {
      context?: { status?: number; body?: unknown };
      status?: number;
    };
    const status = anyError.context?.status ?? anyError.status;
    const body = anyError.context?.body;

    const details =
      body == null
        ? ''
        : ` Response: ${typeof body === 'string' ? body.slice(0, 500) : JSON.stringify(body).slice(0, 500)}`;

    const message = raw.includes('Failed to send a request to the Edge Function')
      ? 'Issue reporting endpoint is unreachable. Verify the Supabase Edge Function `report-issue` is deployed and CORS allows your app domain.'
      : raw || 'Failed to create GitHub issue.';

    throw new Error(`${status ? `[${status}] ` : ''}${message}${details}`);
  }

  return (responseData ?? {}) as ReportProblemResult;
}
