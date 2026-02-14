<template>
  <div v-if="wishlistStore.currentWishlist" class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Wishlist</p>
        <h2 class="text-2xl font-semibold text-slate-900">{{ wishlistStore.currentWishlist.title }}</h2>
        <p v-if="wishlistStore.currentWishlist.description" class="mt-1 text-sm text-slate-600">
          {{ wishlistStore.currentWishlist.description }}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="wishlistStore.currentWishlist.is_public"
          class="btn-ghost text-sm"
          type="button"
          @click="copyPublicLink"
        >
          📋 Copy Public Link
        </button>
        <RouterLink to="/wishlists" class="btn-ghost">← Back</RouterLink>
      </div>
    </div>

    <!-- Edit Wishlist Details -->
    <div class="glass-card p-5">
      <h3 class="text-lg font-semibold text-slate-900">Details</h3>
      <form class="mt-4 space-y-3" @submit.prevent="handleUpdateWishlist">
        <div>
          <label class="label" for="edit-title">Title</label>
          <input id="edit-title" v-model="editTitle" class="input" required />
        </div>
        <div>
          <label class="label" for="edit-description">Description</label>
          <input id="edit-description" v-model="editDescription" class="input" placeholder="Optional" />
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="editIsPublic" type="checkbox" class="h-4 w-4" />
          Public (shareable link)
        </label>
        <button class="btn-primary" type="submit" :disabled="wishlistStore.loading">
          Save Changes
        </button>
      </form>
    </div>

    <!-- Items List -->
    <div class="glass-card p-5">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">Items</h3>
        <span class="text-sm text-slate-600">{{ wishlistStore.items.length }} items</span>
      </div>

      <div v-if="wishlistStore.items.length" class="mt-3 space-y-3">
        <div
          v-for="item in wishlistStore.items"
          :key="item.id"
          class="flex items-start justify-between rounded-lg border border-slate-100 p-3"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <p class="font-medium text-slate-800">{{ item.title }}</p>
              <span
                class="rounded-full px-2 py-0.5 text-xs"
                :class="priorityClass(item.priority)"
              >
                {{ item.priority }}
              </span>
              <span
                v-if="item.is_reserved"
                class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
              >
                Reserved
              </span>
            </div>
            <p v-if="item.description" class="mt-1 text-sm text-slate-500">{{ item.description }}</p>
            <div class="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
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
              class="mt-2 h-20 w-20 rounded-md object-cover"
            />
          </div>
          <div class="flex gap-1">
            <button
              type="button"
              class="btn-ghost text-sm"
              @click="startEditItem(item)"
            >
              Edit
            </button>
            <button
              type="button"
              class="btn-ghost text-sm text-red-600 hover:text-red-800"
              @click="wishlistStore.removeItem(item.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      <p v-else class="mt-3 text-sm text-slate-500">No items yet. Add one below.</p>
    </div>

    <!-- Add/Edit Item Form -->
    <div class="glass-card p-5">
      <h3 class="text-lg font-semibold text-slate-900">
        {{ editingItemId ? 'Edit Item' : 'Add Item' }}
      </h3>
      <form class="mt-4 space-y-3" @submit.prevent="handleSaveItem">
        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <label class="label" for="item-title">Title</label>
            <input id="item-title" v-model="itemForm.title" class="input" required placeholder="Item name" />
          </div>
          <div>
            <label class="label" for="item-priority">Priority</label>
            <select id="item-priority" v-model="itemForm.priority" class="input">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label" for="item-description">Description</label>
          <input id="item-description" v-model="itemForm.description" class="input" placeholder="Optional" />
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <label class="label" for="item-link">Link</label>
            <input id="item-link" v-model="itemForm.link" type="url" class="input" placeholder="https://..." />
          </div>
          <div>
            <label class="label" for="item-image">Image URL</label>
            <input id="item-image" v-model="itemForm.image_url" type="url" class="input" placeholder="https://..." />
          </div>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div>
            <label class="label" for="item-price">Price</label>
            <input id="item-price" v-model.number="itemForm.price" type="number" min="0" step="0.01" class="input" placeholder="0.00" />
          </div>
          <div>
            <label class="label" for="item-currency">Currency</label>
            <input id="item-currency" v-model="itemForm.currency" class="input" placeholder="USD" />
          </div>
        </div>
        <div class="flex gap-3">
          <button class="btn-primary" type="submit">
            {{ editingItemId ? 'Update Item' : 'Add Item' }}
          </button>
          <button v-if="editingItemId" class="btn-ghost" type="button" @click="cancelEditItem">
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
  <LoadingState v-else message="Loading wishlist..." />
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import LoadingState from '@/components/shared/LoadingState.vue';
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
  image_url: '',
  priority: 'medium' as ItemPriority,
});

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

watch(
  () => wishlistStore.currentWishlist,
  (wl) => {
    if (wl) {
      editTitle.value = wl.title;
      editDescription.value = wl.description ?? '';
      editIsPublic.value = wl.is_public;
    }
  },
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
  itemForm.image_url = '';
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
  itemForm.image_url = item.image_url ?? '';
  itemForm.priority = item.priority;
};

const cancelEditItem = () => {
  resetItemForm();
};

const handleSaveItem = async () => {
  if (!itemForm.title.trim()) return;

  const data = {
    title: itemForm.title.trim(),
    description: itemForm.description.trim() || null,
    link: itemForm.link.trim() || null,
    price: itemForm.price,
    currency: itemForm.currency || 'USD',
    image_url: itemForm.image_url.trim() || null,
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
