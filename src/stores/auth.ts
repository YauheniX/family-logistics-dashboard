/**
 * Auth store re-export — backward-compatible path.
 *
 * The canonical store now lives at `@/features/auth/presentation/auth.store`.
 * This file re-exports it so that existing `import { useAuthStore } from '@/stores/auth'`
 * statements continue to work without changes.
 */
export { useAuthStore } from '@/features/auth/presentation/auth.store';

