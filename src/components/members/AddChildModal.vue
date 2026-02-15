<template>
  <ModalDialog :open="open" title="Add Child Profile" @close="$emit('close')">
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- Avatar Selection -->
      <div>
        <label class="label mb-3">Choose Avatar</label>
        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="avatar in avatarOptions"
            :key="avatar.id"
            type="button"
            :aria-label="`Select ${avatar.label} avatar`"
            class="aspect-square rounded-full text-4xl transition-all border-4 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400"
            :class="
              selectedAvatar === avatar.emoji
                ? 'border-green-500 bg-green-50 dark:bg-green-900 scale-110'
                : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
            "
            @click="selectedAvatar = avatar.emoji"
          >
            {{ avatar.emoji }}
          </button>
        </div>
      </div>

      <!-- Name Input -->
      <div>
        <label class="label" for="child-name">Child's Name</label>
        <input
          id="child-name"
          v-model="childName"
          type="text"
          class="input"
          required
          placeholder="Enter child's name"
          maxlength="50"
        />
      </div>

      <!-- Birthday Input -->
      <div>
        <label class="label" for="child-birthday">Birthday</label>
        <input
          id="child-birthday"
          v-model="birthday"
          type="date"
          class="input"
          required
          :max="maxDate"
        />
        <p v-if="age !== null" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Age: {{ age }} years old
        </p>
      </div>

      <!-- Future Features Preview -->
      <div class="rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 border border-green-200 dark:border-green-800">
        <p class="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          ✨ Coming Soon for {{ childName || 'this child' }}:
        </p>
        <ul class="space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
          <li>🎁 Personal wishlist</li>
          <li>🏆 Achievement tracking & gamification</li>
          <li>🔑 Account activation when ready</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-2">
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!isFormValid"
          class="flex-1"
        >
          👶 Add Child
        </BaseButton>
        <BaseButton variant="ghost" type="button" @click="$emit('close')">
          Cancel
        </BaseButton>
      </div>
    </form>
  </ModalDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import ModalDialog from '@/components/shared/ModalDialog.vue';
import BaseButton from '@/components/shared/BaseButton.vue';

interface Props {
  open: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', data: { name: string; birthday: string; avatar: string }): void;
}>();

const childName = ref('');
const birthday = ref('');
const selectedAvatar = ref('👶');

// Avatar options with child-friendly emojis
const avatarOptions = [
  { id: 1, emoji: '👶', label: 'Baby' },
  { id: 2, emoji: '👧', label: 'Girl' },
  { id: 3, emoji: '👦', label: 'Boy' },
  { id: 4, emoji: '🧒', label: 'Child' },
  { id: 5, emoji: '👨', label: 'Man' },
  { id: 6, emoji: '👩', label: 'Woman' },
  { id: 7, emoji: '🐻', label: 'Bear' },
  { id: 8, emoji: '🐰', label: 'Rabbit' },
  { id: 9, emoji: '🐼', label: 'Panda' },
  { id: 10, emoji: '🦁', label: 'Lion' },
  { id: 11, emoji: '🐯', label: 'Tiger' },
  { id: 12, emoji: '🦊', label: 'Fox' },
  { id: 13, emoji: '🐨', label: 'Koala' },
  { id: 14, emoji: '🐸', label: 'Frog' },
  { id: 15, emoji: '🦄', label: 'Unicorn' },
  { id: 16, emoji: '🐶', label: 'Dog' },
];

// Today's date for max date validation
const maxDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Calculate age from birthday
const age = computed(() => {
  if (!birthday.value) return null;
  
  // Parse birthday as date-only value to avoid timezone issues
  const [yearStr, monthStr, dayStr] = birthday.value.split('-');
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

// Form validation
const isFormValid = computed(() => {
  return childName.value.trim().length > 0 && birthday.value.length > 0;
});

const handleSubmit = () => {
  if (!isFormValid.value) return;
  
  emit('submit', {
    name: childName.value.trim(),
    birthday: birthday.value,
    avatar: selectedAvatar.value,
  });
  
  // Reset form
  childName.value = '';
  birthday.value = '';
  selectedAvatar.value = '👶';
};
</script>

<style scoped>
/* Soft, playful animations */
@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

button:hover {
  animation: bounce-subtle 0.3s ease-in-out;
}
</style>
