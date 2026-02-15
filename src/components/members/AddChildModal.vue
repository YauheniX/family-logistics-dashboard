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
  { id: 1, emoji: '👶' },
  { id: 2, emoji: '👧' },
  { id: 3, emoji: '👦' },
  { id: 4, emoji: '🧒' },
  { id: 5, emoji: '👨' },
  { id: 6, emoji: '👩' },
  { id: 7, emoji: '🐻' },
  { id: 8, emoji: '🐰' },
  { id: 9, emoji: '🐼' },
  { id: 10, emoji: '🦁' },
  { id: 11, emoji: '🐯' },
  { id: 12, emoji: '🦊' },
  { id: 13, emoji: '🐨' },
  { id: 14, emoji: '🐸' },
  { id: 15, emoji: '🦄' },
  { id: 16, emoji: '🐶' },
];

// Today's date for max date validation
const maxDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

// Calculate age from birthday
const age = computed(() => {
  if (!birthday.value) return null;
  
  const birthDate = new Date(birthday.value);
  const today = new Date();
  let calculatedAge = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    calculatedAge--;
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
