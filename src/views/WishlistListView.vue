<template>
  <div class="space-y-6">
    <BaseCard>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ $t('wishlists.myTitle') }}</p>
          <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
            {{ $t('wishlists.myTitle') }}
          </h2>
          <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {{ $t('wishlists.subtitle') }}
          </p>
        </div>
        <BaseButton
          variant="primary"
          class="w-full sm:w-auto"
          :disabled="!isHouseholdReady"
          :title="
            !householdStore.initialized
              ? $t('wishlists.loadingHouseholdTooltip')
              : !currentHouseholdId
                ? $t('wishlists.selectHouseholdTooltip')
                : undefined
          "
          @click="showCreatePersonalModal = true"
        >
          {{ $t('wishlists.createWishlist') }}
        </BaseButton>
      </div>
    </BaseCard>

    <LoadingState v-if="wishlistStore.loading" :message="$t('wishlists.loadingWishlists')" />

    <div
      v-else-if="wishlistStore.wishlists.length"
      class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <BaseCard
        v-for="wishlist in wishlistStore.wishlists"
        :key="wishlist.id"
        :hover="true"
        :padding="false"
        class="flex flex-col"
      >
        <div
          class="flex-1 p-4 cursor-pointer"
          tabindex="0"
          role="button"
          @click="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
          @keydown.enter="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
          @keydown.space.prevent="
            $router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })
          "
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {{ wishlist.title }}
            </h3>
            <BaseBadge :variant="getVisibilityVariant(wishlist.visibility)">
              {{ getVisibilityLabel(wishlist.visibility) }}
            </BaseBadge>
          </div>
          <p v-if="wishlist.description" class="text-sm text-neutral-600 dark:text-neutral-400">
            {{ wishlist.description }}
          </p>
          <p class="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
            Created {{ new Date(wishlist.created_at).toLocaleDateString() }}
          </p>
        </div>

        <!-- Action Buttons - Always at bottom -->
        <template #footer>
          <div class="flex gap-2">
            <BaseButton
              variant="ghost"
              class="flex-1 text-sm"
              @click.stop="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
            >
              {{ $t('wishlists.edit') }}
            </BaseButton>
            <BaseButton
              variant="danger"
              class="flex-1 text-sm"
              @click.stop="handleDelete(wishlist.id)"
            >
              {{ $t('wishlists.delete') }}
            </BaseButton>
          </div>
        </template>
      </BaseCard>
    </div>

    <EmptyState
      v-else
      :title="$t('wishlists.noTitle')"
      :description="$t('wishlists.noDescription')"
    />

    <!-- Children's Wishlists Section -->
    <template v-if="canCreateForChildren">
      <BaseCard>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div class="min-w-0">
            <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ $t('wishlists.children.subtitle') }}</p>
            <h2 class="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
              {{ $t('wishlists.children.title') }}
            </h2>
            <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {{ $t('wishlists.children.description') }}
            </p>
          </div>
          <BaseButton
            variant="primary"
            class="w-full sm:w-auto"
            :disabled="!currentHouseholdId || childMembers.length === 0"
            :title="
              !currentHouseholdId
                ? $t('wishlists.selectHouseholdTooltip')
                : childMembers.length === 0
                  ? $t('wishlists.children.noChildrenTooltip')
                  : undefined
            "
            @click="showCreateChildModal = true"
          >
            {{ $t('wishlists.children.createForChild') }}
          </BaseButton>
        </div>
      </BaseCard>

      <div
        v-if="wishlistStore.childrenWishlists.length"
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <BaseCard
          v-for="wishlist in wishlistStore.childrenWishlists"
          :key="wishlist.id"
          :hover="true"
          :padding="false"
          class="flex flex-col"
        >
          <div
            class="flex-1 p-4 cursor-pointer"
            tabindex="0"
            role="button"
            @click="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
            @keydown.enter="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
            @keydown.space.prevent="
              $router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })
            "
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {{ wishlist.title }}
              </h3>
              <div class="flex gap-2">
                <BaseBadge v-if="wishlist.member_name" variant="neutral">
                  {{ wishlist.member_name }}
                </BaseBadge>
                <BaseBadge :variant="getVisibilityVariant(wishlist.visibility)">
                  {{ getVisibilityLabel(wishlist.visibility) }}
                </BaseBadge>
              </div>
            </div>
            <p v-if="wishlist.description" class="text-sm text-neutral-600 dark:text-neutral-400">
              {{ wishlist.description }}
            </p>
            <p class="mt-3 text-xs text-neutral-500 dark:text-neutral-500">
              Created {{ new Date(wishlist.created_at).toLocaleDateString() }}
            </p>
          </div>

          <!-- Action Buttons - Always at bottom -->
          <template #footer>
            <div class="flex gap-2">
              <BaseButton
                variant="ghost"
                class="flex-1 text-sm"
                @click.stop="$router.push({ name: 'wishlist-edit', params: { id: wishlist.id } })"
              >
                {{ $t('wishlists.edit') }}
              </BaseButton>
              <BaseButton
                variant="danger"
                class="flex-1 text-sm"
                @click.stop="handleDelete(wishlist.id)"
              >
                {{ $t('wishlists.delete') }}
              </BaseButton>
            </div>
          </template>
        </BaseCard>
      </div>

      <EmptyState
        v-else
        :title="$t('wishlists.children.noTitle')"
        :description="$t('wishlists.children.noDescription')"
      />
    </template>

    <!-- Personal Wishlist Modal -->
    <ModalDialog
      :open="showCreatePersonalModal"
      :title="$t('wishlists.createModal.title')"
      @close="showCreatePersonalModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreatePersonal">
        <BaseInput v-model="newTitle" :label="$t('wishlists.createModal.titleLabel')" :placeholder="$t('wishlists.createModal.titlePlaceholder')" required />
        <BaseInput
          v-model="newDescription"
          :label="$t('wishlists.createModal.descriptionLabel')"
          :placeholder="$t('wishlists.createModal.descriptionPlaceholder')"
        />
        <div class="space-y-2">
          <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $t('wishlists.createModal.visibilityLabel') }}</label>
          <select v-model="newVisibility" class="input w-full">
            <option value="private">{{ $t('wishlists.visibility.private') }}</option>
            <option value="household">{{ $t('wishlists.visibility.household') }}</option>
            <option value="public">{{ $t('wishlists.visibility.public') }}</option>
          </select>
        </div>
        <div class="flex gap-3">
          <BaseButton variant="primary" type="submit" :disabled="wishlistStore.loading">
            {{ $t('common.create') }}
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showCreatePersonalModal = false">{{ $t('common.cancel') }}</BaseButton>
        </div>
      </form>
    </ModalDialog>

    <!-- Child Wishlist Modal -->
    <ModalDialog
      :open="showCreateChildModal"
      :title="$t('wishlists.children.createModal.title')"
      @close="showCreateChildModal = false"
    >
      <form class="space-y-4" @submit.prevent="handleCreateChild">
        <div class="space-y-2">
          <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $t('wishlists.children.createModal.childLabel') }}</label>
          <select v-model="selectedMemberId" class="input w-full" required>
            <option :value="null" disabled selected>{{ $t('wishlists.children.createModal.choosePlaceholder') }}</option>
            <option v-for="child in childMembers" :key="child.id" :value="child.id">
              {{ child.display_name }}
            </option>
          </select>
        </div>
        <BaseInput v-model="newTitle" :label="$t('wishlists.createModal.titleLabel')" :placeholder="$t('wishlists.createModal.titlePlaceholder')" required />
        <BaseInput
          v-model="newDescription"
          :label="$t('wishlists.createModal.descriptionLabel')"
          :placeholder="$t('wishlists.createModal.descriptionPlaceholder')"
        />
        <div class="space-y-2">
          <label class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ $t('wishlists.createModal.visibilityLabel') }}</label>
          <select v-model="newVisibility" class="input w-full">
            <option value="private">{{ $t('wishlists.visibility.private') }}</option>
            <option value="household">{{ $t('wishlists.visibility.household') }}</option>
            <option value="public">{{ $t('wishlists.visibility.public') }}</option>
          </select>
        </div>
        <div class="flex gap-3">
          <BaseButton
            variant="primary"
            type="submit"
            :disabled="wishlistStore.loading || !selectedMemberId"
          >
            {{ $t('common.create') }}
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showCreateChildModal = false">{{ $t('common.cancel') }}</BaseButton>
        </div>
      </form>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import BaseInput from '@/components/shared/BaseInput.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useToastStore } from '@/stores/toast';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { useMembers } from '@/composables/useMembers';
