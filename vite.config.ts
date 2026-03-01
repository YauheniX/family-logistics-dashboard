/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Read version from package.json directly to ensure availability across all build environments
let packageJson: { version?: string };
try {
  const packageJsonContent = readFileSync(resolve(__dirname, 'package.json'), 'utf-8');
  packageJson = JSON.parse(packageJsonContent);
} catch (error) {
  throw new Error(
    `Failed to read or parse package.json while determining app version: ${error instanceof Error ? error.message : String(error)}`,
  );
}
const appVersion = packageJson.version ?? '0.0.0';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [vue()],
    publicDir: 'public',
    base: process.env.VITE_BASE_PATH || '/',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@supabase')) return 'supabase-vendor';
              if (id.includes('vue-i18n') || id.includes('@intlify')) return 'i18n-vendor';
              if (
                id.includes('node_modules/vue/') ||
                id.includes('node_modules/vue-router/') ||
                id.includes('node_modules/@vue/')
              )
                return 'vue-vendor';
              if (id.includes('pinia')) return 'pinia-vendor';
              return 'vendor';
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        all: true, // Include all files in coverage (except those explicitly excluded)
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/*.config.*',
          '**/mockServiceWorker.js',
          '**/.{idea,git,cache,output,temp}/**',
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  };
});
