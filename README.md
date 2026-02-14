# 🏠 Family Logistics Dashboard

Private family travel planner built with **Vue 3 + Supabase**.  
Organize trips, packing lists, documents, budgets, and timelines in one secure place.

---

## ✨ Features

### 🔐 Authentication
- Google OAuth authentication (Supabase Auth)
- Protected routes with AuthGuard
- Persistent sessions

### 🧳 Trips
- Create / edit / delete trips
- Duplicate trips
- Trip status tracking (`planning | booked | ready | done`)
- Dashboard with responsive trip cards

### 🧺 Packing Lists
- Add packing items per trip
- Categories: `adult | kid | baby | roadtrip | custom`
- Toggle packed state
- Progress tracking

### 📄 Documents
- Upload files to Supabase Storage
- Store booking references, insurance, tickets
- Secure per-user access

### 💰 Budget
- Add expense entries
- Categorized spending
- Automatic total calculation

### 📅 Timeline
- Add trip events (check-in, departure, stops)
- Date/time-based entries

### 🎯 Centralized Error Handling (NEW)
- Type-safe API responses
- Global toast notifications
- Automatic loading states
- Consistent error handling across the app

---

## 🛠 Tech Stack

**Frontend**
- Vue 3 (Composition API)
- Vite
- TypeScript
- Pinia
- Vue Router
- TailwindCSS

**Backend**
- Supabase
  - Auth (Google OAuth)
  - Postgres Database
  - Storage

**Architecture**
- Clean layered architecture (Services → Stores → Components)
- Type-safe error handling with `ApiResponse<T>`
- Global toast notification system
- Reusable `useAsyncHandler` composable

---

## 📦 Project Structure

```
src/
  components/
    layout/         - Navigation, sidebar
    shared/         - Reusable components (LoadingState, ToastContainer)
    trips/          - Trip-specific components
  views/            - Page components
  stores/           - Pinia stores (auth, trips, templates, toast)
  services/         - API layer with Supabase wrapper
  composables/      - Reusable Vue composables (useAsyncHandler, useAsyncState)
  router/           - Vue Router configuration
  types/            - TypeScript type definitions
docs/
  ERROR_HANDLING.md           - Error handling architecture guide
  TOAST_GUIDE.md              - Toast notification usage guide
  USE_ASYNC_HANDLER_GUIDE.md  - useAsyncHandler composable guide
  REFACTORING_SUMMARY.md      - Summary of error handling refactoring
```

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/family-logistics-dashboard.git
cd family-logistics-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create Supabase project

Go to https://supabase.com  
Create a new project and copy:

- Project URL
- Anon public key

---

### 4. Set up Google OAuth

#### A. Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth client ID**
5. Select **Web application** as application type
6. Under **Authorized redirect URIs**, add:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
7. Click **Create** and copy the **Client ID** and **Client Secret**

> **Note**: You may also need to configure the **OAuth consent screen** under
> APIs & Services → OAuth consent screen before creating credentials.

#### B. Supabase Provider Configuration

1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Providers**
3. Find **Google** in the list and enable it
4. Paste the **Client ID** and **Client Secret** from Google Cloud Console
5. Save the configuration

---

### 5. Configure environment variables

Create a `.env` file in the root:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

### 6. Apply database schema

Run the SQL files in your Supabase SQL Editor:

1. `supabase/schema.sql` — creates tables and enables RLS
2. `supabase/rls.sql` — creates row-level security policies

---

### 7. Run development server

```bash
npm run dev
```

---

## 🤖 AI Pull Request Review (GitHub Actions)

This repository includes `.github/workflows/ai-review.yml` to run automated OpenAI-based PR reviews.

- **Trigger:** `pull_request` on `opened` and `synchronize`
- **Action used:** `aider-ai/pr-reviewer`
- **Behavior:** posts AI review comments directly on the PR
- **Graceful handling:** if OpenAI rate limits or a temporary API error occurs, the workflow adds a PR comment and exits without failing the pipeline

### Add `OPENAI_API_KEY` repository secret

1. Open your GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret**.
4. Name: `OPENAI_API_KEY`
5. Value: your OpenAI API key
6. Save the secret.

> 🔒 **Security note:** Never commit or print `OPENAI_API_KEY` in code, logs, or documentation. Store it only in GitHub Secrets.

---

## 🏗️ Architecture & Error Handling

This project uses a **clean, layered architecture** with centralized error handling:

### Service Layer
- All services return `ApiResponse<T>` instead of throwing errors
- Type-safe responses with `{ data: T | null, error: ApiError | null }`
- Centralized Supabase wrapper eliminates boilerplate

```typescript
// Example service function
export async function fetchTrips(userId: string): Promise<ApiResponse<Trip[]>> {
  return SupabaseService.select<Trip>('trips', builder =>
    builder.eq('created_by', userId)
  );
}
```

### Store Layer
- Stores handle errors and show toast notifications
- Loading states managed automatically
- Consistent error messages

```typescript
// Example store action
async loadTrips(userId: string) {
  const response = await fetchTrips(userId);
  if (response.error) {
    useToastStore().error(`Failed to load trips: ${response.error.message}`);
  } else {
    this.trips = response.data ?? [];
  }
}
```

### Component Layer
- Components use stores or `useAsyncHandler` composable
- Automatic loading states and error handling
- Clean, minimal code

```typescript
// Example component with useAsyncHandler
const { loading, execute } = useAsyncHandler({
  successMessage: 'Trip created!',
});

const handleCreate = async () => {
  const result = await execute(() => createTrip(payload));
  if (result) {
    router.push({ name: 'trip-detail', params: { id: result.id } });
  }
};
```

### Toast Notifications
- Global toast system for user feedback
- Auto-dismiss with configurable duration
- Four types: success, error, warning, info

**For detailed documentation, see:**
- [Error Handling Architecture](docs/ERROR_HANDLING.md)
- [Toast Notification Guide](docs/TOAST_GUIDE.md)
- [useAsyncHandler Guide](docs/USE_ASYNC_HANDLER_GUIDE.md)
- [Refactoring Summary](docs/REFACTORING_SUMMARY.md)

---

## 🗄 Example Database Schema

```sql
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  status text default 'planning',
  created_by uuid references auth.users(id),
  created_at timestamp default now()
);

create table packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text,
  category text,
  is_packed boolean default false
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text,
  description text,
  file_url text,
  created_at timestamp default now()
);

create table budget_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  category text,
  amount numeric,
  currency text,
  created_at timestamp default now()
);

create table timeline_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text,
  date_time timestamp,
  notes text
);
```

---

## 🔒 Security

Enable **Row Level Security (RLS)** on all tables and create policies to ensure users can only access their own data.

Example:

```sql
create policy "Users can manage their trips"
on trips
for all
using (auth.uid() = created_by);
```

---

## 📱 Future Improvements

- Trip sharing (multi-user access)
- Google Calendar sync
- Offline mode
- Expense charts
- Smart packing templates
- PWA support

---

## 📄 License

Private project for personal use.
