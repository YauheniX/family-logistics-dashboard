/**
 * Legacy templates store - redirects to new feature-based templates store
 * This file maintains backward compatibility while using the new architecture
 * @deprecated Import from @/features/templates/presentation/templates.store instead
 */

export { useTemplatesStore } from '@/features/templates/presentation/templates.store';

// Alias for backward compatibility (singular vs plural)
export { useTemplatesStore as useTemplateStore } from '@/features/templates/presentation/templates.store';
