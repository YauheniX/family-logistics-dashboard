# 🏗️ Architecture Overview

System architecture documentation for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026  
**Architecture Style**: Clean Architecture with Feature-Based Structure

---

## Executive Summary

The Family Logistics Dashboard follows **Clean Architecture** principles organized by features. This provides:

✅ Clear separation of concerns  
✅ Testable business logic  
✅ Independent, cohesive features  
✅ Type-safe from database to UI  
✅ Easy to maintain and extend

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Presentation                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│  │   Views   │  │  Stores   │  │Composables│      │
│  │  (.vue)   │  │  (Pinia)  │  │  (use*)   │      │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘      │
└────────┼──────────────┼──────────────┼─────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│                      Domain                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│  │ Services  │  │ Entities  │  │Validation │      │
│  │           │  │   (TS)    │  │  (Zod)    │      │
│  └─────┬─────┘  └───────────┘  └───────────┘      │
└────────┼──────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│                  Infrastructure                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐      │
│  │Repositories│  │ Supabase  │  │ Database  │      │
│  │           │  │  Client   │  │  Types    │      │
│  └───────────┘  └───────────┘  └───────────┘      │
└─────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### 1. Presentation Layer

**Responsibility**: User interface and user interactions

**Components**:

- **Views** (`src/views/*.vue`) - Page components tied to routes
- **Components** (`src/components/*.vue`) - Reusable UI components
- **Stores** (`src/stores/*.ts`) - State management (Pinia)
- **Composables** (`src/composables/*.ts`) - Reusable logic

**Key Characteristics**:

- Vue 3 Composition API
- TypeScript strict mode
- TailwindCSS for styling
- Reactive state with Pinia

**Example**:

```typescript
// View layer uses stores and services
import { useShoppingStore } from '@/stores/shopping';

export default defineComponent({
  setup() {
    const shoppingStore = useShoppingStore();

    onMounted(() => {
      shoppingStore.loadLists();
    });

    return { shoppingStore };
  },
});
```

**Dependencies**: Can import from Domain and Infrastructure (via services)

---

### 2. Domain Layer

**Responsibility**: Business logic and domain rules

**Components**:

- **Entities** (`entities.ts`) - Domain models (TypeScript interfaces)
- **Services** (`*.service.ts`) - Business logic orchestration
- **Validation** (`validation.schemas.ts`) - Runtime validation (Zod)
- **DTOs** - Data Transfer Objects for API boundaries

**Key Characteristics**:

- Pure TypeScript (no framework dependencies)
- No database coupling
- No UI coupling
- Testable in isolation

**Example**:

```typescript
// Service orchestrates business logic
export class ShoppingService {
  async markItemPurchased(itemId: string, purchasedBy: string): Promise<ApiResponse<ShoppingItem>> {
    // 1. Validate inputs
    if (!itemId || !purchasedBy) {
      return { success: false, error: 'Invalid input' };
    }

    // 2. Update item
    const result = await shoppingItemRepository.update(itemId, {
      is_purchased: true,
      purchased_by: purchasedBy,
      purchased_at: new Date().toISOString(),
    });

    // 3. Log activity (future)
    // await activityLogService.log('item_purchased', ...);

    return result;
  }
}
```

**Dependencies**: Can import from Infrastructure (repositories only)

---

### 3. Infrastructure Layer

**Responsibility**: Data access and external services

**Components**:

- **Repositories** (`*.repository.ts`) - Data access implementations
- **Supabase Client** (`supabase.client.ts`) - Configured Supabase client
- **Database Types** (`database.types.ts`) - Generated from schema
- **Base Repository** (`base.repository.ts`) - Common CRUD operations

**Key Characteristics**:

- Implements repository interfaces
- Handles database operations
- Manages external API calls
- Type-safe database access

**Example**:

```typescript
// Repository handles data access
export class ShoppingListRepository extends BaseRepository<
  ShoppingList,
  CreateShoppingListDto,
  UpdateShoppingListDto
> {
  constructor() {
    super(supabase, 'shopping_lists');
  }

  async findByHouseholdId(householdId: string): Promise<ApiResponse<ShoppingList[]>> {
    return this.findAll((builder) =>
      builder
        .eq('household_id', householdId)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
    );
  }
}
```

**Dependencies**: None (bottom layer)

---

## Feature-Based Structure

Features are organized as **self-contained modules** with clear boundaries:

