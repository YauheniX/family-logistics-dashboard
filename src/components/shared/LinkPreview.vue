<template>
  <div v-if="isValidLink" class="link-preview-container">
    <!-- Preview Card (with data or fallback) -->
    <a
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      class="link-preview glass-card flex flex-col transition-all hover:shadow-lg hover:border-brand-500 dark:hover:border-brand-400 group overflow-hidden"
    >
      <!-- Image -->
      <div
        class="flex-shrink-0 h-[360px] w-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center"
      >
        <img
          v-if="preview?.image && !imageError"
          :src="preview.image"
          :alt="preview.title"
          loading="lazy"
          class="w-full h-full object-cover"
          @error="handleImageError"
        />
        <svg
          v-else
          class="h-24 w-24 text-neutral-400 dark:text-neutral-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0 space-y-1 p-3">
        <!-- Title -->
        <h3
          class="font-semibold text-sm text-neutral-900 dark:text-neutral-50 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors"
        >
          {{ preview?.title || extractDomain(url) || 'View Link' }}
        </h3>

        <!-- Description -->
        <p
          v-if="preview?.description"
          class="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1"
        >
          {{ preview.description }}
        </p>

        <!-- Domain -->
        <p class="text-xs text-neutral-500 dark:text-neutral-500 flex items-center gap-1">
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          {{ preview?.domain || extractDomain(url) || url }}
        </p>
      </div>
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import { isValidUrl } from '@/utils/validation';

interface LinkPreviewData {
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

interface Props {
  url: string;
}

const props = defineProps<Props>();

const CACHE_KEY_PREFIX = 'link_preview_';
const CACHE_EXPIRATION_DAYS = 7;
const API_ENDPOINT = 'https://api.microlink.io';
const SCREENSHOT_CONFIG = {
  screenshot: 'true',
  meta: 'true',
  'viewport.width': '480',
  'viewport.height': '480',
  'viewport.deviceScaleFactor': '2',
  'viewport.isMobile': 'true',
};

const preview = ref<LinkPreviewData | null>(null);
const cachedPreview = ref<LinkPreviewData | null>(null);
const isLoading = ref(false);
const error = ref(false);
const imageError = ref(false);
const isMounted = ref(false);

const isValidLink = computed(() => isValidUrl(props.url));

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

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
 * Get cached preview from localStorage
 */
function getCachedPreview(url: string): LinkPreviewData | null {
  try {
    const cached = localStorage.getItem(getCacheKey(url));
    if (!cached) return null;

    const parsedCache: CachedPreview = JSON.parse(cached);
    return parsedCache.data;
  } catch (err) {
    console.error('Failed to read cache:', err);
    return null;
  }
}

/**
 * Check if cache needs refresh (background refresh for expired data)
 */
function needsCacheRefresh(url: string): boolean {
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
function saveCachePreview(url: string, data: LinkPreviewData): void {
  try {
    const cacheData: CachedPreview = { data, timestamp: Date.now() };
    localStorage.setItem(getCacheKey(url), JSON.stringify(cacheData));
  } catch (err) {
    console.error('Failed to save cache:', err);
  }
}

/**
 * Fetch preview from Microlink API with screenshot
 */
async function fetchPreview(url: string, silent = false): Promise<void> {
  if (isMounted.value) {
    if (!silent) isLoading.value = true;
    error.value = false;
  }

  try {
    // Build API URL with parameters
    const params = new URLSearchParams({
      url: url,
      ...SCREENSHOT_CONFIG,
    });
    const response = await fetch(`${API_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      // Silently fail for rate limits (429 = Too Many Requests)
      if (response.status === 429 && isMounted.value) {
        error.value = true;
      }
      return;
    }

    const result = await response.json();

    // Check if component is still mounted before updating state
    if (!isMounted.value) return;

    // Validate response structure
    if (result.status !== 'success' || !result.data) {
      if (isMounted.value) error.value = true;
      return;
    }

    const { data } = result;
    const previewData: LinkPreviewData = {
      title: data.title || '',
      description: data.description || '',
      image: data.screenshot?.url || data.image?.url || '',
      domain: extractDomain(data.url || url),
      url: data.url || url,
    };

    preview.value = previewData;
    cachedPreview.value = previewData;

    // Save to cache and reset error state
    saveCachePreview(url, previewData);
    imageError.value = false;
  } catch {
    // Silently fail - graceful degradation
    if (isMounted.value) error.value = true;
  } finally {
    if (!silent && isMounted.value) isLoading.value = false;
  }
}

/**
 * Handle image load error - triggers a fresh API fetch
 * This is the "Error Recovery" mechanism mentioned in requirements
 */
async function handleImageError(): Promise<void> {
  if (!isMounted.value) return;

  imageError.value = true;

  // Only re-fetch if showing cached data (avoid infinite loops)
  if (cachedPreview.value) {
    await fetchPreview(props.url, false);
  }
}

/**
 * Load preview with smart caching
 */
async function loadPreview(): Promise<void> {
  if (!isValidLink.value || !isMounted.value) return;

  // Reset error states
  error.value = false;
  imageError.value = false;

  // Try to load from cache first
  const cached = getCachedPreview(props.url);

  if (cached) {
    // Display cached data immediately
    preview.value = cached;
    cachedPreview.value = cached;

    // Refresh in background if cache is stale
    if (needsCacheRefresh(props.url)) {
      await fetchPreview(props.url, true);
    }
  } else {
    // No cache available - fetch fresh data
    cachedPreview.value = null;
    await fetchPreview(props.url, false);
  }
}

// Watch for URL prop changes
watch(() => props.url, loadPreview, { immediate: true });

onMounted(() => {
  isMounted.value = true;
  loadPreview();
});

onBeforeUnmount(() => {
  isMounted.value = false;
});
</script>

<style scoped>
.link-preview-container {
  width: 100%;
}

.link-preview {
  display: flex;
  text-decoration: none;
  color: inherit;
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
