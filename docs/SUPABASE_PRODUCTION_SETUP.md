# Supabase Production Setup Guide

This guide provides comprehensive instructions for setting up Supabase for the Family Logistics Dashboard application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Supabase Project](#create-supabase-project)
3. [Obtain API Credentials](#obtain-api-credentials)
4. [Configure Environment Variables](#configure-environment-variables)
5. [Run Database Migrations](#run-database-migrations)
6. [Create Storage Bucket](#create-storage-bucket)
7. [Configure Google OAuth](#configure-google-oauth)
8. [Deploy to Vercel](#deploy-to-vercel)
9. [Verification](#verification)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed
- A **Supabase account** (free tier available at [supabase.com](https://supabase.com))
- A **Google Cloud Console account** (for OAuth, optional)
- A **Vercel account** (for production deployment, optional)

---

## Create Supabase Project

1. **Sign up or log in** to [Supabase](https://supabase.com)

2. **Create a new project**:
   - Click "New Project"
   - Enter project name (e.g., "family-logistics")
   - Choose a database password (save this securely)
   - Select a region (choose closest to your users)
   - Click "Create new project"

3. **Wait for project initialization** (takes 1-2 minutes)

---

## Obtain API Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
   - Or visit: `https://supabase.com/dashboard/project/<your-project-ref>/settings/api`

2. Copy the following credentials:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (a long JWT token starting with `eyJ...`)

> ⚠️ **Important**: Copy the **anon/public** key, NOT the service_role key!

---

## Configure Environment Variables

### Option A: Automated Setup (Recommended)

Run the interactive setup script:

```bash
npm run supabase:init
```

This will:
- Prompt you for Supabase URL and anon key
- Validate credentials format
- Create `.env` file automatically
- Test connection

### Option B: Manual Setup

1. **Copy the example environment file**:
   ```bash
   cp env.example .env
   ```

2. **Edit `.env`** and fill in your Supabase credentials:
   ```bash
   # Supabase Configuration (Production)
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key-here
   VITE_SUPABASE_STORAGE_BUCKET=wishlist-images
   
   # Backend Mode
   VITE_USE_MOCK_BACKEND=false
   
   # Base Path
   VITE_BASE_PATH=/
   ```

3. **Save the file**

---

## Run Database Migrations

The application requires several database tables and security policies.

### Step 1: Create Database Schema

1. Open **Supabase SQL Editor**:
   - Go to: `https://supabase.com/dashboard/project/<your-project-ref>/sql/new`
   - Or navigate: SQL Editor → New query

2. **Copy and paste** the contents of `supabase/schema.sql`

3. Click **RUN** (or press `Ctrl+Enter`)

4. Verify success (you should see "Success. No rows returned")

This creates:
- ✅ 7 tables: `user_profiles`, `families`, `family_members`, `shopping_lists`, `shopping_items`, `wishlists`, `wishlist_items`
- ✅ Helper functions for family membership checks
- ✅ Auto-profile creation trigger

### Step 2: Enable Row Level Security

1. **Open a new SQL query** in Supabase SQL Editor

2. **Copy and paste** the contents of `supabase/rls.sql`

3. Click **RUN**

4. Verify success

This enables:
- ✅ RLS on all tables
- ✅ Security policies for data access
- ✅ Public wishlist sharing function

### Verify Tables

Go to **Table Editor** and confirm these tables exist:
- `families`
- `family_members`
- `shopping_lists`
- `shopping_items`
- `wishlists`
- `wishlist_items`
- `user_profiles`

---

## Create Storage Bucket

The application uses Supabase Storage for wishlist item images.

1. **Navigate to Storage**:
   - Go to: `https://supabase.com/dashboard/project/<your-project-ref>/storage/buckets`
   - Or click: Storage → Buckets

2. **Create new bucket**:
   - Click "New bucket"
   - **Name**: `wishlist-images`
   - **Public bucket**: ✅ YES (check this box)
   - Click "Create bucket"

3. **Configure storage policies** (optional, for enhanced security):
   
   Go to Storage → Policies → wishlist-images
   
   - **INSERT policy**: Allow authenticated users to upload to their own folder
     ```sql
     (bucket_id = 'wishlist-images' AND (storage.foldername(name))[1] = auth.uid()::text)
     ```
   
   - **SELECT policy**: Public read access
     ```sql
     (bucket_id = 'wishlist-images')
     ```
   
   - **DELETE policy**: Users can only delete their own files
     ```sql
     (bucket_id = 'wishlist-images' AND (storage.foldername(name))[1] = auth.uid()::text)
     ```

---

## Configure Google OAuth

To enable Google sign-in:

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project (or select existing)

3. Navigate to **APIs & Services** → **Credentials**

4. Click **Create Credentials** → **OAuth 2.0 Client ID**

5. Configure OAuth consent screen (if not done):
   - User Type: External
   - App name: Family Logistics Dashboard
   - User support email: your email
   - Developer contact: your email
   - Save and continue

6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: Family Logistics Dashboard
   - **Authorized redirect URIs**: Add your Supabase callback URL:
     ```
     https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback
     ```
   - Click **Create**

7. **Copy** the Client ID and Client Secret

### Step 2: Configure Supabase Auth

1. Go to **Supabase Dashboard** → **Authentication** → **Providers**

2. Find **Google** provider and click to expand

3. Enable Google provider:
   - Toggle **Enable Google provider** ON
   - **Client ID**: Paste your Google Client ID
   - **Client Secret**: Paste your Google Client Secret
   - Click **Save**

4. Test Google sign-in in your application

---

## Deploy to Vercel

### Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- GitHub repository connected to Vercel

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)

2. Click **Add New** → **Project**

3. Import your GitHub repository

### Step 2: Configure Environment Variables

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**

2. Add the following variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `VITE_SUPABASE_STORAGE_BUCKET`: `wishlist-images`
   - `VITE_USE_MOCK_BACKEND`: `false`

3. Click **Save**

### Step 3: Deploy

1. Go to **Deployments** tab

2. Click **Deploy** on the latest commit (or trigger new deployment)

3. Wait for build to complete

4. Visit your production URL

### Step 4: Configure GitHub Secrets (for CI/CD)

For automated deployments via GitHub Actions:

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

2. Add the following repository secrets:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `VERCEL_TOKEN`: Get from Vercel → Settings → Tokens
   - `VERCEL_ORG_ID`: Get from Vercel project settings
   - `VERCEL_PROJECT_ID`: Get from Vercel project settings

---

## Verification

After completing the setup, verify everything is working:

### Run Verification Script

```bash
npm run supabase:verify
```

This checks:
- ✅ `.env` file exists
- ✅ Valid Supabase credentials
- ✅ Connection to Supabase
- ✅ All required tables exist
- ✅ Storage bucket exists
- ✅ RLS policies enabled

### Manual Verification

1. **Start development server**:
   ```bash
   npm run dev
   ```

2. **Open application** in browser: `http://localhost:5173`

3. **Test authentication**:
   - Click "Register" and create an account
   - Or use "Sign in with Google"

4. **Test functionality**:
   - Create a family
   - Add a shopping list
   - Create a wishlist
   - Upload an image (tests storage)

---

## Troubleshooting

### Problem: "Missing VITE_SUPABASE_URL"

**Solution**: 
- Ensure `.env` file exists in project root
- Check that `VITE_SUPABASE_URL` is set correctly
- Restart dev server after changing `.env`

### Problem: "Invalid API key"

**Solution**:
- Verify you copied the **anon/public** key, not service_role key
- Check for extra spaces or newlines in the key
- Regenerate key if corrupted: Supabase → Settings → API → Reset

### Problem: "relation does not exist"

**Solution**:
- Tables not created yet
- Run `supabase/schema.sql` in Supabase SQL Editor
- Verify in Table Editor that tables exist

### Problem: "Row level security policy violation"

**Solution**:
- RLS policies not applied
- Run `supabase/rls.sql` in Supabase SQL Editor
- Check that user is authenticated before accessing data

### Problem: "Storage bucket not found"

**Solution**:
- Create `wishlist-images` bucket in Supabase Storage
- Make sure it's marked as **public**
- Verify bucket name matches `.env` setting

### Problem: Google OAuth not working

**Solution**:
- Check redirect URI matches exactly: `https://your-project.supabase.co/auth/v1/callback`
- Verify Google Client ID and Secret are correct in Supabase
- Make sure OAuth consent screen is configured
- Check that Google provider is enabled in Supabase

### Problem: Build fails in Vercel

**Solution**:
- Check that all environment variables are set in Vercel
- Verify build command is correct: `vite build`
- Check build logs for specific errors
- Try building locally: `npm run build`

### Problem: "Application runs in mock mode despite credentials"

**Solution**:
- Check that `VITE_USE_MOCK_BACKEND` is NOT set to `'true'`
- Verify credentials are actually loaded (check browser console)
- Clear browser cache and restart dev server
- Check for typos in environment variable names

---

## Additional Resources

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Supabase Auth Guide**: [supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)
- **Supabase Storage Guide**: [supabase.com/docs/guides/storage](https://supabase.com/docs/guides/storage)
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)

---

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/YauheniX/family-logistics-dashboard/issues)
2. Review Supabase logs: Dashboard → Logs
3. Check browser console for errors
4. Run verification script: `npm run supabase:verify`

---

**Last updated**: February 2026
