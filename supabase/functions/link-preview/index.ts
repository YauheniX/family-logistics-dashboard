/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

type LinkPreviewRequest = {
  url: string;
  config?: {
    screenshot?: boolean;
    meta?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
  };
};

type LinkPreviewData = {
  title: string;
  description: string;
  image: string;
  domain: string;
  url: string;
};

const ZENROWS_ENDPOINT = 'https://api.zenrows.com/v1/';
const MICROLINK_ENDPOINT = 'https://api.microlink.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
} as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return json({ ok: true, function: 'link-preview' }, 200);
  }

  if (req.method !== 'POST') {
    return json({ status: 'error', message: 'Method not allowed' }, 405);
  }

  let body: LinkPreviewRequest;
  try {
    body = (await req.json()) as LinkPreviewRequest;
  } catch {
    return json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const targetUrl = (body.url ?? '').trim();
  if (!isValidHttpUrl(targetUrl)) {
    return json({ status: 'error', message: 'Invalid URL' }, 400);
  }

  const config = body.config ?? {};
  const zenrowsApiKey = Deno.env.get('ZENROWS_API_KEY')?.trim();

  try {
    const preview =
      (zenrowsApiKey ? await fetchViaZenRows(targetUrl, config, zenrowsApiKey) : null) ||
      (await fetchViaMicrolink(targetUrl, config));

    if (!preview) {
      return json({ status: 'error', message: 'Preview fetch failed' }, 502);
    }

    return json({ status: 'success', data: preview }, 200);
  } catch {
    return json({ status: 'error', message: 'Preview fetch failed' }, 502);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function extractFirstMatch(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function parseHtmlMeta(
  html: string,
  fallbackUrl: string,
): { title: string; description: string; image: string; url: string } {
  if (!html) {
    return { title: '', description: '', image: '', url: fallbackUrl };
  }

  const title =
    extractFirstMatch(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    extractFirstMatch(html, /<title[^>]*>([^<]+)<\/title>/i);

  const description =
    extractFirstMatch(
      html,
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    extractFirstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);

  const image = extractFirstMatch(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  );

  const canonical = extractFirstMatch(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  const ogUrl = extractFirstMatch(
    html,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
  );

  return {
    title,
    description,
    image,
    url: ogUrl || canonical || fallbackUrl,
  };
}

async function fetchViaZenRows(
  url: string,
  config: NonNullable<LinkPreviewRequest['config']>,
  apiKey: string,
): Promise<LinkPreviewData | null> {
  const params = new URLSearchParams({
    url,
    apikey: apiKey,
    screenshot: config.screenshot !== false ? 'true' : 'false',
    json_response: 'true',
    js_render: 'true',
    window_width: String(config.viewportWidth || 480),
    window_height: String(config.viewportHeight || 480),
    device: config.isMobile !== false ? 'mobile' : 'desktop',
    original_status: 'true',
  });

  const response = await fetch(`${ZENROWS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) return null;

  const result = await response.json();

  if (result?.status === 'success' && result?.data) {
    const data = result.data;
    return {
      title: data.title || '',
      description: data.description || '',
      image: data.screenshot?.url || data.image?.url || '',
      domain: getDomain(data.url || url),
      url: data.url || url,
    };
  }

  const html = typeof result?.html === 'string' ? result.html : '';
  const meta = parseHtmlMeta(html, url);

  const screenshotBase64 =
    typeof result?.screenshot?.data === 'string' && result.screenshot.data.length > 0
      ? result.screenshot.data
      : '';

  return {
    title: meta.title,
    description: config.meta === false ? '' : meta.description,
    image: screenshotBase64 ? `data:image/png;base64,${screenshotBase64}` : meta.image,
    domain: getDomain(meta.url || url),
    url: meta.url || url,
  };
}

async function fetchViaMicrolink(
  url: string,
  config: NonNullable<LinkPreviewRequest['config']>,
): Promise<LinkPreviewData | null> {
  const params = new URLSearchParams({
    url,
    screenshot: config.screenshot !== false ? 'true' : 'false',
    meta: config.meta !== false ? 'true' : 'false',
    'viewport.width': String(config.viewportWidth || 480),
    'viewport.height': String(config.viewportHeight || 480),
    'viewport.deviceScaleFactor': String(config.deviceScaleFactor || 2),
    'viewport.isMobile': config.isMobile !== false ? 'true' : 'false',
  });

  const response = await fetch(`${MICROLINK_ENDPOINT}?${params.toString()}`);
  if (!response.ok) return null;

  const result = await response.json();
  if (result?.status !== 'success' || !result?.data) return null;

  const data = result.data;
  return {
    title: data.title || '',
    description: data.description || '',
    image: data.screenshot?.url || data.image?.url || '',
    domain: getDomain(data.url || url),
    url: data.url || url,
  };
}
