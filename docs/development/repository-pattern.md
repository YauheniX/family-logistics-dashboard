# 🏭 Repository Pattern

How the repository pattern is used in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

The **Repository Pattern** abstracts data access behind an interface. Application code (stores, services) calls the repository interface — it doesn't know or care whether the data comes from Supabase or localStorage.

This enables:
- **Mock Mode** — swap the real database for localStorage with no code changes
- **Testability** — mock the repository in unit tests
- **Portability** — replace Supabase with any other backend

---

## Pattern Structure

```
IMyRepository (interface)
    ├── MyRepository (Supabase implementation)
    └── MyMockRepository (localStorage implementation)

createMyRepository() → factory function → returns correct implementation
```

---

## Interface Contract

Every repository implements an interface defined in the domain layer:

```typescript
// src/features/shopping/domain/shopping-list.repository.interface.ts

export interface IShoppingListRepository {
  findByHouseholdId(householdId: string): Promise<ShoppingList[]>;
  findById(id: string): Promise<ShoppingList | null>;
  create(dto: CreateShoppingListDto): Promise<ShoppingList>;
  update(id: string, dto: UpdateShoppingListDto): Promise<ShoppingList>;
  delete(id: string): Promise<void>;
}
```

---

## Supabase Implementation

```typescript
// src/features/shopping/infrastructure/shopping.repository.ts

export class ShoppingListRepository implements IShoppingListRepository {
  async findByHouseholdId(householdId: string): Promise<ShoppingList[]> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('household_id', householdId)  // ← Always scope to household
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async create(dto: CreateShoppingListDto): Promise<ShoppingList> {
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert(dto)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
  // ...
}
```

---

## Mock Implementation

```typescript
// src/features/shopping/infrastructure/shopping.mock-repository.ts

export class ShoppingListMockRepository implements IShoppingListRepository {
  private readonly STORAGE_KEY = 'mock_shopping_lists';

  private getAll(): ShoppingList[] {
    return JSON.parse(localStorage.getItem(this.STORAGE_KEY) ?? '[]');
  }

  async findByHouseholdId(householdId: string): Promise<ShoppingList[]> {
    // ← Same tenant filter as Supabase implementation
    return this.getAll().filter(list => list.household_id === householdId);
  }

  async create(dto: CreateShoppingListDto): Promise<ShoppingList> {
    const list: ShoppingList = {
      ...dto,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      status: 'active',
    };
    const all = this.getAll();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify([list, ...all]));
    return list;
  }
  // ...
}
```

---

## Factory Function

The factory selects the correct implementation at runtime:

```typescript
// src/features/shopping/infrastructure/shopping.factory.ts

import { isMockMode } from '@/config/backend.config';

export function createShoppingListRepository(): IShoppingListRepository {
  return isMockMode()
    ? new ShoppingListMockRepository()
    : new ShoppingListRepository();
}
```

---

## Usage in Stores

Pinia stores call the factory — they never directly instantiate a repository or call Supabase:

```typescript
// src/features/shopping/presentation/shopping.store.ts

export const useShoppingStore = defineStore('shopping', () => {
  // ← Store gets repository via factory, doesn't care which implementation
  const repo = createShoppingListRepository();

  async function loadLists(householdId: string) {
    const lists = await repo.findByHouseholdId(householdId);
    // ...
  }
});
```

---

## Testing with Mocked Repositories

In tests, mock the factory to inject a controlled repository:

```typescript
vi.mock('@/features/shopping/infrastructure/shopping.factory', () => ({
  createShoppingListRepository: () => ({
    findByHouseholdId: vi.fn().mockResolvedValue([
      { id: '1', title: 'Groceries', household_id: 'hh-1', status: 'active' }
    ]),
    create: vi.fn().mockResolvedValue({ id: '2', title: 'Hardware', household_id: 'hh-1' }),
  }),
}));
```

---

## Rules

1. **Always scope to household** — every `find*` method must accept and use `householdId`
2. **Never call Supabase directly** — only in repository implementations
3. **Mock must mirror real** — mock implementation must honour the same tenant filtering
4. **Factory decides** — stores/components call the factory, not the constructor

---

## See Also

- [Clean Architecture](../architecture/clean-architecture.md) — Why this pattern is used
- [Adding Features](adding-features.md) — How to create a new feature with this pattern
- [Multi-Tenant Architecture](../architecture/multi-tenant.md) — Household isolation
