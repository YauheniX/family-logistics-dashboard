<template>
  <div class="space-y-6">
    <div v-if="wishlistStore.currentWishlist" class="space-y-6">
      <BaseCard>
        <div class="text-center">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Public Wishlist</p>
          <h1 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {{ wishlistStore.currentWishlist.title }}
          </h1>
          <p v-if="wishlistStore.currentWishlist.description" class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {{ wishlistStore.currentWishlist.description }}
          </p>
        </div>
      </BaseCard>

      <div v-if="wishlistStore.items.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <BaseCard
          v-for="item in wishlistStore.items"
          :key="item.id"
          :padding="false"
        >
          <div class="aspect-square bg-neutral-100 dark:bg-neutral-700 rounded-t-card flex items-center justify-center overflow-hidden">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.title"
              class="w-full h-full object-cover"
            />
            <svg v-else class="w-16 h-16 text-neutral-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="p-3 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-medium text-neutral-900 dark:text-neutral-50 line-clamp-2">{{ item.title }}</h4>
              <BaseBadge :variant="priorityVariant(item.priority)">
                {{ item.priority }}
              </BaseBadge>
            </div>
            <p v-if="item.description" class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {{ item.description }}
            </p>
            <p v-if="item.price !== null" class="text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {{ item.price }} {{ item.currency }}
            </p>
            <a
              v-if="safeUrl(item.link)"
              :href="safeUrl(item.link)"
              target="_blank"
              rel="noreferrer"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline block"
            >
              View link →
            </a>
            <div v-if="item.is_reserved" class="pt-2 space-y-2">
              <BaseBadge variant="warning" class="w-full text-center block">
                Reserved{{ item.reserved_by_email ? ` by ${item.reserved_by_email}` : '' }}
              </BaseBadge>
              <BaseButton class="w-full text-sm" variant="tertiary" @click="handleUnreserve(item.id)">
                Unreserve
              </BaseButton>
            </div>
            <div v-else class="pt-2">
              <BaseButton class="w-full text-sm" variant="secondary" @click="startReserve(item.id)">
                Reserve This
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>

      <EmptyState
        v-else
        title="No items"
        description="This wishlist doesn't have any items yet."
        badge="Wishlist"
      />
    </div>

    <BaseCard v-else-if="wishlistStore.error">
      <div class="text-center">
        <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Wishlist not found</h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">This wishlist may not exist or is not public.</p>
      </div>
    </BaseCard>

    <LoadingState v-else message="Loading wishlist..." />

    <!-- Reserve Modal -->
    <ModalDialog :open="showReserveModal" title="Reserve Item" @close="showReserveModal = false">
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Optionally enter your name so the wishlist owner knows who reserved this item.
        </p>
        <div>
          <label class="label" for="reserve-email">Your Name (optional)</label>
          <input
            id="reserve-email"
            v-model="reserveEmail"
            type="text"
            class="input"
            placeholder="Your name"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton variant="primary" type="button" @click="handleReserve">
            Confirm Reservation
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showReserveModal = false">Cancel</BaseButton>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useToastStore } from '@/stores/toast';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type { ItemPriority } from '@/features/shared/domain/entities';

const props = defineProps<{ shareSlug: string }>();

const wishlistStore = useWishlistStore();
const toastStore = useToastStore();

const showReserveModal = ref(false);
const reserveEmail = ref('');
const reservingItemId = ref<string | null>(null);

const priorityVariant = (priority: ItemPriority): 'danger' | 'warning' | 'neutral' => {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'neutral';
  }
};

const safeUrl = (url: string | null): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    // invalid URL
  }
  return undefined;
};

onMounted(async () => {
  await wishlistStore.loadWishlistBySlug(props.shareSlug);
});

const startReserve = (itemId: string) => {
  reservingItemId.value = itemId;
  reserveEmail.value = '';
  showReserveModal.value = true;
};

const handleReserve = async () => {
  if (!reservingItemId.value) return;
  const result = await wishlistStore.reserveItem(
    reservingItemId.value,
    reserveEmail.value.trim() || undefined,
  );
  if (result) {
    toastStore.success('Item reserved successfully!');
    showReserveModal.value = false;
    reservingItemId.value = null;
    reserveEmail.value = '';
  }
};

const handleUnreserve = async (itemId: string) => {
  const result = await wishlistStore.reserveItem(itemId);
  if (result) {
    toastStore.success('Item unreserved successfully!');
  }
};
</script>
