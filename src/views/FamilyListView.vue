<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">Families</p>
          <h2 class="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">My Families</h2>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            Manage your family groups and their shopping lists.
          </p>
        </div>
        <BaseButton @click="showCreateModal = true"> ➕ Create Family </BaseButton>
      </div>
    </BaseCard>

    <LoadingState v-if="familyStore.loading" message="Loading families..." />

    <div v-else-if="familyStore.families.length" class="page-grid">
      <RouterLink
        v-for="family in familyStore.families"
        :key="family.id"
        :to="{ name: 'family-detail', params: { id: family.id } }"
      >
        <BaseCard hover>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {{ family.name }}
          </h3>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Created {{ new Date(family.created_at).toLocaleDateString() }}
          </p>
        </BaseCard>
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
          <BaseButton type="submit" :disabled="familyStore.loading">Create</BaseButton>
          <BaseButton variant="ghost" @click="showCreateModal = false">Cancel</BaseButton>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
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
