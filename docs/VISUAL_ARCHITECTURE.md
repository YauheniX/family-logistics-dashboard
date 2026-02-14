# Visual Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (Vue Components + Views)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Trips Store  │Templates     │ Auth Store   │  Composables │ │
│  │              │   Store      │              │              │ │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘ │
└─────────┼──────────────┼──────────────┼──────────────┼─────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Domain Layer                              │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Trip Service │  Template    │ Auth Service │  Validation  │ │
│  │              │   Service    │              │   Schemas    │ │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────────────┘ │
└─────────┼──────────────┼──────────────┼─────────────────────────┘
          │              │              │
          ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                          │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │ Trip Repos   │Template Repos│ Auth         │  Storage     │ │
│  │ • Trip       │• Template    │  Service     │  Service     │ │
│  │ • Packing    │• Items       │              │              │ │
│  │ • Budget     │              │              │              │ │
│  │ • Timeline   │              │              │              │ │
│  │ • Documents  │              │              │              │ │
│  │ • Members    │              │              │              │ │
│  └──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘ │
└─────────┼──────────────┼──────────────┼──────────────┼─────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Typed Supabase Client                      │
│                    (Database Types Applied)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Backend                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│  │  PostgreSQL  │     Auth     │   Storage    │     RLS      │ │
│  │   Database   │   (OAuth)    │   (Files)    │  Policies    │ │
│  └──────────────┴──────────────┴──────────────┴──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Feature Module Structure

```
features/
│
├── trips/                          # Trip Management Feature
│   ├── domain/                     # Business Logic
│   │   └── trip.service.ts         # • duplicateTrip()
│   │                               # • Complex business operations
│   │
│   ├── infrastructure/             # Data Access
│   │   ├── trip.repository.ts      # • CRUD operations
│   │   ├── trip-data.repository.ts # • Related data (packing, budget, etc.)
│   │   ├── trip-member.repository.ts # • Member management
│   │   └── storage.service.ts      # • File uploads
│   │
│   ├── presentation/               # UI Layer
│   │   └── trips.store.ts          # • State management
│   │
│   └── index.ts                    # Public API exports
│
├── templates/                      # Template Management Feature
│   ├── infrastructure/
│   │   └── template.repository.ts
│   ├── presentation/
│   │   └── templates.store.ts
│   └── index.ts
│
├── auth/                           # Authentication Feature
│   ├── domain/
│   │   └── auth.service.ts
│   ├── presentation/
│   │   └── auth.store.ts
│   └── index.ts
│
└── shared/                         # Common Utilities
    ├── domain/
    │   ├── entities.ts             # Domain models
    │   ├── repository.interface.ts # Contracts
    │   └── validation.schemas.ts   # Zod schemas
    │
    ├── infrastructure/
    │   ├── database.types.ts       # Generated types
    │   ├── supabase.client.ts      # Typed client
    │   └── base.repository.ts      # Base CRUD
    │
    ├── presentation/
    │   └── useFormValidation.ts    # Validation composable
    │
    └── index.ts
```

## Data Flow

### Example: Creating a Trip

```
┌──────────────┐
│ User clicks  │
│ "Create Trip"│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│ Component validates with Zod     │
│ const result = validate(data)    │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Store action called              │
│ tripStore.createTrip(dto)        │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Repository creates record        │
│ tripRepository.create(dto)       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Typed Supabase Client            │
│ supabase.from('trips').insert()  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Database                         │
│ RLS checks, inserts row          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Response flows back up           │
│ • Typed data                     │
│ • Or error with message          │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Store updates state              │
│ trips.unshift(newTrip)           │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ UI updates reactively            │
│ New trip appears in list         │
└──────────────────────────────────┘
```

### Example: Duplicating a Trip (Complex Operation)

```
┌──────────────┐
│ User clicks  │
│ "Duplicate"  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│ Store action                     │
│ tripStore.duplicateTrip(id)      │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Service handles complexity       │
│ tripService.duplicateTrip(trip)  │
└──────┬───────────────────────────┘
       │
       ├─────────────────┬──────────────┬──────────────┬──────────────┐
       ▼                 ▼              ▼              ▼              ▼
  ┌─────────┐    ┌──────────┐   ┌──────────┐  ┌──────────┐   ┌──────────┐
  │ Duplicate│    │  Copy    │   │  Copy    │  │  Copy    │   │  Copy    │
  │   Trip   │    │ Packing  │   │  Budget  │  │ Timeline │   │Documents │
  └─────┬───┘    └─────┬────┘   └─────┬────┘  └─────┬────┘   └─────┬────┘
        │              │              │             │              │
        │              │              │             │              │
        └──────────────┴──────────────┴─────────────┴──────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ All operations succeed│
                        │ or rollback on error  │
                        └───────────────────────┘
```

## Type Flow

```
Database Schema (SQL)
        │
        ▼
Database Types (TypeScript)
Database['public']['Tables']['trips']['Row']
        │
        ▼
Domain Entities (Clean Types)
interface Trip { id: string; name: string; ... }
        │
        ▼
Validation Schemas (Runtime)
TripFormSchema.parse(data) // ✅ or ❌
        │
        ▼
DTOs (Data Transfer Objects)
CreateTripDto, UpdateTripDto
        │
        ▼
Repository Methods
create(dto: CreateTripDto): Promise<ApiResponse<Trip>>
        │
        ▼
Service Methods
duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>>
        │
        ▼
Store Actions
createTrip(dto: CreateTripDto): Promise<Trip | null>
        │
        ▼
Components (Type-safe throughout)
const trip: Trip = await tripStore.createTrip(dto);
```

