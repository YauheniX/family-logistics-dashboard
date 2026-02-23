/**
 * Shared composable for link preview fetching with 7-day caching
 * Used by LinkPreview component and WishlistListView
 */

export interface LinkPreviewData {
  title: string;
  description: string;
  image: string;
  domain: string;
  url: string;
}

interface CachedPreview {
  data: LinkPreviewData;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'link_preview_';
const CACHE_EXPIRATION_DAYS = 7;
const API_ENDPOINT = 'https://api.microlink.io';

/**
 * Get cache key for a URL
 */
function getCacheKey(url: string): string {
  return `${CACHE_KEY_PREFIX}${btoa(url)}`;
}

/**
 * Check if cached data is expired (older than 7 days)
 */
function isCacheExpired(timestamp: number): boolean {
  const expirationMs = CACHE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - timestamp > expirationMs;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Get cached preview from localStorage
 */
export function getCachedPreview(url: string): LinkPreviewData | null {
  try {
    const cached = localStorage.getItem(getCacheKey(url));
    if (!cached) return null;

    const parsedCache: CachedPreview = JSON.parse(cached);

    // Return null if expired
    if (isCacheExpired(parsedCache.timestamp)) {
      return null;
    }

    return parsedCache.data;
  } catch (err) {
    console.error('Failed to read cache:', err);
    return null;
  }
}

/**
 * Check if cache needs refresh (background refresh for expired data)
 */
export function needsCacheRefresh(url: string): boolean {
  try {
    const cached = localStorage.getItem(getCacheKey(url));
    if (!cached) return true;

    const parsedCache: CachedPreview = JSON.parse(cached);
    return isCacheExpired(parsedCache.timestamp);
  } catch {
    return true;
  }
}

/**
 * Save preview to localStorage cache
 */
export function saveCachePreview(url: string, data: LinkPreviewData): void {
  try {
    const cacheData: CachedPreview = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(url), JSON.stringify(cacheData));
  } catch (err) {
    console.error('Failed to save cache:', err);
  }
}

/**
 * Fetch preview from Microlink API with screenshot
 * @param url - URL to fetch preview for
 * @param config - Optional API configuration
 * @param options - Fetch options (force: skip cache)
 * @returns LinkPreviewData or null if fetch fails
 */
export async function fetchLinkPreview(
  url: string,
  config: {
    screenshot?: boolean;
    meta?: boolean;
    viewportWidth?: number;
    viewportHeight?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
  } = {},
  options: { force?: boolean } = {},
): Promise<LinkPreviewData | null> {
  // Check cache first (unless force=true)
  if (!options.force) {
    const cached = getCachedPreview(url);
    if (cached) {
      return cached;
    }
  }

  try {
    // Build API URL with parameters
    const params = new URLSearchParams({
      url: url,
      screenshot: config.screenshot !== false ? 'true' : 'false',
      meta: config.meta !== false ? 'true' : 'false',
      'viewport.width': String(config.viewportWidth || 480),
      'viewport.height': String(config.viewportHeight || 480),
      'viewport.deviceScaleFactor': String(config.deviceScaleFactor || 2),
      'viewport.isMobile': config.isMobile !== false ? 'true' : 'false',
    });

    const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      // Silently fail for rate limits (429 = Too Many Requests)
      return null;
    }

    const result = await response.json();

    // Validate response structure
    if (result.status !== 'success' || !result.data) {
      return null;
    }

    const { data } = result;
    const previewData: LinkPreviewData = {
      title: data.title || '',
      description: data.description || '',
      image: data.screenshot?.url || data.image?.url || '',
      domain: extractDomain(data.url || url),
      url: data.url || url,
    };

    // Save to cache
    saveCachePreview(url, previewData);

    return previewData;
  } catch (err) {
    console.error('Failed to fetch link preview:', err);
    return null;
  }
}

/**
 * Fetch multiple link previews in parallel
 * @param urls - Array of URLs to fetch
 * @param config - Optional API configuration
 * @returns Record of url -> LinkPreviewData (only includes successful fetches)
 */
export async function fetchLinkPreviews(
  urls: string[],
  config?: Parameters<typeof fetchLinkPreview>[1],
): Promise<Record<string, LinkPreviewData>> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const preview = await fetchLinkPreview(url, config);
      return { url, preview };
    }),
  );

  // Convert to record, excluding null results
  const record: Record<string, LinkPreviewData> = {};
  for (const { url, preview } of results) {
    if (preview) {
      record[url] = preview;
    }
  }

  return record;
}
