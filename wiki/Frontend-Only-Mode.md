# Frontend-Only Mode (Mock Backend)

## Overview

The Family Logistics Dashboard supports **frontend-only mode**, allowing you to run the application entirely in the browser without any backend infrastructure. This mode uses **localStorage** for data persistence and provides a **mock authentication** system.

## When to Use Mock Mode

✅ **Perfect for:**
- Local development without setting up Supabase
- Static hosting (GitHub Pages, Netlify, Vercel)
- Demos, presentations, and prototyping
- Offline usage and testing
- Learning and experimenting with the codebase

❌ **Not suitable for:**
- Production deployments requiring multi-user collaboration
- Applications needing cloud data synchronization
- Scenarios requiring real OAuth authentication
- Document storage in the cloud

---

## Architecture

### Storage Layer

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  (Components, Stores, Services)         │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│   Supabase  │  │    Mock    │
│ Repositories│  │Repositories│
└──────┬──────┘  └─────┬──────┘
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│  Supabase   │  │ LocalStorage│
│  Backend    │  │   Adapter  │
└─────────────┘  └────────────┘
```

### Repository Factory Pattern

The application uses a **factory pattern** to switch between Supabase and mock repositories based on configuration:

```typescript
// config/backend.config.ts
export function isMockMode(): boolean {
  const useMock = import.meta.env.VITE_USE_MOCK_BACKEND;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Explicit mock mode
  if (useMock === 'true') {
    return true;
  }

  // Auto-enable if Supabase credentials missing
  if (!supabaseUrl || !supabaseKey) {
    return true;
  }

  return false;
}
```

```typescript
// infrastructure/repository.factory.ts
export function getTripRepository() {
  return isMockMode() 
    ? new MockTripRepository() 
    : new TripRepository();
}
```

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Force mock mode
VITE_USE_MOCK_BACKEND=true

# Base path for routing (for GitHub Pages)
VITE_BASE_PATH=/
```

### Auto-Detection

If you omit `VITE_USE_MOCK_BACKEND`, the app automatically uses mock mode when Supabase credentials are missing:

```bash
# .env is empty or missing Supabase vars
# → App runs in mock mode automatically
```

---

## Mock Authentication

### How It Works

The mock auth service (`MockAuthService`) simulates authentication without requiring real OAuth providers:

1. **Sign Up**: Creates a user record in localStorage
2. **Sign In**: Validates credentials against localStorage
3. **OAuth**: Auto-creates a demo user (e.g., `demo-google@example.com`)
4. **Sessions**: Stored in localStorage, persist across browser sessions

### Usage

**Google OAuth (Mock):**
```typescript
// Click "Sign in with Google"
// → Auto-creates demo-google@example.com
// → No real OAuth required
```

**Email/Password:**
```typescript
// Sign up with any email/password
await authService.signUp('user@example.com', 'password123');

// Sign in
await authService.signIn('user@example.com', 'password123');
```

### Storage Format

```json
{
  "family-logistics:auth-data": {
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
}
```

---

## Mock Data Repositories

All repositories follow the same interface as Supabase repositories but use localStorage:

### Trip Repository

```typescript
class MockTripRepository extends MockRepository<Trip> {
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    const trips = await this.loadAll();
    return {
      data: trips.filter(t => t.created_by === userId),
      error: null
    };
  }
}
```

### Storage Keys

Data is stored in localStorage with prefixed keys:

```
family-logistics:table:trips
family-logistics:table:packing_items
family-logistics:table:budget_entries
family-logistics:table:timeline_events
family-logistics:table:documents
family-logistics:table:packing_templates
family-logistics:table:trip_members
```

### Data Persistence

- ✅ **Persists** across browser sessions
- ✅ **Persists** after page refresh
- ❌ **Lost** when clearing browser data
- ❌ **Not synced** across devices/browsers

---

## Limitations

### 1. Authentication

| Feature | Mock Mode | Supabase Mode |
|---------|-----------|---------------|
| Google OAuth | ⚠️ Mock only (auto-creates demo user) | ✅ Real OAuth |
| Email/Password | ⚠️ Mock only (localStorage) | ✅ Supabase Auth |
| Password reset | ❌ Not available | ✅ Email-based |
| Email verification | ❌ Not available | ✅ Supported |

### 2. Trip Sharing

| Feature | Mock Mode | Supabase Mode |
|---------|-----------|---------------|
| Share trips | ⚠️ Limited (simulated only) | ✅ Real multi-user |
| User roles | ⚠️ Mock only | ✅ owner/editor/viewer |
| Email invites | ❌ Not sent | ✅ Real emails |