import { wishlistService } from '@/features/wishlist/domain/wishlist.service';
import { isValidUrl } from '@/utils/validation';
import { fetchLinkPreview } from '@/composables/useLinkPreview';
import { getVisibilityVariant, getVisibilityLabel } from '@/composables/useVisibilityDisplay';

const authStore = useAuthStore();
const householdStore = useHouseholdStore();
const wishlistStore = useWishlistStore();
const { members, fetchMembers } = useMembers();
const { t } = useI18n();

// Use storeToRefs for proper reactivity with Pinia
const { currentHousehold } = storeToRefs(householdStore);
const currentHouseholdId = computed(() => currentHousehold.value?.id);

// Check if household is ready for data creation (initialized + household selected)
const isHouseholdReady = computed(() => householdStore.initialized && !!currentHouseholdId.value);

// Filter for child members only
const childMembers = computed(() =>
  (members.value || []).filter((m) => m.role === 'child' && m.is_active),
);

// Check if user can create wishlists for children (owner or admin)
const canCreateForChildren = computed(
  () => householdStore.isOwnerOrAdmin && childMembers.value.length > 0,
);

const showCreatePersonalModal = ref(false);
const showCreateChildModal = ref(false);
const newTitle = ref('');
const newDescription = ref('');
const newVisibility = ref<'private' | 'household' | 'public'>('private');
const selectedMemberId = ref<string | null>(null);
const previewUrls = ref<Record<string, string>>({});
const previewImages = ref<Record<string, string>>({});

