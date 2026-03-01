# 🧪 Testing Guide

Testing strategy and practices for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

The project uses **[Vitest](https://vitest.dev/)** for unit testing and **[Vue Test Utils](https://test-utils.vuejs.org/)** for component testing.

**Coverage requirement**: 70% minimum for lines, branches, functions, and statements (enforced by CI).

---

## Running Tests

```bash
# Run all tests once
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx vitest run src/features/shopping/__tests__/shopping.store.test.ts
```

Coverage report is generated in `coverage/` as HTML and LCOV formats.

---

## Test File Location

Tests are co-located with source files in `__tests__/` directories:

```
src/
├── features/
│   ├── shopping/
│   │   ├── __tests__/
│   │   │   ├── shopping.store.test.ts
│   │   │   └── shopping.repository.test.ts
│   │   └── presentation/
│   │       └── shopping.store.ts
├── stores/
│   └── __tests__/
│       └── auth.store.test.ts
└── components/
    └── shared/
        └── __tests__/
            └── simple-components.test.ts
```

---

## What to Test

### Pinia Stores (Priority: High)

Stores contain the most business logic — test them first:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShoppingStore } from '../presentation/shopping.store';

// Mock the repository factory
vi.mock('../infrastructure/shopping.factory', () => ({
  createShoppingListRepository: () => ({
    findByHouseholdId: vi
      .fn()
      .mockResolvedValue([{ id: '1', title: 'Groceries', household_id: 'hh-1', status: 'active' }]),
    create: vi.fn().mockResolvedValue({ id: '2', title: 'Hardware', household_id: 'hh-1' }),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('ShoppingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads lists for a household', async () => {
    const store = useShoppingStore();
    await store.loadLists('hh-1');
    expect(store.lists).toHaveLength(1);
    expect(store.lists[0].title).toBe('Groceries');
  });

  it('sets isLoading during fetch', async () => {
    const store = useShoppingStore();
    const promise = store.loadLists('hh-1');
    expect(store.isLoading).toBe(true);
    await promise;
    expect(store.isLoading).toBe(false);
  });

  it('resets state on $reset', async () => {
    const store = useShoppingStore();
    await store.loadLists('hh-1');
    store.$reset();
    expect(store.lists).toHaveLength(0);
  });
});
```

### Domain Entities and Utilities (Priority: Medium)

Pure functions in the domain layer are easy to test without mocking:

```typescript
import { describe, it, expect } from 'vitest';
import { validateHouseholdName } from '../domain/household.validation';

describe('validateHouseholdName', () => {
  it('accepts valid names', () => {
    expect(validateHouseholdName('Smith Family')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateHouseholdName('')).toBe(false);
  });
});
```

### Vue Components (Priority: Medium)

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import { createPinia } from 'pinia';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('renders the title', () => {
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [createPinia()],
      },
      props: { title: 'Test Title' },
    });
    expect(wrapper.text()).toContain('Test Title');
  });
});
```

### Mock Repositories (Priority: Low)

Mock repositories that store data in localStorage:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ShoppingListMockRepository } from '../infrastructure/shopping.mock-repository';

describe('ShoppingListMockRepository', () => {
  let repo: ShoppingListMockRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new ShoppingListMockRepository();
  });

  it('creates and retrieves a list', async () => {
    await repo.create({ household_id: 'hh-1', title: 'Test List' });
    const lists = await repo.findByHouseholdId('hh-1');
    expect(lists).toHaveLength(1);
    expect(lists[0].title).toBe('Test List');
  });

  it('does not return lists from other households', async () => {
    await repo.create({ household_id: 'hh-1', title: 'List A' });
    const lists = await repo.findByHouseholdId('hh-2');
    expect(lists).toHaveLength(0);
  });
});
```

---

## Coverage Requirements

CI enforces 70% coverage across all metrics:

| Metric     | Threshold |
| ---------- | --------- |
| Lines      | 70%       |
| Branches   | 70%       |
| Functions  | 70%       |
| Statements | 70%       |

Coverage configuration is in `vite.config.ts`:

```typescript
test: {
  coverage: {
    provider: 'v8',
    thresholds: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
},
```

---

## Testing Checklist

For every new feature or bug fix:

- [ ] Unit tests for new Pinia stores
- [ ] Tests for domain validation functions
- [ ] Tests for mock repository (CRUD + tenant isolation)
- [ ] Component tests for critical UI interactions
- [ ] Coverage ≥ 70% after changes

---

## Common Patterns

### Mocking Supabase

Supabase is never called directly in tests. Instead, mock the factory function:

```typescript
vi.mock('@/features/shopping/infrastructure/shopping.factory');
```

### Setting Up Pinia

Every test file that uses stores must activate a fresh Pinia:

```typescript
beforeEach(() => {
  setActivePinia(createPinia());
});
```

### localStorage in Tests

Vitest runs in jsdom environment which supports localStorage. Clear it between tests:

```typescript
beforeEach(() => {
  localStorage.clear();
});
```

---

## See Also

- [CI/CD Pipeline](../operations/ci-cd.md) — How tests run in CI
- [Adding Features](../development/adding-features.md) — Creating tests for new features
