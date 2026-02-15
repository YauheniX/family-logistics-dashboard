<template>
  <div
    class="glass-card p-4 rounded-2xl transition-all hover:shadow-lg border-2"
    :class="cardBorderClass"
  >
    <div class="flex items-start gap-4">
      <!-- Avatar -->
      <div class="relative flex-shrink-0">
        <div
          v-if="member.avatar_url"
          class="h-16 w-16 rounded-full overflow-hidden border-2"
          :class="avatarBorderClass"
        >
          <img
            :src="member.avatar_url"
            :alt="memberName"
            class="h-full w-full object-cover"
          />
        </div>
        <div
          v-else
          class="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white border-2"
          :class="avatarBorderClass"
          :style="{ backgroundColor: avatarColor }"
        >
          {{ initials }}
        </div>
        <!-- Role Badge Overlay -->
        <div class="absolute -bottom-1 -right-1">
          <span
            class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs border-2 border-white dark:border-neutral-800"
            :class="roleIconClass"
            :title="roleLabel"
          >
            {{ roleIcon }}
          </span>
        </div>
      </div>

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
          <span class="text-xs text-neutral-500 dark:text-neutral-400">
            🎁 Wishlist
          </span>
          <span class="text-xs text-neutral-500 dark:text-neutral-400">
            🏆 Achievements
          </span>
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
import BaseBadge from '@/components/shared/BaseBadge.vue';
import type { Member } from '@/features/shared/domain/entities';

interface Props {
  member: Member;
}

const props = defineProps<Props>();

defineEmits<{
  (e: 'remove', id: string): void;
  (e: 'edit', member: Member): void;
}>();

const memberName = computed(() => {
  return props.member.display_name || props.member.email || 'Unknown Member';
});

const initials = computed(() => {
  const name = memberName.value;
  const parts = name.trim().split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
});

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
    Date.UTC(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate())
  );
  const birthDateUtc = new Date(Date.UTC(year, monthIndex, day));

  let calculatedAge = todayUtc.getUTCFullYear() - birthDateUtc.getUTCFullYear();
  const monthDiff = todayUtc.getUTCMonth() - birthDateUtc.getUTCMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && todayUtc.getUTCDate() < birthDateUtc.getUTCDate())
  ) {
    calculatedAge--;
  }

  // Guard against future dates resulting in negative ages
  if (calculatedAge < 0) {
    return null;
  }

  return calculatedAge;
});

// Role-based styling
const roleIcon = computed(() => {
  const icons: Record<string, string> = {
    owner: '👑',
    admin: '⭐',
    member: '👤',
    child: '👶',
    viewer: '👀',
  };
  return icons[props.member.role] || '👤';
});

const roleLabel = computed(() => {
  const labels: Record<string, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    child: 'Child',
    viewer: 'Viewer',
  };
  return labels[props.member.role] || 'Member';
});

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

const roleIconClass = computed(() => {
  if (isChild.value) {
    return 'bg-green-500 dark:bg-green-600';
  }
  if (isViewer.value) {
    return 'bg-purple-500 dark:bg-purple-600';
  }
  if (isOwner.value) {
    return 'bg-yellow-500 dark:bg-yellow-600';
  }
  return 'bg-blue-500 dark:bg-blue-600';
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

const avatarBorderClass = computed(() => {
  if (isChild.value) {
    return 'border-green-300 dark:border-green-600';
  }
  if (isViewer.value) {
    return 'border-purple-300 dark:border-purple-600';
  }
  if (isOwner.value) {
    return 'border-yellow-400 dark:border-yellow-500';
  }
  return 'border-neutral-300 dark:border-neutral-600';
});

const avatarColor = computed(() => {
  const name = memberName.value;
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#06B6D4', // cyan
    '#6366F1', // indigo
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
});

const canEdit = computed(() => {
  // TODO: Implement proper permission checks when auth context is available,
  // e.g. isOwner || isAdmin || isSelf, based on the current authenticated user.
  // Until then, deny edits by default to avoid overexposing edit capabilities.
  return false;
});

const canRemove = computed(() => {
  // Cannot remove owner
  return props.member.role !== 'owner';
});
</script>
