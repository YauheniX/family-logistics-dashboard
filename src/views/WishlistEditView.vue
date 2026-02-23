<template>
  <div v-if="wishlistStore.currentWishlist" class="space-y-6">
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Wishlist</p>
          <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {{ wishlistStore.currentWishlist.title }}
          </h2>
          <p
            v-if="wishlistStore.currentWishlist.description"
            class="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
          >
            {{ wishlistStore.currentWishlist.description }}
          </p>
        </div>
        <div class="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
          <BaseButton
            v-if="wishlistStore.currentWishlist.is_public"
            variant="ghost"
            class="w-full xs:w-auto"
            @click="copyPublicLink"
          >
            📋 Copy Public Link
          </BaseButton>
          <BaseButton variant="ghost" class="w-full xs:w-auto" @click="$router.push('/wishlists')"
            >← Back</BaseButton
          >
        </div>
      </div>
    </BaseCard>

    <!-- Edit Wishlist Details -->
    <BaseCard>
      <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50 mb-4">Details</h3>
      <form class="space-y-3" @submit.prevent="handleUpdateWishlist">
        <BaseInput v-model="editTitle" label="Title" required />
        <BaseInput v-model="editDescription" label="Description" placeholder="Optional" />
        <label class="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input v-model="editIsPublic" type="checkbox" class="checkbox" />
          Public (shareable link)
        </label>
        <BaseButton variant="primary" type="submit" :disabled="wishlistStore.loading">
          Save Changes
        </BaseButton>
      </form>
    </BaseCard>

    <!-- Items List -->
    <BaseCard>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Items</h3>
        <span class="text-sm text-neutral-600 dark:text-neutral-400"
          >{{ wishlistStore.items.length }} items</span
        >
      </div>

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
            <div class="flex items-center gap-2">
              <p
                v-if="item.price !== null"
                class="text-sm font-medium text-neutral-900 dark:text-neutral-50"
              >
                {{ item.price }} {{ item.currency }}
              </p>
              <BaseBadge v-if="item.is_reserved" variant="success">
                Reserved{{ item.reserved_by_name ? ` by ${item.reserved_by_name}` : '' }}
              </BaseBadge>
            </div>
            <div class="flex gap-2 pt-2">
              <BaseButton
                v-if="item.is_reserved"
                class="flex-1 text-sm"
                variant="tertiary"
                @click="handleOwnerUnreserve(item.id)"
              >
                Unreserve
              </BaseButton>
              <BaseButton class="flex-1 text-sm" variant="ghost" @click="startEditItem(item)">
                Edit
              </BaseButton>
              <BaseButton
                class="flex-1 text-sm"
                variant="danger"
                @click="wishlistStore.removeItem(item.id)"
              >
                Delete
              </BaseButton>
            </div>
          </div>
        </BaseCard>
      </div>
      <p v-else class="text-sm text-neutral-600 dark:text-neutral-400">
        No items yet. Add one below.
      </p>
    </BaseCard>

    <!-- Add/Edit Item Form -->
    <BaseCard>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {{ editingItemId ? 'Edit Item' : 'Add Item' }}
        </h3>
        <BaseButton v-if="editingItemId" variant="ghost" type="button" @click="cancelEditItem">
          Cancel
        </BaseButton>
      </div>
      <form class="space-y-4" @submit.prevent="handleSaveItem">
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput v-model="itemForm.title" label="Title" required placeholder="Item name" />
          <div class="space-y-1">
            <label class="label">Priority</label>
            <select v-model="itemForm.priority" class="input w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <BaseInput v-model="itemForm.description" label="Description" placeholder="Optional" />
        <BaseInput v-model="itemForm.link" label="Link" type="url" placeholder="https://..." />
        <div class="grid gap-4 md:grid-cols-2">
          <BaseInput
            label="Price"
            type="number"
            placeholder="0.00"
            :model-value="itemForm.price ?? ''"
            @update:model-value="itemForm.price = $event ? Number($event) : null"
          />
          <BaseInput v-model="itemForm.currency" label="Currency" placeholder="USD" />
        </div>
        <BaseButton variant="primary" type="submit">
          {{ editingItemId ? 'Update Item' : 'Add Item' }}
        </BaseButton>
      </form>
    </BaseCard>
  </div>
  <LoadingState v-else message="Loading wishlist..." />
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import LinkPreview from '@/components/shared/LinkPreview.vue';
import { useToastStore } from '@/stores/toast';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type { ItemPriority, WishlistItem } from '@/features/shared/domain/entities';

const props = defineProps<{ id: string }>();

const wishlistStore = useWishlistStore();
const toastStore = useToastStore();

const editTitle = ref('');
const editDescription = ref('');
const editIsPublic = ref(false);
const editingItemId = ref<string | null>(null);

const itemForm = reactive({
  title: '',
  description: '',
  link: '',
  price: null as number | null,
  currency: 'USD',
  priority: 'medium' as ItemPriority,
});

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

watch(
  () => wishlistStore.currentWishlist,
  (wl) => {
    if (wl) {
      editTitle.value = wl.title;
      editDescription.value = wl.description ?? '';
      editIsPublic.value = wl.is_public;
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await wishlistStore.loadWishlist(props.id);
});

const handleUpdateWishlist = async () => {
  await wishlistStore.updateWishlist(props.id, {
    title: editTitle.value,
    description: editDescription.value || null,
    is_public: editIsPublic.value,
  });
};

const copyPublicLink = () => {
  const slug = wishlistStore.currentWishlist?.share_slug;
  if (!slug) return;
  const url = `${window.location.origin}/#/wishlist/${slug}`;
  navigator.clipboard.writeText(url);
  toastStore.success('Public link copied to clipboard!');
};

const resetItemForm = () => {
  itemForm.title = '';
  itemForm.description = '';
  itemForm.link = '';
  itemForm.price = null;
  itemForm.currency = 'USD';
  itemForm.priority = 'medium';
  editingItemId.value = null;
};

const startEditItem = (item: WishlistItem) => {
  editingItemId.value = item.id;
  itemForm.title = item.title;
  itemForm.description = item.description ?? '';
  itemForm.link = item.link ?? '';
  itemForm.price = item.price;
  itemForm.currency = item.currency;
  itemForm.priority = item.priority;
};

const cancelEditItem = () => {
  resetItemForm();
};

const handleOwnerUnreserve = async (itemId: string) => {
  // Owners can unreserve without a code
  const result = await wishlistStore.reserveItem(itemId, undefined, undefined);
  if (result) {
    toastStore.success('Item unreserved successfully!');
  }
};

const handleSaveItem = async () => {
  if (!itemForm.title.trim()) return;

  const data = {
    title: itemForm.title.trim(),
    description: itemForm.description.trim() || null,
    link: itemForm.link.trim() || null,
    price: itemForm.price,
    currency: itemForm.currency || 'USD',
    priority: itemForm.priority,
  };

  if (editingItemId.value) {
    await wishlistStore.updateItem(editingItemId.value, data);
  } else {
    await wishlistStore.addItem({
      wishlist_id: props.id,
      ...data,
    });
  }
  resetItemForm();
};
</script>
