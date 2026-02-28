# Navigation Structure

**Last Updated**: February 2026  
**Components**: `SidebarNav.vue`, `BottomNav.vue`

---

## Overview

The application uses a responsive sidebar navigation that appears:

- **Desktop**: Fixed sidebar on the left
- **Mobile**: Bottom navigation bar

---

## Sidebar Menu Items

### Primary Navigation

#### Desktop Sidebar (SidebarNav.vue)

| Icon | Label      | Route         | Description                                 |
| ---- | ---------- | ------------- | ------------------------------------------- |
| 🏘️   | Households | `/households` | List and switch between households          |
| 🛒   | Shopping   | `/shopping`   | Shared shopping lists for current household |
| 🎁   | Wishlists  | `/wishlists`  | Personal wishlists (public sharing)         |
| 🎮   | Apps       | `/apps`       | Mini-apps launcher hub                      |
| ⚙️   | Settings   | `/settings`   | User and app settings                       |

#### Mobile Bottom Navigation (BottomNav.vue)

| Icon | Label     | Route        | Description                                     |
| ---- | --------- | ------------ | ----------------------------------------------- |
| 🏠   | Home      | `/`          | Main dashboard view                             |
| 🛒   | Shopping  | `/shopping`  | Shared shopping lists                           |
| 🎁   | Wishlists | `/wishlists` | Personal wishlists                              |
| ⋯    | More      | (dropdown)   | Additional options (Households, Apps, Settings) |

---

## Active State Logic

The sidebar uses intelligent active state highlighting:

```typescript
// SidebarNav.vue
function isActive(itemName: string): boolean {
  const currentRouteName = route.name as string;
  return currentRouteName === itemName;
}

// BottomNav.vue
function isActive(routeName: string): boolean {
  const currentRouteName = route.name as string;

  // Match related routes for navigation items
  if (routeName === 'household-list') {
    return currentRouteName?.startsWith('household') || currentRouteName === 'member-management';
  }
  if (routeName === 'shopping') {
    return currentRouteName?.startsWith('shopping');
  }
  if (routeName === 'wishlist-list') {
    return currentRouteName?.startsWith('wishlist');
  }

  return currentRouteName === routeName;
}
```

### Special Cases

- **Households** - Active when viewing household list or detail pages
- **Shopping** - Active for all shopping-related routes
- **Wishlists** - Active for all wishlist-related routes

---

## Responsive Design

### Desktop (≥1024px)

- Fixed sidebar on left side (`SidebarNav.vue`)
- Full labels visible
- Icons + text navigation
- All primary menu items visible

### Mobile (<1024px)

- Bottom navigation bar (`BottomNav.vue`)
- Fixed to bottom of viewport
- Primary actions: Home, Shopping, Wishlists
- "More" menu (⋯) for additional options:
  - Households
  - Apps
  - Settings
- Swipe-friendly layout
- Safe area insets for notched devices

---

## Recent Changes

### February 2026: Navigation Simplification

**Removed Items**:

- ❌ **Manage Household** menu item removed from both sidebar and bottom navigation
  - Reason: Direct access via household cards in `/households` view
  - Household management now accessible by clicking on household card

**New Behavior**:

- ✅ **Auto-switching**: Clicking a household card now automatically switches the current household
- ✅ **Simplified navigation**: Reduced navigation clutter on mobile
- ✅ **More menu**: Additional items moved to "More" dropdown on mobile

### January 2025: Initial Menu Expansion

1. **Households** 🏘️
   - Dedicated view to list all households and switch between them
   - Route: `/households`

2. **Apps** 🎮
   - New mini-apps hub
   - Apps: Rock-Paper-Scissors game
   - Route: `/apps`

---

## Implementation Details

### Component Locations

- Desktop: `src/components/layout/SidebarNav.vue`
- Mobile: `src/components/layout/BottomNav.vue`
- Household Switcher: `src/components/layout/HouseholdSwitcher.vue`

### Key Features

- Vue Router integration
- Reactive active state
- SVG icons from Heroicons
- Tailwind CSS styling
- Dark mode support
- Responsive breakpoints

### Example Usage

The sidebar is included in the main app layout:

```vue
<template>
  <div class="app-container">
    <SidebarNav />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
```

---

## Authentication

All routes in the sidebar require authentication:

```typescript
meta: {
  requiresAuth: true;
}
```

Unauthenticated users are redirected to the login page.

---

## Accessibility

- Semantic HTML (`<nav>`, `<a>` tags)
- ARIA labels for icon-only buttons
- Keyboard navigation support
- Focus indicators
- Screen reader friendly

---

## Household Switching

### Auto-Switch on Navigation

When a user clicks on a household card in `/households`, the app automatically:

1. Switches the current household (`householdStore.switchHousehold(id)`)
2. Updates the household switcher in the app header
3. Navigates to the household detail page

**Implementation** (`HouseholdListView.vue`):

```vue
<RouterLink
  :to="{ name: 'household-detail', params: { id: household.id } }"
  @click="handleHouseholdClick(household.id)"
>
```

```typescript
const handleHouseholdClick = (householdId: string) => {
  householdStore.switchHousehold(householdId);
};
```

---

## Related Files

- Components:
  - `src/components/layout/SidebarNav.vue`
  - `src/components/layout/BottomNav.vue`
  - `src/components/layout/HouseholdSwitcher.vue`
  - `src/components/shared/ToastContainer.vue`
- Router: `src/router/index.ts`
- Views:
  - `src/views/AppsView.vue`
  - `src/views/HouseholdListView.vue`
  - `src/views/MemberManagementView.vue`
- Stores:
  - `src/stores/household.ts`
  - `src/stores/toast.ts`

---

## Future Enhancements

Potential improvements:

- [ ] Collapsible sidebar on desktop
- [ ] User preference for navigation style
- [ ] Quick actions menu
- [ ] Notification badges
- [ ] Keyboard shortcuts overlay

---

**See Also**:

- [Architecture Overview](../architecture/overview.md)
- [RBAC Permissions](../architecture/rbac-permissions.md)
