<template>
  <div
    class="glass-card p-3 sm:p-4 rounded-2xl transition-all hover:shadow-lg border-2"
    :class="cardBorderClass"
  >
    <div class="flex items-start gap-3 sm:gap-4">
      <!-- Avatar -->
      <Avatar
        :avatar-url="member.avatar_url"
        :name="memberName"
        :role="member.role"
        :size="56"
        :show-role-badge="false"
      />

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
          {{ memberName }}
        </h3>

        <!-- Age for children -->
        <p v-if="isChild && age" class="text-sm text-neutral-600 dark:text-neutral-400">
          {{ age }} years old
        </p>

        <!-- Email for adults -->
        <p v-else-if="member.email" class="text-sm text-neutral-600 dark:text-neutral-400 truncate">
          {{ member.email }}
        </p>

        <!-- Role Badge -->
        <div class="mt-2">
          <BaseBadge :variant="badgeVariant" :class="badgeClass">
            {{ roleLabel }}
          </BaseBadge>
        </div>

        <!-- Future: Wishlist/Achievements Preview -->
        <div v-if="isChild" class="mt-3 flex gap-2">
          <span class="text-xs text-neutral-500 dark:text-neutral-400"> 🎁 Wishlist </span>
          <span class="text-xs text-neutral-500 dark:text-neutral-400"> 🏆 Achievements </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <button
          v-if="canEdit"
          type="button"
          title="Edit member"
          class="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
          @click="$emit('edit', member)"
        >
          ✏️
        </button>
        <button
          v-if="canRemove"
          type="button"
          title="Remove member"
          class="text-neutral-500 hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-400 transition-colors"
          @click="$emit('remove', member.id)"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Avatar from '@/components/shared/Avatar.vue';
import BaseBadge from '@/components/shared/BaseBadge.vue';
import { getRoleLabel } from '@/utils/roleUtils';
import { resolveMemberProfile } from '@/utils/profileResolver';
import type { Member } from '@/features/shared/domain/entities';

interface Props {
  member: Member;
  canManage?: boolean; // Whether current user can manage members (owner/admin)
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'edit', member: Member): void;
}>();

const resolvedProfile = computed(() => resolveMemberProfile(props.member));
const memberName = computed(() => resolvedProfile.value.name);

// Determine role type
const isChild = computed(() => props.member.role === 'child');
const isViewer = computed(() => props.member.role === 'viewer');
const isOwner = computed(() => props.member.role === 'owner');

// Calculate age if birthday is provided (for children)
const age = computed(() => {
  if (!props.member.date_of_birth) return null;

  // Parse birthday as date-only value to avoid timezone issues
  const [yearStr, monthStr, dayStr] = props.member.date_of_birth.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1; // JS months are 0-based
  const day = Number(dayStr);

  if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
    return null;
  }

  // Construct UTC dates for both today and birth date to ensure consistent comparison
  const todayLocal = new Date();
  const todayUtc = new Date(
    Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()),
  );
  const birthDateUtc = new Date(Date.UTC(year, monthIndex, day));

  let calculatedAge = todayUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
  const monthDiff = todayUtc.getUTCMonth() - birthDateUtc.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && todayUtc.getUTCDate() < birthDateUtc.getUTCDate())) {
    calculatedAge--;
  }

  // Guard against future dates resulting in negative ages
  if (calculatedAge < 0) {
    return null;
  }

  return calculatedAge;
});

// Role label for badge using shared utility
const roleLabel = computed(() => getRoleLabel(props.member.role));

const badgeVariant = computed(() => {
  if (isOwner.value) return 'primary';
  if (isChild.value) return 'success';
  if (isViewer.value) return 'warning';
  return 'neutral';
});

const badgeClass = computed(() => {
  if (isChild.value) {
    return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  }
  if (isViewer.value) {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
  }
  return '';
});

const cardBorderClass = computed(() => {
  if (isChild.value) {
    return 'border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700';
  }
  if (isViewer.value) {
    return 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700';
  }
  if (isOwner.value) {
    return 'border-yellow-200 dark:border-yellow-800 hover:border-yellow-300 dark:hover:border-yellow-700';
  }
  return 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600';
});

const canEdit = computed(() => {
  // Only show edit button if user has management permissions
  // and the member is not the owner (owner can't be edited in this view)
  return props.canManage === true && props.member.role !== 'owner';
});

const canRemove = computed(() => {
  // Only show remove button if user has management permissions
  // and the member is not the owner (owner can't be removed)
  return props.canManage === true && props.member.role !== 'owner';
});
</script>
