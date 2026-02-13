<template>
  <div v-if="tripStore.currentTrip" class="space-y-6">
    <div class="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <p class="text-sm text-slate-500">Trip</p>
        <h2 class="text-2xl font-semibold text-slate-900">{{ tripStore.currentTrip.name }}</h2>
        <p class="text-sm text-slate-600">{{ dateRange }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          :to="{ name: 'trip-edit', params: { id: tripStore.currentTrip.id } }"
          class="btn-ghost"
        >
          Edit
        </RouterLink>
        <button class="btn-ghost" type="button" @click="handleDuplicate">Duplicate</button>
        <button class="btn-ghost" type="button" @click="handleDelete">Delete</button>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <div class="space-y-4">
        <div class="glass-card p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">Packing</h3>
            <span class="text-sm text-slate-600">Toggle items as you pack</span>
          </div>
          <div class="mt-3 space-y-2">
            <div v-for="item in tripStore.packing" :key="item.id" class="flex items-center gap-3">
              <input
                :id="item.id"
                v-model="item.is_packed"
                type="checkbox"
                class="h-4 w-4"
                @change="() => tripStore.togglePacked(item.id, item.is_packed)"
              />
              <label :for="item.id" class="flex-1 text-sm text-slate-800">
                {{ item.title }}
                <span class="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {{ item.category }}
                </span>
              </label>
            </div>
            <p v-if="!tripStore.packing.length" class="text-sm text-slate-500">No items yet.</p>
          </div>

          <form class="mt-4 grid gap-2 md:grid-cols-3" @submit.prevent="addPackingItem">
            <input v-model="newPackingTitle" class="input md:col-span-2" placeholder="Add packing item" />
            <select v-model="newPackingCategory" class="input">
              <option value="adult">Adult</option>
              <option value="kid">Kid</option>
              <option value="baby">Baby</option>
              <option value="roadtrip">Roadtrip</option>
              <option value="custom">Custom</option>
            </select>
            <button class="btn-primary md:col-span-3" type="submit">Add item</button>
          </form>
        </div>

        <div class="glass-card p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">Documents</h3>
            <span class="text-sm text-slate-600">Upload files to Supabase Storage</span>
          </div>
          <ul class="mt-3 space-y-2">
            <li v-for="doc in tripStore.documents" :key="doc.id" class="flex items-center justify-between text-sm">
              <div>
                <p class="font-medium text-slate-800">{{ doc.title }}</p>
                <p class="text-xs text-slate-500">{{ doc.description }}</p>
              </div>
              <a :href="doc.file_url" target="_blank" rel="noreferrer" class="text-brand-600">View</a>
            </li>
            <p v-if="!tripStore.documents.length" class="text-sm text-slate-500">No documents yet.</p>
          </ul>

          <form class="mt-4 space-y-2" @submit.prevent="uploadDoc">
            <input v-model="documentTitle" class="input" placeholder="Document title" />
            <input v-model="documentDescription" class="input" placeholder="Description" />
            <input type="file" class="input" @change="onFileChange" />
            <button class="btn-primary" type="submit" :disabled="!selectedFile">Upload</button>
          </form>
        </div>
      </div>

      <div class="space-y-4">
        <div class="glass-card p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">Budget</h3>
            <span class="text-sm text-slate-600">Track trip spend</span>
          </div>
          <ul class="mt-3 space-y-2">
            <li v-for="entry in tripStore.budget" :key="entry.id" class="flex items-center justify-between text-sm">
              <div>
                <p class="font-medium text-slate-800">{{ entry.category }}</p>
                <p class="text-xs text-slate-500">{{ entry.created_at?.slice(0, 10) }}</p>
              </div>
              <span class="font-semibold text-slate-900">
                {{ entry.amount.toFixed(2) }} {{ entry.currency }}
              </span>
            </li>
            <p v-if="!tripStore.budget.length" class="text-sm text-slate-500">No entries yet.</p>
          </ul>

          <form class="mt-4 grid gap-2 md:grid-cols-3" @submit.prevent="addBudget">
            <input v-model="budgetCategory" class="input" placeholder="Category" />
            <input v-model.number="budgetAmount" type="number" min="0" step="0.01" class="input" placeholder="Amount" />
            <input v-model="budgetCurrency" class="input" placeholder="Currency" />
            <button class="btn-primary md:col-span-3" type="submit">Add entry</button>
          </form>
        </div>

        <div class="glass-card p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">Timeline</h3>
            <span class="text-sm text-slate-600">Important moments</span>
          </div>
          <ul class="mt-3 space-y-2">
            <li v-for="event in tripStore.timeline" :key="event.id" class="flex items-center justify-between text-sm">
              <div>
                <p class="font-medium text-slate-800">{{ event.title }}</p>
                <p class="text-xs text-slate-500">{{ formatDateTime(event.date_time) }}</p>
              </div>
              <p class="text-xs text-slate-600">{{ event.notes }}</p>
            </li>
            <p v-if="!tripStore.timeline.length" class="text-sm text-slate-500">No events yet.</p>
          </ul>

          <form class="mt-4 space-y-2" @submit.prevent="addTimeline">
            <input v-model="timelineTitle" class="input" placeholder="Event title" />
            <input v-model="timelineDateTime" type="datetime-local" class="input" />
            <input v-model="timelineNotes" class="input" placeholder="Notes" />
            <button class="btn-primary" type="submit">Add event</button>
          </form>
        </div>
      </div>
    </div>
  </div>
  <LoadingState v-else message="Loading trip..." />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useTripStore } from '@/stores/trips';
