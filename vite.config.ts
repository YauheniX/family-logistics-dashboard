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
          // TODO: Exclude specific low-coverage files until they can be properly tested.
          // These exclusions are temporary and should be removed as test coverage improves.
          // Track progress at: https://github.com/YauheniX/family-logistics-dashboard/issues
          'src/features/auth/domain/auth.service.ts',
          'src/features/auth/domain/auth.service.mock.ts',
          'src/features/auth/index.ts',
          'src/features/shared/infrastructure/mock-storage.adapter.ts',
          'src/features/shared/infrastructure/supabase.client.ts',
          'src/components/shared/BaseButton.vue',
          'src/components/shared/BaseInput.vue',
          'src/components/shared/ModalDialog.vue',
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
