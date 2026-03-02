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

type ResolvedLinkPreviewConfig = {
  screenshot: boolean;
  meta: boolean;
  viewportWidth: number;
  viewportHeight: number;
  deviceScaleFactor: number;
  isMobile: boolean;
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
const PROVIDER_TIMEOUT_MS = Number(Deno.env.get('LINK_PREVIEW_PROVIDER_TIMEOUT_MS') ?? '12000');
const RATE_LIMIT_WINDOW_MS = Number(Deno.env.get('LINK_PREVIEW_RATE_LIMIT_WINDOW_MS') ?? '60000');
const RATE_LIMIT_MAX_REQUESTS = Number(
  Deno.env.get('LINK_PREVIEW_RATE_LIMIT_MAX_REQUESTS') ?? '20',
);
const PREVIEW_CACHE_TTL_MS = Number(Deno.env.get('LINK_PREVIEW_CACHE_TTL_MS') ?? '21600000');
const PREVIEW_CACHE_MAX_ENTRIES = Number(Deno.env.get('LINK_PREVIEW_CACHE_MAX_ENTRIES') ?? '500');

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const previewCacheStore = new Map<
  string,
  { data: LinkPreviewData; expiresAt: number; createdAt: number }
>();

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

  const normalizedUrl = new URL(targetUrl).toString();
  const resolvedConfig = resolveConfig(body.config);
  const cacheKey = await buildCacheKey(normalizedUrl, resolvedConfig);
  const cachedPreview = getCachedPreview(cacheKey);
  if (cachedPreview) {
    return json({ status: 'success', data: cachedPreview }, 200);
  }

  const rateLimitKey = getRateLimitKey(req);
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return json(
      { status: 'error', message: 'Rate limit exceeded' },
      429,
      rateCheck.retryAfterSeconds
        ? { 'Retry-After': String(rateCheck.retryAfterSeconds) }
        : undefined,
    );
  }

  const config = resolvedConfig;
  const zenrowsApiKey = Deno.env.get('ZENROWS_API_KEY')?.trim();

  try {
    let zenrowsPreview: LinkPreviewData | null = null;
    if (zenrowsApiKey) {
      try {
        zenrowsPreview = await fetchViaZenRows(normalizedUrl, config, zenrowsApiKey);
      } catch (error) {
        console.warn('ZenRows provider failed, falling back to Microlink', error);
      }
    }

    let microlinkPreview: LinkPreviewData | null = null;
    if (!zenrowsPreview) {
      try {
        microlinkPreview = await fetchViaMicrolink(normalizedUrl, config);
      } catch (error) {
        console.warn('Microlink provider failed', error);
      }
    }

    const preview = zenrowsPreview || microlinkPreview;

    if (!preview) {
      return json({ status: 'error', message: 'Preview fetch failed' }, 502);
    }

    setCachedPreview(cacheKey, preview);

    return json({ status: 'success', data: preview }, 200);
  } catch {
    return json({ status: 'error', message: 'Preview fetch failed' }, 502);
  }
});

function json(payload: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function parseJwtUserId(authorizationHeader: string | null): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;

  const token = authorizationHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-client-ip') ||
    'unknown'
  );
}

function getRateLimitKey(req: Request): string {
  const userId = parseJwtUserId(req.headers.get('authorization'));
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
}

function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);
  return { allowed: true };
}

function normalizeImage(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object') {
    const imageObject = value as { url?: unknown; src?: unknown; srcUrl?: unknown };
    if (typeof imageObject.url === 'string') return imageObject.url.trim();
    if (typeof imageObject.src === 'string') return imageObject.src.trim();
    if (typeof imageObject.srcUrl === 'string') return imageObject.srcUrl.trim();
  }

  return '';
}

function resolveConfig(config?: LinkPreviewRequest['config']): ResolvedLinkPreviewConfig {
  return {
    screenshot: config?.screenshot !== false,
    meta: config?.meta !== false,
    viewportWidth: config?.viewportWidth || 480,
    viewportHeight: config?.viewportHeight || 480,
    deviceScaleFactor: config?.deviceScaleFactor || 2,
    isMobile: config?.isMobile !== false,
  };
}

async function buildCacheKey(url: string, config: ResolvedLinkPreviewConfig): Promise<string> {
  const payload = `${url}|${JSON.stringify(config)}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getCachedPreview(key: string): LinkPreviewData | null {
  const cached = previewCacheStore.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    previewCacheStore.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedPreview(key: string, data: LinkPreviewData): void {
  const now = Date.now();
  previewCacheStore.set(key, {
    data,
    expiresAt: now + PREVIEW_CACHE_TTL_MS,
    createdAt: now,
  });

  if (previewCacheStore.size <= PREVIEW_CACHE_MAX_ENTRIES) return;

  for (const [entryKey, entry] of previewCacheStore.entries()) {
    if (entry.expiresAt <= now) {
      previewCacheStore.delete(entryKey);
    }
  }

  if (previewCacheStore.size <= PREVIEW_CACHE_MAX_ENTRIES) return;

  let oldestKey: string | null = null;
  let oldestCreatedAt = Number.POSITIVE_INFINITY;
  for (const [entryKey, entry] of previewCacheStore.entries()) {
    if (entry.createdAt < oldestCreatedAt) {
      oldestCreatedAt = entry.createdAt;
      oldestKey = entryKey;
    }
  }

  if (oldestKey) {
    previewCacheStore.delete(oldestKey);
  }
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
  config: ResolvedLinkPreviewConfig,
  apiKey: string,
): Promise<LinkPreviewData | null> {
  const params = new URLSearchParams({
    url,
    apikey: apiKey,
    screenshot: config.screenshot ? 'true' : 'false',
    json_response: 'true',
    js_render: 'true',
    window_width: String(config.viewportWidth),
    window_height: String(config.viewportHeight),
    device: config.isMobile ? 'mobile' : 'desktop',
    original_status: 'true',
  });

  const response = await fetchWithTimeout(`${ZENROWS_ENDPOINT}?${params.toString()}`);
  if (!response) return null;
  if (!response.ok) return null;

  const result = await response.json();

  if (result?.status === 'success' && result?.data) {
    const data = result.data;
    return {
      title: data.title || '',
      description: data.description || '',
      image: normalizeImage(data.image) || normalizeImage(data.screenshot),
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
    description: config.meta ? meta.description : '',
    image: screenshotBase64 ? `data:image/png;base64,${screenshotBase64}` : meta.image,
    domain: getDomain(meta.url || url),
    url: meta.url || url,
  };
}

async function fetchViaMicrolink(
  url: string,
  config: ResolvedLinkPreviewConfig,
): Promise<LinkPreviewData | null> {
  const params = new URLSearchParams({
    url,
    screenshot: config.screenshot ? 'true' : 'false',
    meta: config.meta ? 'true' : 'false',
    'viewport.width': String(config.viewportWidth),
    'viewport.height': String(config.viewportHeight),
    'viewport.deviceScaleFactor': String(config.deviceScaleFactor),
    'viewport.isMobile': config.isMobile ? 'true' : 'false',
  });

  const response = await fetchWithTimeout(`${MICROLINK_ENDPOINT}?${params.toString()}`);
  if (!response) return null;
  if (!response.ok) return null;

  const result = await response.json();
  if (result?.status !== 'success' || !result?.data) return null;

  const data = result.data;
  return {
    title: data.title || '',
    description: data.description || '',
    image: normalizeImage(data.image) || normalizeImage(data.screenshot),
    domain: getDomain(data.url || url),
    url: data.url || url,
  };
}
