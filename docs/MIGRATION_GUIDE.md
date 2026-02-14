# Migration Guide: Using the New Architecture

This guide shows how to migrate from the old code structure to the new feature-based architecture.

## Table of Contents
1. [Using Repositories](#using-repositories)
2. [Using Services](#using-services)
3. [Using Stores](#using-stores)
4. [Form Validation with Zod](#form-validation-with-zod)
5. [Type Safety](#type-safety)

## Using Repositories

### Before (Old Service Layer)
```typescript
// Old way - directly importing service functions
import { fetchTrips, createTrip, updateTrip } from '@/services/tripService';

// Fetching trips
const response = await fetchTrips(userId);
if (response.error) {
  console.error(response.error);
} else {
  const trips = response.data;
}

// Creating a trip
const newTrip = await createTrip({
  name: 'Summer Vacation',
  start_date: '2024-07-01',
  end_date: '2024-07-15',
  status: 'planning',
  created_by: userId,
});
```

### After (Repository Pattern)
```typescript
// New way - using repository
import { tripRepository } from '@/features/trips/infrastructure/trip.repository';

// Fetching trips
const response = await tripRepository.findByUserId(userId);
if (response.error) {
  console.error(response.error);
} else {
  const trips = response.data;
}

// Creating a trip
const newTrip = await tripRepository.create({
  name: 'Summer Vacation',
  start_date: '2024-07-01',
  end_date: '2024-07-15',
  status: 'planning',
  created_by: userId,
});
```

**Benefits:**
- ✅ Consistent interface across all repositories
- ✅ Easy to mock for testing
- ✅ Type-safe with generated database types
- ✅ Centralized error handling

## Using Services

For complex business logic, use services instead of repositories.

### Example: Duplicating a Trip

```typescript
import { tripService } from '@/features/trips/domain/trip.service';

// The service handles all the complexity
const response = await tripService.duplicateTrip(originalTrip);

if (response.error) {
  // Handle error
  showError(response.error.message);
} else {
  // Success - the service already copied all related data
  const duplicatedTrip = response.data;
  showSuccess('Trip duplicated successfully!');
}
```

**What the service does for you:**
1. Creates the duplicate trip
2. Copies all packing items
3. Copies all budget entries
4. Copies all timeline events
5. Handles errors and rollback if anything fails

## Using Stores

Stores are backward compatible but have a cleaner API now.

### Before
```typescript
import { useTripStore } from '@/stores/trips';

const tripStore = useTripStore();

// Load trips
await tripStore.loadTrips(userId);

// Create a trip
const trip = await tripStore.createTrip({
  name: 'Weekend Trip',
  status: 'planning',
  created_by: userId,
});
```

### After (Same API!)
```typescript
// Option 1: Use the old import (still works)
import { useTripStore } from '@/stores/trips';

// Option 2: Use the new import (recommended)
import { useTripStore } from '@/features/trips/presentation/trips.store';

const tripStore = useTripStore();

// Same API - no changes needed!
await tripStore.loadTrips(userId);
const trip = await tripStore.createTrip({
  name: 'Weekend Trip',
  status: 'planning',
  created_by: userId,
});
```

**Under the hood:**
- Stores now use repositories instead of direct service calls
- Better type safety
- Cleaner separation of concerns

## Form Validation with Zod

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useFormValidation } from '@/features/shared/presentation/useFormValidation';
import { TripFormSchema } from '@/features/shared/domain/validation.schemas';
import { useTripStore } from '@/stores/trips';

const tripStore = useTripStore();
const { validate, errors, hasError, getError } = useFormValidation(TripFormSchema);

const formData = ref({
  name: '',
  start_date: null,
  end_date: null,
  status: 'planning' as const,
});

const handleSubmit = async () => {
  // Validate the form
  const result = validate(formData.value);
  
  if (!result.success) {
    // Validation failed - errors are now in `errors.value`
    console.log('Validation errors:', errors.value);
    return;
  }
  
  // Validation passed - result.data is now properly typed!
  const trip = await tripStore.createTrip({
    ...result.data,
    created_by: authStore.userId!,
  });
  
  if (trip) {
    // Success!
    router.push({ name: 'trip-detail', params: { id: trip.id } });
  }
};
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <div>
      <label>Trip Name</label>
      <input 
        v-model="formData.name" 
        type="text"
        :class="{ 'error': hasError('name') }"
      />
      <span v-if="hasError('name')" class="error-message">
        {{ getError('name') }}
      </span>
    </div>
    
    <div>
      <label>Start Date</label>
      <input 
        v-model="formData.start_date" 
        type="date"
        :class="{ 'error': hasError('start_date') }"
      />
      <span v-if="hasError('start_date')" class="error-message">
        {{ getError('start_date') }}
      </span>
    </div>
    
    <div>
      <label>End Date</label>
      <input 
        v-model="formData.end_date" 
        type="date"
        :class="{ 'error': hasError('end_date') }"
      />
      <span v-if="hasError('end_date')" class="error-message">
        {{ getError('end_date') }}
      </span>
    </div>
    
    <button type="submit">Create Trip</button>
  </form>
</template>
```

### Available Validation Schemas

All schemas are in `@/features/shared/domain/validation.schemas`:

```typescript
import {
  TripFormSchema,           // Trip creation/update
  PackingItemFormSchema,    // Packing items
  BudgetEntryFormSchema,    // Budget entries
  TimelineEventFormSchema,  // Timeline events
  DocumentFormSchema,       // Documents
  PackingTemplateFormSchema,// Packing templates
  TripMemberInviteSchema,   // Member invitations
  LoginFormSchema,          // Login
  RegisterFormSchema,       // Registration
} from '@/features/shared/domain/validation.schemas';
```

### Custom Validation

You can also use Zod directly:

```typescript
import { z } from 'zod';

// Create a custom schema
const CustomFormSchema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18 or older'),
  terms: z.boolean().refine(val => val === true, 'Must accept terms'),
});

// Use it with the validation composable
const { validate, errors } = useFormValidation(CustomFormSchema);
```

## Type Safety

### Using Database Types

```typescript
import type { Database } from '@/features/shared/infrastructure/database.types';

// Access table types
type TripRow = Database['public']['Tables']['trips']['Row'];
type TripInsert = Database['public']['Tables']['trips']['Insert'];
type TripUpdate = Database['public']['Tables']['trips']['Update'];
```

### Using Domain Entities

```typescript
import type { 
  Trip, 
  CreateTripDto, 
  UpdateTripDto 
} from '@/features/shared/domain/entities';

// Use in your components
const trip: Trip = {
  id: '123',
  name: 'My Trip',
  status: 'planning',
  start_date: '2024-07-01',
  end_date: '2024-07-15',
  created_by: 'user-id',
  created_at: '2024-01-01T00:00:00Z',
};

// Create DTO (no id or created_at)
const createDto: CreateTripDto = {
  name: 'My Trip',
  status: 'planning',
  start_date: '2024-07-01',
  end_date: '2024-07-15',
  created_by: 'user-id',
};

// Update DTO (all fields optional except what you want to update)
const updateDto: UpdateTripDto = {
  status: 'booked',
};
```

### Typed Supabase Client

```typescript
import { supabase } from '@/features/shared/infrastructure/supabase.client';

// The client is now fully typed!
const { data, error } = await supabase
  .from('trips')  // ✅ Autocomplete for table names
  .select('*')
  .eq('status', 'planning');  // ✅ Type-safe column names and values

// data is typed as Trip[]
if (data) {
  data.forEach(trip => {
    console.log(trip.name);  // ✅ Autocomplete for properties
  });
}
```

## Common Patterns

### Loading Data in a Component

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useTripStore } from '@/stores/trips';
import { useAuthStore } from '@/stores/auth';

const tripStore = useTripStore();
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.userId) {
    await tripStore.loadTrips(authStore.userId);
  }
});
</script>

<template>
  <div v-if="tripStore.loading">Loading...</div>
  <div v-else-if="tripStore.error">Error: {{ tripStore.error }}</div>
  <div v-else>
    <div v-for="trip in tripStore.trips" :key="trip.id">
      {{ trip.name }}
    </div>
  </div>
</template>
```

### Creating with Validation

```typescript
import { ref } from 'vue';
import { useFormValidation } from '@/features/shared/presentation/useFormValidation';
import { BudgetEntryFormSchema } from '@/features/shared/domain/validation.schemas';
import { useTripStore } from '@/stores/trips';

const tripStore = useTripStore();
const { validate, errors } = useFormValidation(BudgetEntryFormSchema);

const formData = ref({
  category: 'Accommodation',
  amount: 0,
  currency: 'USD',
  is_planned: true,
});

const handleSubmit = async () => {
  const result = validate(formData.value);
  
  if (result.success) {
    await tripStore.addBudgetEntry({
      ...result.data,
      trip_id: tripId,
    });
  }
};
```

## Next Steps

1. **Migrate Components**: Move components to feature folders
2. **Add Tests**: Write unit tests for repositories and services
3. **Use TypeScript Strictly**: Enable `strict: true` in tsconfig.json
4. **Monitor Performance**: Add logging and monitoring
5. **Document APIs**: Add JSDoc comments to public methods

## Need Help?

- Check `docs/ARCHITECTURE.md` for architecture overview
- Look at existing feature modules for examples
- The old code still works - migrate gradually!
