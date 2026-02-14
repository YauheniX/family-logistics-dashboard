# Centralized Error Handling Documentation

This document explains the centralized error handling system implemented in the Family Logistics Dashboard.

## Overview

The refactoring introduces a clean, type-safe error handling architecture that eliminates duplicated error logic across the application.

## Core Components

### 1. Type Definitions (`src/types/api.ts`)

```typescript
// Unified API response type
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// Standardized error format
interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
```

**Why?** Type-safe responses ensure compile-time checks and prevent runtime errors from unexpected data structures.

### 2. Supabase Service Wrapper (`src/services/supabaseService.ts`)

A centralized wrapper around Supabase operations that:

- Converts all Supabase errors to our `ApiError` format
- Provides consistent method signatures
- Eliminates try/catch boilerplate

**Key Methods:**

- `select<T>()` - Fetch multiple records
- `selectSingle<T>()` - Fetch one record
- `insert<T>()` - Create a record
- `update<T>()` - Update a record
- `delete()` - Delete a record
- `execute<T>()` - Custom operations

**Example:**

```typescript
// Old way (throws errors)
const { data, error } = await supabase.from('trips').select('*');
if (error) throw error;

// New way (returns ApiResponse)
const response = await SupabaseService.select<Trip>('trips');
if (response.error) {
  // Handle error
}
```

### 3. Toast Notification System

#### Toast Store (`src/stores/toast.ts`)

Manages global toast notifications with methods:

- `success(message)` - Green success toast
- `error(message)` - Red error toast
- `warning(message)` - Yellow warning toast
- `info(message)` - Blue info toast

#### Toast Container (`src/components/shared/ToastContainer.vue`)

Visual component that displays toasts with:

- Auto-dismiss after configurable duration
- Manual close button
- Smooth animations
- Positioned in bottom-right corner

### 4. useAsyncHandler Composable (`src/composables/useAsyncHandler.ts`)

A Vue composable for handling async operations with:

- Automatic loading state management
- Automatic error handling with toast notifications
- Success message support
- Type-safe responses

**Usage:**

```typescript
const { loading, error, execute } = useAsyncHandler({
  successMessage: 'Operation completed!',
  errorPrefix: 'Failed to save',
});

// Using with ApiResponse
const result = await execute(() => tripService.createTrip(payload));

// Using with raw promises (legacy support)
const result = await executeRaw(() => someAsyncFunction());
```

## Migration Strategy

### Services Layer

All service functions now return `ApiResponse<T>` instead of throwing errors:

**Before:**

```typescript
export async function fetchTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase.from('trips').select('*');
  if (error) throw error;
  return data ?? [];
}
```

**After:**

```typescript
export async function fetchTrips(userId: string): Promise<ApiResponse<Trip[]>> {
  return SupabaseService.select<Trip>('trips', (builder) => builder.eq('created_by', userId));
}
```

### Store Layer

Pinia stores handle errors and show toast notifications:

**Before:**

```typescript
async loadTrips(userId: string) {
  try {
    this.trips = await fetchTrips(userId);
  } catch (err: any) {
    this.error = err.message;
  }
}
```

**After:**

```typescript
async loadTrips(userId: string) {
  const response = await fetchTrips(userId);
  if (response.error) {
    this.error = response.error.message;
    useToastStore().error(`Failed to load trips: ${response.error.message}`);
  } else {
    this.trips = response.data ?? [];
  }
}
```

### Component Layer

Components can use stores (which handle errors) or useAsyncHandler:

**Option 1 - Using Store:**

```vue
<script setup>
const tripStore = useTripStore();

// Store handles error display
await tripStore.createTrip(payload);
</script>
```

**Option 2 - Using useAsyncHandler:**

```vue
<script setup>
const { loading, execute } = useAsyncHandler({
  successMessage: 'Trip created!',
});

const handleSubmit = async () => {
  const result = await execute(() => createTrip(payload));
  if (result) {
    // Success - navigate or update UI
  }
};
</script>

<template>
  <button :disabled="loading">
    {{ loading ? 'Saving...' : 'Save' }}
  </button>
</template>
```

## Benefits

1. **No Duplicated Error Logic** - Error handling centralized in service wrapper and stores
2. **Type Safety** - All responses are `ApiResponse<T>` with compile-time checks
3. **User Feedback** - Toast notifications provide immediate visual feedback
4. **Loading States** - Built-in loading management via composable
5. **Clean Architecture** - Clear separation of concerns (service → store → component)
6. **Maintainability** - Single source of truth for error handling patterns
7. **Testability** - Easier to test with predictable response types

## Security Considerations

- Error messages are sanitized before display
- Sensitive details are not exposed to users
- All errors are properly logged for debugging
- Toast messages auto-dismiss to prevent UI clutter

## Example: Complete Flow

```typescript
// 1. Service Layer - Returns ApiResponse
export async function createTrip(payload: NewTripPayload): Promise<ApiResponse<Trip>> {
  return SupabaseService.insert<Trip>('trips', payload);
}

// 2. Store Layer - Handles errors, shows toast
async createTrip(payload: NewTripPayload) {
  const response = await createTrip(payload);
  if (response.error) {
    useToastStore().error(`Failed: ${response.error.message}`);
    return null;
  }
  if (response.data) {
    this.trips.unshift(response.data);
    useToastStore().success('Trip created!');
  }
  return response.data;
}

// 3. Component - Just calls store
const tripStore = useTripStore();
await tripStore.createTrip(payload);
// Toast automatically shown, no extra error handling needed!
```

## Migration Checklist

- ✅ Created `ApiResponse` and `ApiError` types
- ✅ Created `SupabaseService` wrapper
- ✅ Created toast notification system (store + component)
- ✅ Created `useAsyncHandler` composable
- ✅ Migrated all service functions to return `ApiResponse`
- ✅ Updated all stores to use new services and show toasts
- ✅ Added `ToastContainer` to `App.vue`
- ✅ Updated components to handle new response types

## Future Enhancements

- Add retry logic for failed requests
- Implement request caching
- Add offline support with queue
- Enhanced error analytics/monitoring
- Custom error recovery strategies per operation type
