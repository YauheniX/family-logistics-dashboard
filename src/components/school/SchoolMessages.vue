<template>
  <div>
    <!-- No-permission state: shown when the user has no role in the current household -->
    <div
      v-if="!canReadHouseholdResource"
      class="text-center py-10 text-neutral-400 dark:text-neutral-500"
    >
      <span class="text-4xl block mb-2">🔒</span>
      {{ $t('school.messages.empty') }}
    </div>

    <template v-else>
      <!-- Direction tabs -->
      <div class="flex gap-1 mb-4">
        <button
          v-for="dir in ['inbox', 'sent'] as const"
          :key="dir"
          type="button"
          class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          :class="
            direction === dir
              ? 'bg-primary-500 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          "
          @click="direction = dir"
        >
          {{ dir === 'inbox' ? $t('school.messages.inbox') : $t('school.messages.sent') }}
          <span v-if="dir === 'inbox' && unreadCount" class="ml-1 text-xs font-bold">
            ({{ unreadCount }})
          </span>
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="!filtered.length" class="text-center py-10 text-neutral-400">
        <span class="text-4xl block mb-2">✉️</span>
        {{ $t('school.messages.empty') }}
      </div>

      <!-- Message list -->
      <div v-else class="space-y-2">
        <div
          v-for="msg in filtered"
          :key="msg.id"
          role="button"
          tabindex="0"
          :aria-expanded="expanded.has(msg.id)"
          class="px-4 py-3 rounded-xl border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="
            !msg.is_read
              ? 'bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-700'
              : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
          "
          @click="toggleExpanded(msg.id)"
          @keydown.enter.prevent="toggleExpanded(msg.id)"
          @keydown.space.prevent="toggleExpanded(msg.id)"
        >
          <!-- Header row -->
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                {{ msg.subject }}
              </p>
              <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {{
                  direction === 'inbox'
                    ? msg.sender || '—'
                    : (msg.recipients ?? []).join(', ') || '—'
                }}
                <span v-if="msg.sent_at"> · {{ formatDate(msg.sent_at) }}</span>
              </p>
            </div>
            <span
              v-if="!msg.is_read"
              class="flex-shrink-0 text-[10px] font-semibold bg-primary-500 text-white px-1.5 py-0.5 rounded-full"
            >
              {{ $t('school.messages.unread') }}
            </span>
          </div>

          <!-- Expanded body -->
          <p
            v-if="expanded.has(msg.id) && msg.body"
            class="mt-2 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap"
          >
            {{ msg.body }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import { useHouseholdPermissions } from '@/composables/useHouseholdPermissions';

const { t: _t, locale } = useI18n();
const schoolStore = useSchoolStore();
const { canReadHouseholdResource } = useHouseholdPermissions();

const direction = ref<'inbox' | 'sent'>('inbox');
const expanded = ref<Set<string>>(new Set());

const filtered = computed(() =>
  schoolStore.activeMessages.filter((m) => m.direction === direction.value),
);

const unreadCount = computed(
  () => schoolStore.activeMessages.filter((m) => m.direction === 'inbox' && !m.is_read).length,
);

function toggleExpanded(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id);
  } else {
    expanded.value.add(id);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>
