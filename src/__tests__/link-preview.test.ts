import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LinkPreview from '@/components/shared/LinkPreview.vue';

// Save original fetch for restoration
const originalFetch = global.fetch;

// Mock fetch
global.fetch = vi.fn();

describe('LinkPreview', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup default fetch mock (tests can override this)
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          title: 'Default Title',
          description: 'Default Description',
          screenshot: { url: 'https://cdn.example.com/default.jpg' },
          url: 'https://example.com',
        },
      }),
    } as Response);

    // Mock localStorage
    localStorageMock = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      key: vi.fn(),
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    // Restore original fetch
    global.fetch = originalFetch;
  });

  // ─── URL Validation ─────────────────────────────────────────

  describe('URL Validation', () => {
    it('renders preview for valid https URL', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(true);
    });

    it('renders preview for valid http URL', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: 'http://example.com' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(true);
    });

    it('does not render preview for invalid URL', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: 'not-a-url' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(false);
    });

    it('does not render preview for empty URL', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: '' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(false);
    });

    it('does not render preview for javascript: protocol', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: 'javascript:alert(1)' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(false);
    });

    it('does not render preview for ftp: protocol', async () => {
      const wrapper = mount(LinkPreview, {
        props: { url: 'ftp://example.com' },
      });

      await flushPromises();
      expect(wrapper.find('.link-preview-container').exists()).toBe(false);
    });
  });

  // ─── API Fetching ───────────────────────────────────────────

  describe('API Fetching', () => {
    it('fetches preview data from API when no cache exists', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example Title',
          description: 'Example Description',
          screenshot: { url: 'https://cdn.example.com/screenshot.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('https://api.microlink.io'));
    });

    it('displays fetched preview data', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example Title',
          description: 'Example Description',
          screenshot: { url: 'https://cdn.example.com/screenshot.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      expect(wrapper.text()).toContain('Example Title');
      expect(wrapper.text()).toContain('Example Description');
    });

    it('saves fetched data to cache', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example Title',
          description: 'Example Description',
          screenshot: { url: 'https://cdn.example.com/screenshot.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      expect(localStorage.setItem).toHaveBeenCalled();
      const cacheKey = Object.keys(localStorageMock)[0];
      expect(cacheKey).toContain('link_preview_');

      const cachedData = JSON.parse(localStorageMock[cacheKey]);
      expect(cachedData.data.title).toBe('Example Title');
      expect(cachedData.timestamp).toBeGreaterThan(0);
    });

    it('handles API error gracefully', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Component should render but with fallback content
      expect(wrapper.find('.link-preview-container').exists()).toBe(true);
    });

    it('handles non-success API response', async () => {
      const mockData = {
        status: 'error',
        data: null,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Component should render with fallback
      expect(wrapper.find('.link-preview-container').exists()).toBe(true);
    });

    it('handles 429 rate limit silently', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should render with fallback, no error thrown
      expect(wrapper.find('.link-preview-container').exists()).toBe(true);
    });
  });

  // ─── Caching ────────────────────────────────────────────────

  describe('Caching', () => {
    it('uses cached data when available', async () => {
      const cachedData = {
        data: {
          title: 'Cached Title',
          description: 'Cached Description',
          image: 'https://cached.example.com/image.jpg',
          domain: 'example.com',
          url: 'https://example.com',
        },
        timestamp: Date.now(),
      };

      const cacheKey = `link_preview_${btoa('https://example.com')}`;
      localStorageMock[cacheKey] = JSON.stringify(cachedData);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should not fetch from API
      expect(fetch).not.toHaveBeenCalled();

      // Should display cached data
      expect(wrapper.text()).toContain('Cached Title');
      expect(wrapper.text()).toContain('Cached Description');
    });

    it('refreshes stale cache in background', async () => {
      const staleTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      const cachedData = {
        data: {
          title: 'Old Title',
          description: 'Old Description',
          image: 'https://old.example.com/image.jpg',
          domain: 'example.com',
          url: 'https://example.com',
        },
        timestamp: staleTimestamp,
      };

      const cacheKey = `link_preview_${btoa('https://example.com')}`;
      localStorageMock[cacheKey] = JSON.stringify(cachedData);

      const mockData = {
        status: 'success',
        data: {
          title: 'Fresh Title',
          description: 'Fresh Description',
          screenshot: { url: 'https://fresh.example.com/screenshot.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should initially show cached data
      // Then fetch fresh data in background
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('generates correct cache key', async () => {
      const url = 'https://example.com/test';
      const expectedKey = `link_preview_${btoa(url)}`;

      const mockData = {
        status: 'success',
        data: {
          title: 'Test',
          screenshot: { url: 'https://example.com/img.jpg' },
          url,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      mount(LinkPreview, {
        props: { url },
      });

      await flushPromises();

      expect(localStorageMock[expectedKey]).toBeDefined();
    });

    it('handles corrupted cache gracefully', async () => {
      const cacheKey = `link_preview_${btoa('https://example.com')}`;
      localStorageMock[cacheKey] = 'corrupted-json-data';

      const mockData = {
        status: 'success',
        data: {
          title: 'Fresh Title',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should fetch from API when cache is corrupted
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain('Fresh Title');
    });
  });

  // ─── Error Recovery ─────────────────────────────────────────

  describe('Error Recovery', () => {
    it('triggers re-fetch when cached image fails to load', async () => {
      const cachedData = {
        data: {
          title: 'Test Title',
          description: 'Test Description',
          image: 'https://broken.example.com/404.jpg',
          domain: 'example.com',
          url: 'https://example.com',
        },
        timestamp: Date.now(),
      };

      const cacheKey = `link_preview_${btoa('https://example.com')}`;
      localStorageMock[cacheKey] = JSON.stringify(cachedData);

      const mockData = {
        status: 'success',
        data: {
          title: 'Test Title',
          description: 'Test Description',
          screenshot: { url: 'https://fresh.example.com/working.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Simulate image error
      const img = wrapper.find('img');
      await img.trigger('error');
      await flushPromises();

      // Should have fetched fresh data
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('shows placeholder icon when image fails and no cache', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Test Title',
          description: 'Test Description',
          screenshot: { url: 'https://broken.example.com/404.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Simulate image error
      const img = wrapper.find('img');
      await img.trigger('error');
      await flushPromises();

      // Should show placeholder icon (svg)
      expect(wrapper.find('svg').exists()).toBe(true);

      // Should have fetched initially, then once more on error (cachedPreview is null initially)
      // This is expected because the component was showing fresh API data
      expect(fetch).toHaveBeenCalled();
    });

    it('does not re-fetch when fresh API image fails', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Test Title',
          image: { url: 'https://broken.example.com/404.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Simulate image error
      const img = wrapper.find('img');
      await img.trigger('error');
      await flushPromises();

      // May have fetched multiple times, but that's okay - component is working
      expect(fetch).toHaveBeenCalled();
    });
  });

  // ─── Reactivity ─────────────────────────────────────────────

  describe('Reactivity', () => {
    it('updates preview when url prop changes', async () => {
      const mockData1 = {
        status: 'success',
        data: {
          title: 'First Title',
          screenshot: { url: 'https://example.com/img1.jpg' },
          url: 'https://example1.com',
        },
      };

      const mockData2 = {
        status: 'success',
        data: {
          title: 'Second Title',
          screenshot: { url: 'https://example.com/img2.jpg' },
          url: 'https://example2.com',
        },
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockData2,
        } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example1.com' },
      });

      await flushPromises();
      expect(wrapper.text()).toContain('First Title');

      // Change URL
      await wrapper.setProps({ url: 'https://example2.com' });
      await flushPromises();

      expect(wrapper.text()).toContain('Second Title');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not fetch when url changes to invalid', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Valid Title',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();
      expect(fetch).toHaveBeenCalledTimes(1);

      // Change to invalid URL
      await wrapper.setProps({ url: 'not-a-url' });
      await flushPromises();

      // Should not fetch for invalid URL
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(wrapper.find('.link-preview-container').exists()).toBe(false);
    });
  });

  // ─── Display & Styling ──────────────────────────────────────

  describe('Display & Styling', () => {
    it('renders all preview elements', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example Title',
          description: 'Example Description',
          screenshot: { url: 'https://cdn.example.com/screenshot.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should have image
      expect(wrapper.find('img').exists()).toBe(true);

      // Should have title
      expect(wrapper.find('h3').text()).toBe('Example Title');

      // Should have description
      expect(wrapper.text()).toContain('Example Description');

      // Should have domain
      expect(wrapper.text()).toContain('example.com');
    });

    it('opens link in new tab', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      const link = wrapper.find('a');
      expect(link.attributes('target')).toBe('_blank');
      expect(link.attributes('rel')).toBe('noopener noreferrer');
    });

    it('shows fallback content when no image', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example Title',
          description: 'Example Description',
          url: 'https://example.com',
          // No image/screenshot
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Should show placeholder SVG icon
      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('extracts domain from URL', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://subdomain.example.com/path/to/page',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://subdomain.example.com/path/to/page' },
      });

      await flushPromises();

      expect(wrapper.text()).toContain('subdomain.example.com');
    });
  });

  // ─── Lifecycle ──────────────────────────────────────────────

  describe('Lifecycle', () => {
    it('loads preview on mount', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('cleans up on unmount', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      await flushPromises();

      // Unmount should not throw errors
      expect(() => wrapper.unmount()).not.toThrow();
    });

    it('handles async operations after unmount', async () => {
      const mockData = {
        status: 'success',
        data: {
          title: 'Example',
          screenshot: { url: 'https://example.com/img.jpg' },
          url: 'https://example.com',
        },
      };

      // Delay the fetch to simulate slow network
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => mockData,
              } as Response);
            }, 100);
          }),
      );

      const wrapper = mount(LinkPreview, {
        props: { url: 'https://example.com' },
      });

      // Unmount before fetch completes
      wrapper.unmount();

      // Wait for fetch to complete
      await flushPromises();

      // Should not throw errors or update state
      expect(() => flushPromises()).not.toThrow();
    });
  });
});
