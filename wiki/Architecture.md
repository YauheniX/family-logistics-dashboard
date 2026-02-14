# 🏗️ Architecture Overview

Complete architecture guide for the Family Logistics Dashboard.

---

## Overview

This project follows **clean architecture** principles with a **feature-based structure**, providing:
- Clear separation of concerns
- Testable business logic
- Independent features
- Type-safe from database to UI
- Easy to maintain and extend

---

## Architecture Layers

The application is organized into three main layers:

```
┌─────────────────────────────────────┐
│       Presentation Layer            │
│  (UI, Stores, Composables)          │
│  - Vue components                   │
│  - Pinia stores                     │
│  - Composables                      │
├─────────────────────────────────────┤
│         Domain Layer                │
│  (Business Logic, Services)         │
│  - Entities & DTOs                  │
│  - Services                         │
│  - Validation schemas               │
│  - Repository interfaces            │
├─────────────────────────────────────┤
│      Infrastructure Layer           │
│  (Repositories, Database)           │
│  - Repository implementations       │
│  - Supabase client                  │
│  - Database types                   │
│  - External APIs                    │
└─────────────────────────────────────┘
```

### 1. Presentation Layer

**Responsibilities:**
- User interface (Vue components)
- State management (Pinia stores)
- User interactions
- Data presentation

**Key Files:**
- `*.vue` - Vue components
- `*.store.ts` - Pinia stores
- `use*.ts` - Vue composables

**Example:**
```typescript
// TripStore uses services from domain layer
import { tripService } from '@/features/trips'

export const useTripStore = defineStore('trips', () => {
  const trips = ref<Trip[]>([])

  async function loadTrips() {
    const response = await tripService.getAllTrips()
    if (response.data) {
      trips.value = response.data
    }
  }

  return { trips, loadTrips }
})
```

### 2. Domain Layer

**Responsibilities:**
- Business logic
- Data validation
- Service orchestration
- Domain entities

**Key Files:**
- `entities.ts` - Type definitions
- `validation.schemas.ts` - Zod schemas
- `*.service.ts` - Business logic
- `repository.interface.ts` - Repository contracts

**Example:**
```typescript
// TripService orchestrates business logic
export class TripService {
  async duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
    // 1. Duplicate trip
    const duplicated = await tripRepository.duplicate(trip)
    
    // 2. Copy packing items
    await this.copyPackingItems(trip.id, duplicated.id)
    
    // 3. Copy budget entries
    await this.copyBudgetEntries(trip.id, duplicated.id)
    
    return duplicated
  }
}
```

### 3. Infrastructure Layer

**Responsibilities:**
- Data access
- External services
- Database operations
- API calls

**Key Files:**
- `database.types.ts` - Generated database types
- `supabase.client.ts` - Supabase client
- `base.repository.ts` - Base repository
- `*.repository.ts` - Feature repositories

**Example:**
```typescript
// TripRepository handles data access
export class TripRepository extends BaseRepository<Trip> {
  constructor() {
    super(supabase, 'trips')
  }

  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    return this.findAll((builder) => builder.eq('created_by', userId))
  }
}
```

---

## Feature-Based Structure

Features are organized as independent modules:

```
src/features/
├── trips/                 # Trips feature
│   ├── domain/
│   │   ├── entities.ts
│   │   ├── trip.service.ts
│   │   └── repository.interface.ts
│   ├── infrastructure/
│   │   └── trip.repository.ts
│   ├── presentation/
│   │   └── trip.store.ts (future)
│   └── index.ts          # Public API
├── templates/            # Packing templates
│   ├── domain/
│   ├── infrastructure/
│   ├── presentation/
│   └── index.ts
├── auth/                 # Authentication
│   ├── domain/
│   ├── infrastructure/
│   ├── presentation/
│   └── index.ts
└── shared/               # Shared code
    ├── domain/           # Common entities, validation
    ├── infrastructure/   # Supabase client, base repo
    ├── presentation/     # Shared composables
    └── index.ts
```

### Benefits

1. **Independent Features** - Each feature is self-contained
2. **Clear Dependencies** - Only import from `index.ts` (public API)
3. **Easy Testing** - Mock at feature boundaries
4. **Scalability** - Add features without affecting others
5. **Team Collaboration** - Multiple devs work on different features

---

## Design Patterns

### 1. Repository Pattern

Abstracts data access logic.

