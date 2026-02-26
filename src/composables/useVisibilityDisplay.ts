/**
 * Composable for displaying wishlist visibility badges and labels
 */

import type { WishlistVisibility } from '@/features/shared/domain/entities';

type VisibilityVariant = 'success' | 'warning' | 'neutral';

const VISIBILITY_CONFIG: Record<WishlistVisibility, { variant: VisibilityVariant; label: string }> =
  {
    public: { variant: 'success', label: 'Public' },
    household: { variant: 'warning', label: 'Household' },
    private: { variant: 'neutral', label: 'Private' },
  };

/**
 * Normalize visibility value to valid WishlistVisibility type
 */
const normalizeVisibility = (visibility: string | null | undefined): WishlistVisibility => {
  if (visibility === 'public' || visibility === 'household') {
    return visibility;
  }
  return 'private';
};

/**
 * Get the badge variant for a visibility value
 */
export const getVisibilityVariant = (visibility: string | null | undefined): VisibilityVariant => {
  const key = normalizeVisibility(visibility);
  return VISIBILITY_CONFIG[key].variant;
};

/**
 * Get the display label for a visibility value
 */
export const getVisibilityLabel = (visibility: string | null | undefined): string => {
  const key = normalizeVisibility(visibility);
  return VISIBILITY_CONFIG[key].label;
};

/**
 * Export the type for convenience
 */
export type { WishlistVisibility };
