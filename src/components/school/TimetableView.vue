<template>
  <div class="space-y-4">
    <!-- Loading -->
    <div
      v-if="schoolStore.dataLoading"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <span class="text-4xl block mb-2 animate-pulse">📅</span>
      <p>{{ $t('school.loading') }}</p>
    </div>

    <!-- Error state -->
    <div
      v-else-if="schoolStore.dataError && !Object.keys(lessonsByDate).length"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <span class="text-4xl block mb-2">⚠️</span>
      <p class="text-sm text-red-500 mb-4">{{ schoolStore.dataError }}</p>
      <button
        type="button"
        class="btn-primary text-sm"
        :disabled="schoolStore.syncing"
        @click="handleSync"
      >
        <span :class="schoolStore.syncing ? 'animate-spin' : ''">🔄</span>
        {{ schoolStore.syncing ? $t('school.syncing') : $t('school.sync') }}
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!Object.keys(lessonsByDate).length"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <span class="text-4xl block mb-2">📅</span>
      <template v-if="hasSynced">
        <p class="mb-1 font-medium text-neutral-500 dark:text-neutral-400">
          {{ $t('school.timetable.emptyAfterSync') }}
        </p>
        <p class="text-xs mb-2">{{ $t('school.timetable.emptyAfterSyncHint') }}</p>
      </template>
      <template v-else>
        <p class="mb-4">{{ $t('school.timetable.empty') }}</p>
        <button
          type="button"
          class="btn-primary text-sm"
          :disabled="schoolStore.syncing"
          @click="handleSync"
        >
          <span :class="schoolStore.syncing ? 'animate-spin' : ''">🔄</span>
          {{ schoolStore.syncing ? $t('school.syncing') : $t('school.sync') }}
        </button>
      </template>
    </div>

    <!-- One card per day -->
    <div
      v-for="(lessons, date) in lessonsByDate"
      :key="date"
      class="glass-card rounded-xl overflow-hidden"
    >
      <!-- Day header -->
      <div
        class="flex items-center justify-between px-4 py-2"
        :class="
          isToday(date)
            ? 'bg-primary-500/10 border-b border-primary-200 dark:border-primary-800'
            : 'bg-neutral-50/50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-700'
        "
      >
        <span
          class="font-semibold text-sm"
          :class="
            isToday(date)
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-neutral-700 dark:text-neutral-300'
          "
        >
          {{ formatDay(date) }}
        </span>
        <span
          v-if="isToday(date)"
          class="text-xs text-primary-600 dark:text-primary-400 font-medium"
          >{{ $t('school.timetable.today') }}</span
        >
      </div>

      <!-- Lessons list -->
      <div class="divide-y divide-neutral-100 dark:divide-neutral-700/50">
        <div
          v-for="lesson in lessons"
          :key="lesson.id"
          class="flex items-start gap-3 px-4 py-3 transition-colors"
          :class="[
            lesson.is_cancelled ? 'opacity-40 line-through' : '',
            lesson.is_substitution ? 'bg-amber-50/50 dark:bg-amber-900/10' : '',
          ]"
        >
          <!-- Lesson number / time -->
          <div class="flex flex-col items-center min-w-[48px]">
            <span class="text-xs font-bold text-neutral-500 dark:text-neutral-400 leading-none">
              {{ lesson.lesson_number ?? '' }}
            </span>
            <span
              v-if="lesson.start_time"
              class="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums mt-0.5"
            >
              {{ lesson.start_time?.slice(0, 5) }}
            </span>
          </div>

          <!-- Subject & details -->
          <div class="flex-1 min-w-0">
            <p class="font-medium text-neutral-800 dark:text-neutral-200 truncate">
              {{ lesson.subject }}
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <span v-if="lesson.teacher">{{ lesson.teacher }}</span>
              <span v-if="lesson.teacher && lesson.classroom"> · </span>
              <span v-if="lesson.classroom">{{ lesson.classroom }}</span>
            </p>
            <span
              v-if="lesson.is_substitution"
              class="inline-block mt-1 text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full"
            >
              ⚠️ {{ $t('school.timetable.substitution') }}
            </span>
          </div>

          <!-- Time range end -->
          <span
            v-if="lesson.end_time"
            class="text-[11px] text-neutral-400 dark:text-neutral-500 tabular-nums self-start mt-1"
          >
            {{ lesson.end_time?.slice(0, 5) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSchoolStore } from '@/features/school/presentation/school.store';

const schoolStore = useSchoolStore();
const { locale } = useI18n();

const lessonsByDate = computed(() => schoolStore.lessonsByDate);
const hasSynced = computed(() => Boolean(schoolStore.activeConnection?.last_synced_at));

async function handleSync() {
  if (schoolStore.activeConnectionId) {
    await schoolStore.syncConnection(schoolStore.activeConnectionId);
  }
}

const _now = new Date();
const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

function isToday(date: string): boolean {
  return date === todayStr;
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'short' });
}
</script>
