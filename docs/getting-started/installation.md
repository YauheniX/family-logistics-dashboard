# 📦 Installation Guide

Complete setup instructions for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Prerequisites

| Tool | Version | Install |
| ---- | ------- | ------- |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| npm | 9+ | Included with Node.js |
| Git | Any | [git-scm.com](https://git-scm.com/) |

Verify your environment:

```bash
node -v   # v18.x or higher
npm -v    # v9.x or higher
git --version
```

---

## Option A: Mock Mode (No Backend)

The fastest way to run the app. All data is stored in browser localStorage.

```bash
# Clone the repository
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and click **"Sign in with Google"** — a demo user is created automatically.

---

## Option B: Full Setup with Supabase

For real authentication, multi-device sync, and multi-user collaboration.

### Step 1: Clone and Install

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
npm install
```

### Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, database password, and region
3. Wait ~2 minutes for the project to initialise

### Step 3: Get Your Credentials

From your Supabase project dashboard:
- **Project URL**: Settings → API → Project URL
- **Anon Key**: Settings → API → Project API Keys → `anon` / `public`

⚠️ Use the **anon/public** key — never the `service_role` key in the frontend.

### Step 4: Apply the Database Schema

**Option A: Supabase CLI**

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

**Option B: SQL Editor**

1. Go to Supabase Dashboard → **SQL Editor**
2. Open `supabase/schema.sql` in this repo
3. Paste the contents and click **Run**

### Step 5: Configure Environment Variables

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_USE_MOCK_BACKEND=false
VITE_SUPABASE_STORAGE_BUCKET=wishlist-images
```

### Step 6: Create Storage Bucket

1. Supabase Dashboard → **Storage** → **New Bucket**
2. Name: `wishlist-images`
3. Set to **Public** (for image access)

### Step 7: Configure Google OAuth (Optional)

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Create an OAuth 2.0 Client ID
3. Authorized redirect URIs: `http://localhost:5173`, `https://your-production-url.com`
4. Supabase Dashboard → **Authentication** → **Providers** → **Google**
5. Enter Client ID and Client Secret

### Step 8: Start the App

```bash
npm run dev
```

---

## Development Commands

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |
| `npm run type-check` | TypeScript type checking |

---

## Next Steps

- [Configuration Guide](configuration.md) — All environment variables explained
- [Supabase Setup](../backend/supabase-setup.md) — Detailed Supabase configuration
- [Architecture Overview](../architecture/overview.md) — Understand the system design
