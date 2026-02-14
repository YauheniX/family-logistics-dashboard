import { ref, watch, onUnmounted } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

const currentTheme = ref<Theme>('system');
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
let mediaQuery: MediaQueryList | null = null;

export function useTheme() {
  const getSystemTheme = (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme: Theme) => {
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;

    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  };

  const toggleTheme = () => {
    const newTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const initTheme = () => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      currentTheme.value = stored;
    }
    applyTheme(currentTheme.value);

    // Clean up existing listener if any
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener('change', mediaQueryListener);
    }

    // Listen for system theme changes
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQueryListener = () => {
      if (currentTheme.value === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', mediaQueryListener);
  };

  const cleanup = () => {
    if (mediaQuery && mediaQueryListener) {
      mediaQuery.removeEventListener('change', mediaQueryListener);
      mediaQueryListener = null;
      mediaQuery = null;
    }
  };

  // Watch for theme changes
  watch(currentTheme, (theme) => {
    applyTheme(theme);
  });

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    currentTheme,
    setTheme,
    toggleTheme,
    initTheme,
    cleanup,
  };
}
