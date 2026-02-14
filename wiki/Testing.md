# 🧪 Testing

Testing strategy and guidelines for the Family Logistics Dashboard.

---

## Overview

The project uses **Vitest** for unit and integration testing with:
- **70% minimum coverage** enforced by CI
- **Fully isolated tests** (all Supabase calls mocked)
- **jsdom** environment for Vue component testing
- **@testing-library/vue** for component testing best practices

---

## Test Structure

```
src/
├── __tests__/
│   ├── trips-store.test.ts           # Trip CRUD operations
│   ├── packing-logic.test.ts         # Packing toggle and progress
│   ├── budget-calculations.test.ts   # Budget totals
│   ├── auth-guard.test.ts            # Router redirect logic
│   └── auth-store.test.ts            # Auth state management
├── features/
│   ├── trips/
│   │   ├── domain/
│   │   │   └── trip.service.test.ts   # Service unit tests
│   │   └── infrastructure/
│   │       └── trip.repository.test.ts # Repository tests
│   └── templates/
│       └── ... (similar structure)
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode (Development)

```bash
npm test -- --watch
```

### Run Specific Test File

```bash
npm test trips-store.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- -t "should create trip"
```

---

## Coverage Requirements

**Minimum Thresholds:**
- Lines: **70%**
- Branches: **70%**
- Functions: **70%**
- Statements: **70%**

**View Coverage Report:**
```bash
npm run test:coverage
open coverage/index.html  # macOS
```

**CI Enforcement:**
- Coverage report uploaded as artifact
- Build fails if coverage below 70%

---

## Writing Tests

### Test Structure

Use **Arrange-Act-Assert** pattern:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('TripStore', () => {
  let store: ReturnType<typeof useTripStore>

  beforeEach(() => {
    // Arrange: Setup
    setActivePinia(createPinia())
    store = useTripStore()
  })

  it('should create a new trip', async () => {
    // Arrange: Prepare data
    const tripData = { name: 'Paris Trip', status: 'planning' }

    // Act: Perform action
    await store.createTrip(tripData)

    // Assert: Verify outcome
    expect(store.trips).toHaveLength(1)
    expect(store.trips[0].name).toBe('Paris Trip')
  })
})
```

### Mocking Supabase

**Global Mock (Recommended):**

```typescript
// __tests__/setup.ts
vi.mock('@/features/shared/infrastructure/supabase.client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
      delete: vi.fn().mockResolvedValue({ error: null })
    }))
  }
}))
```

**Per-Test Mock:**

```typescript
import { supabase } from '@/features/shared/infrastructure/supabase.client'

it('should handle Supabase error', async () => {
  // Mock specific error
  vi.mocked(supabase.from).mockReturnValueOnce({
    select: vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' }
    })
  } as any)

  const result = await store.loadTrips()
  expect(result.error).toBeDefined()
})
```

### Testing Services

```typescript
// trip.service.test.ts
import { describe, it, expect, vi } from 'vitest'
import { TripService } from '@/features/trips/domain/trip.service'

describe('TripService', () => {
  it('should duplicate trip with all related data', async () => {
    // Arrange
    const mockRepo = {
      duplicate: vi.fn().mockResolvedValue({ data: newTrip, error: null }),
      findById: vi.fn().mockResolvedValue({ data: originalTrip, error: null })
    }
    const service = new TripService(mockRepo)

    // Act
    const result = await service.duplicateTrip('trip-id')

    // Assert
    expect(result.data).toEqual(newTrip)
    expect(mockRepo.duplicate).toHaveBeenCalled()
  })
})
```

### Testing Repositories

```typescript
// trip.repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { TripRepository } from '@/features/trips/infrastructure/trip.repository'

describe('TripRepository', () => {
  let repository: TripRepository

  beforeEach(() => {
    repository = new TripRepository()
  })

  it('should create trip successfully', async () => {
    const dto = { name: 'Test Trip', status: 'planning' }
    const result = await repository.create(dto)

    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Test Trip')
  })
})
```

### Testing Stores (Pinia)

```typescript
// trips-store.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useTripStore } from '@/stores/tripsStore'

describe('Trips Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should load trips for user', async () => {
    const store = useTripStore()
    await store.loadTrips()

    expect(store.trips).toBeDefined()
    expect(Array.isArray(store.trips)).toBe(true)
  })

  it('should handle loading state', async () => {
    const store = useTripStore()
    
    const loadPromise = store.loadTrips()
    expect(store.loading).toBe(true)

    await loadPromise
    expect(store.loading).toBe(false)
  })
})
```

### Testing Components (Vue)

