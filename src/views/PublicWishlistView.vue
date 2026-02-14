<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div v-if="wishlistStore.currentWishlist" class="space-y-6">
      <div class="glass-card p-6 text-center">
        <p class="text-sm text-slate-500">Wishlist</p>
        <h1 class="text-2xl font-semibold text-slate-900">
          {{ wishlistStore.currentWishlist.title }}
        </h1>
        <p v-if="wishlistStore.currentWishlist.description" class="mt-1 text-sm text-slate-600">
          {{ wishlistStore.currentWishlist.description }}
        </p>
      </div>

      <div v-if="wishlistStore.items.length" class="space-y-3">
        <div
          v-for="item in wishlistStore.items"
          :key="item.id"
          class="glass-card p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-medium text-slate-800">{{ item.title }}</h3>
                <span
                  class="rounded-full px-2 py-0.5 text-xs"
                  :class="priorityClass(item.priority)"
                >
                  {{ item.priority }}
                </span>
              </div>
              <p v-if="item.description" class="mt-1 text-sm text-slate-500">
                {{ item.description }}
              </p>
              <div class="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                <span v-if="item.price !== null">{{ item.price }} {{ item.currency }}</span>
                <a
                  v-if="safeUrl(item.link)"
                  :href="safeUrl(item.link)"
                  target="_blank"
                  rel="noreferrer"
                  class="text-brand-600 hover:underline"
                >
                  View link →
                </a>
              </div>
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.title"
                class="mt-3 h-32 w-32 rounded-md object-cover"
              />
            </div>
            <div>
              <span
                v-if="item.is_reserved"
                class="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
              >
                Reserved ✓
              </span>
              <button
                v-else
                class="btn-primary text-sm"
                type="button"
                @click="startReserve(item.id)"
              >
                Reserve
              </button>
            </div>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        title="No items"
        description="This wishlist doesn't have any items yet."
        badge="Wishlist"
      />
    </div>

    <div v-else-if="wishlistStore.error" class="glass-card p-6 text-center">
      <h2 class="text-2xl font-semibold text-slate-900">Wishlist not found</h2>
      <p class="mt-1 text-sm text-slate-600">
        This wishlist may not exist or is not public.
      </p>
    </div>

    <LoadingState v-else message="Loading wishlist..." />

    <!-- Reserve Modal -->
    <ModalDialog :open="showReserveModal" title="Reserve Item" @close="showReserveModal = false">
      <div class="space-y-4">
        <p class="text-sm text-slate-600">
          Optionally enter your email so the wishlist owner knows who reserved this item.
        </p>
        <div>
          <label class="label" for="reserve-email">Email (optional)</label>
          <input
            id="reserve-email"
            v-model="reserveEmail"
            type="email"
            class="input"
            placeholder="your@email.com"
          />
        </div>
        <div class="flex gap-3">
          <button class="btn-primary" type="button" @click="handleReserve">
            Confirm Reservation
          </button>
          <button class="btn-ghost" type="button" @click="showReserveModal = false">Cancel</button>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
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

const priorityClass = (priority: ItemPriority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-700';
    case 'medium':
      return 'bg-yellow-100 text-yellow-700';
    case 'low':
      return 'bg-slate-100 text-slate-600';
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
</script>
