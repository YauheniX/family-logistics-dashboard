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
          @click="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
        >
          <!-- Preview Image -->
          <div
            v-if="previewImages[wishlist.id]"
            class="mb-3 -mt-4 -mx-4 h-32 overflow-hidden rounded-t-lg"
          >
            <img
              :src="previewImages[wishlist.id]"
              :alt="wishlist.title"
              class="w-full h-full object-cover"
            />
          </div>

          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {{ wishlist.title }}
            </h3>
            <BaseBadge :variant="wishlist.is_public ? 'primary' : 'neutral'">
              {{ wishlist.is_public ? 'Public' : 'Private' }}
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
      cta="Create a Wishlist"
      @action="showCreateModal = true"
    />

    <ModalDialog :open="showCreateModal" title="Create Wishlist" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <BaseInput v-model="newTitle" label="Title" placeholder="Birthday wishlist" required />
        <BaseInput
          v-model="newDescription"
          label="Description"
          placeholder="Optional description"
        />
        <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input v-model="newIsPublic" type="checkbox" class="checkbox" />
          Make public (shareable link)
        </label>
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
import { ref, watch } from 'vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { wishlistService } from '@/features/wishlist/domain/wishlist.service';

const authStore = useAuthStore();
const wishlistStore = useWishlistStore();

const showCreateModal = ref(false);
const newTitle = ref('');
const newDescription = ref('');
const newIsPublic = ref(false);
const previewUrls = ref<Record<string, string>>({});
const previewImages = ref<Record<string, string>>({});

const handleCreate = async () => {
  if (!newTitle.value.trim()) return;
  const created = await wishlistStore.createWishlist({
    title: newTitle.value.trim(),
    description: newDescription.value.trim() || null,
    is_public: newIsPublic.value,
  });
  if (created) {
    newTitle.value = '';
    newDescription.value = '';
    newIsPublic.value = false;
    showCreateModal.value = false;
  }
};

const handleDelete = async (wishlistId: string) => {
  if (!confirm('Are you sure you want to delete this wishlist? This action cannot be undone.')) {
    return;
  }

  await wishlistStore.removeWishlist(wishlistId);
};

// Load first item's link for each wishlist and fetch screenshot
const loadWishlistPreviews = async () => {
  const urls: Record<string, string> = {};
  const images: Record<string, string> = {};

  for (const wishlist of wishlistStore.wishlists) {
    try {
      const response = await wishlistService.getWishlistItems(wishlist.id);
      if (response.data && response.data.length > 0) {
        // Find first item with a valid link
        const itemWithLink = response.data.find((item) => item.link && item.link.trim());
        if (itemWithLink?.link) {
          urls[wishlist.id] = itemWithLink.link;

          // Fetch screenshot from Microlink API
          try {
            const microlinkResponse = await fetch(
              `https://api.microlink.io/?url=${encodeURIComponent(itemWithLink.link)}&screenshot=true&meta=false&viewport.width=400&viewport.height=300&viewport.deviceScaleFactor=1`,
            );

            if (microlinkResponse.ok) {
              const data = await microlinkResponse.json();
              if (data.status === 'success' && data.data?.screenshot?.url) {
                images[wishlist.id] = data.data.screenshot.url;
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch screenshot for wishlist ${wishlist.id}`, error);
          }
        }
      }
    } catch (error) {
      // Silently fail for individual wishlists
      console.warn(`Failed to load items for wishlist ${wishlist.id}`, error);
    }
  }

  previewUrls.value = urls;
  previewImages.value = images;
};

watch(
  () => authStore.user?.id,
  async (userId) => {
    if (userId) {
      await wishlistStore.loadWishlists(userId);
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