```typescript
// TripCard.test.ts
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import TripCard from '@/components/trips/TripCard.vue'

describe('TripCard', () => {
  it('should render trip name', () => {
    const trip = { id: '1', name: 'Paris Trip', status: 'planning' }
    const wrapper = mount(TripCard, {
      props: { trip }
    })

    expect(wrapper.text()).toContain('Paris Trip')
  })

  it('should emit delete event on button click', async () => {
    const trip = { id: '1', name: 'Paris Trip', status: 'planning' }
    const wrapper = mount(TripCard, {
      props: { trip }
    })

    await wrapper.find('[data-testid="delete-btn"]').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
  })
})
```

### Testing Validation (Zod)

```typescript
// validation.test.ts
import { describe, it, expect } from 'vitest'
import { TripFormSchema } from '@/features/shared/domain/validation.schemas'

describe('TripFormSchema', () => {
  it('should validate correct trip data', () => {
    const data = {
      name: 'Paris Trip',
      startDate: '2024-06-01',
      endDate: '2024-06-10',
      status: 'planning'
    }

    const result = TripFormSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const data = { name: '', status: 'planning' }
    const result = TripFormSchema.safeParse(data)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Required')
    }
  })
})
```

---

## Test Coverage by Feature

### Current Coverage

| Feature | Lines | Branches | Functions | Statements |
|---------|-------|----------|-----------|------------|
| Trips Store | 85% | 78% | 90% | 85% |
| Packing Logic | 92% | 88% | 100% | 92% |
| Budget Calculations | 95% | 90% | 100% | 95% |
| Auth Guard | 80% | 75% | 85% | 80% |
| Auth Store | 88% | 82% | 92% | 88% |

**Overall:** ~85% (exceeds 70% requirement)

---

## Best Practices

### 1. Test Behavior, Not Implementation

❌ **Bad:**
```typescript
it('should call fetchTrips method', () => {
  expect(store.fetchTrips).toHaveBeenCalled()
})
```

✅ **Good:**
```typescript
it('should load trips for authenticated user', async () => {
  await store.loadTrips()
  expect(store.trips).toHaveLength(3)
})
```

### 2. Use Descriptive Test Names

❌ **Bad:**
```typescript
it('works', () => { /* ... */ })
```

✅ **Good:**
```typescript
it('should calculate total budget from all expense entries', () => { /* ... */ })
```

### 3. Arrange-Act-Assert

```typescript
it('should mark item as packed', () => {
  // Arrange
  const item = { id: '1', title: 'Passport', isPacked: false }

  // Act
  item.isPacked = true

  // Assert
  expect(item.isPacked).toBe(true)
})
```

### 4. Test Edge Cases

```typescript
describe('Budget Calculator', () => {
  it('should handle empty budget entries', () => {
    const total = calculateTotal([])
    expect(total).toBe(0)
  })

  it('should handle null values', () => {
    const total = calculateTotal([null, undefined])
    expect(total).toBe(0)
  })

  it('should handle negative amounts', () => {
    const total = calculateTotal([{ amount: -100 }])
    expect(total).toBe(-100)
  })
})
```

### 5. Mock External Dependencies

```typescript
// Mock router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}))

// Mock Supabase
vi.mock('@/features/shared/infrastructure/supabase.client')
```

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/
```

### Coverage Enforcement

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70
    }
  }
})
```

---

## Debugging Tests

### VS Code Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test", "--", "--run"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Console Logging

```typescript
it('should debug test', () => {
  console.log('Current state:', store.trips)
  expect(store.trips).toHaveLength(1)
})
```

### Snapshot Testing

```typescript
it('should match snapshot', () => {
  const data = { name: 'Trip', status: 'planning' }
  expect(data).toMatchSnapshot()
})
```

---

## Performance Testing

### Test Execution Time

```bash
npm test -- --reporter=verbose
```

### Optimize Slow Tests

```typescript
// Use beforeAll instead of beforeEach when possible
describe('Expensive Setup', () => {
  beforeAll(async () => {
    // Setup once for all tests
    await setupDatabase()
  })

  afterAll(async () => {
    await teardownDatabase()
  })
})
```

---

## Common Issues

### Issue: "Cannot find module"

**Solution:**
```typescript
// Add to vitest.config.ts
resolve: {
  alias: {
    '@': '/src'
  }
}
```

### Issue: "Supabase is not defined"

**Solution:**
Mock Supabase in test setup:
```typescript
// __tests__/setup.ts
vi.mock('@/features/shared/infrastructure/supabase.client')
```

### Issue: "Pinia store not initialized"

**Solution:**
```typescript
beforeEach(() => {
  setActivePinia(createPinia())
})
```

---

## Future Improvements

**Planned:**
- [ ] Add E2E tests with Playwright
- [ ] Component visual regression tests
- [ ] Performance benchmarks
- [ ] Mutation testing

**Considering:**
- Integration with Cypress
- Contract testing with Pact
- Load testing with k6

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Jest to Vitest Migration](https://vitest.dev/guide/migration.html)

---

**Next Steps:**
- [CI/CD Guide](CI-CD.md) - Automated testing
- [Architecture](Architecture.md) - Testable design
- [Features](Features.md) - What to test