```
src/features/
├── auth/                      # Authentication feature
│   ├── domain/
│   │   ├── auth.service.ts           # Business logic
│   │   └── auth.service.mock.ts      # Mock for testing
│   ├── infrastructure/
│   │   └── (none - uses Supabase directly)
│   ├── presentation/
│   │   └── (none - uses root stores temporarily)
│   └── index.ts               # Public API
│
├── household/                 # Household management
│   ├── domain/
│   │   └── household.service.ts
│   ├── infrastructure/
│   │   ├── household.repository.ts
│   │   └── household.mock-repository.ts
│   ├── presentation/
│   │   └── (components will go here)
│   └── index.ts
│
├── shopping/                  # Shopping lists
│   ├── domain/
│   │   └── shopping.service.ts
│   ├── infrastructure/
│   │   ├── shopping.repository.ts
│   │   └── shopping.mock-repository.ts
│   ├── presentation/
│   │   └── (components will go here)
│   └── index.ts
│
├── wishlist/                  # Wishlists
│   ├── domain/
│   │   └── wishlist.service.ts
│   ├── infrastructure/
│   │   ├── wishlist.repository.ts
│   │   └── wishlist.mock-repository.ts
│   ├── presentation/
│   │   └── (components will go here)
│   └── index.ts
│
└── shared/                    # Shared infrastructure
    ├── domain/
    │   ├── entities.ts               # Domain entities
    │   ├── api.ts                    # API types
    │   └── repository.interface.ts   # Repository contracts
    ├── infrastructure/
    │   ├── supabase.client.ts        # Supabase setup
    │   ├── database.types.ts         # Generated types
    │   ├── base.repository.ts        # Base repository
    │   └── mock.repository.ts        # Mock base
    └── index.ts
```

### Feature Module Pattern

Each feature exports a **public API** via `index.ts`:

```typescript
// src/features/shopping/index.ts

// Export services (singletons)
export { shoppingService } from './domain/shopping.service';

// Export repositories (for testing/mocking)
export {
  shoppingListRepository,
  shoppingItemRepository,
} from './infrastructure/shopping.repository';

// Export types (for consumers)
export type { ShoppingList, ShoppingItem, CreateShoppingListDto } from '../shared/domain/entities';
```

**Benefits**:

1. ✅ Consumers import from feature, not internal structure
2. ✅ Internal refactoring doesn't break consumers
3. ✅ Clear dependencies (only public API is accessible)
4. ✅ Easy to test (mock entire feature)

**Usage**:

```typescript
// ✅ Good - Import from feature public API
import { shoppingService } from '@/features/shopping';

// ❌ Bad - Import from internal structure
import { ShoppingService } from '@/features/shopping/domain/shopping.service';
```

---

## Design Patterns

### 1. Repository Pattern

Abstracts data access behind an interface.

**Interface** (`shared/domain/repository.interface.ts`):

```typescript
export interface Repository<TEntity, TCreateDto, TUpdateDto> {
  findAll(): Promise<ApiResponse<TEntity[]>>;
  findById(id: string): Promise<ApiResponse<TEntity>>;
  create(dto: TCreateDto): Promise<ApiResponse<TEntity>>;
  update(id: string, dto: TUpdateDto): Promise<ApiResponse<TEntity>>;
  delete(id: string): Promise<ApiResponse<void>>;
}
```

**Implementation**:

```typescript
export class ShoppingListRepository extends BaseRepository<...> {
  // Custom methods beyond base CRUD
  async findByHouseholdId(householdId: string) { ... }
  async archiveList(id: string) { ... }
}
```

**Benefits**:

- Consistent API across features
- Easy to mock for testing
- Can swap implementations (Supabase → REST → GraphQL)

See [Repository Pattern](../development/repository-pattern.md) for details.

---

### 2. Service Layer Pattern

Encapsulates business logic.

**Purpose**:

- Orchestrate multiple repositories
- Enforce business rules
- Handle complex workflows
- Return consistent `ApiResponse<T>`

**Example**:

```typescript
export class WishlistService {
  async shareWishlist(wishlistId: string): Promise<ApiResponse<Wishlist>> {
    // 1. Fetch wishlist
    const wishlist = await wishlistRepository.findById(wishlistId);
    if (!wishlist.success) return wishlist;

    // 2. Business rule: Generate unique share slug if not exists
    if (!wishlist.data.share_slug) {
      const slug = generateUniqueSlug();
      const updated = await wishlistRepository.update(wishlistId, {
        share_slug: slug,
        is_public: true,
      });
      return updated;
    }

    // 3. Update visibility
    return wishlistRepository.update(wishlistId, { is_public: true });
  }
}
```

