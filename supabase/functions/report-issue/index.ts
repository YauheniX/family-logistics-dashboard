/// <reference lib="deno.ns" />
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
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
  if (screenshot?.dataBase64 && screenshot.dataBase64.length > 4_000_000) {
    return json({ error: 'Screenshot payload too large.' }, 413);
  }

  const verifiedUserId = await getVerifiedUserId(req);
  if (!verifiedUserId) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const issueBody = buildIssueBody({
    description,
    screenshot,
    appVersion: body.appVersion,
    browser: body.browser,
    userId: verifiedUserId,
  });

  const createIssueResponse = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(githubOwner)}/${encodeURIComponent(githubRepo)}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'family-logistics-dashboard',
      },
      body: JSON.stringify({
        title,
        body: issueBody,
      }),
    },
  );

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

  const created = (await createIssueResponse.json()) as { html_url?: string };
  return json({ issueUrl: created.html_url }, 200);
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
  parts.push(input.description);
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
    parts.push(`- Name: ${sanitizeInline(input.screenshot.name)}`);
    parts.push(`- Type: ${sanitizeInline(input.screenshot.type)}`);
    parts.push('');
    parts.push('```base64');
    parts.push(input.screenshot.dataBase64);
    parts.push('```');
    parts.push('');
  }

  return parts.join('\n');
}

function sanitizeInline(value: string) {
  return value.replace(/[\r\n]/g, ' ').slice(0, 500);
}

async function getVerifiedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

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
    if (error) return null;
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
