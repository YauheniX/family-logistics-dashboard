<template>
  <div class="max-w-3xl space-y-6">
    <div class="glass-card p-6">
      <p class="text-sm text-slate-500">Trip</p>
      <h2 class="text-2xl font-semibold text-slate-900">
        {{ isEdit ? 'Edit trip' : 'Create a new trip' }}
      </h2>
    </div>

    <form class="glass-card space-y-4 p-6" @submit.prevent="handleSubmit">
      <div>
        <label class="label" for="name">Trip name</label>
        <input
          id="name"
          v-model="form.name"
          class="input"
          required
          placeholder="Spain family adventure"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <label class="label" for="start">Start date</label>
          <input id="start" v-model="form.start_date" type="date" class="input" />
        </div>
        <div>
          <label class="label" for="end">End date</label>
          <input id="end" v-model="form.end_date" type="date" class="input" />
        </div>
      </div>

      <div>
        <label class="label" for="status">Status</label>
        <select id="status" v-model="form.status" class="input">
          <option value="planning">Planning</option>
          <option value="booked">Booked</option>
          <option value="ready">Ready</option>
          <option value="done">Done</option>
        </select>
      </div>

      <div class="flex gap-3">
        <button class="btn-primary" type="submit" :disabled="tripStore.loading">
          {{ isEdit ? 'Update trip' : 'Create trip' }}
        </button>
        <button class="btn-ghost" type="button" @click="router.back()">Cancel</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trips';
import type { TripStatus } from '@/types/entities';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const tripStore = useTripStore();

const tripId = computed(() => (route.params.id as string | undefined) ?? undefined);
const isEdit = computed(() => Boolean(tripId.value));

const form = reactive({
  name: '',
  start_date: '',
  end_date: '',
  status: 'planning' as TripStatus,
});

watch(
  () => tripStore.currentTrip,
  (trip) => {
    if (trip) {
      form.name = trip.name;
      form.start_date = trip.start_date ?? '';
      form.end_date = trip.end_date ?? '';
      form.status = trip.status;
    }
  },
);

onMounted(async () => {
  if (isEdit.value && tripId.value) {
    await tripStore.loadTrip(tripId.value);
  }
});

const handleSubmit = async () => {
  if (!authStore.user) return;
  const payload = {
    name: form.name,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    status: form.status,
    created_by: authStore.user.id,
  };

  if (isEdit.value && tripId.value) {
    const updated = await tripStore.updateTrip(tripId.value, payload);
    if (updated) router.push({ name: 'trip-detail', params: { id: updated.id } });
  } else {
    const created = await tripStore.createTrip(payload);
    if (created) router.push({ name: 'trip-detail', params: { id: created.id } });
  }
};
</script>