## Repository Pattern Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     BaseRepository                          │
│  • findAll()     - Get all records                          │
│  • findById()    - Get single record                        │
│  • create()      - Create record                            │
│  • createMany()  - Batch create                             │
│  • update()      - Update record                            │
│  • upsert()      - Insert or update                         │
│  • delete()      - Delete record                            │
│  • execute()     - Custom queries                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ extends
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│ TripRepository │ │TemplateRepo    │ │ BudgetRepo     │
│                │ │                │ │                │
│ + findByUserId │ │+ findByUserId  │ │+ findByTripId  │
│ + duplicate    │ │                │ │                │
└────────────────┘ └────────────────┘ └────────────────┘
```

## Validation Flow

```
User Input (Form Data)
        │
        ▼
┌───────────────────────────────┐
│ useFormValidation composable  │
│                               │
│ const { validate } =          │
│   useFormValidation(schema)   │
└───────────┬───────────────────┘
            │
            ▼
┌───────────────────────────────┐
│ Zod Schema Validation         │
│                               │
│ TripFormSchema.parse(data)    │
└───────┬───────────────────────┘
        │
        ├─── Success ✅
        │         │
        │         ▼
        │    ┌──────────────────┐
        │    │ Typed Data       │
        │    │ result.data      │
        │    └────────┬─────────┘
        │             │
        │             ▼
        │    ┌──────────────────┐
        │    │ Create/Update    │
        │    │ Repository call  │
        │    └──────────────────┘
        │
        └─── Failure ❌
                  │
                  ▼
             ┌──────────────────┐
             │ Error Messages   │
             │ errors.value     │
             └────────┬─────────┘
                      │
                      ▼
             ┌──────────────────┐
             │ Display to User  │
             │ Field errors     │
             └──────────────────┘
```

## Dependency Direction

```
┌─────────────────────────────────────────────────────┐
│                  Presentation                       │
│  (Stores, Components, Composables)                  │
│                                                     │
│  Depends on ↓                                       │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                     Domain                          │
│  (Services, Entities, Interfaces, Validation)       │
│                                                     │
│  Depends on ↓ (only interfaces)                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                Infrastructure                       │
│  (Repositories, Database, External APIs)            │
│                                                     │
│  Depends on ↓                                       │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              External Services                      │
│  (Supabase, Storage, Auth)                         │
└─────────────────────────────────────────────────────┘

Rule: Dependencies always point downward
      Upper layers depend on lower layers
      Lower layers are independent
```

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│                  User Input                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            Layer 1: Client Validation               │
│  • Zod schema validation                            │
│  • Type checking                                    │
│  • Required fields                                  │
│  • Format validation (email, dates, etc.)           │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         Layer 2: Type-Safe Queries                  │
│  • Typed Supabase client                            │
│  • No string concatenation                          │
│  • SQL injection prevention                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│           Layer 3: Row Level Security               │
│  • Database policies                                │
│  • User can only access own data                    │
│  • Shared data through explicit permissions         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         Layer 4: Database Constraints               │
│  • Foreign key constraints                          │
│  • Check constraints                                │
│  • NOT NULL constraints                             │
│  • Unique constraints                               │
└─────────────────────────────────────────────────────┘
```

## Scalability Pattern

```
Adding a New Feature: "Flights"

1. Create Feature Folder
   features/flights/

2. Define Domain
   features/flights/domain/
   ├── flight.entity.ts      # Flight, FlightDto types
   └── flight.service.ts     # Business logic

3. Implement Infrastructure
   features/flights/infrastructure/
   └── flight.repository.ts  # extends BaseRepository

4. Create Presentation
   features/flights/presentation/
   └── flights.store.ts      # Pinia store

5. Add Validation
   shared/domain/validation.schemas.ts
   └── export const FlightFormSchema = z.object({...})

6. Export Public API
   features/flights/index.ts
   └── export * from './domain/...'

7. Use in Components
   import { flightRepository } from '@/features/flights';
   import { FlightFormSchema } from '@/features/shared';

That's it! The feature is fully integrated.
```

## Benefits Visualization

```
Before Refactoring          After Refactoring
─────────────────          ──────────────────

Flat Structure              Feature-Based
services/                   features/
├── tripService.ts           ├── trips/
├── authService.ts           │   ├── domain/
├── templateService.ts       │   ├── infrastructure/
└── ...                      │   └── presentation/
                             ├── auth/
                             └── templates/

Direct DB Calls             Repository Pattern
supabase.from('trips')...   tripRepository.findAll()
                            • Consistent API
                            • Type-safe
                            • Testable

Manual Types                Generated + Domain Types
interface Trip {...}        Database['Tables']['trips']
                           + Clean domain entities

No Validation              Zod Validation
if (name === '') {...}     TripFormSchema.parse(data)
                           • Runtime checking
                           • Type inference

Mixed Concerns             Clean Layers
Business + Data Access     Domain → Infrastructure
in same file               → Presentation
```
