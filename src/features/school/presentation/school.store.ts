import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { schoolService } from '../domain/school.service';
import type {
  SchoolConnection,
  SchoolGrade,
  SchoolLesson,
  SchoolHomework,
  SchoolAttendance,
  SchoolMessage,
  SchoolAnnouncement,
  ConnectSchoolDto,
  SyncResult,
} from '../domain/school.entities';

export const useSchoolStore = defineStore('school', () => {
  // ─── State ────────────────────────────────────────────────
  const connections = ref<SchoolConnection[]>([]);
  const activeConnectionId = ref<string | null>(null);

  // Per-connection caches (keyed by connection_id)
  const grades = ref<Record<string, SchoolGrade[]>>({});
  const timetable = ref<Record<string, SchoolLesson[]>>({});
  const homework = ref<Record<string, SchoolHomework[]>>({});
  const attendance = ref<Record<string, SchoolAttendance[]>>({});
  const messages = ref<Record<string, SchoolMessage[]>>({});
  const announcements = ref<Record<string, SchoolAnnouncement[]>>({});

  const loading = ref(false);
  const syncing = ref(false);
  const connecting = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters ──────────────────────────────────────────────

  const activeConnection = computed(
    () => connections.value.find((c) => c.id === activeConnectionId.value) ?? null,
  );

  const activeGrades = computed(() =>
    activeConnectionId.value ? (grades.value[activeConnectionId.value] ?? []) : [],
  );

  const activeTimetable = computed(() =>
    activeConnectionId.value ? (timetable.value[activeConnectionId.value] ?? []) : [],
  );

  const activeHomework = computed(() =>
    activeConnectionId.value ? (homework.value[activeConnectionId.value] ?? []) : [],
  );

  const activeAttendance = computed(() =>
    activeConnectionId.value ? (attendance.value[activeConnectionId.value] ?? []) : [],
  );

  const activeMessages = computed(() =>
    activeConnectionId.value ? (messages.value[activeConnectionId.value] ?? []) : [],
  );

  const activeAnnouncements = computed(() =>
    activeConnectionId.value ? (announcements.value[activeConnectionId.value] ?? []) : [],
  );

  const pendingHomework = computed(() => schoolService.getPendingHomework(activeHomework.value));

  const gradesBySubject = computed(() => schoolService.groupGradesBySubject(activeGrades.value));

  const lessonsByDate = computed(() => schoolService.groupLessonsByDate(activeTimetable.value));

  // ─── Reset ────────────────────────────────────────────────

  function $reset() {
    connections.value = [];
    activeConnectionId.value = null;
    grades.value = {};
    timetable.value = {};
    homework.value = {};
    attendance.value = {};
    messages.value = {};
    announcements.value = {};
    loading.value = false;
    syncing.value = false;
    connecting.value = false;
    error.value = null;
  }

  function setActiveConnection(id: string | null) {
    activeConnectionId.value = id;
  }

  // ─── Connection Actions ───────────────────────────────────

  async function loadConnections(householdId: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await schoolService.getConnections(householdId);
      if (response.error) {
        error.value = response.error.message;
      } else {
        connections.value = response.data ?? [];
        // Auto-select first active connection if none selected
        if (!activeConnectionId.value && connections.value.length > 0) {
          activeConnectionId.value = connections.value[0].id;
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function connectSchool(dto: ConnectSchoolDto): Promise<boolean> {
    connecting.value = true;
    error.value = null;
    try {
      const response = await schoolService.connectSchool(dto);
      if (response.error) {
        error.value = response.error.message;
        useToastStore().error(`Connection failed: ${response.error.message}`);
        return false;
      }

      // Reload connections to get the full row
      await loadConnections(dto.household_id);
      useToastStore().success('School account connected!');
      return true;
    } finally {
      connecting.value = false;
    }
  }

  async function disconnectSchool(connectionId: string, householdId: string): Promise<boolean> {
    loading.value = true;
    try {
      const response = await schoolService.disconnectSchool(connectionId);
      if (response.error) {
        useToastStore().error(`Disconnect failed: ${response.error.message}`);
        return false;
      }

      // Update local state
      connections.value = connections.value.filter((c) => c.id !== connectionId);
      if (activeConnectionId.value === connectionId) {
        activeConnectionId.value = connections.value[0]?.id ?? null;
      }
      // Clean up caches
      delete grades.value[connectionId];
      delete timetable.value[connectionId];
      delete homework.value[connectionId];
      delete attendance.value[connectionId];
      delete messages.value[connectionId];
      delete announcements.value[connectionId];

      useToastStore().success('School account disconnected.');
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ─── Sync Action ──────────────────────────────────────────

  async function syncConnection(connectionId: string): Promise<SyncResult | null> {
    syncing.value = true;
    error.value = null;
    try {
      const response = await schoolService.sync(connectionId);
      if (response.error) {
        useToastStore().error(`Sync failed: ${response.error.message}`);
        return null;
      }

      useToastStore().success('School data synced successfully!');

      // Reload cached data for this connection
      await Promise.allSettled([
        loadGrades(connectionId),
        loadTimetable(connectionId),
        loadHomework(connectionId),
        loadAttendance(connectionId),
        loadMessages(connectionId),
        loadAnnouncements(connectionId),
      ]);

      return response.data;
    } finally {
      syncing.value = false;
    }
  }

  // ─── Data Load Actions ────────────────────────────────────

  async function loadGrades(connectionId: string) {
    const response = await schoolService.getGrades(connectionId);
    if (!response.error && response.data) {
      grades.value = { ...grades.value, [connectionId]: response.data };
    }
  }

  async function loadTimetable(connectionId: string) {
    const response = await schoolService.getWeekTimetable(connectionId);
    if (!response.error && response.data) {
      timetable.value = { ...timetable.value, [connectionId]: response.data };
    }
  }

  async function loadHomework(connectionId: string) {
    const response = await schoolService.getHomework(connectionId);
    if (!response.error && response.data) {
      homework.value = { ...homework.value, [connectionId]: response.data };
    }
  }

  async function loadAttendance(connectionId: string) {
    const response = await schoolService.getAttendance(connectionId);
    if (!response.error && response.data) {
      attendance.value = { ...attendance.value, [connectionId]: response.data };
    }
  }

  async function loadMessages(connectionId: string) {
    const response = await schoolService.getMessages(connectionId, 'inbox');
    if (!response.error && response.data) {
      messages.value = { ...messages.value, [connectionId]: response.data };
    }
  }

  async function loadAnnouncements(connectionId: string) {
    const response = await schoolService.getAnnouncements(connectionId);
    if (!response.error && response.data) {
      announcements.value = { ...announcements.value, [connectionId]: response.data };
    }
  }

  async function loadAllData(connectionId: string) {
    await Promise.allSettled([
      loadGrades(connectionId),
      loadTimetable(connectionId),
      loadHomework(connectionId),
      loadAttendance(connectionId),
      loadMessages(connectionId),
      loadAnnouncements(connectionId),
    ]);
  }

  async function toggleHomeworkDone(homeworkId: string, connectionId: string, isDone: boolean) {
    const response = await schoolService.markHomeworkDone(homeworkId, isDone);
    if (!response.error && response.data) {
      const list = homework.value[connectionId] ?? [];
      homework.value = {
        ...homework.value,
        [connectionId]: list.map((h) => (h.id === homeworkId ? response.data! : h)),
      };
    }
  }

  return {
    // State
    connections,
    activeConnectionId,
    grades,
    timetable,
    homework,
    attendance,
    messages,
    announcements,
    loading,
    syncing,
    connecting,
    error,
    // Getters
    activeConnection,
    activeGrades,
    activeTimetable,
    activeHomework,
    activeAttendance,
    activeMessages,
    activeAnnouncements,
    pendingHomework,
    gradesBySubject,
    lessonsByDate,
    // Actions
    $reset,
    setActiveConnection,
    loadConnections,
    connectSchool,
    disconnectSchool,
    syncConnection,
    loadAllData,
    loadGrades,
    loadTimetable,
    loadHomework,
    loadAttendance,
    loadMessages,
    loadAnnouncements,
    toggleHomeworkDone,
  };
});
