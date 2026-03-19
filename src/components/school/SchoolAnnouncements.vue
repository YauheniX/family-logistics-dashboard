<template>
  <div>
    <!-- Empty state -->
    <div v-if="!schoolStore.activeAnnouncements.length" class="text-center py-10 text-neutral-400">
      <Megaphone class="w-10 h-10 mx-auto mb-2 text-neutral-400" />
      {{ $t('school.announcements.empty') }}
    </div>

    <!-- Announcement list -->
    <div v-else class="space-y-3">
      <div
        v-for="item in schoolStore.activeAnnouncements"
        :key="item.id"
        role="button"
        tabindex="0"
        :aria-expanded="expanded.has(item.id)"
        class="px-4 py-3 rounded-xl border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :class="
          item.is_new
            ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700'
            : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'
        "
        @click="toggleExpanded(item.id)"
        @keydown.enter.prevent="toggleExpanded(item.id)"
        @keydown.space.prevent="toggleExpanded(item.id)"
      >
        <!-- Header -->
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {{ item.title }}
            </p>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              <span v-if="item.author">{{ item.author }}</span>
              <span v-if="item.author && item.published_at"> · </span>
              <span v-if="item.published_at">{{ formatDate(item.published_at) }}</span>
            </p>
          </div>
          <span
            v-if="item.is_new"
            class="flex-shrink-0 text-[10px] font-semibold bg-amber-500 text-white px-1.5 py-0.5 rounded-full"
          >
            {{ $t('school.announcements.new') }}
          </span>
        </div>

        <!-- Expanded content -->
        <p
          v-if="expanded.has(item.id) && item.content"
          class="mt-2 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap cursor-default max-h-64 overflow-y-auto"
        >
          {{ item.content }}
        </p>
        <p
          v-else-if="item.content"
          class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 cursor-pointer"
        >
          {{ item.content }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Megaphone } from 'lucide-vue-next';
import { useSchoolStore } from '@/features/school/presentation/school.store';

const { locale } = useI18n();
const schoolStore = useSchoolStore();

const expanded = ref<Set<string>>(new Set());

function toggleExpanded(id: string) {
  if (expanded.value.has(id)) {
    expanded.value.delete(id);
  } else {
    expanded.value.add(id);
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
</script>
