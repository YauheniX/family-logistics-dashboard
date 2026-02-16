/// <reference lib="deno.ns" />
// NOTE: Deno std and Supabase client versions are intentionally pinned for reproducible builds
// and to match the known-good Supabase Edge Functions runtime environment.
// Review and update these versions periodically after verifying compatibility with the runtime.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type ScreenshotPayload = {
  name: string;
  type: string;
  dataBase64: string;
};

type ReportIssueRequest = {
  title: string;
  description: string;
  screenshot?: ScreenshotPayload | null;
  appVersion?: string;
  browser?: string;
  userId?: string | null; // client-provided (untrusted)
  label?: 'bug' | 'enhancement' | 'super buba issue';
};

// CORS
// This function is called from the browser (your app domain), not from your Supabase project domain.
// Using '*' is fine here because we do NOT rely on cookies; auth is via Authorization bearer token.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
} as const;

serve(async (req) => {
  // NOTE: Rate limiting should be implemented to prevent abuse.
  // Consider using Supabase's built-in rate limiting features or
  // implementing custom rate limiting based on user ID.
  // For production, track issue creation timestamps per user.

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Health check for deploy/CORS debugging (does not create issues)
  if (req.method === 'GET') {
    return json({ ok: true, function: 'report-issue' }, 200);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const githubToken = Deno.env.get('GITHUB_TOKEN');
  const githubOwner = Deno.env.get('GITHUB_OWNER');
  const githubRepo = Deno.env.get('GITHUB_REPO');

  if (!githubToken || !githubOwner || !githubRepo) {
    return json({ error: 'Server misconfigured (missing GitHub env vars).' }, 500);
  }

  let body: ReportIssueRequest;
  try {
    body = (await req.json()) as ReportIssueRequest;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const title = (body.title ?? '').trim();
  const description = (body.description ?? '').trim();
  if (!title) return json({ error: 'Title is required.' }, 400);
  if (!description) return json({ error: 'Description is required.' }, 400);

  const screenshot = body.screenshot ?? null;
  if (screenshot?.dataBase64) {
    // Frontend validates 2MB file size; base64 encoding adds ~33% overhead
    // So 2MB becomes ~2.67MB. We use 3MB limit to be safe.
    if (screenshot.dataBase64.length > 3_000_000) {
      return json({ error: 'Screenshot payload too large.' }, 413);
    }
    // Validate base64 format (alphanumeric + / + = padding).
    // Note: This is a *sanity check* and does not fully validate base64 padding or length.
    // The resulting string is sent to the GitHub Issues API and used only in markdown content
    // (e.g. as an image), where GitHub safely handles and stores the data without executing it
    // as code. This check is therefore sufficient to reject clearly malformed input while
    // relying on GitHub's handling for safe storage/rendering.
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(screenshot.dataBase64)) {
      return json({ error: 'Invalid screenshot data format.' }, 400);
    }
  }

  const verified = await getVerifiedUser(req);
  if (!verified.userId) {
    return json({ error: 'Unauthorized', reason: verified.reason }, 401);
  }

  const issueBody = buildIssueBody({
    description,
    screenshot,
    appVersion: body.appVersion,
    browser: body.browser,
    userId: verified.userId,
  });

  const label =
    body.label === 'enhancement'
      ? 'enhancement'
      : body.label === 'super buba issue'
        ? 'super buba issue'
        : 'bug';

  try {
    const issueEndpoint = `https://api.github.com/repos/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}/issues`;
    const headers = {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'family-logistics-dashboard',
    };

    const basePayload = {
      title: sanitizeInline(title),
      body: issueBody,
    };

    // Apply default label. If the label doesn't exist in the repo, GitHub returns 422.
    // In that case, retry without labels to avoid blocking reporting.
    const createWithLabels = await fetch(issueEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...basePayload,
        labels: [label],
      }),
    });

    const createIssueResponse = createWithLabels;

    if (!createIssueResponse.ok && createIssueResponse.status === 422) {
      const retryWithoutLabels = await fetch(issueEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(basePayload),
      });

      // If retry succeeds, use it; otherwise keep original failure response for diagnostics.
      if (retryWithoutLabels.ok) {
        return json({ issueUrl: (await retryWithoutLabels.json()).html_url }, 200);
      }

      const retryText = await retryWithoutLabels.text();
      return json(
        {
          error: 'GitHub issue creation failed.',
          details: retryText.slice(0, 2000),
        },
        502,
      );
    }

    if (!createIssueResponse.ok) {
      const text = await createIssueResponse.text();
      return json(
        {
          error: 'GitHub issue creation failed.',
          details: text.slice(0, 2000),
        },
        502,
      );
    }

    try {
      const created = (await createIssueResponse.json()) as { html_url?: string };
      return json({ issueUrl: created.html_url }, 200);
    } catch (error) {
      console.error('Failed to parse GitHub issue creation response as JSON', error);
      return json(
        {
          error: 'GitHub issue creation response could not be parsed as JSON.',
        },
        502,
      );
    }
  } catch (error) {
    console.error('Failed to contact GitHub API', error);
    return json(
      {
        error: 'Failed to contact GitHub.',
        details: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function buildIssueBody(input: {
  description: string;
  screenshot: ScreenshotPayload | null;
  appVersion?: string;
  browser?: string;
  userId?: string | null;
}) {
  const parts: string[] = [];
  parts.push('### Description');
  parts.push(sanitizeDescription(input.description));
  parts.push('');

  parts.push('### Metadata');
  parts.push(`- App version: ${sanitizeInline(input.appVersion ?? 'unknown')}`);
  parts.push(`- Browser: ${sanitizeInline(input.browser ?? 'unknown')}`);
  parts.push(`- User ID: ${sanitizeInline(input.userId ?? 'anonymous')}`);
  parts.push('');

  if (input.screenshot?.dataBase64) {
    parts.push('### Screenshot');
    parts.push(
      '_Attached as base64 to keep the implementation minimal. Decode locally if needed._',
    );
    parts.push('');
    parts.push('<details>');
    parts.push(`<summary>Show screenshot data (${sanitizeInline(input.screenshot.name)})</summary>`);
    parts.push('');
    parts.push(`- Name: ${sanitizeInline(input.screenshot.name)}`);
    parts.push(`- Type: ${sanitizeInline(input.screenshot.type)}`);
    parts.push('');
    parts.push('```base64');
    parts.push(input.screenshot.dataBase64);
    parts.push('```');
    parts.push('');
    parts.push('</details>');
    parts.push('');
  }

  return parts.join('\n');
}

function sanitizeInline(value: string) {
  return value.replace(/[\r\n]/g, ' ').slice(0, 500);
}

function sanitizeDescription(value: string): string {
  // Preserve basic formatting but prevent breaking the issue structure
  // Remove or escape characters that could break out of the Description section
  // Limit to reasonable length
  return value
    .replace(/```/g, '` ` `') // Prevent code block injection
    .replace(/^#+\s/gm, '') // Remove heading markers to prevent section injection
    .slice(0, 5000); // Reasonable limit for descriptions
}

async function getVerifiedUser(req: Request): Promise<{ userId: string | null; reason: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { userId: null, reason: 'Missing Authorization header' };

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY in Edge Function environment; unable to verify user.',
    );
    return { userId: null, reason: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY' };
  }

  try {
    const supabase = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return { userId: null, reason: `Invalid token: ${String(error.message || 'unknown')}` };
    }
    return { userId: data.user?.id ?? null, reason: data.user?.id ? 'ok' : 'No user in token' };
  } catch {
    return { userId: null, reason: 'Failed to verify token' };
  }
}