### 3. Document Storage

| Feature | Mock Mode | Supabase Mode |
|---------|-----------|---------------|
| Upload docs | ⚠️ Base64 in localStorage (size limited) | ✅ Cloud storage |
| Max file size | ⚠️ ~1-5MB (browser limit) | ✅ Configurable (up to GBs) |
| File types | ✅ All types | ✅ All types |

### 4. Data Storage

| Feature | Mock Mode | Supabase Mode |
|---------|-----------|---------------|
| Storage location | ⚠️ Browser localStorage | ✅ Cloud database |
| Storage limit | ⚠️ ~5-10MB (browser limit) | ✅ Unlimited (Supabase tier) |
| Multi-device sync | ❌ Not available | ✅ Real-time sync |
| Data export | ⚠️ Manual (copy localStorage) | ✅ Database export |

---

## Testing in Mock Mode

All existing tests work with mock mode:

```bash
# Run tests (auto-uses mock repos in test env)
npm test

# Run with coverage
npm run test:coverage
```

The test suite automatically uses mock repositories, so no Supabase connection is required.

---

## Debugging

### Check Current Mode

Open browser console and check:

```javascript
console.info('Backend mode:', import.meta.env.VITE_USE_MOCK_BACKEND);
// If undefined, check localStorage for data
localStorage.getItem('family-logistics:table:trips');
```

### Inspect localStorage

```javascript
// View all app data
Object.keys(localStorage)
  .filter(k => k.startsWith('family-logistics:'))
  .forEach(k => console.log(k, localStorage.getItem(k)));
```

### Clear All Data

```javascript
// Reset app (delete all data)
Object.keys(localStorage)
  .filter(k => k.startsWith('family-logistics:'))
  .forEach(k => localStorage.removeItem(k));

// Reload page
location.reload();
```

---

## Migration to Supabase

To migrate from mock mode to Supabase:

1. **Export Data** (manual):
   ```javascript
   // Export trips
   const trips = JSON.parse(localStorage.getItem('family-logistics:table:trips'));
   console.log(JSON.stringify(trips, null, 2));
   ```

2. **Set up Supabase**:
   - Create Supabase project
   - Run schema migrations
   - Configure OAuth

3. **Update .env**:
   ```bash
   VITE_USE_MOCK_BACKEND=false
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Import Data** (manual):
   - Sign in to Supabase mode
   - Manually recreate trips/data
   - Or use Supabase SQL to bulk import

---

## Best Practices

### Development

✅ **Do:**
- Use mock mode for rapid prototyping
- Clear localStorage between test scenarios
- Test with realistic data volumes
- Document mock-specific behavior

❌ **Don't:**
- Store sensitive data in mock mode (it's not encrypted)
- Exceed browser storage limits (~5-10MB)
- Rely on mock mode for production

### Deployment

✅ **Do:**
- Use mock mode for static demos
- Set `VITE_BASE_PATH` for GitHub Pages
- Test builds locally before deploying
- Document that it's a demo/offline version

❌ **Don't:**
- Deploy mock mode as a production app
- Share sensitive trip data in mock mode
- Expect data to persist forever (users can clear browser data)

---

## Troubleshooting

### "Failed to load data"

**Cause:** localStorage quota exceeded

**Solution:**
```javascript
// Clear old data
localStorage.clear();
location.reload();
```

### "User not authenticated"

**Cause:** Auth state lost (cookies cleared)

**Solution:**
- Sign in again (mock OAuth is instant)
- Or check localStorage for `family-logistics:auth-data`

### "Data disappeared"

**Cause:** Browser data cleared

**Solution:**
- Mock mode data is not backed up
- For important data, export manually or use Supabase mode

---

## FAQ

**Q: Can I use mock mode in production?**  
A: Not recommended. Mock mode is for demos, development, and static hosting only. Use Supabase mode for production.

**Q: How much data can I store?**  
A: Browser localStorage limit is ~5-10MB. If exceeded, create fewer trips or use Supabase.

**Q: Will my data sync across devices?**  
A: No. Mock mode uses browser localStorage, which is device-specific.

**Q: Can I import real data?**  
A: You can manually copy trip data to localStorage, but it's easier to use Supabase mode.

**Q: Does mock mode work offline?**  
A: Yes! Once loaded, the app works fully offline (after initial page load).

---

## Related Pages

- [Deployment Guide](Deployment.md) - How to deploy with mock or Supabase mode
- [Architecture](Architecture.md) - System design and repository pattern
- [Testing](Testing.md) - Test strategy with mock repositories
