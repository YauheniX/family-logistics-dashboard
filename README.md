# 🏠 Family Logistics Dashboard

Production-grade family travel planner built with **Vue 3 + Supabase**.  
Organize trips, packing lists, documents, budgets, and timelines with enterprise-level architecture.

**🎯 New in v2.0: Production-Ready Architecture**
- ✅ Feature-based folder structure
- ✅ Repository pattern for data access
- ✅ Typed Supabase client with generated types
- ✅ Zod validation for forms
- ✅ Clean separation: Domain → Infrastructure → Presentation
- ✅ Full backward compatibility

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

### 🎯 Centralized Error Handling
- Type-safe API responses
- Global toast notifications
- Automatic loading states
- Consistent error handling across the app

### 🤝 Trip Sharing (NEW)
- Invite members by email
- Role-based access (owner, editor, viewer)
- Secure user lookup functions
- Real-time collaboration

---

## 🛠 Tech Stack

**Frontend**
- Vue 3 (Composition API)
- TypeScript (strict mode)
- Pinia (state management)
- Vue Router
- Vite (build tool)
- TailwindCSS
- Zod (runtime validation)

**Backend**
- Supabase
  - Auth (Google OAuth)
  - Postgres Database
  - Storage (file uploads)
  - Row Level Security (RLS)

**Architecture**
- **Feature-based structure** (trips, templates, auth, shared)
- **Repository pattern** for data access
- **Service layer** for business logic
- **Typed database client** with generated types
- **Zod validation** for forms and inputs
- **Clean architecture** (Domain → Infrastructure → Presentation)

---

## 📦 Project Structure

```
src/
  features/              # Feature-based architecture (NEW!)
    trips/
      domain/           # Business logic & services
      infrastructure/   # Repositories & data access
      presentation/     # Stores & UI (to be added)
      index.ts          # Public API
    templates/
      domain/
      infrastructure/
      presentation/
      index.ts
    auth/
      domain/
      infrastructure/
      presentation/
      index.ts
    shared/             # Common code
      domain/           # Entities, validation, interfaces
      infrastructure/   # Database types, Supabase client, base repository
      presentation/     # Shared composables
      index.ts
  components/           # UI components (being migrated to features)
    layout/            - Navigation, sidebar
    shared/            - Reusable components
    trips/             - Trip-specific components
  views/               # Page components
  stores/              # Legacy stores (backward compatibility layer)
  services/            # Legacy services (being migrated)
  composables/         # Reusable Vue composables
  router/              # Vue Router configuration
  types/               # Legacy type definitions
docs/
  ARCHITECTURE.md              # Architecture overview and design patterns
  MIGRATION_GUIDE.md           # Step-by-step migration guide with examples
  ERROR_HANDLING.md            # Error handling architecture
  TOAST_GUIDE.md               # Toast notification usage
  USE_ASYNC_HANDLER_GUIDE.md   # Async handler composable
supabase/
  schema.sql                   # Database schema
  rls.sql                      # Row Level Security policies
  migrations/
    002_architecture_refactoring.sql  # Performance indexes
```

### 📚 Architecture Documentation

**New developers start here:**
1. [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Understand the architecture
2. [MIGRATION_GUIDE.md](docs/MIGRATION_GUIDE.md) - See code examples
3. Feature folders - Explore the codebase

**Key concepts:**
- **Features are independent** - Each feature has its own domain, infrastructure, and presentation
- **Repository pattern** - Clean data access abstraction
- **Service layer** - Complex business logic
- **Type safety** - From database to UI
- **Validation** - Zod schemas for runtime checking

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

### 6. Apply database schema and migrations

Run the SQL files in your Supabase SQL Editor in order:

1. `supabase/schema.sql` — creates tables and enables RLS
2. `supabase/rls.sql` — creates row-level security policies
3. `supabase/migrations/002_architecture_refactoring.sql` — adds performance indexes

---

### 7. Run development server

```bash
npm run dev
```

---

## 🤖 AI Pull Request Review (GitHub Actions)

This repository includes `.github/workflows/ai-review.yml` to run automated OpenAI-based PR reviews.

- **Trigger:** `pull_request` on `opened` and `synchronize`
- **Action used:** `anc95/ChatGPT-CodeReview@v1.0.23`
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

## 🏗️ Production-Grade Architecture

This project follows **clean architecture** principles with a **feature-based structure**.

### Layers

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Stores, Components, Composables)      │
├─────────────────────────────────────────┤
│           Domain Layer                  │
│   (Entities, Services, Validation)      │
├─────────────────────────────────────────┤
│       Infrastructure Layer              │
│  (Repositories, Database, External APIs)│
└─────────────────────────────────────────┘
```

### Repository Pattern

All data access goes through repositories:

```typescript
// Clean, consistent API
import { tripRepository } from '@/features/trips';

// Type-safe queries
const response = await tripRepository.findByUserId(userId);
if (response.data) {
  console.log(response.data); // Trips[]
}
```

### Service Layer

Business logic lives in services:

```typescript
import { tripService } from '@/features/trips';

// Complex operations handled for you
const duplicated = await tripService.duplicateTrip(originalTrip);
// ✅ Copies trip, packing items, budget, timeline
// ✅ Handles errors and rollback
// ✅ Returns typed result
```

### Form Validation

Runtime validation with Zod:

```typescript
import { useFormValidation } from '@/features/shared/presentation/useFormValidation';
import { TripFormSchema } from '@/features/shared/domain/validation.schemas';

const { validate, errors } = useFormValidation(TripFormSchema);

const result = validate(formData);
if (result.success) {
  // ✅ Data is validated and typed
  await createTrip(result.data);
} else {
  // ❌ Errors available in errors.value
  console.log(errors.value);
}
```

### Type Safety

End-to-end type safety from database to UI:

```typescript
// 1. Database types (auto-generated from schema)
import type { Database } from '@/features/shared/infrastructure/database.types';

// 2. Domain entities (clean business types)
import type { Trip, CreateTripDto } from '@/features/shared/domain/entities';

// 3. Typed Supabase client
import { supabase } from '@/features/shared/infrastructure/supabase.client';
const { data } = await supabase.from('trips').select('*');
// data is typed as Trip[]
```

### Error Handling

Consistent error handling across all layers:

```typescript
// All operations return ApiResponse<T>
interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

// Easy to handle
const response = await tripRepository.findById(id);
if (response.error) {
  showError(response.error.message);
} else {
  const trip = response.data; // Typed!
}
```

### Documentation

**📚 Essential Reading:**
- [Architecture Guide](docs/ARCHITECTURE.md) - Design patterns and structure
- [Migration Guide](docs/MIGRATION_GUIDE.md) - Code examples and how-tos
- [Error Handling](docs/ERROR_HANDLING.md) - Error handling patterns
- [Toast Guide](docs/TOAST_GUIDE.md) - User notifications

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

## 📱 Roadmap

**Completed ✅**
- Feature-based architecture
- Repository pattern
- Typed Supabase client
- Zod validation
- Trip sharing with roles
- Document upload
- Budget tracking
- Timeline/itinerary

**In Progress 🚧**
- Migrate UI components to feature folders
- Comprehensive test suite
- API documentation with TypeDoc

**Planned 📋**
- Google Calendar sync
- Offline mode (PWA)
- Expense charts and analytics
- Smart packing templates with AI
- Mobile app (React Native)
- Multi-currency support
- Export to PDF

---

## 📄 License

Private project for personal use.
