<template>
  <div class="min-h-screen pb-24">
    <!-- ─── Header ──────────────────────────────────────────── -->
    <div
      class="sticky top-0 z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700"
    >
      <div class="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
        <span class="text-2xl">🏫</span>
        <h1
          class="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex-1 truncate"
        >
          {{ $t('school.title') }}
        </h1>

        <!-- Sync button -->
        <button
          v-if="schoolStore.activeConnectionId"
          type="button"
          :disabled="schoolStore.syncing"
          class="btn-secondary text-sm flex items-center gap-1.5 shrink-0"
          @click="handleSync"
        >
          <span :class="schoolStore.syncing ? 'animate-spin' : ''">🔄</span>
          <span class="hidden sm:inline">{{
            schoolStore.syncing ? $t('school.syncing') : $t('school.sync')
          }}</span>
        </button>

        <!-- Add connection button -->
        <button type="button" class="btn-primary text-sm shrink-0" @click="showConnect = true">
          <span class="sm:hidden">+</span>
          <span class="hidden sm:inline">{{ $t('school.addConnection') }}</span>
        </button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      <!-- ─── Loading ──────────────────────────────────────── -->
      <div v-if="schoolStore.loading" class="text-center py-12 text-neutral-400">
        <span class="text-4xl block mb-2 animate-pulse">⏳</span>
        {{ $t('school.loading') }}
      </div>

      <!-- ─── No connections ──────────────────────────────── -->
      <div v-else-if="!schoolStore.connections.length && !showConnect" class="text-center py-14">
        <span class="text-6xl block mb-4">🏫</span>
        <h2 class="text-xl font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          {{ $t('school.noConnectionTitle') }}
        </h2>
        <p class="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
          {{ $t('school.noConnectionDesc') }}
        </p>
        <button class="btn-primary" type="button" @click="showConnect = true">
          {{ $t('school.connectAccountBtn') }}
        </button>
      </div>

      <!-- ─── Connect form ────────────────────────────────── -->
      <div v-if="showConnect" class="sm:flex sm:justify-center">
        <SchoolConnect
          :household-id="householdId"
          :members="householdMembers"
          class="w-full sm:max-w-md"
          @cancel="showConnect = false"
          @connected="onConnected"
        />
      </div>

      <!-- ─── Connected: connection picker ───────────────── -->
      <div v-else-if="schoolStore.connections.length" class="flex gap-2 flex-wrap">
        <button
          v-for="conn in schoolStore.connections"
          :key="conn.id"
          type="button"
          class="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
          :class="
            schoolStore.activeConnectionId === conn.id
              ? 'bg-primary-500 text-white border-primary-500'
              : conn.sync_error
                ? 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/20'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
          "
          @click="schoolStore.setActiveConnection(conn.id)"
        >
          {{ conn.sync_error ? '⚠️' : '🎓' }} {{ conn.display_label }}
        </button>
      </div>

      <!-- ─── Last synced info ─────────────────────────────── -->
      <div
        v-if="schoolStore.activeConnection?.last_synced_at"
        class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
      >
        <p class="text-xs text-neutral-400 dark:text-neutral-500">
          {{
            $t('school.lastSynced', {
              date: formatDate(schoolStore.activeConnection.last_synced_at),
            })
          }}
        </p>
        <p v-if="schoolStore.activeConnection.sync_error" class="text-xs text-red-500">
          ⚠️ {{ schoolStore.activeConnection.sync_error }}
        </p>
      </div>
      <p
        v-else-if="schoolStore.activeConnectionId && !schoolStore.syncing"
        class="text-xs text-neutral-400 dark:text-neutral-500"
      >
        {{ $t('school.notSyncedYet') }}
      </p>

      <!-- ─── Tabs ─────────────────────────────────────────── -->
      <div v-if="schoolStore.activeConnectionId && !showConnect">
        <!-- Tab bar -->
        <div
          class="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl mb-4"
        >
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            :class="
              activeTab === tab.id
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
            "
            @click="activeTab = tab.id"
          >
            <span>{{ tab.icon }}</span>
            <span class="hidden xs:inline sm:inline truncate">{{ tab.label }}</span>
            <span
              v-if="tab.badge"
              class="ml-0.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            >
              {{ tab.badge }}
            </span>
          </button>
        </div>

        <!-- Tab content -->
        <component :is="activeTabComponent" />
      </div>

      <!-- ─── Disconnect button ───────────────────────────── -->
      <div
        v-if="schoolStore.activeConnectionId && !showConnect && householdStore.isOwnerOrAdmin"
        class="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end"
      >
        <button
          type="button"
          class="text-xs text-red-500 hover:text-red-700 transition-colors"
          @click="handleDisconnect"
        >
          {{ $t('school.disconnectBtn') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSchoolStore } from '@/features/school/presentation/school.store';
import { useHouseholdStore } from '@/stores/household';
import { useMembers } from '@/composables/useMembers';
import SchoolConnect from '@/components/school/SchoolConnect.vue';

const GradesList = defineAsyncComponent(() => import('@/components/school/GradesList.vue'));
const TimetableView = defineAsyncComponent(() => import('@/components/school/TimetableView.vue'));
const HomeworkList = defineAsyncComponent(() => import('@/components/school/HomeworkList.vue'));
const AttendanceList = defineAsyncComponent(() => import('@/components/school/AttendanceList.vue'));
const SchoolMessages = defineAsyncComponent(() => import('@/components/school/SchoolMessages.vue'));
const SchoolAnnouncements = defineAsyncComponent(
  () => import('@/components/school/SchoolAnnouncements.vue'),
);

// ─── i18n ────────────────────────────────────────────────
const { t, locale } = useI18n();

// ─── Stores ─────────────────────────────────────────────────
const schoolStore = useSchoolStore();
const householdStore = useHouseholdStore();
const { members, fetchMembers } = useMembers();

// ─── State ──────────────────────────────────────────────────
const showConnect = ref(false);
const activeTab = ref<
  'timetable' | 'grades' | 'homework' | 'attendance' | 'messages' | 'announcements'
>('timetable');

// ─── Derived data ────────────────────────────────────────────
const householdId = computed(() => householdStore.currentHousehold?.id ?? '');

const householdMembers = computed(() =>
  (members.value ?? []).map((m) => ({ id: m.id, display_name: m.display_name })),
);

const tabs = computed(() => [
  { id: 'timetable' as const, icon: '📅', label: t('school.tabs.timetable') },
  { id: 'grades' as const, icon: '📊', label: t('school.tabs.grades') },
  {
    id: 'homework' as const,
    icon: '📝',
    label: t('school.tabs.homework'),
    badge: schoolStore.pendingHomework.length || undefined,
  },
  { id: 'attendance' as const, icon: '✅', label: t('school.tabs.attendance') },
  {
    id: 'messages' as const,
    icon: '✉️',
    label: t('school.tabs.messages'),
    badge:
      schoolStore.activeMessages.filter((m) => !m.is_read && m.direction === 'inbox').length ||
      undefined,
  },
  {
    id: 'announcements' as const,
    icon: '📢',
    label: t('school.tabs.announcements'),
    badge: schoolStore.activeAnnouncements.filter((a) => a.is_new).length || undefined,
  },
]);

const activeTabComponent = computed(() => {
  switch (activeTab.value) {
    case 'grades':
      return GradesList;
    case 'timetable':
      return TimetableView;
    case 'homework':
      return HomeworkList;
    case 'attendance':
      return AttendanceList;
    case 'messages':
      return SchoolMessages;
    case 'announcements':
      return SchoolAnnouncements;
    default:
      return null;
  }
});

// ─── Lifecycle ───────────────────────────────────────────────
onMounted(async () => {
  if (!householdId.value) return;
  await fetchMembers();
  await schoolStore.loadConnections(householdId.value);
  if (schoolStore.activeConnectionId) {
    await schoolStore.loadAllData(schoolStore.activeConnectionId);
  }
});

// ─── Handlers ────────────────────────────────────────────────
async function switchConnection(connId: string) {
  schoolStore.setActiveConnection(connId);
  await schoolStore.loadAllData(connId);
}

async function onConnected(connectionId: string) {
  showConnect.value = false;
  if (connectionId) {
    await switchConnection(connectionId);
  }
}

async function handleSync() {
  if (!schoolStore.activeConnectionId) return;
  await schoolStore.syncConnection(schoolStore.activeConnectionId);
}

async function handleDisconnect() {
  if (!schoolStore.activeConnectionId || !householdId.value) return;
  const confirm = window.confirm(t('school.disconnectConfirm'));
  if (!confirm) return;
  await schoolStore.disconnectSchool(schoolStore.activeConnectionId, householdId.value);
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
