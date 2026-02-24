<template>
  <div class="space-y-6">
    <div v-if="wishlistStore.currentWishlist" class="space-y-6">
      <BaseCard>
        <div class="text-center">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Public Wishlist</p>
          <h1 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {{ wishlistStore.currentWishlist.title }}
          </h1>
          <p
            v-if="wishlistStore.currentWishlist.description"
            class="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
          >
            {{ wishlistStore.currentWishlist.description }}
          </p>
        </div>
      </BaseCard>

      <div
        v-if="wishlistStore.items.length"
        class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <BaseCard v-for="item in wishlistStore.items" :key="item.id" :padding="false">
          <LinkPreview v-if="safeUrl(item.link)" :url="safeUrl(item.link)!" />
          <div class="p-3 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h4 class="font-medium text-neutral-900 dark:text-neutral-50 line-clamp-2">
                {{ item.title }}
              </h4>
              <BaseBadge :variant="priorityVariant(item.priority)">
                {{ item.priority }}
              </BaseBadge>
            </div>
            <p
              v-if="item.description"
              class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2"
            >
              {{ item.description }}
            </p>
            <p
              v-if="item.price !== null"
              class="text-sm font-medium text-neutral-900 dark:text-neutral-50"
            >
              {{ item.price }} {{ item.currency }}
            </p>
          </div>
          <template #footer>
            <div v-if="item.is_reserved" class="space-y-2">
              <BaseBadge variant="warning" class="w-full text-center block">
                Reserved{{ item.reserved_by_name ? ` by ${item.reserved_by_name}` : '' }}
              </BaseBadge>
              <BaseButton
                class="w-full text-sm"
                variant="tertiary"
                @click="startUnreserve(item.id)"
              >
                Unreserve
              </BaseButton>
            </div>
            <BaseButton
              v-else
              class="w-full text-sm"
              variant="secondary"
              @click="startReserve(item.id)"
            >
              Reserve This
            </BaseButton>
          </template>
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
        <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Wishlist not found
        </h2>
        <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          This wishlist may not exist or is not public.
        </p>
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
          <label class="label" for="reserve-name">Your Name (optional)</label>
          <input
            id="reserve-name"
            v-model="reserveName"
            type="text"
            class="input"
            placeholder="Your name"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton variant="primary" type="button" @click="handleReserve">
            Confirm Reservation
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showReserveModal = false"
            >Cancel</BaseButton
          >
        </div>
      </div>
    </ModalDialog>

    <!-- Show Reservation Code Modal -->
    <ModalDialog
      :open="showCodeModal"
      title="Reservation Confirmed!"
      @close="showCodeModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Save this 4-digit code. You'll need it to unreserve this item later.
        </p>
        <div
          class="bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 rounded-lg p-6 text-center"
        >
          <p class="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Your Code</p>
          <p class="text-4xl font-bold text-primary-600 dark:text-primary-400 tracking-widest">
            {{ generatedCode }}
          </p>
        </div>
        <div class="flex gap-3">
          <BaseButton variant="primary" type="button" @click="copyCode"> 📋 Copy Code </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showCodeModal = false">
            Done
          </BaseButton>
        </div>
      </div>
    </ModalDialog>

    <!-- Unreserve Modal -->
    <ModalDialog :open="showUnreserveModal" title="Unreserve Item" @close="cancelUnreserve">
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Enter the 4-digit code you received when reserving this item.
        </p>
        <div>
          <label class="label" for="unreserve-code">Reservation Code</label>
          <input
            id="unreserve-code"
            v-model="unreserveCode"
            type="text"
            inputmode="numeric"
            class="input text-center text-2xl tracking-widest"
            placeholder="0000"
            maxlength="4"
            pattern="[0-9]{4}"
            @input="unreserveCode = unreserveCode.replace(/\D/g, '').slice(0, 4)"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton
            variant="primary"
            type="button"
            :disabled="!/^\d{4}$/.test(unreserveCode)"
            @click="handleUnreserve"
          >
            Confirm Unreserve
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="cancelUnreserve"> Cancel </BaseButton>
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
import LinkPreview from '@/components/shared/LinkPreview.vue';
import { useToastStore } from '@/stores/toast';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type { ItemPriority } from '@/features/shared/domain/entities';

const props = defineProps<{ shareSlug: string }>();

const wishlistStore = useWishlistStore();
const toastStore = useToastStore();

const showReserveModal = ref(false);
const showUnreserveModal = ref(false);
const showCodeModal = ref(false);
const reserveName = ref('');
const unreserveCode = ref('');
const reservingItemId = ref<string | null>(null);
const unreservingItemId = ref<string | null>(null);
const generatedCode = ref<string | null>(null);

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
  reserveName.value = '';
  showReserveModal.value = true;
};

const handleReserve = async () => {
  if (!reservingItemId.value) return;
  const result = await wishlistStore.reserveItem(
    reservingItemId.value,
    reserveName.value.trim() || undefined,
  );
  if (result) {
    showReserveModal.value = false;
    reservingItemId.value = null;
    reserveName.value = '';

    // Show the generated code
    if (result.code) {
      generatedCode.value = result.code;
      showCodeModal.value = true;
    } else {
      toastStore.success('Item reserved successfully!');
    }
  }
};

const copyCode = async () => {
  if (!generatedCode.value) return;

  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    toastStore.error('Clipboard is not available in this browser. Please copy the code manually.');
    return;
  }

  try {
    await navigator.clipboard.writeText(generatedCode.value);
    toastStore.success('Code copied to clipboard!');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to copy code to clipboard', error);
    toastStore.error('Failed to copy code to clipboard. Please copy it manually.');
  }
};

const startUnreserve = (itemId: string) => {
  unreservingItemId.value = itemId;
  unreserveCode.value = '';
  showUnreserveModal.value = true;
};

const handleUnreserve = async () => {
  if (!unreservingItemId.value || unreserveCode.value.length !== 4) return;

  const result = await wishlistStore.reserveItem(
    unreservingItemId.value,
    undefined,
    unreserveCode.value,
  );

  if (result) {
    toastStore.success('Item unreserved successfully!');
    showUnreserveModal.value = false;
    unreservingItemId.value = null;
    unreserveCode.value = '';
  }
};

const cancelUnreserve = () => {
  showUnreserveModal.value = false;
  unreservingItemId.value = null;
  unreserveCode.value = '';
};
</script>
