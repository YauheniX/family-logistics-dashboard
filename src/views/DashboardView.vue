<template>
  <div class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Your trips</p>
        <h2 class="text-2xl font-semibold text-slate-900">Plan, pack, and go</h2>
        <p class="mt-1 text-sm text-slate-600">
          Manage itineraries, packing lists, documents, budgets, and timelines in one place.
        </p>
      </div>
      <RouterLink to="/trips/new" class="btn-primary">➕ New Trip</RouterLink>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Trips</p>
        <p class="text-2xl font-bold text-slate-900">{{ tripStore.trips.length }}</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Budget total</p>
        <p class="text-2xl font-bold text-slate-900">{{ budgetTotal }} {{ currencyHint }}</p>
      </div>
      <div class="glass-card p-4">
        <p class="text-sm text-slate-500">Packing items</p>
        <p class="text-2xl font-bold text-slate-900">{{ packingCount }}</p>
      </div>
    </div>

    <LoadingState v-if="tripStore.loading" message="Loading your trips..." />

    <div v-else-if="tripStore.trips.length" class="page-grid">
      <TripCard v-for="trip in tripStore.trips" :key="trip.id" :trip="trip" />
    </div>

    <EmptyState
      v-else
      title="No trips yet"
      description="Create your first trip to start tracking packing, documents, budgets, and timeline."
      cta="Create a trip"
      @action="() => router.push('/trips/new')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import TripCard from '@/components/trips/TripCard.vue';
import EmptyState from '@/components/shared/EmptyState.vue';
import LoadingState from '@/components/shared/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trips';

const authStore = useAuthStore();
const tripStore = useTripStore();
const router = useRouter();

const budgetTotal = computed(() => tripStore.totalBudget.toFixed(2));
const currencyHint = computed(() => (tripStore.budget[0]?.currency ? tripStore.budget[0].currency : '')); // simple hint
const packingCount = computed(() => tripStore.packing.length);

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) tripStore.loadTrips(userId);
  },
  { immediate: true },
);

onMounted(() => {
  if (authStore.user?.id) {
    tripStore.loadTrips(authStore.user.id);
  }
});
</script>
