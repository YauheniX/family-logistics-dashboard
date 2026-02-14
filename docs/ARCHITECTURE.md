# Architecture Documentation

## Overview

This project follows a clean, feature-based architecture that separates concerns and makes the codebase scalable and maintainable.

## Folder Structure

```
src/
├── features/              # Feature-based modules
│   ├── auth/             # Authentication feature
│   │   ├── domain/       # Business logic
│   │   ├── infrastructure/ # Data access (if needed)
│   │   ├── presentation/ # UI components & stores
│   │   └── index.ts      # Public API
│   ├── trips/            # Trips management feature
│   │   ├── domain/       # Business logic & services
│   │   ├── infrastructure/ # Repositories & data access
│   │   ├── presentation/ # UI components & stores
│   │   └── index.ts      # Public API
│   ├── templates/        # Packing templates feature
│   │   ├── domain/       # Business logic
│   │   ├── infrastructure/ # Repositories
│   │   ├── presentation/ # UI components & stores
│   │   └── index.ts      # Public API
│   └── shared/           # Shared utilities across features
│       ├── domain/       # Common entities, interfaces, validation
│       ├── infrastructure/ # Supabase client, base repository
│       └── index.ts      # Public API
├── components/           # Legacy UI components (being migrated)
├── views/                # Legacy views (being migrated)
├── stores/               # Legacy stores (compatibility layer)
└── ...
```

## Architecture Layers

### 1. Domain Layer (`domain/`)

Contains pure business logic, entities, and service interfaces.

- **Entities**: Domain models (e.g., `Trip`, `PackingItem`)
- **Services**: Business logic (e.g., `TripService`)
- **Validation**: Zod schemas for runtime validation
- **Interfaces**: Repository contracts

**Key files:**

- `entities.ts` - Domain entities and DTOs
- `validation.schemas.ts` - Zod validation schemas
- `repository.interface.ts` - Repository contracts
- `*.service.ts` - Business logic services

### 2. Infrastructure Layer (`infrastructure/`)

Handles data access and external dependencies.

- **Repositories**: Data access implementations using repository pattern
- **Database**: Typed Supabase client and database types
- **External services**: Third-party integrations

**Key files:**

- `database.types.ts` - Auto-generated types from database schema
- `supabase.client.ts` - Typed Supabase client
- `base.repository.ts` - Base repository with common CRUD operations
- `*.repository.ts` - Feature-specific repositories

### 3. Presentation Layer (`presentation/`)

UI components and state management.

- **Stores**: Pinia stores for state management
- **Components**: Vue components (to be added)

**Key files:**

- `*.store.ts` - Pinia stores

## Key Design Patterns

### Repository Pattern

Abstracts data access logic and provides a clean interface for the domain layer.

```typescript
// Define repository interface
interface Repository<T> {
  findAll(): Promise<ApiResponse<T[]>>;
  findById(id: string): Promise<ApiResponse<T>>;
  create(dto: CreateDto): Promise<ApiResponse<T>>;
  update(id: string, dto: UpdateDto): Promise<ApiResponse<T>>;
  delete(id: string): Promise<ApiResponse<void>>;
}

// Implement repository
class TripRepository extends BaseRepository<Trip> {
  constructor() {
    super(supabase, 'trips');
  }

  // Add custom methods
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    return this.findAll((builder) => builder.eq('created_by', userId));
  }
}
```

### Service Layer

Encapsulates business logic and orchestrates repositories.

```typescript
class TripService {
  async duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
    // Business logic here
    const duplicated = await tripRepository.duplicate(trip);
    // Copy related data
    await this.copyPackingItems(trip.id, duplicated.id);
    return duplicated;
  }
}
```

### Dependency Injection via Singletons

Each repository and service is exported as a singleton for easy consumption.

```typescript
// Export singleton
export const tripRepository = new TripRepository();

// Use in service
import { tripRepository } from '@/features/trips';
```

## Type Safety

### Database Types

Generated from Supabase schema to ensure type safety at the database level.

```typescript
// database.types.ts
export interface Database {
  public: {
    Tables: {
      trips: {
        Row: { id: string; name: string; ... }
        Insert: { id?: string; name: string; ... }
        Update: { id?: string; name?: string; ... }
      }
    }
  }
}
```

### Domain Entities

Clean domain models separate from database types.

```typescript
// entities.ts
export interface Trip {
  id: string;
  name: string;
  status: TripStatus;
  // ...
}

export type CreateTripDto = Omit<Trip, 'id' | 'created_at'>;
export type UpdateTripDto = Partial<CreateTripDto>;
```

### Validation with Zod

Runtime validation for user inputs.

```typescript
// validation.schemas.ts
export const TripFormSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  start_date: z.string().nullable().optional(),
  status: z.enum(['planning', 'booked', 'ready', 'done']),
});

// Use in components
const result = TripFormSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
}
```

## Migration Guide

### For existing code using old services:

**Before:**

```typescript
import { fetchTrips, createTrip } from '@/services/tripService';

const response = await fetchTrips(userId);
```

**After:**

```typescript
import { tripService } from '@/features/trips';

const response = await tripService.getUserTrips(userId);
```

### For existing code using old stores:

Stores are backward compatible through compatibility layer in `src/stores/`.

**Current (works):**

```typescript
import { useTripStore } from '@/stores/trips';
```

**New (recommended):**

```typescript
import { useTripStore } from '@/features/trips/presentation/trips.store';
```

## Security Best Practices

1. **Row Level Security (RLS)**: All database tables have RLS enabled
2. **Type-safe queries**: Using typed Supabase client prevents SQL injection
3. **Validation**: Zod schemas validate all user inputs
4. **Error handling**: Centralized error handling in repositories
5. **Principle of least privilege**: Services only access what they need

## Testing Strategy

### Unit Tests (To be added)

- Test domain services in isolation
- Mock repositories
- Test validation schemas

### Integration Tests (To be added)

- Test repositories against test database
- Test complete user flows

### E2E Tests (To be added)

- Test critical user journeys
- Test with real Supabase instance

## Benefits of This Architecture

1. **Scalability**: Easy to add new features without affecting existing ones
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Each layer can be tested independently
4. **Type Safety**: Comprehensive type coverage from database to UI
5. **Security**: Centralized security controls
6. **Developer Experience**: Clear structure, easy to navigate
7. **Performance**: Optimized data access patterns

## Next Steps

1. Migrate remaining UI components to feature folders
2. Add comprehensive tests
3. Add API documentation with TypeDoc
4. Consider adding a cache layer for frequently accessed data
5. Add monitoring and logging infrastructure
