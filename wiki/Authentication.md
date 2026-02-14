# 🔐 Authentication Setup

This guide covers setting up authentication for the Family Logistics Dashboard using Supabase Auth with Google OAuth and email/password.

---

## Overview

The application uses **Supabase Auth** which provides:

- Google OAuth (primary method)
- Email/password authentication (fallback)
- Persistent sessions
- Protected routes via AuthGuard
- Automatic token refresh

---

## Google OAuth Setup

### Step 1: Google Cloud Console Configuration

1. **Go to Google Cloud Console**  
   Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)

2. **Create or Select Project**
   - Create a new project or select an existing one
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
   - Select **Web application** as application type
   - Set a name (e.g., "Family Logistics Web Client")

5. **Add Authorized Redirect URIs**

   Add your Supabase callback URL:

   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```

   **How to find your project ref:**
   - Go to your Supabase dashboard
   - Your project URL looks like: `https://abcdefgh.supabase.co`
   - The ref is the subdomain: `abcdefgh`

6. **Save and Copy Credentials**
   - Click **Create**
   - Copy the **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
   - Copy the **Client Secret** (keep this secure!)

### Step 2: Supabase Provider Configuration

1. **Open Supabase Dashboard**
   - Go to your project at [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Navigate to Authentication Settings**
   - Click **Authentication** in the sidebar
   - Select **Providers** tab

3. **Enable Google Provider**
   - Find **Google** in the provider list
   - Toggle it **ON**
   - Paste your **Client ID** from Google Cloud Console
   - Paste your **Client Secret** from Google Cloud Console

4. **Save Configuration**
   - Click **Save**
   - Google OAuth is now active!

---

## Email/Password Authentication

Email/password authentication is **enabled by default** in Supabase.

### Configuration Options

1. **Go to Authentication → Settings**
2. Configure:
   - **Enable email confirmations** (recommended for production)
   - **Enable email change confirmations**
   - **Disable sign-ups** (if you want invite-only)

### Customizing Email Templates

1. Navigate to **Authentication → Email Templates**
2. Customize templates for:
   - Confirmation emails
   - Password reset emails
   - Magic link emails
   - Email change notifications

---

## Frontend Implementation

The app uses the Supabase client to handle authentication.

### Supabase Client Setup

Location: `src/features/shared/infrastructure/supabase.client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Auth Store

Location: `src/stores/authStore.ts`

Handles:

- User session state
- Sign in with Google
- Sign in with email/password
- Sign out
- Session persistence

### Protected Routes

Location: `src/router/index.ts`

Uses **beforeEach** navigation guard to protect routes:

```typescript
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  await authStore.initializeAuth();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});
```

---

## Testing Authentication Locally

### 1. Start Development Server

```bash
npm run dev
```

### 2. Open Browser

Navigate to `http://localhost:5173`

### 3. Test Google OAuth

1. Click "Sign in with Google"
2. Select your Google account
3. Grant permissions
4. You should be redirected to the dashboard

### 4. Test Email/Password

1. Click "Sign up with Email"
2. Enter email and password
3. Check email for confirmation (if enabled)
4. Sign in

---

## Common Issues

### Issue: "Redirect URI mismatch"

**Cause:** The callback URL in Google Cloud Console doesn't match Supabase.

**Solution:**

- Double-check your Supabase project ref
- Ensure the callback URL format is correct:
  ```
  https://<ref>.supabase.co/auth/v1/callback
  ```
- Add both HTTP and HTTPS variants for localhost if testing locally

### Issue: "Invalid client_id"

**Cause:** Client ID in Supabase doesn't match Google Cloud Console.

**Solution:**

- Re-copy the Client ID from Google Cloud Console
- Paste it exactly in Supabase (no extra spaces)
- Save and retry

### Issue: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen not configured properly.

**Solution:**

- Complete all required fields in OAuth consent screen
- Add your email to test users (if app is in testing mode)
- Publish the app or add yourself as a test user

### Issue: Email confirmations not working

**Cause:** SMTP not configured or email templates broken.

**Solution:**

- Check **Authentication → Settings → SMTP Settings**
- Use Supabase's default email service for testing
- Verify email templates are correct

---

## Security Best Practices

### 1. Environment Variables

- **Never commit** `.env` file to Git
- Use `.env.example` as a template
- Keep `VITE_SUPABASE_ANON_KEY` public-safe (it's designed to be exposed)
- Store secrets (like service role keys) server-side only

### 2. OAuth Credentials

- Keep **Client Secret** secure (never expose in frontend)
- Rotate credentials periodically
- Use different OAuth clients for dev/staging/production

### 3. Row Level Security (RLS)

- Always enable RLS on all tables
- Test policies thoroughly
- Use `auth.uid()` to restrict access to user's own data

### 4. Session Management

- Sessions auto-refresh with Supabase
- Set appropriate session timeouts
- Implement proper sign-out logic

---

## Production Deployment

### Update Redirect URIs

When deploying to production, add your production URL to Google Cloud Console:

```
https://your-production-domain.com/auth/callback
```

### Supabase Production Configuration

1. Create a separate Supabase project for production
2. Use different environment variables:
   ```
   VITE_SUPABASE_URL=<production-url>
   VITE_SUPABASE_ANON_KEY=<production-key>
   ```
3. Configure Google OAuth with production project ref

---

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Vue 3 Auth Examples](https://supabase.com/docs/guides/auth/auth-helpers/vue)

---

**Next Steps:**

- Set up [Database Schema](Database-Schema.md)
- Configure [Row Level Security](Database-Schema.md#row-level-security)
- Explore [Features](Features.md)
