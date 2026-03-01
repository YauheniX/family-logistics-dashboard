# 🗃️ State Management

Pinia stores and state management patterns in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

State management uses **[Pinia](https://pinia.vuejs.org/)** — the official Vue 3 state management library. The app uses the **Composition API** store style (setup stores).

---

## Store Architecture

Stores are divided into two categories:

### Global Stores (`src/stores/`)

Application-wide state shared across all features:

| File | Store ID | Responsibility |
| ---- | -------- | -------------- |
| `src/stores/auth.ts` | `auth` | User session, authentication state |
| `src/stores/household.ts` | `household` | Current household, member list |
| `src/stores/toast.ts` | `toast` | Toast notification queue |

### Feature Stores (`src/features/*/presentation/`)

Feature-scoped state:

| File | Store ID | Responsibility |
| ---- | -------- | -------------- |
| `src/features/shopping/presentation/shopping.store.ts` | `shopping` | Shopping lists and items |
| `src/features/wishlist/presentation/wishlist.store.ts` | `wishlist` | Wishlists and items |
| `src/features/household/presentation/household.store.ts` | `household-feature` | (internal use) |

---

## Store Rules

### 1. Unique Store IDs

Every `defineStore()` must use a **unique ID** across the entire application:

```typescript
// ✅ Good
export const useShoppingStore = defineStore('shopping', () => { ... });

// ❌ Bad — duplicates the global auth store ID
export const useAuthStore = defineStore('auth', () => { ... }); // in features/auth/
```

### 2. Import from Primary Store Paths

```typescript
// ✅ Good — primary stores
import { useAuthStore } from '@/stores/auth';
import { useHouseholdStore } from '@/stores/household';
import { useShoppingStore } from '@/features/shopping/presentation/shopping.store';

// ❌ Bad — feature-internal stores not meant for app-wide use
import { useAuthStore } from '@/features/auth/presentation/auth.store';
```

### 3. Use Setter Actions, Not Direct Mutation

```typescript
// ✅ Good — use action
shoppingStore.setCurrentList(list);

// ❌ Bad — direct mutation breaks Vue reactivity in strict mode
shoppingStore.currentList = list;
```

### 4. Use `storeToRefs` for Reactive Destructuring

```typescript
// ✅ Good — maintains reactivity
const { lists, isLoading } = storeToRefs(shoppingStore);

// ❌ Bad — breaks reactivity
const { lists, isLoading } = shoppingStore;
```

### 5. Reset Stores on Logout

All stores must be reset when the user logs out (prevents data leakage between sessions):

```typescript
// In App.vue or auth composable
async function logout() {
  await authService.logout();
  householdStore.$reset();
  shoppingStore.$reset();
  wishlistStore.$reset();
}
```

---

## Store Pattern (Setup Store)

All stores use the Composition API style:

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createShoppingListRepository } from '../infrastructure/shopping.factory';
import type { ShoppingList } from '../domain/shopping.entities';

export const useShoppingStore = defineStore('shopping', () => {
  // State
  const lists = ref<ShoppingList[]>([]);
  const currentList = ref<ShoppingList | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Repository (injected via factory)
  const repo = createShoppingListRepository();

  // Computed (getters)
  const activeLists = computed(() => lists.value.filter(l => l.status === 'active'));

  // Actions
  async function loadLists(householdId: string): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      lists.value = await repo.findByHouseholdId(householdId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error loading lists';
    } finally {
      isLoading.value = false;
    }
  }

  function setCurrentList(list: ShoppingList | null): void {
    currentList.value = list;
  }

  // Required: reset function for logout
  function $reset(): void {
    lists.value = [];
    currentList.value = null;
    isLoading.value = false;
    error.value = null;
  }

  return {
    // State (reactive refs)
    lists,
    currentList,
    isLoading,
    error,
    // Computed
    activeLists,
    // Actions
    loadLists,
    setCurrentList,
    $reset,
  };
});
```

---

## Auth Store

The global auth store manages Supabase session state:

```typescript
// src/stores/auth.ts — use this, not features/auth/presentation/auth.store.ts
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
auth.user        // current User | null
auth.isLoggedIn  // boolean computed
await auth.signOut()
```

---

## Household Store

The global household store manages the active household and membership:

```typescript
import { useHouseholdStore } from '@/stores/household';

const householdStore = useHouseholdStore();
householdStore.currentHousehold  // Household | null
householdStore.members           // Member[]
householdStore.currentMember     // Member | null (current user's membership)
```

---

## See Also

- [Project Structure](project-structure.md) — Directory layout
- [Adding Features](../development/adding-features.md) — Creating stores for new features
- [Architecture Overview](../architecture/overview.md) — System design
