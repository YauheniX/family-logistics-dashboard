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
            v-if="isOwner"
            variant="primary"
            class="w-full xs:w-auto"
            @click="openEditWishlistModal"
          >
            Edit
          </BaseButton>
          <BaseButton
            v-if="isOwner"
            variant="secondary"
            class="w-full xs:w-auto"
            @click="openAddItemModal"
          >
            Add Item
          </BaseButton>

          <BaseButton
            v-if="wishlistStore.currentWishlist.visibility === 'public'"
            variant="ghost"
            class="w-full xs:w-auto"
            @click="copyPublicLink"
          >
            📋 Copy Public Link
          </BaseButton>
        </div>
      </div>
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
          </div>
          <template v-if="isOwner" #footer>
            <div class="flex gap-2">
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
          </template>
          <template v-else #footer>
            <div class="flex gap-2">
              <BaseButton
                v-if="!item.is_reserved"
                class="flex-1 text-sm"
                variant="primary"
                @click="openReserveModal(item)"
              >
                Reserve
              </BaseButton>
              <span
                v-else
                class="flex-1 text-sm text-center py-2 text-success-600 dark:text-success-400 font-medium"
              >
                Reserved{{ item.reserved_by_name ? ` by ${item.reserved_by_name}` : '' }}
              </span>
            </div>
          </template>
        </BaseCard>
      </div>
      <p v-else class="text-sm text-neutral-600 dark:text-neutral-400">
        No items yet. Click "Add Item" to get started.
      </p>
    </BaseCard>
  </div>
  <LoadingState v-else message="Loading wishlist..." />

  <!-- Edit Wishlist Modal -->
  <ModalDialog :open="showEditWishlistModal" title="Edit Wishlist" @close="closeEditWishlistModal">
    <form class="space-y-4" @submit.prevent="handleUpdateWishlist">
      <BaseInput v-model="editTitle" label="Title" required />
      <BaseInput v-model="editDescription" label="Description" placeholder="Optional" />
      <div class="space-y-1">
        <label class="label">Visibility</label>
        <select v-model="editVisibility" class="input w-full">
          <option value="private">Private (only you)</option>
          <option value="household">Household (all members)</option>
          <option value="public">Public (shareable link)</option>
        </select>
      </div>
      <div class="flex gap-2 justify-end">
        <BaseButton variant="ghost" type="button" @click="closeEditWishlistModal"
          >Cancel</BaseButton
        >
        <BaseButton variant="primary" type="submit" :disabled="wishlistStore.loading">
          Save Changes
        </BaseButton>
      </div>
    </form>
  </ModalDialog>

  <!-- Add/Edit Item Modal -->
  <ModalDialog
    :open="showItemModal"
    :title="editingItemId ? 'Edit Item' : 'Add Item'"
    @close="closeItemModal"
  >
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
      <div class="flex gap-2 justify-end">
        <BaseButton variant="ghost" type="button" @click="closeItemModal">Cancel</BaseButton>
        <BaseButton variant="primary" type="submit">
          {{ editingItemId ? 'Update Item' : 'Add Item' }}
        </BaseButton>
      </div>
    </form>
  </ModalDialog>

  <!-- Reserve Item Modal -->
  <ModalDialog :open="showReserveModal" title="Reserve Item" @close="closeReserveModal">
    <form class="space-y-4" @submit.prevent="handleReserve">
      <p class="text-sm text-neutral-600 dark:text-neutral-400">
        Reserve "<strong>{{ reservingItem?.title }}</strong
        >" so others know you're getting it.
      </p>
      <BaseInput v-model="reserverName" label="Your Name" placeholder="Enter your name" required />
      <div class="flex gap-2 justify-end">
        <BaseButton variant="ghost" type="button" @click="closeReserveModal">Cancel</BaseButton>
        <BaseButton variant="primary" type="submit">Reserve</BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import LinkPreview from '@/components/shared/LinkPreview.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type {
  ItemPriority,
  WishlistItem,
  WishlistVisibility,
} from '@/features/shared/domain/entities';

const props = defineProps<{ id: string }>();

const wishlistStore = useWishlistStore();
const toastStore = useToastStore();
const authStore = useAuthStore();

const isOwner = computed(() => {
  const currentUserId = authStore.user?.id;
  const wishlistOwnerId = wishlistStore.currentWishlist?.user_id;
  return currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;
});

const editTitle = ref('');
const editDescription = ref('');
const editVisibility = ref<WishlistVisibility>('private');
const editingItemId = ref<string | null>(null);
const showItemModal = ref(false);
const showEditWishlistModal = ref(false);
const showReserveModal = ref(false);
const reservingItem = ref<WishlistItem | null>(null);
const reserverName = ref('');

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
      editVisibility.value = wl.visibility ?? 'private';
    }
  },
  { immediate: true },
);

onMounted(async () => {
  await wishlistStore.loadWishlist(props.id);
});

const openEditWishlistModal = () => {
  showEditWishlistModal.value = true;
};

const closeEditWishlistModal = () => {
  showEditWishlistModal.value = false;
};

const handleUpdateWishlist = async () => {
  await wishlistStore.updateWishlist(props.id, {
    title: editTitle.value,
    description: editDescription.value || null,
    visibility: editVisibility.value,
  });
  closeEditWishlistModal();
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
  showItemModal.value = true;
};

const openAddItemModal = () => {
  resetItemForm();
  showItemModal.value = true;
};

const closeItemModal = () => {
  resetItemForm();
  showItemModal.value = false;
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

const openReserveModal = (item: WishlistItem) => {
  reservingItem.value = item;
  reserverName.value = '';
  showReserveModal.value = true;
};

const closeReserveModal = () => {
  reservingItem.value = null;
  reserverName.value = '';
  showReserveModal.value = false;
};

const handleReserve = async () => {
  if (!reservingItem.value || !reserverName.value.trim()) return;

  const result = await wishlistStore.reserveItem(reservingItem.value.id, reserverName.value.trim());
  if (result) {
    toastStore.success(`Item reserved! Save this code to unreserve later: ${result.code}`);
    closeReserveModal();
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
  showItemModal.value = false;
};
</script>
