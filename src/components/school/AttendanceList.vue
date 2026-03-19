<template>
  <div>
    <!-- No-permission state: shown when the user has no role in the current household -->
    <div
      v-if="!canReadHouseholdResource"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <Lock class="w-10 h-10 mx-auto mb-2 text-neutral-400 dark:text-neutral-500" />
      {{ $t('school.attendance.empty') }}
    </div>

    <template v-else>
      <!-- Empty state -->
      <div v-if="!grouped.length" class="text-center py-10 text-neutral-400">
        <CheckCircle2 class="w-10 h-10 mx-auto mb-2 text-neutral-400" />
        {{ $t('school.attendance.empty') }}
      </div>

      <!-- Records grouped by date -->
      <div v-else class="space-y-4">
        <div v-for="group in grouped" :key="group.date" class="space-y-1">
          <h3
            class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide px-1"
          >
            {{ formatDay(group.date) }}
          </h3>

          <div
            v-for="item in group.items"
            :key="item.id"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700"
          >
            <!-- Type badge -->
            <span
              class="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-sm font-bold"
              :class="badgeClass(item.type_short ?? item.type)"
            >
              {{ item.type_short ?? (item.type?.charAt(0).toUpperCase() || '?') }}
            </span>

            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
                {{ item.subject ?? typeName(item.type_short ?? item.type) }}
              </p>
              <p v-if="item.lesson_number" class="text-xs text-neutral-400 dark:text-neutral-500">
                {{ $t('school.tabs.timetable') }} {{ item.lesson_number }}
                <span v-if="item.teacher"> · {{ item.teacher }}</span>
              </p>
            </div>

            <!-- New badge -->
            <span
              v-if="item.is_new"
              class="text-[10px] font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full"
            >
              {{ $t('school.messages.unread') }}
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Lock, CheckCircle2 } from 'lucide-vue-next';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import { useHouseholdPermissions } from '@/composables/useHouseholdPermissions';

const { t, locale } = useI18n();
const schoolStore = useSchoolStore();
const { canReadHouseholdResource } = useHouseholdPermissions();

// ─── Group records by date ────────────────────────────────
const grouped = computed(() => {
  const records = schoolStore.activeAttendance;
  const map = new Map<string, typeof records>();
  for (const item of records) {
    const arr = map.get(item.date) ?? [];
    arr.push(item);
    map.set(item.date, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
});

// ─── Helpers ─────────────────────────────────────────────
function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function typeName(type: string): string {
  const map: Record<string, string> = {
    ob: t('school.attendance.present'),
    nb: t('school.attendance.absent'),
    sp: t('school.attendance.late'),
    zw: t('school.attendance.excused'),
  };
  return map[type.toLowerCase()] ?? type;
}

function badgeClass(type: string): string {
  const lower = type.toLowerCase();
  if (lower === 'ob' || lower === 'present')
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (lower === 'nb' || lower === 'absent')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (lower === 'sp' || lower === 'late')
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (lower === 'zw' || lower === 'excused')
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300';
}
</script>
