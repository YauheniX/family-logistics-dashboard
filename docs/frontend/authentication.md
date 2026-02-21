# 🔐 Authentication

Complete authentication setup guide for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026

---

## Overview

The application uses **Supabase Auth** with:

✅ Google OAuth (primary method)  
✅ Email/Password authentication (fallback)  
✅ Persistent sessions  
✅ Protected routes via AuthGuard  
✅ Automatic token refresh

---

## Google OAuth Setup

### Step 1: Google Cloud Console Configuration

1. **Go to Google Cloud Console**  
   Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. **Create or Select Project**
   - Create a new project or select existing
   - Give it a meaningful name (e.g., "Family Logistics Dashboard")

3. **Configure OAuth Consent Screen**
   - Navigate to **APIs & Services → OAuth consent screen**
   - Select **External** user type (unless you have Google Workspace)
   - Fill in required fields:
     - App name: "Family Logistics Dashboard"
     - User support email: your email
     - Developer contact: your email
   - Add scopes (if needed): `email`, `profile`, `openid`
   - Save and continue

4. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services → Credentials**
   - Click **Create Credentials → OAuth client ID**
   - Select **Web application**
   - Set a name (e.g., "Family Logistics Web Client")

5. **Add Authorized Redirect URIs**

   Add your Supabase callback URL:

   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

   **Find your project ref:**
   - Go to Supabase dashboard
   - Your URL: `https://abcdefgh.supabase.co`
   - Your ref: `abcdefgh`

6. **Save and Copy Credentials**
   - Click **Create**
   - Copy **Client ID** (e.g., `123456789-abc...apps.googleusercontent.com`)
   - Copy **Client Secret** (keep secure!)

### Step 2: Supabase Provider Configuration

1. **Open Supabase Dashboard**  
   [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Navigate to Authentication**
   - Click **Authentication** → **Providers**

3. **Enable Google Provider**
   - Find **Google** in provider list
   - Toggle **ON**
   - Paste **Client ID**
   - Paste **Client Secret**

4. **Save Configuration**
   - Click **Save**
   - ✅ Google OAuth active!

---

## Email/Password Authentication

Email/password is **enabled by default** in Supabase.

### Configuration Options

**Authentication → Settings:**

- Enable email confirmations (recommended for production)
- Enable email change confirmations
- Disable sign-ups (for invite-only mode)

### Email Templates

**Authentication → Email Templates:**  
Customize templates for:

- Confirmation emails
- Password reset emails
- Magic link emails
- Email change notifications

---

## Frontend Implementation

### Supabase Client

**Location**: `src/features/shared/infrastructure/supabase.client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
});
```

### Auth Service

**Location**: `src/features/auth/domain/auth.service.ts`

**Key Methods**:

- `signInWithGoogle()` - OAuth sign-in
- `signInWithPassword()` - Email/password sign-in
- `signUp()` - Create account
- `signOut()` - End session
- `resetPassword()` - Password reset

### Protected Routes

**Location**: `src/router/index.ts`

```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  await authStore.initializeAuth();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.guestOnly && authStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});
```

---

## Testing Locally

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Open Browser

[http://localhost:5173](http://localhost:5173)

### 3. Test Google OAuth

1. Click "Sign in with Google"
2. Select Google account
3. Grant permissions
4. Redirected to dashboard

### 4. Test Email/Password

1. Click "Sign up with Email"
2. Enter email and password
3. Check email for confirmation (if enabled)
4. Sign in

---

## Common Issues

### Redirect URI Mismatch

**Error**: "Redirect URI mismatch"

**Solution**:

- Verify Supabase project ref
- Ensure callback URL format:
  ```
  https://<ref>.supabase.co/auth/v1/callback
  ```
- Check for typos

### Invalid Client ID

**Error**: "Invalid client_id"

**Solution**:

- Re-copy Client ID from Google Console
- Paste exactly in Supabase (no spaces)
- Save and retry

### Access Blocked

**Error**: "This app's request is invalid"

**Solution**:

- Complete OAuth consent screen
- Add yourself as test user
- Publish app or use testing mode

### Email Confirmations Not Working

**Solution**:

- Check SMTP settings in Supabase
- Use default Supabase email for testing
- Verify email templates

---

## Security Best Practices

### Environment Variables

- ❌ Never commit `.env` to Git
- ✅ Use `.env.example` as template
- ✅ Keep `VITE_SUPABASE_ANON_KEY` (safe to expose)
- ❌ Never expose service role keys in frontend

### OAuth Credentials

- Keep Client Secret secure
- Rotate credentials periodically
- Use different clients for dev/staging/prod

### Row Level Security

- Always enable RLS on all tables
- Test policies thoroughly
- Use `auth.uid()` for user data

### Session Management

- Sessions auto-refresh with Supabase
- Set appropriate timeouts
- Implement proper sign-out

---

## Production Deployment

### Update Redirect URIs

Add production URL to Google Cloud Console:

```
https://your-production-domain.com
```

### Supabase Production Setup

1. Create separate production project
2. Use production environment variables:
   ```env
   VITE_SUPABASE_URL=<prod-url>
   VITE_SUPABASE_ANON_KEY=<prod-key>
   ```
3. Configure Google OAuth with production ref

---

## Related Documentation

- [Backend Setup](../backend/supabase-setup.md)
- [RLS Policies](../backend/rls-policies.md)
- [Mock Mode](../features/mock-mode.md)
- [Deployment](../deployment/overview.md)

---

**Last Updated**: February 21, 2026
