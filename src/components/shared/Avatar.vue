<template>
  <div class="relative flex-shrink-0" :style="{ width: sizeValue, height: sizeValue }">
    <!-- Image Avatar (URL) -->
    <div
      v-if="isImageUrl && !hasImageError"
      class="rounded-full overflow-hidden border-2 transition-all"
      :class="avatarBorderClass"
      :style="{ width: sizeValue, height: sizeValue }"
    >
      <img
        :src="avatarUrl || ''"
        :alt="name"
        class="h-full w-full object-cover"
        referrerpolicy="no-referrer"
        @error="handleImageError"
      />
    </div>

    <!-- Emoji Avatar -->
    <div
      v-else-if="isEmoji && !hasImageError"
      class="flex items-center justify-center rounded-full border-2 bg-white dark:bg-neutral-800 transition-all"
      :class="avatarBorderClass"
      :style="{ width: sizeValue, height: sizeValue, fontSize: emojiFontSize }"
    >
      {{ avatarUrl }}
    </div>

    <!-- Initials Fallback -->
    <div
      v-else
      class="flex items-center justify-center rounded-full font-bold text-white border-2 transition-all"
      :class="avatarBorderClass"
      :style="{
        width: sizeValue,
        height: sizeValue,
        backgroundColor: avatarColor,
        fontSize: initialsFontSize,
      }"
    >
      {{ initials }}
    </div>

    <!-- Role Badge Overlay -->
    <div v-if="showRoleBadge" class="absolute" :style="badgePosition">
      <span
        class="inline-flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-800 transition-all"
        :class="roleIconClass"
        :style="{ width: badgeSize, height: badgeSize, fontSize: badgeIconSize }"
        :title="roleLabel"
      >
        {{ roleIcon }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Avatar Component
 *
 * A robust, reusable avatar component that handles:
 * - Google Auth profile pictures (with 429 error failsafe)
 * - Emoji avatars
 * - Initials fallback with consistent color generation
 * - Optional role badge overlay
 *
 * @example
 * ```vue
 * <Avatar
 *   :avatar-url="user.avatar_url"
 *   :name="user.display_name"
 *   :role="user.role"
 *   :size="64"
 *   :show-role-badge="true"
 * />
 * ```
 *
 * @example Without role badge (for user profiles)
 * ```vue
 * <Avatar
 *   :avatar-url="currentUser.avatar"
 *   :name="currentUser.name"
 *   :size="48"
 *   :show-role-badge="false"
 * />
 * ```
 */
import { computed, ref, watch } from 'vue';
import {
  getRoleLabel,
  getRoleIcon,
  getRoleBadgeClass,
  getRoleBorderClass,
} from '@/utils/roleUtils';

interface Props {
  /** Avatar URL (can be Google Auth URL, emoji, or null) */
  avatarUrl?: string | null;
  /** User's name (used for initials and color generation) */
  name: string;
  /** User's role (determines badge icon and colors) */
  role?: 'owner' | 'admin' | 'member' | 'child' | 'viewer' | (string & {});
  /** Avatar size (number in pixels or CSS string like '64px' or '4rem') */
  size?: string | number;
  /** Whether to show the role badge overlay */
  showRoleBadge?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: null,
  role: 'member',
  size: 64,
  showRoleBadge: true,
});

// Track image loading errors
const hasImageError = ref(false);

const handleImageError = () => {
  hasImageError.value = true;
};

// Reset error state when avatar URL changes
watch(
  () => props.avatarUrl,
  () => {
    hasImageError.value = false;
  },
);

// Normalize size to CSS value
const sizeValue = computed(() => {
  if (typeof props.size === 'number') {
    return `${props.size}px`;
  }
  return props.size;
});

// Calculate derived sizes based on main size
const numericSize = computed(() => {
  if (typeof props.size === 'number') {
    return props.size;
  }
  // Extract numeric value and unit from string like "64px" or "4rem"
  const match = props.size.match(/^(\d+(?:\.\d+)?)(\w*)/);
  if (!match) return 64;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'px';

  // Convert rem/em to pixels
  if (unit === 'rem') {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    return value * rootFontSize;
  } else if (unit === 'em') {
    // For em units, use root font size as fallback since we don't have element context
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize || '16');
    return value * rootFontSize;
  }

  // Default to pixels
  return value;
});

const emojiFontSize = computed(() => {
  const size = numericSize.value;
  return `${size * 0.5}px`; // Emoji is ~50% of container
});

const initialsFontSize = computed(() => {
  const size = numericSize.value;
  return `${size * 0.35}px`; // Initials are ~35% of container
});

const badgeSize = computed(() => {
  const size = numericSize.value;
  return `${size * 0.375}px`; // Badge is ~37.5% of container (24px for 64px avatar)
});

const badgeIconSize = computed(() => {
  const size = numericSize.value;
  return `${size * 0.25}px`; // Icon is ~25% of container
});

const badgePosition = computed(() => {
  const size = numericSize.value;
  const offset = size * 0.015625; // ~1px for 64px avatar
  return {
    bottom: `-${offset}px`,
    right: `-${offset}px`,
  };
});

// Check if avatar_url is a valid image URL
const isImageUrl = computed(() => {
  if (!props.avatarUrl) return false;
  const url = props.avatarUrl.trim();
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
});

// Check if avatar_url is an emoji
const isEmoji = computed(() => {
  if (!props.avatarUrl) return false;
  const value = props.avatarUrl.trim();

  // URLs are not emojis
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return false;
  }

  // Use Intl.Segmenter to count grapheme clusters (user-perceived characters)
  // This handles ZWJ sequences correctly (e.g., 👨‍👩‍👧‍👦 counts as 1)
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = Array.from(segmenter.segment(value));

  // Emojis are typically 1-4 grapheme clusters
  if (segments.length > 4) return false;

  // Use Extended_Pictographic which includes emoji with variation selectors and ZWJ sequences
  // This pattern matches emoji with optional variation selector (U+FE0F) and ZWJ sequences
  return /^\p{Extended_Pictographic}(\u{FE0F}|\u{200D}\p{Extended_Pictographic})*$/u.test(value);
});

// Generate initials from name
const initials = computed(() => {
  const name = props.name.trim();
  if (!name) return '?';

  const parts = name.split(/[\s@]+/).filter((part) => part.length > 0);
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

  if (parts.length >= 2) {
    // Get first grapheme from first two parts
    const firstGrapheme = Array.from(segmenter.segment(parts[0]))[0]?.segment || '';
    const secondGrapheme = Array.from(segmenter.segment(parts[1]))[0]?.segment || '';
    return (firstGrapheme + secondGrapheme).toUpperCase();
  }

  // Get first two graphemes from single part
  const graphemes = Array.from(segmenter.segment(name));
  const initials = graphemes
    .slice(0, 2)
    .map((g) => g.segment)
    .join('');
  return initials.toUpperCase();
});

// Generate consistent color from name hash
const avatarColor = computed(() => {
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#6366F1', // indigo
  ];
  // Use multiplicative rolling hash to avoid anagram collisions
  const hash = props.name.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0);
  return colors[hash % colors.length];
});

// Role-based styling using shared utilities
const roleIcon = computed(() => getRoleIcon(props.role));
const roleLabel = computed(() => getRoleLabel(props.role));
const roleIconClass = computed(() => getRoleBadgeClass(props.role));
const avatarBorderClass = computed(() => getRoleBorderClass(props.role));
</script>
