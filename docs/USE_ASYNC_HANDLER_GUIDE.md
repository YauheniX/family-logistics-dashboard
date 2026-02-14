# useAsyncHandler Composable - Complete Guide

## Overview

`useAsyncHandler` is a Vue 3 composable that simplifies async operation handling by providing:

- ✅ Automatic loading state management
- ✅ Automatic error handling with toast notifications
- ✅ Optional success messages
- ✅ Type-safe execution
- ✅ Support for both `ApiResponse<T>` and raw promises

## Basic Usage

### Simple Example

```typescript
import { useAsyncHandler } from '@/composables/useAsyncHandler';

const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Data saved successfully!',
});

const handleSave = async () => {
  const result = await execute(() => saveData(payload));
  if (result) {
    // Success - result contains the data
    console.log('Saved:', result);
  }
  // Error is automatically handled and displayed in toast
};
```

### In a Vue Component

```vue
<template>
  <div>
    <button @click="handleCreate" :disabled="loading">
      {{ loading ? 'Creating...' : 'Create Trip' }}
    </button>
    <p v-if="error" class="text-red-600">{{ error.message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAsyncHandler } from '@/composables/useAsyncHandler';
import { createTrip } from '@/services/tripService';

const tripName = ref('');

const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Trip created successfully!',
  errorPrefix: 'Failed to create trip',
});

const handleCreate = async () => {
  const result = await execute(() =>
    createTrip({
      name: tripName.value,
      status: 'planning',
      created_by: userId.value,
    }),
  );

  if (result) {
    // Success - navigate or update UI
    router.push({ name: 'trip-detail', params: { id: result.id } });
  }
};
</script>
```

## API Reference

### Options

```typescript
interface UseAsyncHandlerOptions {
  successMessage?: string; // Show success toast with this message
  showErrorToast?: boolean; // Show error toast (default: true)
  errorPrefix?: string; // Prefix for error messages (default: "Error")
}
```

### Return Value

```typescript
interface UseAsyncHandlerReturn<T> {
  loading: Readonly<Ref<boolean>>; // Loading state (readonly)
  error: Readonly<Ref<ApiError | null>>; // Error object (readonly)
  execute: (fn: () => Promise<ApiResponse<T>>) => Promise<T | null>;
  executeRaw: (fn: () => Promise<T>) => Promise<T | null>;
}
```

## Methods

### `execute()`

Use for functions that return `ApiResponse<T>`:

```typescript
const { execute } = useAsyncHandler();

// Service function returns ApiResponse<Trip>
const trip = await execute(() => tripService.fetchTrip(id));
```

### `executeRaw()`

Use for legacy functions that throw errors:

```typescript
const { executeRaw } = useAsyncHandler();

// Legacy function that throws
const data = await executeRaw(() => legacyAsyncFunction());
```

## Configuration Examples

### With Success Message

```typescript
const { execute } = useAsyncHandler({
  successMessage: 'Trip deleted successfully!',
});

await execute(() => tripService.deleteTrip(id));
// Shows green toast on success
```

### Without Error Toast

```typescript
const { error, execute } = useAsyncHandler({
  showErrorToast: false, // Don't show toast
});

const result = await execute(() => loadData());
if (error.value) {
  // Handle error manually
  customErrorHandler(error.value);
}
```

### With Custom Error Prefix

```typescript
const { execute } = useAsyncHandler({
  errorPrefix: 'Upload failed',
});

await execute(() => uploadFile(file));
// Error toast: "Upload failed: Connection timeout"
```

### All Options

```typescript
const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Operation completed!',
  showErrorToast: true,
  errorPrefix: 'Operation failed',
});
```

## Advanced Usage

### Multiple Operations

```typescript
const createHandler = useAsyncHandler({
  successMessage: 'Trip created!',
});

const updateHandler = useAsyncHandler({
  successMessage: 'Trip updated!',
});

const deleteHandler = useAsyncHandler({
  successMessage: 'Trip deleted!',
  errorPrefix: 'Delete failed',
});

const handleCreate = () => createHandler.execute(() => createTrip(data));
const handleUpdate = () => updateHandler.execute(() => updateTrip(id, data));
const handleDelete = () => deleteHandler.execute(() => deleteTrip(id));
```

### Conditional Success Messages

```typescript
const { execute } = useAsyncHandler(); // No default message

const handleSave = async (isNew: boolean) => {
  const result = await execute(() => saveTrip(data));
  if (result) {
    // Show custom success message based on context
    const message = isNew ? 'Trip created!' : 'Changes saved!';
    useToastStore().success(message);
  }
};
```

### With Form Validation

```typescript
const { loading, execute } = useAsyncHandler({
  successMessage: 'Form submitted!',
});

const handleSubmit = async () => {
  // Client-side validation first
  if (!validateForm()) {
    useToastStore().error('Please fill all required fields');
    return;
  }

  // Then execute async operation
  const result = await execute(() => submitForm(formData));
  if (result) {
    resetForm();
  }
};
```

### Sequential Operations

