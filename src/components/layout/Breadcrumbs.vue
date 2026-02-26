<template>
  <nav
    v-if="breadcrumbs.length > 0"
    aria-label="Breadcrumb"
    class="flex items-center gap-2 text-sm"
  >
    <RouterLink
      v-for="(crumb, index) in breadcrumbs"
      :key="index"
      :to="crumb.to"
      class="flex items-center gap-2"
      :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined"
    >
      <span
        class="transition-colors"
        :class="
          index === breadcrumbs.length - 1
            ? 'text-neutral-900 dark:text-neutral-50 font-medium'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
        "
      >
        {{ crumb.label }}
      </span>
      <svg
        v-if="index < breadcrumbs.length - 1"
        class="h-4 w-4 text-neutral-400 dark:text-neutral-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

interface Breadcrumb {
  label: string;
  to: string;
}

const route = useRoute();

const shoppingStore = useShoppingStore();

const breadcrumbs = computed<Breadcrumb[]>(() => {
  const crumbs: Breadcrumb[] = [];
  const routeName = route.name as string;

  // Always start with Home
  crumbs.push({ label: 'Home', to: '/' });

  // Build breadcrumbs based on current route
  switch (routeName) {
    case 'dashboard':
      break;
    case 'household-detail':
      crumbs.push({ label: 'Manage', to: '/households' });
      break;
    case 'member-management':
      crumbs.push({ label: 'Manage', to: `/households/${route.params.id}` });
      crumbs.push({ label: 'Members', to: route.path });
      break;
    case 'shopping':
      crumbs.push({ label: 'Shopping', to: '/shopping' });
      break;
    case 'shopping-list':
      crumbs.push({ label: 'Shopping', to: '/shopping' });
      // Use store title if available
      crumbs.push({ label: shoppingStore.currentList?.title ?? 'Shopping List', to: route.path });
      break;

    case 'wishlist-list':
      crumbs.push({ label: 'Wishlists', to: '/wishlists' });
      break;
    case 'wishlist-edit':
      crumbs.push({ label: 'Wishlists', to: '/wishlists' });
      crumbs.push({ label: 'Manage Wishlist', to: route.path });
      break;
    case 'wishlist-detail':
      crumbs.push({ label: ' Wishlist Detail', to: route.path });
      break;
    case 'settings':
      crumbs.push({ label: 'Settings', to: '/settings' });
      break;
  }

  return crumbs;
});
</script>