**Interface:**
```typescript
interface IRepository<T> {
  findAll(filter?: FilterFn): Promise<ApiResponse<T[]>>
  findById(id: string): Promise<ApiResponse<T>>
  create(dto: CreateDto): Promise<ApiResponse<T>>
  update(id: string, dto: UpdateDto): Promise<ApiResponse<T>>
  delete(id: string): Promise<ApiResponse<void>>
}
```

**Implementation:**
```typescript
export class TripRepository extends BaseRepository<Trip> {
  constructor() {
    super(supabase, 'trips')
  }

  // Base methods inherited: findAll, findById, create, update, delete

  // Custom methods
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    return this.findAll((builder) => builder.eq('created_by', userId))
  }

  async duplicate(trip: Trip): Promise<ApiResponse<Trip>> {
    const { id, created_at, ...rest } = trip
    return this.create(rest)
  }
}
```

**Benefits:**
- ✅ Decouples business logic from data access
- ✅ Easy to mock for testing
- ✅ Consistent error handling
- ✅ Reusable base operations

### 2. Service Pattern

Encapsulates complex business logic.

```typescript
export class TripService {
  async duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
    // Step 1: Duplicate trip
    const response = await tripRepository.duplicate(trip)
    if (response.error) return response

    // Step 2: Copy related data
    const newTripId = response.data!.id
    await this.copyPackingItems(trip.id, newTripId)
    await this.copyBudgetEntries(trip.id, newTripId)
    await this.copyTimelineEvents(trip.id, newTripId)

    return response
  }

  private async copyPackingItems(
    sourceId: string,
    targetId: string
  ): Promise<void> {
    // Implementation...
  }
}
```

**Benefits:**
- ✅ Complex operations in one place
- ✅ Orchestrates multiple repositories
- ✅ Reusable business logic
- ✅ Transaction-like operations

### 3. Singleton Pattern

Export instances for easy consumption.

```typescript
// Export singleton
export const tripRepository = new TripRepository()
export const tripService = new TripService()

// Usage
import { tripRepository, tripService } from '@/features/trips'
```

**Benefits:**
- ✅ Single source of truth
- ✅ No "new" keyword in consumers
- ✅ Easy to mock in tests
- ✅ Consistent across app

---

## Type Safety

### Generated Database Types

Auto-generated from Supabase schema:

```typescript
// database.types.ts (generated)
export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          name: string
          start_date: string | null
          end_date: string | null
          status: 'planning' | 'booked' | 'ready' | 'done'
          created_by: string
          created_at: string
        }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
    }
  }
}
```

**Generate Command:**
```bash
npx supabase gen types typescript --project-id <ref> > src/features/shared/infrastructure/database.types.ts
```

### Domain Entities

Clean types for business logic:

```typescript
// entities.ts
export interface Trip {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  status: TripStatus
  createdBy: string
  createdAt: Date
}

export type TripStatus = 'planning' | 'booked' | 'ready' | 'done'

export type CreateTripDto = Omit<Trip, 'id' | 'createdAt'>
export type UpdateTripDto = Partial<CreateTripDto>
```

### Validation with Zod

Runtime validation for user inputs:

```typescript
// validation.schemas.ts
import { z } from 'zod'

export const TripFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  status: z.enum(['planning', 'booked', 'ready', 'done'])
})

export type TripFormData = z.infer<typeof TripFormSchema>

// Usage in component
const result = TripFormSchema.safeParse(formData)
if (!result.success) {
  console.error(result.error.flatten())
}
```

---

## Error Handling

Consistent error handling across all layers.

### ApiResponse Type

```typescript
interface ApiResponse<T> {
  data: T | null
  error: ApiError | null
}

interface ApiError {
  message: string
  code?: string
}
```

### Repository Level

```typescript
async findById(id: string): Promise<ApiResponse<Trip>> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { data: null, error: { message: error.message } }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: { message: 'Unexpected error' } }
  }
}
```

### Service Level

```typescript
async duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
  const response = await tripRepository.duplicate(trip)
  
  if (response.error) {
    // Log error, show toast, etc.
    return response
  }

  // Continue with success case
  return response
}
```

### Presentation Level

```typescript
async function duplicateTrip(trip: Trip) {
  loading.value = true
  const response = await tripService.duplicateTrip(trip)
  loading.value = false

  if (response.error) {
    showErrorToast(response.error.message)
  } else {
    showSuccessToast('Trip duplicated!')
    trips.value.push(response.data!)
  }
}
```

