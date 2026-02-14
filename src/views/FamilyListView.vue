<template>
  <div class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Families</p>
        <h2 class="text-2xl font-semibold text-slate-900">My Families</h2>
        <p class="mt-1 text-sm text-slate-600">
          Manage your family groups and their shopping lists.
        </p>
      </div>
      <button class="btn-primary" type="button" @click="showCreateModal = true">
        ➕ Create Family
      </button>
    </div>

    <LoadingState v-if="familyStore.loading" message="Loading families..." />

    <div v-else-if="familyStore.families.length" class="page-grid">
      <RouterLink
        v-for="family in familyStore.families"
        :key="family.id"
        :to="{ name: 'family-detail', params: { id: family.id } }"
        class="glass-card p-5 transition hover:shadow-md"
      >
        <h3 class="text-lg font-semibold text-slate-900">{{ family.name }}</h3>
        <p class="mt-1 text-sm text-slate-500">
          Created {{ new Date(family.created_at).toLocaleDateString() }}
        </p>
      </RouterLink>
    </div>

    <EmptyState
      v-else
      title="No families yet"
      description="Create your first family to start managing shopping lists together."
      cta="Create a Family"
      @action="showCreateModal = true"
    />

    <ModalDialog :open="showCreateModal" title="Create Family" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="label" for="family-name">Family name</label>
          <input
            id="family-name"
            v-model="newFamilyName"
            class="input"
            required
            placeholder="e.g. The Smiths"
          />
        </div>
        <div class="flex gap-3">
          <button class="btn-primary" type="submit" :disabled="familyStore.loading">
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
import { useFamilyStore } from '@/features/family/presentation/family.store';

const authStore = useAuthStore();
const familyStore = useFamilyStore();

const showCreateModal = ref(false);
const newFamilyName = ref('');

const handleCreate = async () => {
  if (!authStore.user?.id || !newFamilyName.value.trim()) return;
  const created = await familyStore.createFamily(newFamilyName.value.trim(), authStore.user.id);
  if (created) {
    newFamilyName.value = '';
    showCreateModal.value = false;
  }
};

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) familyStore.loadFamilies(userId);
  },
  { immediate: true },
);
</script>