**Benefits**:

- Business logic in one place
- Testable without database
- Reusable across features

See [Service Pattern](../development/service-pattern.md) for details.

---

### 3. Dependency Injection (via Singletons)

Each service and repository is exported as a **singleton**:

```typescript
// Export singleton instance
export const shoppingService = new ShoppingService();
```

**Benefits**:

- Simple (no DI framework needed)
- Consistent instances across app
- Easy to swap in tests

**Testing**:

```typescript
// Mock by importing mock implementation
import { mockShoppingService } from '@/features/shopping/mock';
```

---

### 4. API Response Wrapper

All async operations return `ApiResponse<T>`:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}
```

**Benefits**:

- Consistent error handling
- No throwing exceptions
- Type-safe results
- Easy to handle in UI

**Usage**:

```typescript
const result = await shoppingService.createList(dto);

if (result.success) {
  console.log('Created:', result.data);
} else {
  console.error('Error:', result.error);
}
```

---

## Data Flow

### Read Flow (Query)

```
User Action (Click)
    ↓
Component calls Store method
    ↓
Store calls Service method
    ↓
Service calls Repository method
    ↓
Repository queries Supabase
    ↓
Supabase returns DB data
    ↓
Repository maps to Domain Entity
    ↓
Service returns ApiResponse<T>
    ↓
Store updates reactive state
    ↓
Component re-renders (reactive)
```

### Write Flow (Command)

```
User Action (Submit Form)
    ↓
Component validates input (Zod)
    ↓
Component calls Store method
    ↓
Store calls Service method
    ↓
Service validates business rules
    ↓
Service calls Repository method
    ↓
Repository sends to Supabase
    ↓
Supabase validates RLS & constraints
    ↓
Supabase persists data
    ↓
Repository returns ApiResponse<T>
    ↓
Service may log activity (future)
    ↓
Store updates reactive state
    ↓
Component shows success/error toast
```

---

## Type Safety Flow

```
1. Database Schema (schema.sql)
       ↓
2. Generate Types (Supabase CLI)
       ↓
3. database.types.ts
       ↓
4. Domain Entities (entities.ts)
       ↓
5. DTOs (Create, Update)
       ↓
6. Zod Schemas (runtime validation)
       ↓
7. Service Methods (type-safe)
       ↓
8. Store State (typed)
       ↓
9. Components (typed props)
```

**Key Points**:

- Database is source of truth
- Types flow from DB to UI
- Runtime validation via Zod
- Compile-time validation via TypeScript

See [Type Safety](../development/type-safety.md) for details.

---

## Authentication & Authorization

### Authentication (Who you are)

**Provider**: Supabase Auth

**Methods**:

- Google OAuth (primary)
- Email/Password (fallback)

**Flow**:

```
User clicks "Sign in with Google"
    ↓
Redirects to Google OAuth
    ↓
Google returns to Supabase callback
    ↓
Supabase creates session
    ↓
Frontend receives session
    ↓
Auth store updates state
    ↓
Router allows protected routes
```

### Authorization (What you can do)

**Mechanism**: Row Level Security (RLS) in PostgreSQL

**Enforcement Points**:

1. **Database** - RLS policies (primary)
2. **Frontend** - UI restrictions (secondary)

**Row Level Security**:

```sql
-- Example: Users can only see shopping lists from their families
create policy shopping_lists_select on shopping_lists
for select using (
  exists (
    select 1 from family_members
    where family_id = shopping_lists.family_id
      and user_id = auth.uid()
  )
);
```

**Role-Based Access**:

- `owner` - Full control
- `admin` - Management permissions (future)
- `member` - Content creation
- `child` - Limited access (future)
- `viewer` - Read-only (future)

See [RLS Policies](../backend/rls-policies.md) for complete policy documentation.

---

## State Management

**Library**: Pinia (Vue 3 official state management)

### Store Registry

| Store ID           | Location                                               | Purpose                       |
| ------------------ | ------------------------------------------------------ | ----------------------------- |
| `auth`             | `@/stores/auth.ts`                                     | User authentication (primary) |
| `auth-feature`     | `@/features/auth/presentation/auth.store.ts`           | Feature testing only          |
| `household`        | `@/stores/household.ts`                                | Current household context     |
| `household-entity` | `@/features/household/presentation/household.store.ts` | CRUD operations               |
| `shopping`         | `@/features/shopping/presentation/shopping.store.ts`   | Shopping lists & items        |
| `wishlist`         | `@/features/wishlist/presentation/wishlist.store.ts`   | Wishlists & items             |
| `toast`            | `@/stores/toast.ts`                                    | Toast notifications           |

**⚠️ CRITICAL**: Store IDs must be unique across the entire application. Duplicate IDs cause silent state sharing bugs.

### Store Organization

```plaintext
stores/
├── auth.ts                  # User authentication (ID: 'auth')
├── household.ts             # Current household context (ID: 'household')
└── toast.ts                 # Toast notifications (ID: 'toast')

