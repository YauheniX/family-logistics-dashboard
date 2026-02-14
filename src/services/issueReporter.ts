import { supabase } from '@/services/supabaseClient';
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

  const payload = {
    title: input.title,
    description: input.description,
    screenshot: input.screenshot,
    appVersion: APP_VERSION,
    browser: navigator.userAgent,
    userId: input.userId,
  };

  const { data, error } = await supabase.functions.invoke('report-issue', {
    body: payload,
  });

  if (error) {
    // Supabase may wrap edge errors; surface a readable message.
    const message = error.message || 'Failed to create GitHub issue.';
    throw new Error(message);
  }

  return (data ?? {}) as ReportProblemResult;
}
