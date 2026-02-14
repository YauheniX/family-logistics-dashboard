# 🔧 Developer Guides

Technical guides for developers working on the Family Logistics Dashboard.

---

## Overview

This section contains detailed technical guides for common development patterns and utilities used in the codebase.

---

## Error Handling

### Centralized Error Handling System

The application uses a clean, type-safe error handling architecture that eliminates duplicated error logic.

#### Core Types

**ApiResponse Type** (`src/features/shared/domain/entities.ts`):

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
```

**Benefits:**
- ✅ Type-safe responses with compile-time checks
- ✅ Consistent error format across the app
- ✅ Prevents runtime errors from unexpected data structures

#### Supabase Service Wrapper

**Location:** `src/services/supabaseService.ts`

A centralized wrapper around Supabase operations that:
- Converts all Supabase errors to `ApiError` format
- Provides consistent method signatures
- Eliminates try/catch boilerplate

**Key Methods:**
- `select<T>()` - Fetch multiple records
- `selectSingle<T>()` - Fetch one record
- `insert<T>()` - Create a record
- `update<T>()` - Update a record
- `delete()` - Delete a record
- `execute<T>()` - Custom operations

**Example Usage:**

```typescript
// Old way (throws errors)
try {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('created_by', userId);
  
  if (error) throw error;
  return data;
} catch (err) {
  console.error('Failed to load trips:', err);
  showErrorToast('Failed to load trips');
}

// New way (returns ApiResponse)
const response = await supabaseService.select('trips', (builder) =>
  builder.eq('created_by', userId)
);

if (response.error) {
  showErrorToast(response.error.message);
  return;
}

const trips = response.data; // Type-safe!
```

#### Error Handling in Repositories

```typescript
// Repository example
export class TripRepository extends BaseRepository<Trip> {
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    return this.findAll((builder) => builder.eq('created_by', userId));
  }
}

// Usage in component/store
const response = await tripRepository.findByUserId(userId);
if (response.error) {
  useToastStore().error(response.error.message);
  return;
}

trips.value = response.data;
```

#### Error Handling in Services

```typescript
export class TripService {
  async duplicateTrip(tripId: string): Promise<ApiResponse<Trip>> {
    // Get original trip
    const tripResponse = await tripRepository.findById(tripId);
    if (tripResponse.error) return tripResponse;

    // Duplicate trip
    const duplicateResponse = await tripRepository.duplicate(tripResponse.data!);
    if (duplicateResponse.error) return duplicateResponse;

    // Copy related data
    await this.copyRelatedData(tripId, duplicateResponse.data!.id);

    return duplicateResponse;
  }
}
```

#### Best Practices

1. **Always return ApiResponse<T>**
   ```typescript
   // ✅ Good
   async function getTrip(id: string): Promise<ApiResponse<Trip>>

   // ❌ Bad
   async function getTrip(id: string): Promise<Trip | null>
   ```

2. **Check for errors before using data**
   ```typescript
   const response = await tripRepository.findById(id);
   if (response.error) {
     // Handle error
     return;
   }
   // Safe to use response.data
   ```

3. **Propagate errors up the call stack**
   ```typescript
   async function complexOperation() {
     const result = await someRepository.method();
     if (result.error) return result; // Propagate error
     // Continue with success case
   }
   ```

---

## Toast Notifications

### Toast Notification System

The application uses a centralized toast notification system via Pinia store.

#### Usage

**Import:**
```typescript
import { useToastStore } from '@/stores/toastStore';
```

#### Toast Types

**1. Success Toast (Green)**
```typescript
useToastStore().success('Trip created successfully!');
```
- Color: Green background with green border
- Icon: ✓ (checkmark)
- Default Duration: 3 seconds
- Use Cases: Successful operations (create, update, delete)

**2. Error Toast (Red)**
```typescript
useToastStore().error('Failed to load trips: Connection timeout');
```
- Color: Red background with red border
- Icon: ✕ (cross)
- Default Duration: 5 seconds
- Use Cases: Failed operations, validation errors

**3. Warning Toast (Yellow)**
```typescript
useToastStore().warning('Some items were skipped');
```
- Color: Yellow/amber background with amber border
- Icon: ⚠ (warning symbol)
- Default Duration: 4 seconds
- Use Cases: Partial success, warnings, deprecation notices

**4. Info Toast (Blue)**
```typescript
useToastStore().info('Loading trip data...');
```
- Color: Blue background with blue border
- Icon: ℹ (information symbol)
- Default Duration: 3 seconds
- Use Cases: Informational messages, status updates

#### Component Example

```vue
<script setup>
import { useToastStore } from '@/stores/toastStore';

const toastStore = useToastStore();

async function saveTrip() {
  const response = await tripRepository.create(tripData);
  
  if (response.error) {
    toastStore.error(`Failed to save trip: ${response.error.message}`);
    return;
  }
  
  toastStore.success('Trip saved successfully!');
  router.push({ name: 'trips' });
}
</script>
```

#### Custom Duration

```typescript
// Show toast for 10 seconds
useToastStore().success('Important message!', 10000);
```

#### Manual Dismissal

```typescript
// Get toast ID
const toastId = useToastStore().info('Processing...');

// Dismiss manually later
useToastStore().dismiss(toastId);
```

---

## Async Handler Composable

### useAsyncHandler

A Vue 3 composable that simplifies async operation handling.

#### Features

- ✅ Automatic loading state management
- ✅ Automatic error handling with toast notifications
- ✅ Optional success messages
- ✅ Type-safe execution
- ✅ Support for both `ApiResponse<T>` and raw promises

#### Basic Usage

```typescript
import { useAsyncHandler } from '@/composables/useAsyncHandler';