import { useAuthStore } from '@/stores/auth';
import { uploadDocument } from '@/services/storageService';
import LoadingState from '@/components/shared/LoadingState.vue';

const route = useRoute();
const router = useRouter();
const tripStore = useTripStore();
const authStore = useAuthStore();

const newPackingTitle = ref('');
const newPackingCategory = ref('adult');
const documentTitle = ref('');
const documentDescription = ref('');
const selectedFile = ref<File | null>(null);
const budgetCategory = ref('');
const budgetAmount = ref<number | null>(null);
const budgetCurrency = ref('USD');
const timelineTitle = ref('');
const timelineDateTime = ref('');
const timelineNotes = ref('');

const tripId = computed(() => route.params.id as string);
const dateRange = computed(() => {
  const trip = tripStore.currentTrip;
  if (!trip?.start_date || !trip.end_date) return 'Dates TBA';
  const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
  return `${fmt.format(new Date(trip.start_date))} - ${fmt.format(new Date(trip.end_date))}`;
});

onMounted(async () => {
  if (tripId.value) {
    await tripStore.loadTrip(tripId.value);
  }
});

const addPackingItem = async () => {
  if (!tripId.value || !newPackingTitle.value.trim()) return;
  await tripStore.savePackingItem({
    trip_id: tripId.value,
    title: newPackingTitle.value,
    category: newPackingCategory.value as any,
    is_packed: false,
  });
  newPackingTitle.value = '';
};

const onFileChange = (event: Event) => {
  const files = (event.target as HTMLInputElement).files;
  selectedFile.value = files?.[0] ?? null;
};

const uploadDoc = async () => {
  if (!selectedFile.value || !tripId.value || !authStore.user) return;
  const url = await uploadDocument(selectedFile.value, authStore.user.id);
  await tripStore.addDocument({
    trip_id: tripId.value,
    title: documentTitle.value || selectedFile.value.name,
    description: documentDescription.value,
    file_url: url,
  });
  documentTitle.value = '';
  documentDescription.value = '';
  selectedFile.value = null;
};

const addBudget = async () => {
  if (!tripId.value || budgetAmount.value === null) return;
  await tripStore.addBudgetEntry({
    trip_id: tripId.value,
    category: budgetCategory.value || 'General',
    amount: Number(budgetAmount.value),
    currency: budgetCurrency.value || 'USD',
  });
  budgetCategory.value = '';
  budgetAmount.value = null;
};

const addTimeline = async () => {
  if (!tripId.value || !timelineTitle.value) return;
  await tripStore.addTimelineEvent({
    trip_id: tripId.value,
    title: timelineTitle.value,
    date_time: timelineDateTime.value || new Date().toISOString(),
    notes: timelineNotes.value,
  });
  timelineTitle.value = '';
  timelineDateTime.value = '';
  timelineNotes.value = '';
};

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const handleDuplicate = async () => {
  if (tripId.value) {
    await tripStore.duplicateTrip(tripId.value);
    router.push({ name: 'dashboard' });
  }
};

const handleDelete = async () => {
  if (tripId.value) {
    await tripStore.removeTrip(tripId.value);
    router.push({ name: 'dashboard' });
  }
};
</script>
