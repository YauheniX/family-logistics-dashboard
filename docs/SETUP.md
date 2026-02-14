# 🏠 Family Logistics Dashboard — Localhost Setup Guide

A step-by-step guide to run the **Family Logistics Dashboard** on your local machine.
This application is a private family travel planner that lets you organize trips, packing lists, documents, budgets, and timelines in one secure place.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Clone the Repository](#1-clone-the-repository)
- [2. Install Dependencies](#2-install-dependencies)
- [3. Set Up Supabase](#3-set-up-supabase)
  - [3a. Create a Supabase Project](#3a-create-a-supabase-project)
  - [3b. Run the Database Schema](#3b-run-the-database-schema)
  - [3c. Create the Storage Bucket](#3c-create-the-storage-bucket)
- [4. Configure Environment Variables](#4-configure-environment-variables)
- [5. Start the Development Server](#5-start-the-development-server)
- [6. Create an Account and Log In](#6-create-an-account-and-log-in)
- [7. Available Scripts](#7-available-scripts)
- [Travel Features Overview](#travel-features-overview)
  - [Trips](#-trips)
  - [Packing Lists](#-packing-lists)
  - [Documents](#-documents)
  - [Budget](#-budget)
  - [Timeline](#-timeline)
- [Project Structure](#project-structure)
- [Architecture Overview](#architecture-overview)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Make sure the following are installed on your system:

| Tool        | Minimum Version    | Check command   |
| ----------- | ------------------ | --------------- |
| **Node.js** | 18.x or later      | `node -v`       |
| **npm**     | 9.x or later       | `npm -v`        |
| **Git**     | any recent version | `git --version` |

> **Windows note:** Use the **64-bit (x64)** Node.js installer. Supabase CLI does not support 32-bit Node (`ia32`) on Windows.

You will also need a free **Supabase** account — sign up at [https://supabase.com](https://supabase.com).

---

## 1. Clone the Repository

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
```

---

## 2. Install Dependencies

```bash
npm install
```

This installs:

- **Vue 3** — UI framework (Composition API)
- **Vite** — development server and build tool
- **Pinia** — state management
- **Vue Router** — client-side routing
- **@supabase/supabase-js** — Supabase client SDK
- **TailwindCSS** — utility-first CSS framework
- **TypeScript** — type safety
- **ESLint & Prettier** — code quality tools

---

## 3. Set Up Supabase

The app uses [Supabase](https://supabase.com) as its backend for authentication, database (PostgreSQL), and file storage.

### 3a. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**.
3. Choose an organization, enter a project name (e.g., `family-logistics`), set a database password, and select a region close to you.
4. Wait for the project to finish provisioning.
5. Once ready, go to **Settings → API** and copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **anon public** key (under "Project API keys")

### 3b. Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Copy the entire contents of [`supabase/schema.sql`](../supabase/schema.sql) from this repository and paste it into the editor.
4. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).

This creates the following tables with Row Level Security (RLS) enabled:

| Table             | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `trips`           | Core trip data — name, dates, status, owner      |
| `packing_items`   | Per-trip packing checklist with categories       |
| `documents`       | File metadata (title, description, storage URL)  |
| `budget_entries`  | Expense tracking with category, amount, currency |
| `timeline_events` | Trip milestones with date/time and notes         |

All tables have RLS policies so each user can only access their own data.

### 3c. Create the Storage Bucket

The schema script automatically creates a `documents` storage bucket. If it doesn't appear:

1. In the Supabase dashboard, go to **Storage**.
2. Click **New bucket**.
3. Name it `documents` and enable **Public bucket** (the app retrieves public URLs for uploads).

---

## 4. Configure Environment Variables

1. Copy the example environment file:

   ```bash
   cp env.example .env
   ```

2. Open `.env` and fill in the values from your Supabase project:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_public_key
   VITE_SUPABASE_STORAGE_BUCKET=documents
   ```

   | Variable                       | Description                                                            |
   | ------------------------------ | ---------------------------------------------------------------------- |
   | `VITE_SUPABASE_URL`            | Your Supabase project URL (from Settings → API)                        |
   | `VITE_SUPABASE_ANON_KEY`       | Your anon/public API key (from Settings → API)                         |
   | `VITE_SUPABASE_STORAGE_BUCKET` | Name of the storage bucket for document uploads (default: `documents`) |

> **Note:** The `.env` file is git-ignored. Never commit real credentials to version control.

### 4b. Enable in-app issue reporting (optional)

The app can create GitHub issues via a **Supabase Edge Function** so the GitHub token is never exposed to the browser.

1. Deploy the function:

   ```bash
   npx supabase functions deploy report-issue
   ```

2. Set function secrets (server-side only):

   ```bash
   npx supabase secrets set GITHUB_TOKEN=... GITHUB_OWNER=... GITHUB_REPO=...
   ```

The UI button is available when running with Supabase enabled (not in mock backend mode).

---

## 5. Start the Development Server

```bash
npm run dev
```

The Vite dev server starts and outputs a local URL (default: [http://localhost:5173](http://localhost:5173)).

Open the URL in your browser.

---

## 6. Create an Account and Log In

1. On the first visit you are redirected to the **Login** page.
2. Click **Create one** to go to the **Register** page.
3. Enter an email and password, then click **Create account**.
4. Once registered, you are taken to the **Dashboard** where you can start creating trips.

> **Tip:** Supabase Auth may send a confirmation email depending on your project settings. To disable email confirmation for local development, go to **Authentication → Settings → Email Auth** in the Supabase dashboard and turn off "Enable email confirmations".

---

## 7. Available Scripts

| Command           | Description                                       |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Start the Vite development server with hot-reload |
| `npm run build`   | Create an optimized production build in `dist/`   |
| `npm run preview` | Preview the production build locally              |
| `npm run lint`    | Run ESLint on `.ts` and `.vue` files              |
| `npm run format`  | Auto-format all files with Prettier               |

---

## Travel Features Overview

### 🧳 Trips

The central entity of the application. Each trip contains:

- **Name** — e.g., "Spain family adventure"
- **Start / End dates**
- **Status** — `planning` → `booked` → `ready` → `done`

**Routes:**

| Page        | Path              | Description                                              |
| ----------- | ----------------- | -------------------------------------------------------- |
| Dashboard   | `/`               | Lists all your trips with summary stats                  |
| New Trip    | `/trips/new`      | Form to create a trip                                    |
| Trip Detail | `/trips/:id`      | Full trip view with packing, documents, budget, timeline |
| Edit Trip   | `/trips/:id/edit` | Edit an existing trip                                    |

From the dashboard you can **view**, **edit**, **duplicate**, or **delete** any trip.

### 🧺 Packing Lists

Each trip has its own packing list. You can:

- Add items with a title and category (`adult`, `kid`, `baby`, `roadtrip`, `custom`)
- Check/uncheck items as you pack
- Track packing progress

### 📄 Documents

Upload and manage travel documents per trip:

- Booking confirmations, insurance papers, tickets, etc.
- Files are stored in Supabase Storage under the `documents` bucket
- Each document has a title, optional description, and a file URL

### 💰 Budget

Track trip expenses:

- Add entries with a category (e.g., "Flights", "Hotel"), amount, and currency
- The dashboard shows total budget across all trips
- Per-trip budget view shows itemized expenses

### 📅 Timeline

Record important trip milestones:

- Events like check-in, departure, excursions, or return
- Each event has a title, date/time, and optional notes
- Events are sorted chronologically

---

## Project Structure

```
family-logistics-dashboard/
├── docs/                        # Documentation
│   └── SETUP.md                 # This file
├── src/
│   ├── App.vue                  # Root component (layout shell)
│   ├── main.ts                  # App entry point
│   ├── components/
│   │   ├── layout/
│   │   │   └── SidebarNav.vue   # Sidebar navigation
│   │   ├── shared/
│   │   │   ├── EmptyState.vue   # Empty-state placeholder
│   │   │   └── LoadingState.vue # Loading spinner
│   │   └── trips/
│   │       └── TripCard.vue     # Trip card for the dashboard grid
│   ├── composables/
│   │   └── useAsyncState.ts     # Reusable async state helper
│   ├── router/
│   │   └── index.ts             # Vue Router config + auth guards
│   ├── services/
│   │   ├── supabaseClient.ts    # Supabase client initialization
│   │   ├── tripService.ts       # CRUD operations for trips & related data
│   │   └── storageService.ts    # File upload to Supabase Storage
│   ├── stores/
│   │   ├── auth.ts              # Pinia auth store (login, register, logout)
│   │   └── trips.ts             # Pinia trips store (trips, packing, docs, budget, timeline)
│   ├── styles/
│   │   └── main.css             # Global styles + TailwindCSS directives
│   ├── types/
│   │   └── entities.ts          # TypeScript interfaces (Trip, PackingItem, etc.)
│   └── views/
│       ├── DashboardView.vue    # Trip list with summary stats
│       ├── TripDetailView.vue   # Trip detail with packing, docs, budget, timeline
│       ├── TripFormView.vue     # Create / edit trip form
│       └── auth/
│           ├── LoginView.vue    # Sign-in page
│           └── RegisterView.vue # Registration page
├── supabase/
│   └── schema.sql               # Database schema + RLS policies
├── env.example                  # Environment variable template
├── package.json                 # Dependencies and scripts
├── tailwind.config.cjs          # TailwindCSS configuration
├── postcss.config.cjs           # PostCSS configuration
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite build configuration
├── .eslintrc.cjs                # ESLint configuration
└── .prettierrc                  # Prettier configuration
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                    Browser                       │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Vue Router  │  │  Pinia   │  │ Components │  │
│  │  (Guards)    │  │  Stores  │  │  & Views   │  │
│  └──────┬──────┘  └────┬─────┘  └─────┬──────┘  │
│         │              │              │          │
│         └──────────┬───┘──────────────┘          │
│                    │                             │
│            ┌───────▼────────┐                    │
│            │  Service Layer │                    │
│            │ (tripService,  │                    │
│            │  storageService│                    │
│            │  supabaseClient│                    │
│            └───────┬────────┘                    │
└────────────────────┼─────────────────────────────┘
                     │ HTTPS
          ┌──────────▼──────────┐
          │      Supabase       │
          │  ┌───────────────┐  │
          │  │  Auth          │  │
          │  │  PostgreSQL DB │  │
          │  │  Storage       │  │
          │  └───────────────┘  │
          └─────────────────────┘
```

**Data flow:**

1. **Vue Router** guards check auth state before loading protected pages.
2. **Views** dispatch actions to **Pinia stores**.
3. **Stores** call the **service layer** (`tripService.ts`, `storageService.ts`).
4. **Services** use the **Supabase JS client** to communicate with the Supabase backend over HTTPS.
5. **Supabase** handles auth, runs queries against PostgreSQL (with RLS), and manages file storage.

---

## Troubleshooting

### `Missing Supabase environment variables`

The app throws this error at startup if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are not set.

**Fix:** Make sure you created a `.env` file (see [step 4](#4-configure-environment-variables)) and that both values are filled in.

### `npm run dev` fails or nothing loads

- Ensure you ran `npm install` first.
- Check you are using Node.js 18 or later (`node -v`).
- Check terminal output for port conflicts — Vite defaults to port 5173. If that port is in use, Vite automatically picks the next available port.

### `'supabase' is not recognized` during local setup

- Run `node -p "process.arch"`.
- If it returns `ia32`, reinstall **64-bit (x64)** Node.js and reopen your terminal.
- Run `npm.cmd rebuild supabase` in the project root to regenerate the local Supabase launcher.
- Verify the CLI with `npx.cmd supabase --version`.
- Re-run the local setup task after reinstalling Node.

### Cannot register or log in

- Verify the Supabase URL and anon key in your `.env` are correct.
- If you see "Email not confirmed" errors, disable email confirmation in the Supabase dashboard: **Authentication → Settings → Email Auth → Enable email confirmations** → turn off.

### Tables not found / RLS errors

- Make sure you ran the full `supabase/schema.sql` in the Supabase SQL Editor.
- Check that RLS is enabled on all tables (the schema script does this automatically).

### File uploads fail

- Confirm the `documents` storage bucket exists in **Supabase → Storage**.
- Ensure the storage policies from `schema.sql` were applied.
- Check that `VITE_SUPABASE_STORAGE_BUCKET` in `.env` matches the bucket name (default: `documents`).

### Build errors

```bash
npm run build
```

If you see TypeScript errors, run:

```bash
npm run lint
```

to identify specific issues. The project uses strict TypeScript settings.
