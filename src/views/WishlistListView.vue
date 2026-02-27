<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Wishlists</p>
          <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            My Wishlists
          </h2>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Create and manage your personal wishlists.
          </p>
        </div>
        <BaseButton variant="primary" class="w-full sm:w-auto" @click="showCreateModal = true">
          ➕ Create Wishlist
        </BaseButton>
      </div>
    </BaseCard>

    <LoadingState v-if="wishlistStore.loading" message="Loading wishlists..." />

    <div
      v-else-if="wishlistStore.wishlists.length"
      class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <BaseCard
        v-for="wishlist in wishlistStore.wishlists"
        :key="wishlist.id"
        :hover="true"
        :padding="false"
        class="flex flex-col"
      >
        <div
          class="flex-1 p-4 cursor-pointer"
          tabindex="0"
          role="button"
          @click="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
          @keydown.enter="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
          @keydown.space.prevent="
            $router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })
          "
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {{ wishlist.title }}
            </h3>
            <BaseBadge :variant="getVisibilityVariant(wishlist.visibility)">
              {{ getVisibilityLabel(wishlist.visibility) }}
            </BaseBadge>
          </div>
          <p v-if="wishlist.description" class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ wishlist.description }}
          </p>
          <p class="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
            Created {{ new Date(wishlist.created_at).toLocaleDateString() }}
          </p>
        </div>

        <!-- Action Buttons - Always at bottom -->
        <template #footer>
          <div class="flex gap-2">
            <BaseButton
              variant="ghost"
              class="flex-1 text-sm"
              @click.stop="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
            >
              Edit
            </BaseButton>
            <BaseButton
              variant="danger"
              class="flex-1 text-sm"
              @click.stop="handleDelete(wishlist.id)"
            >
              Delete
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </div>

    <EmptyState
      v-else
      title="No wishlists yet"
      description="Create your first wishlist to start tracking gift ideas."
    />

    <ModalDialog :open="showCreateModal" title="Create Wishlist" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <BaseInput v-model="newTitle" label="Title" placeholder="Birthday wishlist" required />
        <BaseInput
          v-model="newDescription"
          label="Description"
          placeholder="Optional description"
        />
        <div class="space-y-2">
          <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >Visibility</label
          >
          <select v-model="newVisibility" class="input w-full">
            <option value="private">Private (only you)</option>
            <option value="household">Household (all members)</option>
            <option value="public">Public (shareable link)</option>
          </select>
        </div>
        <div class="flex gap-3">
          <BaseButton variant="primary" type="submit" :disabled="wishlistStore.loading">
            Create
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showCreateModal = false"
            >Cancel</BaseButton
          >
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { wishlistService } from '@/features/wishlist/domain/wishlist.service';
import { isValidUrl } from '@/utils/validation';
import { fetchLinkPreview } from '@/composables/useLinkPreview';
import { getVisibilityVariant, getVisibilityLabel } from '@/composables/useVisibilityDisplay';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const wishlistStore = useWishlistStore();

// Use storeToRefs for proper reactivity with Pinia
const { currentHousehold } = storeToRefs(householdStore);
const currentHouseholdId = computed(() => currentHousehold.value?.id);

const showCreateModal = ref(false);
const newTitle = ref('');
const newDescription = ref('');
const newVisibility = ref<'private' | 'household' | 'public'>('private');
const previewUrls = ref<Record<string, string>>({});
const previewImages = ref<Record<string, string>>({});

const handleCreate = async () => {
  if (!newTitle.value.trim()) return;
  if (!currentHouseholdId.value) {
    return; // Cannot create without a household
  }
  const created = await wishlistStore.createWishlist({
    title: newTitle.value.trim(),
    description: newDescription.value.trim() || null,
    visibility: newVisibility.value,
    household_id: currentHouseholdId.value,
  });
  if (created) {
    newTitle.value = '';
    newDescription.value = '';
    newVisibility.value = 'private';
    showCreateModal.value = false;
  }
};

const handleDelete = async (wishlistId: string) => {
  if (!confirm('Are you sure you want to delete this wishlist? This action cannot be undone.')) {
    return;
  }

  await wishlistStore.removeWishlist(wishlistId);
};

/**
 * Load first item's link for each wishlist and fetch screenshot
 * Parallelizes API calls for better performance
 */
const loadWishlistPreviews = async () => {
  const urls: Record<string, string> = {};
  const images: Record<string, string> = {};

  // Step 1: Fetch all wishlist items in parallel
  const itemFetches = wishlistStore.wishlists.map(async (wishlist) => {
    try {
      const response = await wishlistService.getWishlistItems(wishlist.id);
      if (response.data && response.data.length > 0) {
        // Find first item with a valid link
        const itemWithLink = response.data.find(
          (item) => item.link && item.link.trim() && isValidUrl(item.link),
        );
        if (itemWithLink?.link) {
          return { wishlistId: wishlist.id, url: itemWithLink.link };
        }
      }
    } catch (error) {
      // Silently fail for individual wishlists
      console.warn(`Failed to load items for wishlist ${wishlist.id}`, error);
    }
    return null;
  });

  const wishlistUrls = (await Promise.all(itemFetches)).filter((item) => item !== null);

  // Step 2: Fetch all link previews in parallel (uses cache automatically)
  const previewFetches = wishlistUrls.map(async ({ wishlistId, url }) => {
    urls[wishlistId] = url;

    try {
      // fetchLinkPreview handles caching internally
      const preview = await fetchLinkPreview(url, {
        screenshot: true,
        meta: false,
        viewportWidth: 400,
        viewportHeight: 300,
        deviceScaleFactor: 1,
      });

      if (preview?.image) {
        return { wishlistId, image: preview.image };
      }
    } catch (error) {
      console.warn(`Failed to fetch screenshot for wishlist ${wishlistId}`, error);
    }
    return null;
  });

  const previewResults = (await Promise.all(previewFetches)).filter((item) => item !== null);

  // Step 3: Update state with results
  for (const { wishlistId, image } of previewResults) {
    images[wishlistId] = image;
  }

  previewUrls.value = urls;
  previewImages.value = images;
};

// Load wishlists when user or household changes
watch(
  [() => authStore.user?.id, currentHouseholdId],
  async ([userId, householdId]) => {
    if (userId && householdId) {
      await wishlistStore.loadWishlistsByHousehold(userId, householdId);
      // Load previews after wishlists are loaded
      await loadWishlistPreviews();
    }
  },
  { immediate: true },
);

// Also reload previews when wishlists change
watch(
  () => wishlistStore.wishlists.length,
  () => {
    if (wishlistStore.wishlists.length > 0) {
      loadWishlistPreviews();
    }
  },
);
</script>
