# 🔒 Supabase Setup Guide

Configure Supabase as the backend for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your organisation, enter a project name, set a database password, and select a region.
4. Click **Create new project** — initialisation takes ~2 minutes.

---

## 2. Apply the Database Schema

The full schema is in `supabase/schema.sql`. Apply it using one of these methods:

### Method A: Supabase CLI (Recommended)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply schema
supabase db push
```

### Method B: SQL Editor

1. Open Supabase Dashboard → **SQL Editor**
2. Open `supabase/schema.sql` from this repository
3. Paste the full contents and click **Run**

---

## 3. Get Your API Credentials

From the Supabase Dashboard:
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon/public** key (a long JWT token starting with `eyJ...`)

⚠️ **Use only the `anon` key in the frontend** — never the `service_role` key.

---

## 4. Configure Authentication

### Enable Email Auth

Supabase Dashboard → **Authentication** → **Providers** → **Email** → Enable.

### Enable Google OAuth (Optional)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create an **OAuth 2.0 Client ID**
3. Set **Authorized redirect URIs**:
   - `http://localhost:5173` (development)
   - `https://your-production-domain.com` (production)
4. Copy the **Client ID** and **Client Secret**
5. Supabase Dashboard → **Authentication** → **Providers** → **Google**
6. Enter Client ID and Client Secret → **Save**

---

## 5. Configure Storage

For wishlist images:

1. Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `wishlist-images`
3. Set to **Public** (allows image URLs to be accessed without auth)
4. Click **Create**

---

## 6. Set Environment Variables

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_USE_MOCK_BACKEND=false
VITE_SUPABASE_STORAGE_BUCKET=wishlist-images
```

---

## 7. Verify the Setup

```bash
npm run dev
```

1. Open [http://localhost:5173](http://localhost:5173)
2. Sign in with email/password or Google
3. Create a household — if successful, Supabase is connected

**Check for errors**: Open browser DevTools → Console. Supabase connection errors appear here.

---

## Row-Level Security

RLS is applied automatically as part of `supabase/schema.sql`. All tables have RLS enabled. You should never need to disable RLS.

See [RLS Policies](rls-policies.md) for the full policy documentation.

---

## Production Deployment

For production:
1. Configure environment variables in your hosting provider (Vercel, Netlify, etc.)
2. Update Google OAuth redirect URIs to include your production domain
3. See [Deployment Guide](../deployment/overview.md)

---

## Troubleshooting

### "Invalid API key"

- Verify `VITE_SUPABASE_ANON_KEY` is the `anon` key (not `service_role`)
- Ensure there are no extra spaces in your `.env.local` file

### "Permission denied" errors

- RLS schema may not have been applied — re-run `supabase db push`
- Verify the user is a member of the household being accessed

### Storage uploads failing

- Ensure the `wishlist-images` bucket exists and is set to **Public**
- Check `VITE_SUPABASE_STORAGE_BUCKET` matches the bucket name exactly
