import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTheme } from '../useTheme';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe('useTheme', () => {
  let mockMatchMedia: MockMediaQueryList;
  let mockLocalStorage: Record<string, string>;
  let mockDocumentElement: {
    classList: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
    });

    // Mock document.documentElement.classList
    mockDocumentElement = {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    };
    Object.defineProperty(document, 'documentElement', {
      value: mockDocumentElement,
      writable: true,
      configurable: true,
    });

    // Mock window.matchMedia
    mockMatchMedia = {
      matches: false,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mockMatchMedia),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with system theme by default', () => {
    const { currentTheme } = useTheme();
    expect(currentTheme.value).toBe('system');
  });

  it('applies light theme when system preference is light', () => {
    mockMatchMedia.matches = false; // Light theme
    const { initTheme } = useTheme();
    initTheme();

    expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  it('applies dark theme when system preference is dark', () => {
    mockMatchMedia.matches = true; // Dark theme
    const { initTheme } = useTheme();
    initTheme();

    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('loads theme from localStorage on init', () => {
    mockLocalStorage['theme-preference'] = 'dark';
    const { initTheme, currentTheme } = useTheme();
    initTheme();

    expect(currentTheme.value).toBe('dark');
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('sets theme and saves to localStorage', () => {
    const { setTheme, currentTheme } = useTheme();
    setTheme('dark');

    expect(currentTheme.value).toBe('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('toggles theme from dark to light', () => {
    const { setTheme, toggleTheme, currentTheme } = useTheme();
    setTheme('dark');

    toggleTheme();

    expect(currentTheme.value).toBe('light');
    expect(mockDocumentElement.classList.remove).toHaveBeenCalledWith('dark');
  });

  it('toggles theme from light to dark', () => {
    const { setTheme, toggleTheme, currentTheme } = useTheme();
    setTheme('light');

    toggleTheme();

    expect(currentTheme.value).toBe('dark');
    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('listens to system theme changes when theme is system', () => {
    const { initTheme, currentTheme } = useTheme();
    currentTheme.value = 'system';
    initTheme();

    expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('reapplies theme when system theme changes', () => {
    mockMatchMedia.matches = false; // Start with light
    const { initTheme, currentTheme } = useTheme();
    currentTheme.value = 'system';
    initTheme();

    // Simulate system theme change to dark
    mockMatchMedia.matches = true;
    const changeListener = mockMatchMedia.addEventListener.mock.calls[0][1];

    // Reset classList mocks to track new calls
    mockDocumentElement.classList.add.mockClear();
    mockDocumentElement.classList.remove.mockClear();

    changeListener();

    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });

  it('cleans up event listener on cleanup', () => {
    const { initTheme, cleanup } = useTheme();
    initTheme();

    cleanup();

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('cleans up existing listener before adding new one in initTheme', () => {
    const { initTheme } = useTheme();

    // First init
    initTheme();
    const firstListener = mockMatchMedia.addEventListener.mock.calls[0][1];

    // Second init (should remove old listener first)
    initTheme();

    expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', firstListener);
  });

  it('applies system theme correctly based on matchMedia when theme is system', () => {
    mockMatchMedia.matches = true; // Dark system theme
    const { setTheme } = useTheme();
    setTheme('system');

    expect(mockDocumentElement.classList.add).toHaveBeenCalledWith('dark');
  });
});
