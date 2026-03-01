# 🛠 Adding Features Guide

Step-by-step guide to adding new features to the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

New features follow the **Clean Architecture** pattern with a feature-based module structure. Each feature is self-contained and lives in `src/features/<feature-name>/`.

---

## Step 1: Plan the Feature

Before writing code, answer these questions:

1. Which **household** does this data belong to? (It must be scoped to a household)
2. Which **roles** can perform which actions?
3. What **database tables** are needed?
4. What **API interface** (repository) is needed?

---

## Step 2: Create the Module Structure

```bash
mkdir -p src/features/my-feature/{domain,infrastructure,presentation}
```

Resulting structure:

```
src/features/my-feature/
├── domain/
│   ├── my-feature.entities.ts       # TypeScript interfaces
│   └── my-feature.repository.interface.ts
├── infrastructure/
│   ├── my-feature.repository.ts     # Supabase implementation
│   ├── my-feature.mock-repository.ts # Mock implementation
│   └── my-feature.factory.ts        # Factory function
├── presentation/
│   └── my-feature.store.ts          # Pinia store
└── index.ts                         # Public exports
```

---

## Step 3: Define Domain Entities

```typescript
// src/features/my-feature/domain/my-feature.entities.ts

export interface MyFeatureItem {
  id: string;
  household_id: string; // ← Always include this
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CreateMyFeatureItemDto = Pick<MyFeatureItem, 'household_id' | 'title'>;
export type UpdateMyFeatureItemDto = Partial<Pick<MyFeatureItem, 'title'>>;
```

---

## Step 4: Define the Repository Interface

```typescript
// src/features/my-feature/domain/my-feature.repository.interface.ts

import type {
  MyFeatureItem,
  CreateMyFeatureItemDto,
  UpdateMyFeatureItemDto,
} from './my-feature.entities';

export interface IMyFeatureRepository {
  findByHouseholdId(householdId: string): Promise<MyFeatureItem[]>;
  findById(id: string): Promise<MyFeatureItem | null>;
  create(dto: CreateMyFeatureItemDto): Promise<MyFeatureItem>;
  update(id: string, dto: UpdateMyFeatureItemDto): Promise<MyFeatureItem>;
  delete(id: string): Promise<void>;
}
```

---

## Step 5: Implement the Supabase Repository

```typescript
// src/features/my-feature/infrastructure/my-feature.repository.ts

import { supabase } from '@/services/supabaseClient';
import type { IMyFeatureRepository } from '../domain/my-feature.repository.interface';
import type {
  MyFeatureItem,
  CreateMyFeatureItemDto,
  UpdateMyFeatureItemDto,
} from '../domain/my-feature.entities';

export class MyFeatureRepository implements IMyFeatureRepository {
  async findByHouseholdId(householdId: string): Promise<MyFeatureItem[]> {
    const { data, error } = await supabase
      .from('my_feature_items')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async create(dto: CreateMyFeatureItemDto): Promise<MyFeatureItem> {
    const { data, error } = await supabase.from('my_feature_items').insert(dto).select().single();

    if (error) throw error;
    return data;
  }

  // ... implement other methods
}
```

---

## Step 6: Implement the Mock Repository

```typescript
// src/features/my-feature/infrastructure/my-feature.mock-repository.ts

import type { IMyFeatureRepository } from '../domain/my-feature.repository.interface';
import type {
  MyFeatureItem,
  CreateMyFeatureItemDto,
  UpdateMyFeatureItemDto,
} from '../domain/my-feature.entities';

const STORAGE_KEY = 'mock_my_feature_items';

export class MyFeatureMockRepository implements IMyFeatureRepository {
  private getAll(): MyFeatureItem[] {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  }

  private saveAll(items: MyFeatureItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async findByHouseholdId(householdId: string): Promise<MyFeatureItem[]> {
    return this.getAll().filter((item) => item.household_id === householdId);
  }

  async create(dto: CreateMyFeatureItemDto): Promise<MyFeatureItem> {
    const item: MyFeatureItem = {
      ...dto,
      id: crypto.randomUUID(),
      created_by: 'mock-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.saveAll([...this.getAll(), item]);
    return item;
  }

  // ... implement other methods
}
```

---

## Step 7: Create the Factory

```typescript
// src/features/my-feature/infrastructure/my-feature.factory.ts

import { isMockMode } from '@/config/backend.config';
import type { IMyFeatureRepository } from '../domain/my-feature.repository.interface';
import { MyFeatureRepository } from './my-feature.repository';
import { MyFeatureMockRepository } from './my-feature.mock-repository';

export function createMyFeatureRepository(): IMyFeatureRepository {
  return isMockMode() ? new MyFeatureMockRepository() : new MyFeatureRepository();
}
```

---

## Step 8: Create the Pinia Store

```typescript
// src/features/my-feature/presentation/my-feature.store.ts

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { createMyFeatureRepository } from '../infrastructure/my-feature.factory';
import type { MyFeatureItem, CreateMyFeatureItemDto } from '../domain/my-feature.entities';

export const useMyFeatureStore = defineStore('my-feature', () => {
  const items = ref<MyFeatureItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const repo = createMyFeatureRepository();

  async function loadItems(householdId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      items.value = await repo.findByHouseholdId(householdId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      isLoading.value = false;
    }
  }

  async function createItem(dto: CreateMyFeatureItemDto): Promise<void> {
    const item = await repo.create(dto);
    items.value.unshift(item);
  }

  function $reset(): void {
    items.value = [];
    isLoading.value = false;
    error.value = null;
  }

  return { items, isLoading, error, loadItems, createItem, $reset };
});
```

---

## Step 9: Write Tests

```typescript
// src/features/my-feature/__tests__/my-feature.store.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMyFeatureStore } from '../presentation/my-feature.store';

vi.mock('../infrastructure/my-feature.factory', () => ({
  createMyFeatureRepository: () => ({
    findByHouseholdId: vi
      .fn()
      .mockResolvedValue([{ id: '1', household_id: 'hh-1', title: 'Test Item' }]),
    create: vi.fn().mockResolvedValue({ id: '2', household_id: 'hh-1', title: 'New Item' }),
  }),
}));

describe('MyFeatureStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads items for a household', async () => {
    const store = useMyFeatureStore();
    await store.loadItems('hh-1');
    expect(store.items).toHaveLength(1);
    expect(store.items[0].title).toBe('Test Item');
  });
});
```

---

## Step 10: Add Database Migration

Create `supabase/migrations/0NN_add_my_feature.sql`:

```sql
-- Create table
CREATE TABLE IF NOT EXISTS my_feature_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  created_by   UUID NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE my_feature_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "my_feature_items_select"
  ON my_feature_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE household_id = my_feature_items.household_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- Indexes
CREATE INDEX idx_my_feature_items_household_id ON my_feature_items(household_id);
```

---

## Step 11: Update Documentation

- Add feature to `docs/features/`
- Update `docs/architecture/overview.md` if architecture changes
- Update RBAC permissions table if new roles/permissions added

---

## See Also

- [Repository Pattern](repository-pattern.md) — Repository pattern details
- [Clean Architecture](../architecture/clean-architecture.md) — Architecture overview
- [Testing Guide](../testing/overview.md) — Testing strategy
