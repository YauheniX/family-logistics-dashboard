# 🌍 Multi-Language & Dark Mode

Internationalization (i18n) and theming support for the Family Logistics Dashboard.

---

## Multi-Language Support

### Current Status

**Status:** 🚧 In Progress

The application currently supports English only, but the architecture is being prepared for multi-language support.

### Planned Implementation

#### Technologies

**Vue I18n** - Official internationalization plugin for Vue 3

```bash
npm install vue-i18n@9
```

#### Setup

**1. Create Locale Files**

```
src/
├── locales/
│   ├── en.json      # English
│   ├── es.json      # Spanish
│   ├── fr.json      # French
│   ├── de.json      # German
│   └── index.ts     # i18n setup
```

**2. English Locale (en.json)**

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "trips": "Trips",
    "templates": "Templates",
    "settings": "Settings"
  },
  "trips": {
    "title": "Trips",
    "create": "New Trip",
    "edit": "Edit Trip",
    "delete": "Delete Trip",
    "duplicate": "Duplicate Trip",
    "status": {
      "planning": "Planning",
      "booked": "Booked",
      "ready": "Ready",
      "done": "Done"
    }
  },
  "packing": {
    "title": "Packing List",
    "addItem": "Add Item",
    "categories": {
      "adult": "Adult",
      "kid": "Kid",
      "baby": "Baby",
      "roadtrip": "Road Trip",
      "custom": "Custom"
    },
    "progress": "{packed} of {total} items packed"
  },
  "budget": {
    "title": "Budget",
    "total": "Total",
    "planned": "Planned",
    "actual": "Actual",
    "categories": {
      "accommodation": "Accommodation",
      "transport": "Transportation",
      "food": "Food & Dining",
      "activities": "Activities"
    }
  }
}
```

**3. i18n Configuration**

```typescript
// src/locales/index.ts
import { createI18n } from 'vue-i18n'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import de from './de.json'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    es,
    fr,
    de
  }
})
```

**4. Install in App**

```typescript
// main.ts
import { createApp } from 'vue'
import { i18n } from './locales'
import App from './App.vue'

const app = createApp(App)
app.use(i18n)
app.mount('#app')
```

#### Usage in Components

**Template:**
```vue
<template>
  <div>
    <h1>{{ $t('trips.title') }}</h1>
    <button>{{ $t('trips.create') }}</button>
    <p>{{ $t('packing.progress', { packed: 5, total: 10 }) }}</p>
  </div>
</template>
```

**Script:**
```vue
<script setup>
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

function changeLanguage(lang) {
  locale.value = lang
}
</script>

<template>
  <select @change="changeLanguage($event.target.value)">
    <option value="en">English</option>
    <option value="es">Español</option>
    <option value="fr">Français</option>
    <option value="de">Deutsch</option>
  </select>
</template>
```

### Supported Languages (Planned)

- 🇬🇧 English (en) - Default
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇩🇪 German (de)
- 🇮🇹 Italian (it)
- 🇵🇹 Portuguese (pt)
- 🇯🇵 Japanese (ja)
- 🇨🇳 Chinese (zh)

### Locale Persistence

Store user preference in localStorage:

```typescript
// composables/useLocale.ts
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export function useLocale() {
  const { locale } = useI18n()
  
  // Load from localStorage
  const savedLocale = localStorage.getItem('user-locale')
  if (savedLocale) {
    locale.value = savedLocale
  }
  
  // Save when changed
  watch(locale, (newLocale) => {
    localStorage.setItem('user-locale', newLocale)
  })
  
  return { locale }
}
```

### Date/Number Formatting

Use locale-aware formatting:

```typescript
// Date formatting
const { d } = useI18n()
const formattedDate = d(new Date(), 'short') // Respects locale

// Number formatting
const { n } = useI18n()
const formattedPrice = n(1234.56, 'currency') // Respects locale
```

### RTL Support

For right-to-left languages (Arabic, Hebrew):

```typescript
// Detect RTL
const isRTL = computed(() => ['ar', 'he'].includes(locale.value))

// Apply to HTML
watch(isRTL, (rtl) => {
  document.documentElement.dir = rtl ? 'rtl' : 'ltr'
})
```

---

## Dark Mode Support

### Current Status

**Status:** 🚧 In Progress

Dark mode infrastructure is being prepared using TailwindCSS dark mode.

### Implementation

#### 1. TailwindCSS Configuration

```javascript
// tailwind.config.cjs
module.exports = {
  darkMode: 'class', // Use class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode colors
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        background: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        
        // Dark mode colors (optional custom)
        'dark-primary': '#60A5FA',
        'dark-secondary': '#A78BFA',
        'dark-background': '#1F2937',
        'dark-surface': '#111827',
        'dark-text': '#F9FAFB'
      }
    }
  }
}
```

#### 2. Dark Mode Composable

```typescript
// composables/useDarkMode.ts
import { ref, watch } from 'vue'

