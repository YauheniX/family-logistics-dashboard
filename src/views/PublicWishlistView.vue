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
          <template v-if="isAuthenticated">
            Reserve this item as <strong>{{ displayName }}</strong
            >? Others will see your name.
          </template>
          <template v-else>
            Enter your name and email to reserve this item. You'll need the email to unreserve it
            later.
          </template>
        </p>
        <div v-if="!isAuthenticated" class="space-y-3">
          <div>
            <label class="label" for="reserve-name">Your Name</label>
            <input
              id="reserve-name"
              v-model="reserveName"
              type="text"
              class="input"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label class="label" for="reserve-email">Your Email</label>
            <input
              id="reserve-email"
              v-model="reserveEmail"
              type="email"
              class="input"
              placeholder="your@email.com"
              required
            />
          </div>
        </div>
        <div class="flex gap-3">
          <BaseButton
            variant="primary"
            type="button"
            :disabled="!isAuthenticated && (!reserveName.trim() || !reserveEmail.trim())"
            @click="handleReserve"
          >
            Confirm Reservation
          </BaseButton>
          <BaseButton variant="ghost" type="button" @click="showReserveModal = false"
            >Cancel</BaseButton
          >
        </div>
      </div>
    </ModalDialog>

    <!-- Unreserve Modal -->
    <ModalDialog :open="showUnreserveModal" title="Unreserve Item" @close="cancelUnreserve">
      <div class="space-y-4">
        <p class="text-sm text-neutral-600 dark:text-neutral-400">
          Enter the email address you used to reserve this item.
        </p>
        <div>
          <label class="label" for="unreserve-email">Your Email</label>
          <input
            id="unreserve-email"
            v-model="unreserveEmail"
            type="email"
            class="input"
            placeholder="your@email.com"
            required
          />
        </div>
        <div class="flex gap-3">
          <BaseButton
            variant="primary"
            type="button"
            :disabled="!unreserveEmail.trim()"
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
import { onMounted, ref, computed, watch } from 'vue';
import BaseButton from '@/components/shared/BaseButton.vue';
import BaseCard from '@/components/shared/BaseCard.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import LinkPreview from '@/components/shared/LinkPreview.vue';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
import { useUserProfile } from '@/composables/useUserProfile';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import type { ItemPriority } from '@/features/shared/domain/entities';

const props = defineProps<{ shareSlug: string }>();

const wishlistStore = useWishlistStore();
const toastStore = useToastStore();
const authStore = useAuthStore();
const { userDisplayName, loadUserProfile } = useUserProfile();

const showReserveModal = ref(false);
const showUnreserveModal = ref(false);
const reserveName = ref('');
const reserveEmail = ref('');
const unreserveEmail = ref('');
const reservingItemId = ref<string | null>(null);
const unreservingItemId = ref<string | null>(null);

// Use authenticated user's name if available
const isAuthenticated = computed(() => !!authStore.user);
const displayName = computed(() => userDisplayName.value || '');

// Load user profile when authenticated
watch(
  () => authStore.user,
  (user) => {
    if (user?.id) {
      loadUserProfile(user.id);
    }
  },
  { immediate: true },
);

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
  reserveEmail.value = '';
  showReserveModal.value = true;
};

const handleReserve = async () => {
  if (!reservingItemId.value) return;

  // Use authenticated user's name or manual input
  const name = isAuthenticated.value ? displayName.value : reserveName.value.trim();
  const email = isAuthenticated.value ? undefined : reserveEmail.value.trim();

  if (!name) {
    toastStore.error('Name is required to reserve an item');
    return;
  }

  if (!isAuthenticated.value && !email) {
    toastStore.error('Email is required to reserve an item');
    return;
  }

  // Validate email format if provided
  if (email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      toastStore.error('Please enter a valid email address');
      return;
    }
  }

  const result = await wishlistStore.reserveItem(
    reservingItemId.value,
    name,
    email, // Email required for anonymous, optional for authenticated
  );

  if (result) {
    showReserveModal.value = false;
    reservingItemId.value = null;
    reserveName.value = '';
    reserveEmail.value = '';
    toastStore.success('Item reserved successfully! Use your email to unreserve it later.');
  }
};

const startUnreserve = (itemId: string) => {
  unreservingItemId.value = itemId;
  unreserveEmail.value = '';
  showUnreserveModal.value = true;
};

const handleUnreserve = async () => {
  if (!unreservingItemId.value || !unreserveEmail.value.trim()) return;

  const result = await wishlistStore.reserveItem(
    unreservingItemId.value,
    undefined,
    unreserveEmail.value.trim(),
  );

  if (result) {
    toastStore.success('Item unreserved successfully!');
    showUnreserveModal.value = false;
    unreservingItemId.value = null;
    unreserveEmail.value = '';
  }
};

const cancelUnreserve = () => {
  showUnreserveModal.value = false;
  unreservingItemId.value = null;
  unreserveEmail.value = '';
};
</script>