features/
├── shopping/presentation/
│   └── shopping.store.ts    # Shopping lists (ID: 'shopping')
├── wishlist/presentation/
│   └── wishlist.store.ts    # Wishlists (ID: 'wishlist')
└── household/presentation/
    └── household.store.ts   # Household CRUD (ID: 'household-entity')
```

### Store Pattern (Setup Syntax)

```typescript
export const useShoppingStore = defineStore('shopping', () => {
  // ─── State ────────────────────────────────────────────
  const lists = ref<ShoppingList[]>([]);
  const currentList = ref<ShoppingList | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ─── Getters (computed) ───────────────────────────────
  const activeLists = computed(() => lists.value.filter((l) => l.status === 'active'));

  // ─── Reset (for logout) ───────────────────────────────
  function $reset() {
    lists.value = [];
    currentList.value = null;
    loading.value = false;
    error.value = null;
  }

  // ─── Setters (actions) ────────────────────────────────
  function setCurrentList(list: ShoppingList | null) {
    currentList.value = list;
  }

  // ─── Async Actions ────────────────────────────────────
  async function loadLists(householdId: string) {
    loading.value = true;
    const result = await shoppingService.getListsForHousehold(householdId);
    if (result.success) {
      lists.value = result.data;
    }
    loading.value = false;
  }

  return {
    // State
    lists,
    currentList,
    loading,
    error,
    // Getters
    activeLists,
    // Reset & Setters
    $reset,
    setCurrentList,
    // Actions
    loadLists,
  };
});
```

### Logout Cleanup Pattern

All stores must be reset on logout to prevent data leakage between sessions:

```typescript
// In App.vue watch for auth state
watch(
  () => authStore.user?.id,
  (userId, prevUserId) => {
    if (!userId && prevUserId) {
      // User logged out - reset ALL stores
      householdStore.$reset();
      shoppingStore.$reset();
      wishlistStore.$reset();
    }
  },
);
```

### Usage in Components

```typescript
// ✅ Correct - use store instance
const shoppingStore = useShoppingStore();
shoppingStore.loadLists(householdId);
shoppingStore.setCurrentList(list);

// ❌ Wrong - direct mutation
shoppingStore.currentList = list;

// ✅ Correct - destructure with storeToRefs for reactivity
const { lists, loading } = storeToRefs(shoppingStore);

// ❌ Wrong - loses reactivity
const { lists } = shoppingStore;
```

See [State Management](../frontend/state-management.md) for details.

---

## Mock Mode (Frontend-Only)

The application can run **entirely in the browser** without Supabase.

**Configuration**:

```env
VITE_USE_MOCK_BACKEND=true
```

**How It Works**:

1. Check `isMockMode()` at runtime
2. Use `MockRepository` instead of `BaseRepository`
3. Data stored in `localStorage`
4. Mock authentication (auto-login)

**Mock Repositories**:

```typescript
export class MockShoppingListRepository extends MockRepository<...> {
  constructor() {
    super('shopping_lists'); // localStorage key
  }

  // Same interface as real repository
  async findByHouseholdId(householdId: string) {
    const allLists = this.loadFromStorage();
    return {
      success: true,
      data: allLists.filter(l => l.household_id === householdId),
    };
  }
}
```

**Benefits**:

- No backend needed for development
- Easy demos
- GitHub Pages deployment
- Faster development iteration

See [Mock Mode](../features/mock-mode.md) for details.

---

## Testing Strategy

**Framework**: Vitest + Testing Library

**Coverage**: Minimum 70% (enforced by CI)

### Test Organization

```
src/
├── __tests__/                      # Integration tests
│   ├── auth-store.test.ts
│   ├── shopping-store.test.ts
│   └── household-store.test.ts
│
└── features/
    └── shopping/
        ├── domain/
        │   └── shopping.service.test.ts    # Unit tests
        └── infrastructure/
            └── shopping.repository.test.ts  # Unit tests
