<template>
  <div :class="containerClass" role="status" aria-label="Loading content">
    <!-- Card Skeleton -->
    <div v-if="variant === 'card'" class="glass-card p-4 space-y-4 animate-fade-in">
      <div class="flex items-start gap-3">
        <div class="skeleton-avatar" />
        <div class="flex-1 space-y-2">
          <div class="skeleton-line h-5 w-3/4" />
          <div class="skeleton-line h-4 w-1/2" />
        </div>
      </div>
      <div class="space-y-2">
        <div class="skeleton-line h-4 w-full" />
        <div class="skeleton-line h-4 w-5/6" />
        <div class="skeleton-line h-4 w-4/6" />
      </div>
    </div>

    <!-- List Item Skeleton -->
    <div v-else-if="variant === 'list-item'" class="flex items-center gap-3 p-3 animate-fade-in">
      <div v-if="showAvatar" class="skeleton-avatar-sm" />
      <div class="flex-1 space-y-2">
        <div class="skeleton-line h-4 w-3/4" />
        <div class="skeleton-line h-3 w-1/2" />
      </div>
      <div class="skeleton-line h-8 w-16" />
    </div>

    <!-- Avatar Skeleton -->
    <div
      v-else-if="variant === 'avatar'"
      :class="avatarSize === 'lg' ? 'skeleton-avatar-lg' : 'skeleton-avatar'"
      class="animate-pulse"
    />

    <!-- Text Lines Skeleton -->
    <div v-else-if="variant === 'text'" class="space-y-2">
      <div v-for="i in lines" :key="i" class="skeleton-line h-4" :class="getLineWidth(i)" />
    </div>

    <!-- Image Skeleton with Blur-up -->
    <div
      v-else-if="variant === 'image'"
      class="skeleton-image animate-pulse"
      :style="{ aspectRatio: aspectRatio }"
    >
      <svg
        class="mx-auto my-auto w-12 h-12 text-neutral-300 dark:text-neutral-600"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fill-rule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clip-rule="evenodd"
        />
      </svg>
    </div>

    <!-- Wishlist/Shopping Grid Skeleton -->
    <div v-else-if="variant === 'grid-item'" class="glass-card overflow-hidden p-0 animate-fade-in">
      <div class="skeleton-image aspect-video" />
      <div class="p-3 space-y-2">
        <div class="skeleton-line h-5 w-full" />
        <div class="skeleton-line h-4 w-3/4" />
        <div class="flex gap-2 mt-3">
          <div class="skeleton-line h-6 w-16" />
          <div class="skeleton-line h-6 w-20" />
        </div>
      </div>
    </div>

    <!-- Table Row Skeleton -->
    <div
      v-else-if="variant === 'table-row'"
      class="flex items-center gap-4 p-4 border-b border-neutral-200 dark:border-neutral-700"
    >
      <div v-for="i in columns" :key="i" class="skeleton-line h-4" :class="getColumnWidth(i)" />
    </div>

    <!-- Button Skeleton -->
    <div v-else-if="variant === 'button'" class="skeleton-button" />

    <!-- Default (simple shimmer bar) -->
    <div v-else class="skeleton-line h-4 w-full" />

    <span class="sr-only">Loading...</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  variant?:
    | 'card'
    | 'list-item'
    | 'avatar'
    | 'text'
    | 'image'
    | 'grid-item'
    | 'table-row'
    | 'button'
    | 'default';
  lines?: number;
  columns?: number;
  showAvatar?: boolean;
  avatarSize?: 'sm' | 'md' | 'lg';
  aspectRatio?: string;
  containerClass?: string;
}

const _props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  lines: 3,
  columns: 4,
  showAvatar: false,
  avatarSize: 'md',
  aspectRatio: '16/9',
  containerClass: '',
});

const getLineWidth = (index: number) => {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return widths[index % widths.length];
};

const getColumnWidth = (index: number) => {
  const widths = ['flex-1', 'w-32', 'w-24', 'w-20'];
  return widths[index % widths.length];
};
</script>

<style scoped>
/* Skeleton Base Styles */
.skeleton-line {
  @apply bg-neutral-200 dark:bg-neutral-700 rounded-md overflow-hidden relative;
}

.skeleton-avatar {
  @apply w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 overflow-hidden relative;
}

.skeleton-avatar-sm {
  @apply w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 overflow-hidden relative;
}

.skeleton-avatar-lg {
  @apply w-24 h-24 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0 overflow-hidden relative;
}

.skeleton-image {
  @apply w-full bg-neutral-200 dark:bg-neutral-700 rounded-md flex items-center justify-center overflow-hidden relative;
}

.skeleton-button {
  @apply h-10 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg overflow-hidden relative;
}

/* Shimmer Wave Animation */
.skeleton-line::after,
.skeleton-avatar::after,
.skeleton-avatar-sm::after,
.skeleton-avatar-lg::after,
.skeleton-image::after,
.skeleton-button::after {
  content: '';
  @apply absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent;
  animation: skeletonWave 1.5s linear infinite;
}

@keyframes skeletonWave {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .skeleton-line::after,
  .skeleton-avatar::after,
  .skeleton-avatar-sm::after,
  .skeleton-avatar-lg::after,
  .skeleton-image::after,
  .skeleton-button::after {
    animation: none;
  }
}
</style>
