# Navigation Structure

**Last Updated**: January 2025  
**Component**: `SidebarNav.vue`

---

## Overview

The application uses a responsive sidebar navigation that appears:

- **Desktop**: Fixed sidebar on the left
- **Mobile**: Bottom navigation bar

---

## Sidebar Menu Items

### Primary Navigation

| Icon | Label            | Route               | Description                                   |
| ---- | ---------------- | ------------------- | --------------------------------------------- |
| 🏠   | Dashboard        | `/`                 | Main dashboard view                           |
| 🏘️   | Households       | `/households`       | List and switch between households            |
| 👨‍👩‍👧‍👦   | Manage Household | `/household-detail` | Manage current household members and settings |
| 🛒   | Shopping Lists   | `/shopping`         | Shared shopping lists for current household   |
| 🎁   | Wishlists        | `/wishlists`        | Personal wishlists (public sharing)           |
| 🎮   | Apps             | `/apps`             | Mini-apps launcher hub                        |
| ⚙️   | Settings         | `/settings`         | User and app settings                         |

---

## Active State Logic

The sidebar uses intelligent active state highlighting:

```typescript
const isActive = (routeName: string): boolean => {
  if (route.name === routeName) return true;

  // Special cases for nested routes
  if (routeName === 'household-detail') {
    return route.name === 'member-management';
  }

  return false;
};
```

### Special Cases

- **Manage Household** - Also active when viewing member management
- **Apps** - Remains active when using sub-apps like Rock-Paper-Scissors

---

## Responsive Design

### Desktop (≥768px)

- Fixed sidebar on left side
- Full labels visible
- Icons + text navigation

### Mobile (<768px)

- Bottom navigation bar
- Icons only (no labels)
- Fixed to bottom of viewport
- Swipe-friendly layout

---

## Recent Changes (January 2025)

### New Menu Items Added

1. **Households** 🏘️
   - Previously: Users could only view/manage the _current_ household
   - Now: Dedicated view to list all households and switch between them
   - Route: `/households`

2. **Apps** 🎮
   - New mini-apps hub
   - Apps: Rock-Paper-Scissors game
   - Route: `/apps`
   - Sub-routes: `/apps/rock-paper-scissors`

### Menu Item Separation

- **Households** (🏘️) - View and switch between all households
- **Manage Household** (👨‍👩‍👧‍👦) - Manage _current_ household only

This separation clarifies the distinction between switching households vs. managing the active one.

---

## Implementation Details

### Component Location

`src/components/layout/SidebarNav.vue`

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

## Related Files

- Component: `src/components/layout/SidebarNav.vue`
- Router: `src/router/index.ts`
- Apps Hub: `src/views/AppsView.vue`
- Households View: `src/views/HouseholdsView.vue` (if exists)

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