---

## Data Flow

### Read Flow (Database → UI)

```
1. User clicks "Load Trips" button
   ↓
2. Component calls store action
   store.loadTrips()
   ↓
3. Store calls service
   tripService.getAllTrips()
   ↓
4. Service calls repository
   tripRepository.findAll()
   ↓
5. Repository queries Supabase
   supabase.from('trips').select('*')
   ↓
6. Data flows back:
   DB → Repository → Service → Store → Component → UI
```

### Write Flow (UI → Database)

```
1. User submits form
   ↓
2. Component validates with Zod
   TripFormSchema.safeParse(formData)
   ↓
3. Component calls store action
   store.createTrip(validatedData)
   ↓
4. Store calls service
   tripService.createTrip(data)
   ↓
5. Service calls repository
   tripRepository.create(data)
   ↓
6. Repository inserts to Supabase
   supabase.from('trips').insert(data)
   ↓
7. Success/error flows back to UI
```

---

## Testing Strategy

### Unit Tests

Test services and repositories in isolation:

```typescript
// trip.service.test.ts
describe('TripService', () => {
  it('should duplicate trip with related data', async () => {
    // Mock repository
    const mockRepo = {
      duplicate: vi.fn().mockResolvedValue({ data: newTrip, error: null })
    }

    const service = new TripService(mockRepo)
    const result = await service.duplicateTrip(originalTrip)

    expect(result.data).toEqual(newTrip)
    expect(mockRepo.duplicate).toHaveBeenCalledWith(originalTrip)
  })
})
```

### Integration Tests

Test with real Supabase client (or mock at network level):

```typescript
// trip.repository.test.ts
describe('TripRepository', () => {
  it('should create trip in database', async () => {
    const repo = new TripRepository()
    const result = await repo.create(tripDto)

    expect(result.error).toBeNull()
    expect(result.data?.name).toBe(tripDto.name)
  })
})
```

---

## Best Practices

### 1. Feature Independence

❌ **Don't:**
```typescript
// Don't import from internal folders
import { TripRepository } from '@/features/trips/infrastructure/trip.repository'
```

✅ **Do:**
```typescript
// Import from public API (index.ts)
import { tripRepository } from '@/features/trips'
```

### 2. Single Responsibility

Each layer has one job:
- **Presentation** - Display data
- **Domain** - Business logic
- **Infrastructure** - Data access

### 3. Dependency Direction

Dependencies flow inward:
```
Presentation → Domain → Infrastructure
```

Never the reverse!

### 4. Type Safety

Always use types:
- Database types from Supabase
- Domain entities for business logic
- Zod schemas for validation

### 5. Error Handling

Return `ApiResponse<T>` for all async operations:
```typescript
// ✅ Good
async function getTrip(id: string): Promise<ApiResponse<Trip>>

// ❌ Bad
async function getTrip(id: string): Promise<Trip | null>
```

---

## Migration Path

### Legacy → New Architecture

The codebase is in transition:

**Old Structure:**
```
src/
├── services/         # Legacy services
├── stores/           # Legacy stores
└── components/       # Legacy components
```

**New Structure:**
```
src/
├── features/         # New feature-based modules
└── legacy/           # Backward compatibility
```

**Migration Steps:**

1. Create new feature folder
2. Implement repository + service
3. Update store to use new service
4. Migrate components (optional)
5. Remove legacy code

See [MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md) for detailed examples.

---

## Documentation

**Essential Reading:**
- [Database Schema](Database-Schema.md) - Tables and RLS
- [Features Guide](Features.md) - Feature documentation
- [Testing](Testing.md) - Test strategies

**Additional Resources:**
- [docs/ERROR_HANDLING.md](../docs/ERROR_HANDLING.md)
- [docs/TOAST_GUIDE.md](../docs/TOAST_GUIDE.md)
- [docs/MIGRATION_GUIDE.md](../docs/MIGRATION_GUIDE.md)

---

## Future Improvements

**Planned:**
- [ ] Move UI components to feature folders
- [ ] Add API documentation with TypeDoc
- [ ] Implement event sourcing for audit trail
- [ ] Add caching layer for performance
- [ ] Create CLI for generating features

**Considering:**
- GraphQL layer for complex queries
- WebSocket for real-time updates
- Offline-first with IndexedDB
- Micro-frontends for scaling

---

**Last Updated:** February 2026  
**Architecture Version:** 2.0
