<template>
  <div class="glass-card p-5">
    <h3 class="text-lg font-semibold text-slate-900">Budget Overview</h3>

    <div v-if="!categories.length" class="mt-3 text-sm text-slate-500">No budget data yet.</div>

    <template v-else>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div class="flex items-center justify-center">
          <div class="h-48 w-48">
            <Doughnut :data="chartData" :options="chartOptions" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-600">Planned</span>
            <span class="font-semibold text-slate-900">{{ planned.toFixed(2) }} {{ currency }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-slate-600">Spent</span>
            <span class="font-semibold text-slate-900">{{ spent.toFixed(2) }} {{ currency }}</span>
          </div>
          <div class="my-2 border-t border-slate-200" />
          <div
            v-for="cat in categories"
            :key="cat.category"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-slate-600">{{ cat.category }}</span>
            <span class="font-semibold text-slate-900">{{ cat.spent.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { CategoryTotal } from '@/types/entities';

ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  categories: CategoryTotal[];
  planned: number;
  spent: number;
  currency: string;
}>();

const COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#4f46e5', '#7c3aed', '#5b21b6',
];

const chartData = computed(() => ({
  labels: props.categories.map((c) => c.category),
  datasets: [
    {
      data: props.categories.map((c) => c.spent),
      backgroundColor: props.categories.map((_, i) => COLORS[i % COLORS.length]),
      borderWidth: 0,
    },
  ],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: { label: string; parsed: number }) =>
          `${ctx.label}: ${ctx.parsed.toFixed(2)}`,
      },
    },
  },
};
</script>
