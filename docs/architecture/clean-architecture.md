# 🏗️ Clean Architecture

Architecture pattern used in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

The codebase follows **Clean Architecture** principles, adapted for a Vue 3 + TypeScript frontend. The core idea is that **business rules do not depend on frameworks or external services**.

The architecture is divided into three layers with a strict dependency rule: inner layers know nothing about outer layers.

```
┌─────────────────────────────────────────────────────┐
│              Presentation Layer (outermost)          │
│  Vue Components • Pinia Stores • Composables         │
│  Depends on: Domain                                  │
├─────────────────────────────────────────────────────┤
│                  Domain Layer (core)                 │
│  Entities • DTOs • Service Interfaces                │
│  Depends on: Nothing (pure TypeScript)               │
├─────────────────────────────────────────────────────┤
│         Infrastructure Layer (outermost)             │
│  Supabase Repositories • Mock Repositories           │
│  Depends on: Domain interfaces                       │
└─────────────────────────────────────────────────────┘
```

---

## Dependency Rule

> Source code dependencies must point **inward** toward higher-level policies.

```
Presentation → Domain ← Infrastructure
```

- Presentation (Vue components, stores) **depends on** domain entities and service interfaces.
- Infrastructure (Supabase repositories) **implements** domain interfaces.
- Domain has **zero dependencies** on frameworks, libraries, or external services.

---

## Layers in Detail

### Domain Layer

Located: `src/features/<feature>/domain/`

Contains:

- **Entities**: Pure TypeScript interfaces (e.g., `ShoppingList`, `Household`)
- **DTOs**: Data Transfer Objects for create/update operations
- **Service Interfaces**: TypeScript interfaces that infrastructure must implement
- **Business Rules**: Validation logic, business constraints

```typescript
// Example: domain entity (pure TypeScript, no dependencies)
export interface ShoppingList {
  id: string;
  household_id: string;
  title: string;
  status: 'active' | 'archived';
  created_by: string;
  created_at: string;
}

// Example: repository interface (defines contract)
export interface IShoppingListRepository {
  findByHouseholdId(householdId: string): Promise<ShoppingList[]>;
  create(dto: CreateShoppingListDto): Promise<ShoppingList>;
  update(id: string, dto: UpdateShoppingListDto): Promise<ShoppingList>;
  delete(id: string): Promise<void>;
}
```

### Infrastructure Layer

Located: `src/features/<feature>/infrastructure/`

Contains:

- **Supabase Repository**: Implements the domain interface using Supabase
- **Mock Repository**: Implements the domain interface using localStorage
- **Factory**: Selects the correct implementation based on config

```typescript
// Example: Supabase repository implements domain interface
export class ShoppingListRepository implements IShoppingListRepository {
  async findByHouseholdId(householdId: string): Promise<ShoppingList[]> {
    const { data } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId);
    return data ?? [];
  }
  // ...
}

// Example: Factory pattern — selects implementation
export function createShoppingListRepository(): IShoppingListRepository {
  return isMockMode() ? new ShoppingListMockRepository() : new ShoppingListRepository();
}
```

### Presentation Layer

Located: `src/features/<feature>/presentation/`

Contains:

- **Pinia Store**: State management; calls domain services/repositories
- **Vue Components**: UI components specific to the feature

```typescript
// Example: Pinia store uses the repository interface
export const useShoppingStore = defineStore('shopping', () => {
  const repo = createShoppingListRepository();

  async function loadLists(householdId: string) {
    const lists = await repo.findByHouseholdId(householdId);
    // update state...
  }
});
```

---

## Feature Module Structure

Each feature is a self-contained module:

```
src/features/shopping/
├── domain/
│   ├── entities.ts            # TypeScript interfaces
│   ├── shopping.service.ts    # Domain service (optional)
│   └── shopping.repository.interface.ts
├── infrastructure/
│   ├── shopping.repository.ts      # Supabase implementation
│   ├── shopping.mock-repository.ts # Mock implementation
│   └── shopping.factory.ts         # Factory function
├── presentation/
│   └── shopping.store.ts      # Pinia store
└── index.ts                   # Public API (re-exports)
```

---

## Benefits

| Benefit         | How                                                               |
| --------------- | ----------------------------------------------------------------- |
| Testability     | Domain and stores can be tested without a real database           |
| Mock Mode       | Swap Supabase with localStorage by changing the factory           |
| Maintainability | Clear separation; changes in Supabase don't affect business logic |
| Portability     | Replace Supabase with any backend by implementing the interface   |

---

## See Also

- [Repository Pattern Guide](../development/repository-pattern.md) — Implementing repositories
- [Domain Model](../domain/overview.md) — Core entities
- [Multi-Tenant Architecture](multi-tenant.md) — Household isolation design
