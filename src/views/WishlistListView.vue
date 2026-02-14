<template>
  <div class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Wishlists</p>
        <h2 class="text-2xl font-semibold text-slate-900">My Wishlists</h2>
        <p class="mt-1 text-sm text-slate-600">
          Create and manage your personal wishlists.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="showCreateModal = true">
        ➕ Create Wishlist
      </button>
    </div>

    <LoadingState v-if="wishlistStore.loading" message="Loading wishlists..." />

    <div v-else-if="wishlistStore.wishlists.length" class="page-grid">
      <RouterLink
        v-for="wishlist in wishlistStore.wishlists"
        :key="wishlist.id"
        :to="{ name: 'wishlist-edit', params: { id: wishlist.id } }"
        class="glass-card p-5 transition hover:shadow-md"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-900">{{ wishlist.title }}</h3>
          <span
            class="rounded-full px-2 py-0.5 text-xs"
            :class="wishlist.is_public ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
          >
            {{ wishlist.is_public ? 'Public' : 'Private' }}
          </span>
        </div>
        <p v-if="wishlist.description" class="mt-1 text-sm text-slate-500">
          {{ wishlist.description }}
        </p>
        <p class="mt-2 text-xs text-slate-400">
          Created {{ new Date(wishlist.created_at).toLocaleDateString() }}
        </p>
      </RouterLink>
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
        <div>
          <label class="label" for="wishlist-title">Title</label>
          <input
            id="wishlist-title"
            v-model="newTitle"
            class="input"
            required
            placeholder="Birthday wishlist"
          />
        </div>
        <div>
          <label class="label" for="wishlist-description">Description</label>
          <input
            id="wishlist-description"
            v-model="newDescription"
            class="input"
            placeholder="Optional description"
          />
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="newIsPublic" type="checkbox" class="h-4 w-4" />
          Make public (shareable link)
        </label>
        <div class="flex gap-3">
          <button class="btn-primary" type="submit" :disabled="wishlistStore.loading">
            Create
          </button>
          <button class="btn-ghost" type="button" @click="showCreateModal = false">Cancel</button>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';

const authStore = useAuthStore();
const wishlistStore = useWishlistStore();

const showCreateModal = ref(false);
const newTitle = ref('');
const newDescription = ref('');
const newIsPublic = ref(false);

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

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) wishlistStore.loadWishlists(userId);
  },
  { immediate: true },
);
</script>
