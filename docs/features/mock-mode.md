# 🔧 Mock Mode (Frontend-Only)

Run the application entirely in the browser without backend infrastructure.

**Last Updated**: February 21, 2026

---

## Overview

**Mock Mode** allows you to run the Family Logistics Dashboard using only **localStorage** for data persistence and **mock authentication** - no Supabase or backend required.

---

## When to Use

### ✅ Perfect For

- Local development without Supabase setup
- Static hosting (GitHub Pages, Netlify, Vercel)
- Demos, presentations, prototyping
- Offline usage and testing
- Learning the codebase
- CI/CD testing

### ❌ Not Suitable For

- Production with multi-user collaboration
- Cloud data synchronization
- Real OAuth authentication
- Document/file storage in cloud

---

## Architecture

### Storage Layer

```
Application Layer (Components, Stores, Services)
            ↓
    ┌───────────────┐
    │ isMockMode()? │
    └───────┬───────┘
            │
    ┌───────┴────────┐
    │                 │
    ▼                 ▼
Supabase         Mock
Repositories    Repositories
    │                 │
    ▼                 ▼
Supabase         localStorage
Backend
```

### How It Works

1. **Check Environment**: `isMockMode()` checks for Supabase credentials
2. **Factory Pattern**: Returns mock or real repository
3. **Same Interface**: Mock repositories implement same interface
4. **localStorage**: All data stored in browser

---

## Configuration

### Method 1: Explicit Mock Mode

Create `.env` file:

```env
VITE_USE_MOCK_BACKEND=true
```

### Method 2: Auto-Detection (Recommended)

Leave `.env` empty or omit Supabase vars:

```env
# No Supabase credentials
# → Auto-enables mock mode
```

### Detection Logic

**File**: `src/config/backend.config.ts`

```typescript
export function isMockMode(): boolean {
  const useMock = import.meta.env.VITE_USE_MOCK_BACKEND;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Explicit mock mode
  if (useMock === 'true') {
    return true;
  }

  // Auto-enable if credentials missing
  if (!supabaseUrl || !supabaseKey) {
    console.info('🔧 Mock Mode - Using localStorage');
    return true;
  }

  return false;
}
```

---

## Mock Authentication

### How It Works

**MockAuthService** simulates authentication:

1. **Sign Up**: Creates user in localStorage
2. **Sign In**: Validates credentials
3. **OAuth**: Auto-creates demo user
4. **Sessions**: Persist in localStorage

### Usage Examples

**Google OAuth (Mock)**:

```typescript
// Click "Sign in with Google"
// → Auto-creates demo-google@example.com
// → No real OAuth flow
```

**Email/Password**:

```typescript
await authService.signUp('user@example.com', 'password123');
await authService.signIn('user@example.com', 'password123');
```

### Storage Format

**localStorage key**: `family-logistics:auth-data`

```json
{
  "users": [
    {
      "id": "user-1234567890",
      "email": "demo-google@example.com",
      "password": "demo-password"
    }
  ],
  "currentUser": {
    "id": "user-1234567890",
    "email": "demo-google@example.com"
  }
}
```

---

## Mock Repositories

All repositories use **same interface** as real repositories.

### Base Mock Repository

**File**: `src/features/shared/infrastructure/mock.repository.ts`

```typescript
export abstract class MockRepository<T> {
  protected storageKey: string;

  constructor(tableName: string) {
    this.storageKey = `family-logistics:table:${tableName}`;
  }

  protected loadFromStorage(): T[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  protected saveToStorage(items: T[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  async create(dto: CreateDto): Promise<ApiResponse<T>> {
    const items = this.loadFromStorage();
    const newItem = {
      id: generateId(),
      ...dto,
      created_at: new Date().toISOString(),
    } as T;
    items.push(newItem);
    this.saveToStorage(items);
    return { success: true, data: newItem };
  }

  // ... other CRUD methods
}
```

### Example: Shopping List Repository

**File**: `src/features/shopping/infrastructure/shopping.mock-repository.ts`

```typescript
export class MockShoppingListRepository extends MockRepository<ShoppingList> {
  constructor() {
    super('shopping_lists');
  }

  async findByHouseholdId(id: string): Promise<ApiResponse<ShoppingList[]>> {
    const lists = this.loadFromStorage();
    const filtered = lists.filter((l) => l.household_id === id);
    return { success: true, data: filtered };
  }
}
```

---

## Storage Keys

Data stored in localStorage with prefixed keys:

```
family-logistics:auth-data
family-logistics:table:user_profiles
family-logistics:table:families
family-logistics:table:family_members
family-logistics:table:shopping_lists
family-logistics:table:shopping_items
family-logistics:table:wishlists
family-logistics:table:wishlist_items
```

---

## Data Persistence

### ✅ Persists

- Across browser sessions
- After page refresh
- After closing browser

### ❌ Does Not Persist

