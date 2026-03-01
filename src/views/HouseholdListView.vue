<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            {{ $t('households.subtitle') }}
          </p>
          <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {{ $t('households.title') }}
          </h2>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {{ $t('households.description') }}
          </p>
        </div>
        <BaseButton class="w-full sm:w-auto" @click="showCreateModal = true">
          {{ $t('households.createHousehold') }}
        </BaseButton>
      </div>
    </BaseCard>

    <LoadingState
      v-if="householdEntityStore.loading"
      :message="$t('households.loadingHouseholds')"
    />

    <div v-else-if="householdEntityStore.households.length" class="page-grid">
      <RouterLink
        v-for="household in householdEntityStore.households"
        :key="household.id"
        :to="{ name: 'household-detail', params: { id: household.id } }"
        @click="handleHouseholdClick(household.id)"
      >
        <BaseCard hover>
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {{ household.name }}
          </h3>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{
              $t('households.created', {
                date: new Date(household.created_at).toLocaleDateString(),
              })
            }}
          </p>
        </BaseCard>
      </RouterLink>
    </div>

    <EmptyState
      v-else
      :title="$t('households.noHouseholdsTitle')"
      :description="$t('households.noHouseholdsDescription')"
      :cta="$t('households.createCta')"
      @action="showCreateModal = true"
    />

    <ModalDialog
      :open="showCreateModal"
      :title="$t('households.modalTitle')"
      @close="showCreateModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div>
          <label class="label" for="household-name">{{ $t('households.nameLabel') }}</label>
          <input
            id="household-name"
            v-model="newHouseholdName"
            class="input"
            required
            :placeholder="$t('households.namePlaceholder')"
          />
        </div>
        <div class="flex gap-3">
          <BaseButton type="submit" :disabled="householdEntityStore.loading">{{
            $t('common.create')
          }}</BaseButton>
          <BaseButton variant="ghost" @click="showCreateModal = false">{{
            $t('common.cancel')
          }}</BaseButton>
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
import { useHouseholdStore } from '@/stores/household';
import { useHouseholdEntityStore } from '@/features/household/presentation/household.store';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const householdEntityStore = useHouseholdEntityStore();

const showCreateModal = ref(false);
const newHouseholdName = ref('');

const handleCreate = async () => {
  if (!authStore.user?.id || !newHouseholdName.value.trim()) return;
  const created = await householdEntityStore.createHousehold(
    newHouseholdName.value.trim(),
    authStore.user.id,
  );
  if (created) {
    newHouseholdName.value = '';
    showCreateModal.value = false;
  }
};

const handleHouseholdClick = (householdId: string) => {
  householdStore.switchHousehold(householdId);
};

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) householdEntityStore.loadHouseholds(userId);
  },
  { immediate: true },
);
</script>
