<template>
  <div class="glass-card flex flex-col gap-4 p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-slate-500">Trip</p>
        <h3 class="text-lg font-semibold text-slate-900">{{ trip.name }}</h3>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold capitalize" :class="statusClass">
        {{ trip.status }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      <span>📅 {{ formattedDateRange }}</span>
      <span>🧳 Packing: {{ trip.packing_progress ?? '—' }}</span>
    </div>

    <div class="flex items-center gap-2 text-sm">
      <RouterLink :to="{ name: 'trip-detail', params: { id: trip.id } }" class="btn-ghost">
        View
      </RouterLink>
      <RouterLink :to="{ name: 'trip-edit', params: { id: trip.id } }" class="btn-ghost">
        Edit
      </RouterLink>
      <button
        class="btn-ghost"
        type="button"
        :disabled="Boolean(isDuplicating)"
        @click="emit('duplicate', trip.id)"
      >
        {{ isDuplicating ? 'Duplicating...' : 'Duplicate' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Trip } from '@/types/entities';

const { trip, isDuplicating } = defineProps<{ trip: Trip; isDuplicating?: boolean }>();
const emit = defineEmits<{ duplicate: [tripId: string] }>();

const statusClass = computed(() => {
  const base = 'border text-brand-900 bg-brand-50 border-brand-200';
  const statusMap: Record<Trip['status'], string> = {
    planning: base,
    booked: 'border text-emerald-900 bg-emerald-50 border-emerald-200',
    ready: 'border text-amber-900 bg-amber-50 border-amber-200',
    done: 'border text-slate-900 bg-slate-100 border-slate-200',
  };
  return statusMap[trip.status] || base;
});

const formattedDateRange = computed(() => {
  if (!trip.start_date || !trip.end_date) return 'Dates TBA';
  const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  return `${fmt.format(new Date(trip.start_date))} - ${fmt.format(new Date(trip.end_date))}`;
});
</script>
