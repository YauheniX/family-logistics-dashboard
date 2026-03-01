# 🧩 Components Guide

Reusable Vue 3 components in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

Reusable components are located in `src/components/`. They follow Vue 3 Composition API patterns and use TailwindCSS for styling.

Components are divided into:

- **Shared components** (`src/components/shared/`) — used across multiple features
- **Feature components** — co-located with their feature in `src/features/<feature>/`

---

## Component Conventions

### Props

Use TypeScript interfaces for prop definitions:

```typescript
<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  isLoading: false,
});
</script>
```

### Emits

Declare emits explicitly with types:

```typescript
const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
}>();
```

### Composables

Extract stateful logic into composables in `src/composables/`:

```typescript
// Use like this in components:
const { members, isLoading, loadMembers } = useMembers();
```

---

## Shared Components

### Toast Notifications

Toast notifications are managed by the `toast` store:

```typescript
import { useToastStore } from '@/stores/toast';

const toast = useToastStore();
toast.success('List created successfully');
toast.error('Failed to save changes');
toast.info('Invitation sent');
```

---

## Key Composables

| Composable             | File                                  | Purpose                           |
| ---------------------- | ------------------------------------- | --------------------------------- |
| `useMembers`           | `composables/useMembers.ts`           | Load and manage household members |
| `useInvitations`       | `composables/useInvitations.ts`       | Invitation management             |
| `useLinkPreview`       | `composables/useLinkPreview.ts`       | Microlink URL preview             |
| `useTheme`             | `composables/useTheme.ts`             | Dark/light theme toggle           |
| `useUserProfile`       | `composables/useUserProfile.ts`       | Current user profile              |
| `useAsyncHandler`      | `composables/useAsyncHandler.ts`      | Async error handling wrapper      |
| `useAsyncState`        | `composables/useAsyncState.ts`        | Async state management            |
| `useVisibilityDisplay` | `composables/useVisibilityDisplay.ts` | Wishlist visibility labels        |

---

## Styling

All components use **TailwindCSS** utility classes. No custom CSS files are created for components — utility classes are used directly in templates.

Global styles are in `src/styles/`.

---

## Component Testing

Components are tested with **Vue Test Utils** + **Vitest**:

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import MyComponent from '../MyComponent.vue';

describe('MyComponent', () => {
  it('renders the title', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test Title' },
    });
    expect(wrapper.text()).toContain('Test Title');
  });
});
```

---

## Adding a New Component

1. Create in `src/components/shared/` (for reusable) or `src/features/<feature>/` (for feature-specific)
2. Use `<script setup lang="ts">` with typed props
3. Style with TailwindCSS utility classes
4. Write tests in `__tests__/` alongside the component
5. Export from feature's `index.ts` if needed outside the feature

---

## See Also

- [Project Structure](project-structure.md) — Directory layout
- [State Management](state-management.md) — Pinia stores
- [Adding Features](../development/adding-features.md) — Creating new features