export function useDarkMode() {
  const isDark = ref(false)
  
  // Load from localStorage
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    isDark.value = true
  } else if (!savedTheme) {
    // Check system preference
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  
  // Apply theme
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
  
  applyTheme(isDark.value)
  
  // Watch for changes
  watch(isDark, (dark) => {
    applyTheme(dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  })
  
  const toggleDarkMode = () => {
    isDark.value = !isDark.value
  }
  
  return {
    isDark,
    toggleDarkMode
  }
}
```

#### 3. Theme Toggle Component

```vue
<script setup>
import { useDarkMode } from '@/composables/useDarkMode'

const { isDark, toggleDarkMode } = useDarkMode()
</script>

<template>
  <button
    @click="toggleDarkMode"
    class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
  >
    <svg v-if="isDark" class="w-6 h-6" fill="currentColor">
      <!-- Sun icon -->
      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
    </svg>
    <svg v-else class="w-6 h-6" fill="currentColor">
      <!-- Moon icon -->
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
    </svg>
  </button>
</template>
```

#### 4. Using Dark Mode in Components

```vue
<template>
  <div class="bg-white dark:bg-gray-800">
    <h1 class="text-gray-900 dark:text-gray-100">
      {{ trip.name }}
    </h1>
    <p class="text-gray-600 dark:text-gray-400">
      {{ trip.description }}
    </p>
    <button class="
      bg-blue-500 hover:bg-blue-600
      dark:bg-blue-600 dark:hover:bg-blue-700
      text-white
    ">
      Save
    </button>
  </div>
</template>
```

### Color Palette

**Light Mode:**
- Background: `#FFFFFF`
- Surface: `#F9FAFB`
- Primary: `#3B82F6` (Blue)
- Secondary: `#8B5CF6` (Purple)
- Text: `#111827`
- Text Muted: `#6B7280`

**Dark Mode:**
- Background: `#111827`
- Surface: `#1F2937`
- Primary: `#60A5FA` (Lighter Blue)
- Secondary: `#A78BFA` (Lighter Purple)
- Text: `#F9FAFB`
- Text Muted: `#9CA3AF`

### Accessibility

Ensure proper contrast ratios:

```css
/* Light mode */
.text-primary {
  @apply text-blue-600; /* Contrast ratio: 4.5:1 */
}

/* Dark mode */
.dark .text-primary {
  @apply text-blue-400; /* Contrast ratio: 7:1 */
}
```

### System Preference Detection

Auto-detect user's system theme:

```typescript
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')

prefersDark.addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    isDark.value = e.matches
  }
})
```

---

## Implementation Roadmap

### Phase 1: Dark Mode (In Progress)

- [x] TailwindCSS dark mode setup
- [ ] Dark mode composable
- [ ] Theme toggle component
- [ ] Apply dark mode to all components
- [ ] Test accessibility
- [ ] Document usage

### Phase 2: Multi-Language (Planned)

- [ ] Install vue-i18n
- [ ] Create locale files (en, es, fr, de)
- [ ] Extract all UI strings
- [ ] Language selector component
- [ ] Locale persistence
- [ ] Date/number formatting
- [ ] Test all translations

### Phase 3: Advanced Features (Future)

- [ ] RTL support
- [ ] Automatic language detection
- [ ] Crowdsourced translations
- [ ] Translation management tool
- [ ] Language-specific content

---

## Best Practices

### Translation Keys

**Structure:**
```
feature.component.element
```

**Examples:**
```
trips.card.title
trips.form.submit
packing.list.empty
budget.summary.total
```

### Pluralization

```json
{
  "items": {
    "packed": "No items packed | 1 item packed | {count} items packed"
  }
}
```

```typescript
$t('items.packed', 0) // "No items packed"
$t('items.packed', 1) // "1 item packed"
$t('items.packed', 5) // "5 items packed"
```

### Dynamic Values

```json
{
  "welcome": "Welcome back, {name}!"
}
```

```typescript
$t('welcome', { name: user.name })
```

### Avoid Concatenation

❌ **Bad:**
```typescript
const message = $t('hello') + ' ' + $t('world')
```

✅ **Good:**
```json
{
  "greeting": "Hello, world!"
}
```

---

## Testing

### Test Translations

```typescript
import { i18n } from '@/locales'

describe('Translations', () => {
  it('should have English translations', () => {
    expect(i18n.global.t('trips.title', {}, { locale: 'en' }))
      .toBe('Trips')
  })

  it('should have Spanish translations', () => {
    expect(i18n.global.t('trips.title', {}, { locale: 'es' }))
      .toBe('Viajes')
  })
})
```

### Test Dark Mode

```typescript
import { useDarkMode } from '@/composables/useDarkMode'

describe('Dark Mode', () => {
  it('should toggle dark mode', () => {
    const { isDark, toggleDarkMode } = useDarkMode()
    
    const initialState = isDark.value
    toggleDarkMode()
    expect(isDark.value).toBe(!initialState)
  })
})
```

---

## Additional Resources

- [Vue I18n Documentation](https://vue-i18n.intlify.dev/)
- [TailwindCSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [MDN Internationalization](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/i18n)

---

**Next Steps:**
- [Features Guide](Features.md) - UI features to translate
- [Architecture](Architecture.md) - Where to integrate i18n
- [Testing](Testing.md) - Test translations
