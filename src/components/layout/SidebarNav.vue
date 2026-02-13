<template>
  <aside
    class="hidden w-72 shrink-0 border-r border-slate-200 bg-white/90 px-5 py-6 backdrop-blur lg:block"
  >
    <div class="mb-8 flex items-center justify-between">
      <div>
        <p class="text-xs uppercase tracking-wide text-brand-500">Family</p>
        <h2 class="text-lg font-bold text-slate-900">Logistics</h2>
      </div>
      <span class="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
        Private
      </span>
    </div>

    <div class="mb-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
      <p class="font-semibold text-slate-900">Welcome</p>
      <p class="mt-1 break-words text-slate-600">{{ userEmail || 'Authenticated user' }}</p>
    </div>

    <nav class="space-y-1 text-sm font-medium text-slate-700">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
        :class="
          route.name === item.name
            ? 'bg-brand-50 text-brand-700 border border-brand-100'
            : 'hover:bg-slate-100'
        "
      >
        <span class="text-lg">{{ item.emoji }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router';

const props = defineProps<{
  userEmail?: string | null;
}>();

const route = useRoute();

const items = [
  { name: 'dashboard', label: 'Dashboard', to: '/', emoji: '📌' },
  { name: 'trip-new', label: 'New Trip', to: '/trips/new', emoji: '🧭' },
];

const userEmail = props.userEmail;
</script>