```

### Testing Patterns

**1. Repository Tests** (mock Supabase):

```typescript
vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [...], error: null }),
    })),
  },
}));
```

**2. Service Tests** (mock repositories):

```typescript
vi.mock('@/features/shopping/infrastructure/shopping.repository', () => ({
  shoppingListRepository: {
    create: vi.fn().mockResolvedValue({ success: true, data: mockList }),
  },
}));
```

**3. Store Tests** (mock services):

```typescript
vi.mock('@/features/shopping', () => ({
  shoppingService: {
    getListsForHousehold: vi.fn().mockResolvedValue({ success: true, data: [...] }),
  },
}));
```

See [Testing Guide](../testing/overview.md) for details.

---

## Deployment Architecture

### Static Hosting (GitHub Pages, Vercel)

```
┌──────────────┐
│   Browser    │ ← Vue SPA (static files)
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│   Supabase   │ ← Backend (PostgreSQL + Auth + Storage)
└──────────────┘
```

**Advantages**:

- Simple deployment
- Free hosting options
- Global CDN
- Automatic SSL

### Supabase Architecture

```
┌─────────────────┐
│  PostgreSQL DB  │ ← Data storage
│  (RLS enabled)  │
└────────┬────────┘
         │
┌────────┴────────┐
│  Supabase API   │ ← REST API (auto-generated)
│  (Row Security) │
└────────┬────────┘
         │
┌────────┴────────┐
│  Auth Service   │ ← Supabase Auth (Google OAuth, Email/Pass)
└────────┬────────┘
         │
┌────────┴────────┐
│  Storage        │ ← File storage (wishlist images)
└─────────────────┘
```

See [Deployment Guide](../deployment/overview.md) for details.

---

## Security Architecture

### Defense in Depth

1. **Database Level** (Primary):
   - Row Level Security (RLS) policies
   - Foreign key constraints
   - Check constraints
   - Triggers

2. **API Level**:
   - Supabase Auth JWT validation
   - API key authentication
   - Rate limiting (Supabase)

3. **Frontend Level** (Secondary):
   - Route guards (AuthGuard)
   - Role-based UI hiding
   - Input validation (Zod)
   - XSS prevention (Vue auto-escaping)

**Security Principles**:

- Never trust client-side validation
- RLS is source of truth
- Authenticate every request
- Validate all inputs
- Log security events

---

## Performance Considerations

### Database Optimization

- ✅ Strategic indexes on foreign keys
- ✅ Materialized views for analytics (future)
- ✅ Query result caching via Supabase
- ✅ Pagination for large datasets

### Frontend Optimization

- ✅ Code splitting (Vite)
- ✅ Lazy loading routes
- ✅ Computed properties (Pinia)
- ✅ Virtual scrolling for large lists (future)
- ✅ Image optimization (future)

### Caching Strategy

- ✅ Supabase query caching
- ✅ Pinia state caching
- ✅ Browser localStorage for mock mode
- ⚠️ Application-level caching (planned)

---

## Scalability

### Current Limits

- Single Supabase project
- Regional deployment
- Vertical scaling only

### Future Enhancements

- Multi-region deployment
- Read replicas for analytics
- CDN for static assets
- Background job processing (Edge Functions)

---

## Technology Decisions

See [Architecture Decision Records (ADR)](../adr/) for detailed rationale:

- [ADR-001: Clean Architecture](../adr/001-clean-architecture.md)
- [ADR-002: Feature-Based Structure](../adr/002-feature-based-structure.md)
- [ADR-003: Repository Pattern](../adr/003-repository-pattern.md)
- [ADR-004: Multi-Tenant Households](../adr/004-multi-tenant-households.md)
- [ADR-005: Mock Mode](../adr/005-mock-mode.md)

---

## Related Documentation

- [Clean Architecture Details](clean-architecture.md)
- [Feature Structure Guide](feature-structure.md)
- [Multi-Tenant Design](multi-tenant.md)
- [Database Schema](../backend/database-schema.md)
- [Domain Model](../domain/overview.md)

---

**Last Updated**: February 21, 2026
