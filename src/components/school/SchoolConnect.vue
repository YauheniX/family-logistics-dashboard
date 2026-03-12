<template>
  <div class="glass-card rounded-2xl p-6 max-w-md mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <div
        class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl"
      >
        🏫
      </div>
      <div>
        <h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {{ $t('school.connect.title') }}
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ $t('school.connect.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Platform badge -->
    <div
      class="flex items-center gap-2 mb-5 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
    >
      <span class="text-blue-600 dark:text-blue-400 text-sm">
        📚 {{ $t('school.connect.instructions') }}
      </span>
    </div>

    <!-- Form -->
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <!-- Member selector -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {{ $t('school.connect.memberLabel') }}
        </label>
        <select v-model="form.member_id" required class="input-field w-full">
          <option value="" disabled>{{ $t('school.connect.memberPlaceholder') }}</option>
          <option v-for="m in members" :key="m.id" :value="m.id">
            {{ m.display_name }}
          </option>
        </select>
      </div>

      <!-- Librus login -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {{ $t('school.connect.loginLabel') }}
        </label>
        <input
          v-model="form.username"
          type="text"
          autocomplete="username"
          :placeholder="$t('school.connect.loginPlaceholder')"
          required
          class="input-field w-full"
        />
      </div>

      <!-- Password -->
      <div>
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {{ $t('school.connect.passwordLabel') }}
        </label>
        <input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
          class="input-field w-full"
        />
      </div>

      <!-- Error -->
      <p v-if="schoolStore.error" class="text-sm text-red-600 dark:text-red-400">
        {{ schoolStore.error }}
      </p>

      <!-- Actions -->
      <div class="flex gap-3 pt-1">
        <button type="button" class="btn-secondary flex-1" @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="schoolStore.connecting"
          class="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <span v-if="schoolStore.connecting" class="animate-spin">⏳</span>
          {{
            schoolStore.connecting
              ? $t('school.connect.connectingBtn')
              : $t('school.connect.connectBtn')
          }}
        </button>
      </div>
    </form>

    <!-- Disclaimer -->
    <p class="mt-4 text-xs text-neutral-400 dark:text-neutral-500 text-center">
      {{ $t('school.connect.disclaimer') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import type { Member } from '@/features/shared/domain/entities';

const props = defineProps<{
  householdId: string;
  members: Pick<Member, 'id' | 'display_name'>[];
}>();

const emit = defineEmits<{
  cancel: [];
  connected: [connectionId: string];
}>();

const schoolStore = useSchoolStore();

const form = reactive({
  member_id: '',
  username: '',
  password: '',
});

async function handleSubmit() {
  const success = await schoolStore.connectSchool({
    household_id: props.householdId,
    member_id: form.member_id,
    username: form.username.trim(),
    password: form.password.trim(),
  });

  if (success) {
    const conn = schoolStore.connections.find(
      (c) => c.member_id === form.member_id && c.platform === 'librus',
    );
    emit('connected', conn?.id ?? '');
    form.password = '';
  }
}
</script>
