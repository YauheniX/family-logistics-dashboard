<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {{ $t('shopping.title') }}
          </h3>
          <BaseButton
            variant="primary"
            :disabled="!isHouseholdReady"
            :title="
              !householdStore.initialized
                ? $t('shopping.loadingHouseholdTooltip')
                : !householdStore.currentHousehold
                  ? $t('shopping.selectHouseholdTooltip')
                  : undefined
            "
            @click="showCreateListModal = true"
          >
            {{ $t('shopping.newList') }}
          </BaseButton>
        </div>

        <!-- Status Tabs -->
        <div
          class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 p-1 bg-neutral-50 dark:bg-neutral-800"
        >
          <button
            type="button"
            class="status-tab-btn"
            :class="{ active: statusFilter === 'active' }"
            @click="statusFilter = 'active'"
          >
            {{ $t('shopping.active') }}
          </button>
          <button
            type="button"
            class="status-tab-btn"
            :class="{ active: statusFilter === 'archived' }"
            @click="statusFilter = 'archived'"
          >
            {{ $t('shopping.archived') }}
          </button>
        </div>
      </div>

      <div
        v-if="!householdStore.initialized"
        class="text-sm text-neutral-500 dark:text-neutral-400 mt-4"
      >
        {{ $t('shopping.loadingHousehold') }}
      </div>

      <div
        v-else-if="!householdStore.currentHousehold"
        class="text-sm text-neutral-500 dark:text-neutral-400 mt-4"
      >
        {{ $t('shopping.noHousehold') }}
      </div>

      <div v-else class="mt-4">
        <div v-if="filteredLists.length" class="space-y-2">
          <RouterLink
            v-for="list in filteredLists"
            :key="list.id"
            :to="{ name: 'shopping-list', params: { listId: list.id } }"
            class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <div>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ list.title }}</p>
              <p v-if="list.description" class="text-xs text-neutral-500 dark:text-neutral-400">
                {{ list.description }}
              </p>
            </div>
            <BaseBadge :variant="list.status === 'active' ? 'success' : 'neutral'">{{
              list.status
            }}</BaseBadge>
          </RouterLink>
        </div>
        <p v-else class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ $t('shopping.noLists', { status: statusFilter }) }}
        </p>
      </div>
    </BaseCard>
  </div>
  <ModalDialog
    :open="showCreateListModal"
    :title="$t('shopping.createModal.title')"
    @close="showCreateListModal = false"
  >
    <form class="space-y-4" @submit.prevent="handleCreateList">
      <div>
        <label class="label" for="list-title">{{ $t('shopping.createModal.titleLabel') }}</label>
        <BaseInput
          id="list-title"
          v-model="newListTitle"
          required
          :placeholder="$t('shopping.createModal.titlePlaceholder')"
        />
      </div>
      <div>
        <label class="label" for="list-description">{{
          $t('shopping.createModal.descriptionLabel')
        }}</label>
        <BaseInput
          id="list-description"
          v-model="newListDescription"
          :placeholder="$t('shopping.createModal.descriptionPlaceholder')"
        />
      </div>
      <div class="flex gap-3">
        <BaseButton type="submit"> {{ $t('common.create') }} </BaseButton>
        <BaseButton variant="ghost" @click.prevent="showCreateListModal = false">
          {{ $t('common.cancel') }}
        </BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const { t } = useI18n();
const householdStore = useHouseholdStore();
const shoppingStore = useShoppingStore();
const toastStore = useToastStore();

const showCreateListModal = ref(false);
const newListTitle = ref('');
const newListDescription = ref('');
const statusFilter = ref<'active' | 'archived'>('active');

// Computed: Check if household is ready for operations
const isHouseholdReady = computed(
  () => householdStore.initialized && !!householdStore.currentHousehold,
);

const filteredLists = computed(() => {
  return shoppingStore.lists.filter((list) => list.status === statusFilter.value);
});

const handleCreateList = async () => {
  // CRITICAL: Wait for household store initialization before creating list
  if (!householdStore.initialized) {
    toastStore.warning(t('shopping.loadingHouseholdWait'));
    return;
  }

  const currentHousehold = householdStore.currentHousehold;
  if (!newListTitle.value.trim() || !currentHousehold?.id) return;

  const result = await shoppingStore.createList({
    household_id: String(currentHousehold.id),
    title: newListTitle.value.trim(),
    description: newListDescription.value.trim() || null,
  });
  if (result) {
    shoppingStore.setCurrentList(result);
    newListTitle.value = '';
    newListDescription.value = '';
    showCreateListModal.value = false;
    await shoppingStore.loadLists(String(currentHousehold.id));
    router.push({ name: 'shopping-list', params: { listId: result.id } });
  }
};

onMounted(async () => {
  // Wait for household store initialization if needed
  if (!householdStore.initialized) {
    console.log('[ShoppingIndex] Waiting for household store initialization...');
    // Watch for initialization to complete
    const unwatch = watch(
      () => householdStore.initialized,
      async (isInitialized) => {
        if (isInitialized) {
          unwatch();
          const currentHousehold = householdStore.currentHousehold;
          if (currentHousehold?.id) {
            await shoppingStore.loadLists(currentHousehold.id);
          }
        }
      },
      { immediate: true },
    );
  } else {
    // Already initialized, proceed normally
    const currentHousehold = householdStore.currentHousehold;
    if (currentHousehold?.id) {
      await shoppingStore.loadLists(currentHousehold.id);
    }
  }
});

// Watch for household changes and reload lists
watch(
  () => householdStore.currentHousehold,
  async (newHousehold) => {
    // Only proceed if store is initialized
    if (!householdStore.initialized) return;

    if (newHousehold?.id) {
      await shoppingStore.loadLists(newHousehold.id);
    } else {
      // Clear lists if no household selected
      shoppingStore.clearLists();
    }
  },
);
</script>

<style scoped>
.status-tab-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(100 116 139);
  background-color: transparent;
  transition: all 0.2s;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.status-tab-btn:hover {
  color: rgb(51 65 85);
}

.status-tab-btn.active {
  background-color: rgb(255 255 255);
  color: rgb(59 130 246);
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.dark .status-tab-btn {
  color: rgb(148 163 184);
}

.dark .status-tab-btn:hover {
  color: rgb(203 213 225);
}

.dark .status-tab-btn.active {
  background-color: rgb(51 65 85);
  color: rgb(96 165 250);
}

@media (max-width: 640px) {
  .status-tab-btn {
    padding: 0.625rem 1rem;
  }
}
</style>
