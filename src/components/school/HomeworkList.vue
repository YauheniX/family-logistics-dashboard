<template>
  <div class="space-y-2">
    <!-- Empty state -->
    <div v-if="!homework.length" class="text-center py-10 text-neutral-400 dark:text-neutral-500">
      <span class="text-4xl block mb-2">📝</span>
      <p>{{ $t('school.homework.empty') }}</p>
    </div>

    <!-- Homework items -->
    <div
      v-for="item in homework"
      :key="item.id"
      class="glass-card rounded-xl p-4 flex items-start gap-3 transition-opacity"
      :class="item.is_done ? 'opacity-50' : ''"
    >
      <!-- Checkbox -->
      <button
        type="button"
        class="mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
        :class="
          item.is_done
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-neutral-300 dark:border-neutral-600 hover:border-green-400'
        "
        :aria-label="item.is_done ? 'Mark as not done' : 'Mark as done'"
        @click="toggleDone(item)"
      >
        <span v-if="item.is_done" class="text-xs leading-none">✓</span>
      </button>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          >
            {{ item.subject }}
          </span>
          <span
            v-if="item.date_due"
            class="text-xs px-2 py-0.5 rounded-full"
            :class="dueDateClass(item.date_due)"
          >
            📅 {{ formatDue(item.date_due) }}
          </span>
        </div>
        <p
          class="mt-1 text-sm text-neutral-700 dark:text-neutral-300"
          :class="item.is_done ? 'line-through text-neutral-400' : ''"
        >
          {{ item.description }}
        </p>
        <p v-if="item.teacher" class="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
          👨‍🏫 {{ item.teacher }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import type { SchoolHomework } from '@/features/school/domain/school.entities';

const schoolStore = useSchoolStore();
const { t, locale } = useI18n();

const homework = computed(() => schoolStore.activeHomework);

const todayStr = new Date().toISOString().slice(0, 10);

async function toggleDone(item: SchoolHomework) {
  if (!schoolStore.activeConnectionId) return;
  await schoolStore.toggleHomeworkDone(item.id, schoolStore.activeConnectionId, !item.is_done);
}

function dueDateClass(dateStr: string): string {
  const diff = Math.floor(
    (new Date(dateStr).getTime() - new Date(todayStr).getTime()) / 86_400_000,
  );
  if (diff < 0) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  if (diff === 0) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
  if (diff <= 2) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
}

function formatDue(dateStr: string): string {
  const diff = Math.floor(
    (new Date(dateStr).getTime() - new Date(todayStr).getTime()) / 86_400_000,
  );
  if (diff < 0) return t('school.homework.overdue', { date: dateStr });
  if (diff === 0) return t('school.homework.today');
  if (diff === 1) return t('school.homework.tomorrow');
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
</script>