- When clearing browser data
- Across devices
- Across browsers
- In incognito mode (after close)

---

## Development Workflow

### 1. Start in Mock Mode

```bash
# No .env file needed
npm run dev
```

### 2. Create Test Data

- Sign in with mock Google account
- Create household
- Add shopping lists
- Add wishlists

### 3. Test Features

All features work identically to Supabase mode:

- CRUD operations
- Role-based access
- Public wishlist sharing
- Item reservations

### 4. Switch to Supabase

When ready:

1. Create `.env`:

   ```env
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```

2. Restart dev server:

   ```bash
   npm run dev
   ```

3. ✅ Now using Supabase!

---

## Clearing Mock Data

### Method 1: Browser DevTools

1. Open DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Select your domain
4. Delete keys starting with `family-logistics:`

### Method 2: Code

```typescript
// Clear all app data
Object.keys(localStorage)
  .filter((key) => key.startsWith('family-logistics:'))
  .forEach((key) => localStorage.removeItem(key));
```

### Method 3: UI (Future)

Add "Clear Data" button in settings (planned feature).

---

## Testing Mock Mode

### Unit Tests

Mock mode repositories can be tested:

```typescript
describe('MockShoppingListRepository', () => {
  let repository: MockShoppingListRepository;

  beforeEach(() => {
    localStorage.clear();
    repository = new MockShoppingListRepository();
  });

  it('creates shopping list', async () => {
    const result = await repository.create({
      title: 'Groceries',
      household_id: 'family-1',
    });

    expect(result.success).toBe(true);
    expect(result.data.title).toBe('Groceries');
  });
});
```

### Integration Tests

Test entire flows with mock backend:

```typescript
describe('Shopping List Flow (Mock)', () => {
  beforeEach(() => {
    import.meta.env.VITE_USE_MOCK_BACKEND = 'true';
  });

  it('creates and retrieves list', async () => {
    const created = await shoppingService.createList({...});
    const retrieved = await shoppingService.getList(created.data.id);

    expect(retrieved.data).toEqual(created.data);
  });
});
```

---

## Deployment with Mock Mode

### GitHub Pages

Perfect for static deployment:

1. Set environment variable:

   ```yaml
   # .github/workflows/deploy.yml
   - name: Build
     run: npm run build
     env:
       VITE_USE_MOCK_BACKEND: 'true'
   ```

2. Deploy:
   ```bash
   npm run build
   # Deploy dist/ folder
   ```

### Netlify / Vercel

Add environment variable in dashboard:

```
VITE_USE_MOCK_BACKEND=true
```

---

## Limitations

### 1. No Cloud Sync

- Data only on one device
- Can't collaborate with others
- No backup/restore

### 2. No Real Auth

- Mock authentication only
- No OAuth providers
- No email verification

### 3. Storage Limits

- localStorage: ~5-10 MB limit per domain
- Varies by browser
- Quota errors if exceeded

### 4. No File Storage

- Can't upload images
- Can't store documents
- URLs only (external images)

### 5. No Server-Side Logic

- No RLS enforcement
- No database triggers
- No background jobs

---

## Migration Path

### From Mock → Supabase

**Data doesn't auto-migrate**. You must:

1. Export mock data (JSON)
2. Set up Supabase
3. Import data via SQL or API
4. Update environment variables

### Script (Future)

```bash
# Export mock data
npm run mock:export > data.json

# Import to Supabase
npm run supabase:import data.json
```

---

## Troubleshooting

### Mock Mode Not Activating

**Check**:

1. `.env` has no Supabase vars, OR
2. `VITE_USE_MOCK_BACKEND=true`

**Verify**:

```typescript
import { isMockMode } from '@/config/backend.config';
console.log('Mock mode:', isMockMode()); // should be true
```

### Data Not Persisting

**Causes**:

- Browser in incognito mode
- localStorage disabled
- Third-party cookies blocked

**Solution**: Use regular browser window with localStorage enabled

### Storage Quota Exceeded

**Error**: "QuotaExceededError"

**Solution**:

- Clear old data
- Use real Supabase for large datasets

---

## Best Practices

### Development

1. ✅ Start with mock mode (faster iteration)
2. ✅ Test with mock data
3. ✅ Switch to Supabase for integration testing
4. ✅ Use mock mode in CI/CD

### Production

1. ❌ Don't deploy mock mode to production
2. ✅ Use Supabase for real deployments
3. ✅ Use mock mode only for demos/static sites

### Testing

1. ✅ Test both mock and Supabase modes
2. ✅ Ensure feature parity
3. ✅ Use mock for unit tests (faster)
4. ✅ Use Supabase for E2E tests

---

## Related Documentation

- [Configuration Guide](../getting-started/configuration.md)
- [Supabase Setup](../backend/supabase-setup.md)
- [Repository Pattern](../development/repository-pattern.md)
- [Testing Guide](../testing/overview.md)

---

**Last Updated**: February 21, 2026
