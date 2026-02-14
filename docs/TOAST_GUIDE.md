# Toast Notification System - Visual Guide

## Toast Types

The toast notification system supports four types of messages:

### 1. Success Toast (Green)

```typescript
useToastStore().success('Trip created successfully!');
```

- **Color**: Green background with green border
- **Icon**: ✓ (checkmark)
- **Default Duration**: 3 seconds
- **Use Cases**: Successful operations (create, update, delete)

### 2. Error Toast (Red)

```typescript
useToastStore().error('Failed to load trips: Connection timeout');
```

- **Color**: Red background with red border
- **Icon**: ✕ (cross)
- **Default Duration**: 5 seconds
- **Use Cases**: Failed operations, validation errors

### 3. Warning Toast (Yellow)

```typescript
useToastStore().warning('Some items were skipped');
```

- **Color**: Yellow/amber background with amber border
- **Icon**: ⚠ (warning symbol)
- **Default Duration**: 4 seconds
- **Use Cases**: Partial success, warnings, deprecation notices

### 4. Info Toast (Blue)

```typescript
useToastStore().info('Loading trip data...');
```

- **Color**: Blue background with blue border
- **Icon**: ℹ (information symbol)
- **Default Duration**: 3 seconds
- **Use Cases**: Informational messages, status updates

## Features

### Auto-Dismiss

All toasts automatically dismiss after their duration:

```typescript
// Custom duration (in milliseconds)
useToastStore().success('Message', 10000); // 10 seconds
```

### Manual Close

Users can close any toast by clicking the × button

### Multiple Toasts

Multiple toasts stack vertically in the bottom-right corner

### Smooth Animations

- **Slide In**: Toast slides in from the right
- **Slide Out**: Toast slides out to the right when dismissed

## Usage in Different Layers

### In Stores (Recommended)

```typescript
// stores/trips.ts
async createTrip(payload: NewTripPayload) {
  const response = await createTrip(payload);
  if (response.error) {
    useToastStore().error(`Failed to create trip: ${response.error.message}`);
    return null;
  }
  if (response.data) {
    useToastStore().success('Trip created successfully!');
  }
  return response.data;
}
```

### In Components with useAsyncHandler

```typescript
// Automatic toast handling
const { loading, execute } = useAsyncHandler({
  successMessage: 'Trip created!',
  errorPrefix: 'Create failed',
});

await execute(() => tripService.createTrip(payload));
// Toasts shown automatically!
```

### Direct Usage in Components (Edge Cases)

```typescript
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();

const handleCustomAction = () => {
  toastStore.info('Processing your request...');
  // ... do work ...
  toastStore.success('Done!');
};
```

## Best Practices

### ✅ DO

- Use success toasts for completed actions
- Use error toasts for failures with clear messages
- Keep messages concise and actionable
- Use consistent message patterns

### ❌ DON'T

- Don't show toasts for every minor action
- Don't use technical error messages (show user-friendly text)
- Don't stack too many toasts (they auto-dismiss)
- Don't use toasts for critical confirmations (use modals instead)

## Examples

### Good Toast Messages

```typescript
✅ "Trip created successfully!"
✅ "Failed to save: Network connection lost"
✅ "Template applied: 5 items added, 2 skipped"
✅ "Changes saved automatically"
```

### Poor Toast Messages

```typescript
❌ "Error: PostgrestError: 23505"  // Too technical
❌ "Something went wrong"  // Too vague
❌ "The operation you attempted to perform has encountered an unexpected..." // Too long
❌ "OK"  // Not informative
```

## Styling

The toast container uses Tailwind CSS classes and can be customized in:
`src/components/shared/ToastContainer.vue`

Current styling:

- **Position**: Fixed, bottom-right (4rem from bottom and right)
- **Width**: Min 300px, Max 400px
- **Shadow**: Large shadow for depth
- **Border**: 1px colored border matching toast type
- **Border Radius**: Rounded-lg (0.5rem)
- **Padding**: 1rem (16px)

## Accessibility

- **role="alert"**: Announces toasts to screen readers
- **aria-live="polite"**: Non-intrusive announcements
- **Keyboard Accessible**: Close buttons are focusable
- **Color + Icon**: Not relying on color alone (icons provide visual cues)

## Testing Toast Notifications

To test toasts in your component:

```typescript
// Test success
const testSuccess = () => {
  useToastStore().success('This is a success message!');
};

// Test error
const testError = () => {
  useToastStore().error('This is an error message!');
};

// Test all types
const testAll = () => {
  useToastStore().success('Success message');
  setTimeout(() => useToastStore().error('Error message'), 500);
  setTimeout(() => useToastStore().warning('Warning message'), 1000);
  setTimeout(() => useToastStore().info('Info message'), 1500);
};
```

## Technical Implementation

The toast system consists of:

1. **Store** (`src/stores/toast.ts`)
   - Reactive state for toast array
   - Methods to add/remove toasts
   - Auto-dismiss timers

2. **Component** (`src/components/shared/ToastContainer.vue`)
   - Renders all active toasts
   - Handles animations
   - Provides close button

3. **App Integration** (`src/App.vue`)
   - Toast container added at root level
   - Available throughout the app

## Performance

- **Lightweight**: Minimal overhead (< 2KB minified)
- **Efficient**: Only re-renders when toasts change
- **No Memory Leaks**: Timers properly cleaned up
- **Smooth Animations**: CSS transitions (GPU accelerated)