const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Data saved successfully!',
});

const handleSave = async () => {
  const result = await execute(() => saveData(payload));
  if (result) {
    console.log('Saved:', result);
  }
};
```

#### In a Vue Component

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
import { tripRepository } from '@/features/trips';

const tripName = ref('');

const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Trip created successfully!',
  errorPrefix: 'Failed to create trip',
});

const handleCreate = async () => {
  const result = await execute(() =>
    tripRepository.create({
      name: tripName.value,
      status: 'planning',
      createdBy: userId.value,
    }),
  );

  if (result) {
    router.push({ name: 'trip-detail', params: { id: result.id } });
  }
};
</script>
```

#### API Reference

**Options:**
```typescript
interface UseAsyncHandlerOptions {
  successMessage?: string;      // Toast message on success
  errorPrefix?: string;         // Prefix for error messages
  showErrorToast?: boolean;     // Show error toast (default: true)
  showSuccessToast?: boolean;   // Show success toast (default: true)
}
```

**Returns:**
```typescript
{
  loading: Ref<boolean>;        // Loading state
  error: Ref<ApiError | null>;  // Error state
  execute: <T>(fn: () => Promise<ApiResponse<T> | T>) => Promise<T | null>;
}
```

#### Advanced Usage

**With Custom Error Handling:**
```typescript
const { loading, error, execute } = useAsyncHandler({
  showErrorToast: false, // Don't show automatic toast
});

const handleDelete = async () => {
  const result = await execute(() => tripRepository.delete(tripId));
  
  if (error.value) {
    // Custom error handling
    if (error.value.code === 'FOREIGN_KEY_VIOLATION') {
      showCustomDialog('Cannot delete trip with existing data');
    } else {
      showErrorToast(error.value.message);
    }
  }
};
```

**Multiple Operations:**
```typescript
const { loading, execute } = useAsyncHandler();

async function saveAll() {
  const tripResult = await execute(() => tripRepository.create(tripData));
  if (!tripResult) return;

  const packingResult = await execute(() => 
    packingRepository.create({ tripId: tripResult.id, ...packingData })
  );
  
  if (packingResult) {
    useToastStore().success('Trip and packing list created!');
  }
}
```

---

## Migration Guide

### Migrating to New Architecture

Step-by-step guide for migrating code to the feature-based architecture.

#### 1. Using Repositories

**Before (Old Service Layer):**
```typescript
import { fetchTrips, createTrip, updateTrip } from '@/services/tripService';

const response = await fetchTrips(userId);
if (response.error) {
  console.error(response.error);
} else {
  const trips = response.data;
}
```

**After (Repository Pattern):**
```typescript
import { tripRepository } from '@/features/trips';

const response = await tripRepository.findByUserId(userId);
if (response.error) {
  console.error(response.error);
} else {
  const trips = response.data;
}
```

#### 2. Using Services

**Before:**
```typescript
// Manual duplication logic scattered across components
async function duplicateTrip(tripId: string) {
  const trip = await fetchTripById(tripId);
  const newTrip = await createTrip({ ...trip, name: `${trip.name} (Copy)` });
  
  // Copy packing items manually
  const packingItems = await fetchPackingItems(tripId);
  for (const item of packingItems) {
    await createPackingItem({ ...item, tripId: newTrip.id });
  }
  
  // Copy budget entries manually...
  // Copy timeline events manually...
}
```

**After:**
```typescript
import { tripService } from '@/features/trips';

// Service handles all complexity
const response = await tripService.duplicateTrip(tripId);
if (response.error) {
  showErrorToast(response.error.message);
} else {
  showSuccessToast('Trip duplicated successfully!');
}
```

#### 3. Form Validation with Zod

**Before:**
```typescript
function validateTripForm(data: any) {
  const errors: Record<string, string> = {};
  
  if (!data.name || data.name.trim() === '') {
    errors.name = 'Name is required';
  }
  if (data.name && data.name.length > 200) {
    errors.name = 'Name must be less than 200 characters';
  }
  
  return { valid: Object.keys(errors).length === 0, errors };
}
```

**After:**
```typescript
import { TripFormSchema } from '@/features/shared/domain/validation.schemas';

const result = TripFormSchema.safeParse(formData);
if (!result.success) {
  const errors = result.error.flatten().fieldErrors;
  // Display errors
} else {
  const validData = result.data; // Type-safe!
  await tripRepository.create(validData);
}
```

#### 4. Type Safety

**Before:**
```typescript
const { data } = await supabase.from('trips').select('*');
// data is 'any' - no type safety!
```

**After:**
```typescript
import { tripRepository } from '@/features/trips';

const response = await tripRepository.findAll();
// response.data is Trip[] - fully typed!
```

---

## Additional Resources

- [Architecture Guide](Architecture.md) - Complete architecture overview
- [Testing Guide](Testing.md) - How to test with new patterns
- [Features Guide](Features.md) - Feature implementation examples
- [docs/ERROR_HANDLING.md](../docs/ERROR_HANDLING.md) - Full error handling documentation
- [docs/MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md) - Complete migration guide
- [docs/TOAST_GUIDE.md](../docs/TOAST_GUIDE.md) - Full toast guide
- [docs/USE_ASYNC_HANDLER_GUIDE.md](../docs/USE_ASYNC_HANDLER_GUIDE.md) - Complete async handler guide

---

**Last Updated:** February 2026
