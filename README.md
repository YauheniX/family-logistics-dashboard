# 🏠 Family Logistics Dashboard

Private family travel planner built with **Vue 3 + Supabase**.  
Organize trips, packing lists, documents, budgets, and timelines in one secure place.

---

## ✨ Features

### 🔐 Authentication
- Email/password authentication (Supabase Auth)
- Protected routes
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
  - Auth
  - Postgres Database
  - Storage

---

## 📦 Project Structure

```
src/
  components/
  views/
  stores/
  services/
  composables/
  router/
  types/
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

### 4. Configure environment variables

Create a `.env` file in the root:

```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

### 5. Run development server

```bash
npm run dev
```

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