const handleCreatePersonal = async () => {
  if (!newTitle.value.trim()) return;

  // CRITICAL: Wait for household store initialization before creating wishlist
  if (!householdStore.initialized) {
    useToastStore().warning(t('shopping.loadingHouseholdWait'));
    return;
  }

  if (!currentHouseholdId.value) {
    useToastStore().warning(t('wishlists.selectHouseholdTooltip'));
    return;
  }

  const created = await wishlistStore.createWishlist({
    title: newTitle.value.trim(),
    description: newDescription.value.trim() || null,
    visibility: newVisibility.value,
    household_id: currentHouseholdId.value,
    // No member_id - will use current user's member_id
  });
  if (created) {
    newTitle.value = '';
    newDescription.value = '';
    newVisibility.value = 'private';
    showCreatePersonalModal.value = false;
  }
};

const handleCreateChild = async () => {
  if (!newTitle.value.trim()) return;
  if (!selectedMemberId.value) {
    useToastStore().warning(t('wishlists.children.createModal.choosePlaceholder'));
    return;
  }

  // CRITICAL: Wait for household store initialization before creating wishlist
  if (!householdStore.initialized) {
    useToastStore().warning(t('shopping.loadingHouseholdWait'));
    return;
  }

  if (!currentHouseholdId.value) {
    useToastStore().warning(t('wishlists.selectHouseholdTooltip'));
    return;
  }

  const created = await wishlistStore.createWishlist({
    title: newTitle.value.trim(),
    description: newDescription.value.trim() || null,
    visibility: newVisibility.value,
    household_id: currentHouseholdId.value,
    member_id: selectedMemberId.value,
  });
  if (created) {
    newTitle.value = '';
    newDescription.value = '';
    newVisibility.value = 'private';
    selectedMemberId.value = null;
    showCreateChildModal.value = false;
  }
};

const handleDelete = async (wishlistId: string) => {
  if (!confirm(t('wishlists.deleteConfirm'))) {
    return;
  }

  await wishlistStore.removeWishlist(wishlistId);
};

/**
 * Load first item's link for each wishlist and fetch screenshot
 * Parallelizes API calls for better performance
 */
const loadWishlistPreviews = async () => {
  const urls: Record<string, string> = {};
  const images: Record<string, string> = {};

  // Step 1: Fetch all wishlist items in parallel
  const itemFetches = wishlistStore.wishlists.map(async (wishlist) => {
    try {
      const response = await wishlistService.getWishlistItems(wishlist.id);
      if (response.data && response.data.length > 0) {
        // Find first item with a valid link
        const itemWithLink = response.data.find(
          (item) => item.link && item.link.trim() && isValidUrl(item.link),
        );
        if (itemWithLink?.link) {
          return { wishlistId: wishlist.id, url: itemWithLink.link };
        }
      }
    } catch (error) {
      // Silently fail for individual wishlists
      console.warn(`Failed to load items for wishlist ${wishlist.id}`, error);
    }
    return null;
  });

  const wishlistUrls = (await Promise.all(itemFetches)).filter((item) => item !== null);

  // Step 2: Fetch all link previews in parallel (uses cache automatically)
  const previewFetches = wishlistUrls.map(async ({ wishlistId, url }) => {
    urls[wishlistId] = url;

    try {
      // fetchLinkPreview handles caching internally
      const preview = await fetchLinkPreview(url, {
        screenshot: true,
        meta: false,
        viewportWidth: 400,
        viewportHeight: 300,
        deviceScaleFactor: 1,
      });

      if (preview?.image) {
        return { wishlistId, image: preview.image };
      }
    } catch (error) {
      console.warn(`Failed to fetch screenshot for wishlist ${wishlistId}`, error);
    }
    return null;
  });

  const previewResults = (await Promise.all(previewFetches)).filter((item) => item !== null);

  // Step 3: Update state with results
  for (const { wishlistId, image } of previewResults) {
    images[wishlistId] = image;
  }

  previewUrls.value = urls;
  previewImages.value = images;
};

// Load wishlists and members when user or household changes
watch(
  [() => authStore.user?.id, currentHouseholdId],
  async ([userId, householdId]) => {
    if (userId && householdId) {
      await Promise.all([
        wishlistStore.loadWishlistsByHousehold(userId, householdId),
        wishlistStore.loadChildrenWishlists(userId, householdId),
        fetchMembers(),
      ]);
      // Load previews after wishlists are loaded
      await loadWishlistPreviews();
    }
  },
  { immediate: true },
);
</script>
