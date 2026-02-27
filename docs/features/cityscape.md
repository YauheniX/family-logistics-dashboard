# Cityscape App 🏙️

**Status**: ✅ Implemented  
**Added**: January 2025  
**Component**: `CityscapeView.vue`

---

## Overview

An interactive animated cityscape application featuring day/night toggle, animated weather elements, and clickable city components. Optimized for both desktop and mobile devices (including Samsung S25).

---

## Features

### Interactive Elements

All city elements respond to clicks with visual feedback:

- **5 Houses** - Residential buildings with windows
- **2 Streetlamps** - Light poles along the street
- **2 Trees** - Decorative vegetation
- **6 Skyscrapers** - Tall buildings forming the city skyline

### Animated Elements

- **Clouds** - Floating across the sky with CSS animations
- **Rain Drops** - Falling rain during night mode
- **Smoke** - Rising from chimneys
- **Vehicles** - Moving cars/buses on the street

### Day/Night Toggle

Toggle button (☀️/🌙) switches between:

- **Day Mode**: Blue sky background
- **Night Mode**: Dark sky background with rain animation

---

## Mobile Optimization

### Responsive Scaling

The cityscape automatically scales based on screen width:

- **Desktop (>960px)**: 100% scale
- **Samsung S25 (416-420px)**: 68% scale
- **Mobile (≤415px)**: 46% scale

### Touch Support

- All interactive elements support `:active` states for touch feedback
- No side padding on mobile for maximum width utilization
- Centered layout with horizontal scrolling if needed

---

## Technical Implementation

### Component Structure

```vue
<script setup lang="ts">
import { ref } from 'vue';

const isNightMode = ref(false);
</script>

<template>
  <div class="cityscape-container">
    <div class="city-wrapper">
      <button @click="isNightMode = !isNightMode">Toggle</button>
      <div class="city-scene" :class="{ 'night-mode': isNightMode }">
        <!-- City elements -->
      </div>
    </div>
  </div>
</template>
```

### CSS Animations

Key animations used:

- `float` - Cloud movement
- `fall` - Rain drops
- `smoke` - Rising smoke from chimneys
- `move-vehicle` - Vehicle movement

### Styling

- Scoped styles prevent CSS conflicts
- Dark mode aware (dark:bg-gray-900, dark:text-white)
- TailwindCSS utilities for container styling
- Custom CSS for city graphics

---

## Navigation Integration

### Routes

```typescript
{
  path: '/apps/cityscape',
  name: 'cityscape',
  component: () => import('../views/CityscapeView.vue'),
  meta: { requiresAuth: true }
}
```

### Breadcrumbs

Path: **Home > Apps > Cityscape**

### Apps View Tile

Located in AppsView.vue as a clickable tile:

- Emoji: 🏙️
- Title: "Cityscape"
- Description: "Interactive city scene"

---

## Testing

### Test Coverage

**39 tests** covering:

#### Rendering (9 tests)

- Container rendering
- Toggle button presence
- City wrapper structure
- City scene rendering
- Night mode initial state
- Initial class presence
- Container classes
- Button text verification
- No errors on mount

#### Interactions (4 tests)

- Toggle button click functionality
- Night mode activation
- Day mode restoration
- Multiple toggles

#### Animations (4 tests)

- Cloud animation presence
- Rain animation in night mode
- Smoke animation presence
- Vehicle animation presence

#### Mobile Experience (6 tests)

- Responsive container scaling
- Mobile-specific transforms
- Touch-friendly button sizing
- No horizontal scroll
- Centered layout
- Samsung S25 optimization

#### Night Mode (4 tests)

- Dark sky in night mode
- Light sky in day mode
- Rain visibility toggle
- Class toggling

#### City Elements (12 tests)

- Exactly 5 houses
- Exactly 2 streetlamps
- Exactly 2 trees
- Exactly 6 skyscrapers
- Correct semantic structure
- Interactive elements (hover/active states)

### Running Tests

```bash
npm test cityscape-view.test.ts
```

All tests consistently pass with 100% coverage of component functionality.

---

## Performance Considerations

- CSS animations use `transform` for GPU acceleration
- No JavaScript animations (pure CSS)
- Minimal DOM manipulation (single reactive flag)
- Scoped styles prevent global CSS pollution
- Lazy-loaded route component

---

## Future Enhancements

Potential improvements:

- [ ] Add sound effects toggle
- [ ] More weather options (snow, fog)
- [ ] Seasonal themes
- [ ] Building customization
- [ ] Save preferred mode to localStorage

---

## Related Files

- Component: `src/views/CityscapeView.vue`
- Tests: `src/__tests__/cityscape-view.test.ts`
- AppsView Tests: `src/__tests__/apps-view.test.ts` (tile integration)
- Breadcrumbs Tests: `src/__tests__/breadcrumbs-cityscape.test.ts`
- Router Tests: `src/__tests__/router-cityscape.test.ts`
- Route Config: `src/router/index.ts`
- Breadcrumbs: `src/components/layout/Breadcrumbs.vue`
- Apps Hub: `src/views/AppsView.vue`

---

## Known Issues

None reported.

---

**Last Updated**: January 2025