```typescript
const { loading, execute } = useAsyncHandler();

const handleComplexOperation = async () => {
  // Step 1
  const trip = await execute(() => createTrip(tripData));
  if (!trip) return; // Error handled automatically

  // Step 2
  const member = await execute(() => addMember(trip.id, memberData));
  if (!member) return;

  // Step 3
  await execute(() => sendNotification(trip.id));

  useToastStore().success('All done!');
};
```

## Real-World Examples

### File Upload

```vue
<script setup lang="ts">
const { loading, execute } = useAsyncHandler({
  successMessage: 'File uploaded successfully!',
  errorPrefix: 'Upload failed',
});

const selectedFile = ref<File | null>(null);

const handleUpload = async () => {
  if (!selectedFile.value) {
    useToastStore().warning('Please select a file');
    return;
  }

  const url = await execute(() => uploadDocument(selectedFile.value!, userId.value));

  if (url) {
    selectedFile.value = null;
    // Maybe add to documents list
  }
};
</script>

<template>
  <div>
    <input type="file" @change="(e) => (selectedFile = e.target.files[0])" />
    <button @click="handleUpload" :disabled="loading">
      {{ loading ? 'Uploading...' : 'Upload' }}
    </button>
  </div>
</template>
```

### Data Fetching

```vue
<script setup lang="ts">
const { loading, error, execute } = useAsyncHandler({
  showErrorToast: true,
});

const trips = ref<Trip[]>([]);

onMounted(async () => {
  const result = await execute(() => fetchTrips(userId.value));
  if (result) {
    trips.value = result;
  }
});
</script>

<template>
  <div>
    <LoadingSpinner v-if="loading" />
    <ErrorMessage v-else-if="error" :error="error" />
    <TripList v-else :trips="trips" />
  </div>
</template>
```

### Form Submission

```vue
<script setup lang="ts">
const { loading, execute } = useAsyncHandler({
  successMessage: 'Trip created successfully!',
});

const formData = ref({
  name: '',
  startDate: '',
  endDate: '',
});

const handleSubmit = async () => {
  const result = await execute(() =>
    createTrip({
      name: formData.value.name,
      start_date: formData.value.startDate,
      end_date: formData.value.endDate,
      status: 'planning',
      created_by: userId.value,
    }),
  );

  if (result) {
    // Navigate to new trip
    router.push({ name: 'trip-detail', params: { id: result.id } });
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="formData.name" placeholder="Trip name" />
    <input v-model="formData.startDate" type="date" />
    <input v-model="formData.endDate" type="date" />
    <button type="submit" :disabled="loading">
      {{ loading ? 'Creating...' : 'Create Trip' }}
    </button>
  </form>
</template>
```

## Best Practices

### ✅ DO

- Use `execute()` for `ApiResponse<T>` functions
- Use `executeRaw()` only for legacy code
- Show loading states in UI
- Keep success messages short and clear
- Use descriptive error prefixes

### ❌ DON'T

- Don't mutate `loading` or `error` directly (they're readonly)
- Don't forget to handle the null case when result fails
- Don't use for synchronous operations
- Don't create multiple handlers unnecessarily

## Type Safety

The composable is fully typed:

```typescript
// TypeScript infers the return type
const { execute } = useAsyncHandler<Trip>();

const trip: Trip | null = await execute(() => fetchTrip(id));
//    ^-- Type is Trip | null

if (trip) {
  // trip is Trip here (not null)
  console.log(trip.name);
}
```

## Testing

```typescript
import { useAsyncHandler } from '@/composables/useAsyncHandler';

describe('useAsyncHandler', () => {
  it('handles success', async () => {
    const { loading, execute } = useAsyncHandler({
      successMessage: 'Success!',
    });

    const result = await execute(() => Promise.resolve({ data: 'test', error: null }));

    expect(result).toBe('test');
    expect(loading.value).toBe(false);
  });

  it('handles errors', async () => {
    const { error, execute } = useAsyncHandler();

    const result = await execute(() =>
      Promise.resolve({ data: null, error: { message: 'Failed' } }),
    );

    expect(result).toBeNull();
    expect(error.value?.message).toBe('Failed');
  });
});
```

## Performance

- **Lightweight**: ~3KB uncompressed
- **No Memory Leaks**: Properly cleans up state
- **Reactive**: Uses Vue's reactivity system efficiently
- **Type-Safe**: Full TypeScript support with inference

## Migration from Manual Handling

### Before (Manual)

```typescript
const loading = ref(false);
const error = ref<string | null>(null);

const handleSave = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await saveData(payload);
    if (response.error) {
      error.value = response.error.message;
      useToastStore().error(error.value);
      return;
    }
    useToastStore().success('Saved!');
    // use response.data
  } catch (e) {
    error.value = 'Failed to save';
    useToastStore().error(error.value);
  } finally {
    loading.value = false;
  }
};
```

### After (with useAsyncHandler)

```typescript
const { loading, execute } = useAsyncHandler({
  successMessage: 'Saved!',
});

const handleSave = async () => {
  const result = await execute(() => saveData(payload));
  // use result if not null
};
```

**Result**: 18 lines → 5 lines (72% reduction)
