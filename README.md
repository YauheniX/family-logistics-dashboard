# 🛒 Family Shopping & Wishlist Planner

> **Production-grade Family Planner** built with Vue 3, TypeScript, and Supabase.  
> Create shared shopping lists, manage personal wishlists, and collaborate with family members.

[![CI](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml)

---

## 🎯 What Is This?

A **Family Planner** system with:

1. **Shared Shopping Lists** — Create and manage shopping lists within your family group. Family members can add items, mark purchases, and see who bought what.
2. **Personal Wishlists** — Create wish lists that can be publicly shared via a unique link. Anyone (no login required) can view and reserve items.
3. **Family Groups** — Create a family, invite members by email, and collaborate on shared shopping lists.
4. **Role-Based Access** — Family owners can manage members; all members can create and edit shopping lists.
5. **Public Wishlist Sharing** — Share wishlists via `/w/:share_slug` — visitors can reserve items without logging in.

---

## ✨ Key Features

- 👨‍👩‍👧‍👦 **Family Groups** — Create families, invite members, manage roles (owner/member)
- 🛒 **Shared Shopping Lists** — Add items, mark purchased, see who bought what, archive lists
- 🎁 **Personal Wishlists** — Create wishlists with priority, price, links, and images
- 🌐 **Public Wishlist Sharing** — Share via unique link, visitors can reserve items without login
- 🔐 **Secure Auth** — Google OAuth + email/password (Supabase mode)
- 📊 **Dashboard** — Stats for active lists, items to buy, reserved wishlist items
- ✅ **Production-Ready** — Clean architecture, comprehensive tests, CI/CD pipeline

---

## 🛠 Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| **Frontend**   | Vue 3 (Composition API) • TypeScript • Pinia • Tailwind |
| **Backend**    | Supabase (PostgreSQL + Auth + Storage + RLS)            |
| **Validation** | Zod                                                    |
| **Build**      | Vite                                                    |
| **Deployment** | Vercel / GitHub Pages / Any static host                 |

---

## 🗄️ Database Schema

```
user_profiles     — Extended user profile (display_name, avatar_url)
families          — Family groups
family_members    — Members with roles (owner | member)
shopping_lists    — Shared lists per family (active | archived)
shopping_items    — Items with quantity, category, purchase tracking
wishlists         — Personal wishlists with public share_slug
wishlist_items    — Items with priority, price, reservation support
```

### Entity Relationships

```
auth.users ──┬── user_profiles (1:1)
             ├── families (creator)
             ├── family_members (many-to-many with families)
             ├── shopping_lists (creator)
             ├── shopping_items (added_by, purchased_by)
             └── wishlists (owner)
                   └── wishlist_items (with public reservation)
```

See [`supabase/schema.sql`](supabase/schema.sql) for the full schema.

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled. Key policies:

| Table            | Rule                                                               |
| ---------------- | ------------------------------------------------------------------ |
| **user_profiles** | Anyone can read; only own profile can be updated                  |
| **families**      | Visible only to members; only owner can update/delete             |
| **family_members**| Visible to family members; only owner can add/remove              |
| **shopping_lists**| Accessible only if user is a family member                        |
| **shopping_items**| Accessible only if parent list belongs to user's family           |
| **wishlists**     | Owner has full access; public read if `is_public = true`          |
| **wishlist_items**| Owner full access; public reservation via security-definer function|

Public wishlist reservation uses a `reserve_wishlist_item()` security-definer function that restricts updates to only `is_reserved` and `reserved_by_email` fields.

See [`supabase/rls.sql`](supabase/rls.sql) for all policies.

---

## 🗺️ Routing Structure

| Path                          | View                | Auth Required |
| ----------------------------- | ------------------- | ------------- |
| `/login`                      | Login               | No (guests)   |
| `/register`                   | Register            | No (guests)   |
| `/`                           | Dashboard           | Yes           |
| `/families`                   | Family List         | Yes           |
| `/families/:id`               | Family Detail       | Yes           |
| `/shopping/:listId`           | Shopping List       | Yes           |
| `/wishlists`                  | Wishlist List       | Yes           |
| `/wishlists/:id`              | Wishlist Edit       | Yes           |
| `/wishlist/:shareSlug`        | Public Wishlist     | **No**        |

---

## 🚀 Quick Start

### Option A: Frontend-Only Mode (No Backend)

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
npm install
npm run dev
```

Visit `http://localhost:5173` — uses localStorage, no Supabase needed.

### Option B: Full-Stack Mode (Supabase Backend)

#### Prerequisites

- Node.js 18+
- [Supabase account](https://supabase.com) (free tier)
- Google Cloud Console account (for OAuth)

#### Setup

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
npm install
cp env.example .env
# Edit .env with your Supabase credentials
```

#### Supabase Configuration

1. **Create a project** at [supabase.com](https://supabase.com)
2. **Set environment variables** (from Project Settings → API):
   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_USE_MOCK_BACKEND=false
   ```
3. **Run SQL scripts** in Supabase SQL Editor:
   - `supabase/schema.sql` — Creates tables and functions
   - `supabase/rls.sql` — Sets up RLS policies
4. **Create storage bucket** named `wishlist-images` (public read)
5. **Enable Auth providers**: Email + Google OAuth

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase Authentication → Providers → Google

```bash
npm run dev
```

---

## 🌐 Public Wishlist Sharing

Wishlists can be shared publicly via a unique URL:

```
https://your-app.com/#/wishlist/<share_slug>
```

**How it works:**
- Wishlist owner sets `is_public = true` and copies the share link
- Anyone with the link can view the wishlist items
- Visitors can **reserve items** by clicking "Reserve" (optionally providing their email)
- The wishlist owner can see who reserved each item
- No login is required for public visitors

---

## 🚀 Deploy to Vercel

1. Import your repository at [vercel.com](https://vercel.com)
2. Set environment variables:
   - `VITE_SUPABASE_URL` — Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — Your Supabase anon key
3. Deploy

For mock mode: set `VITE_USE_MOCK_BACKEND=true` (no Supabase needed).

---

## 🏗️ Project Structure

```
src/
├── features/              # Feature-based architecture
│   ├── auth/              # Authentication (login, register, OAuth)
│   ├── family/            # Family groups & members
│   ├── shopping/          # Shared shopping lists & items
│   ├── wishlist/          # Personal wishlists & public sharing
│   └── shared/            # Shared domain, infrastructure, utilities
├── components/            # UI components (layout, shared)
├── views/                 # Page views
├── stores/                # Pinia stores (auth, toast)
├── composables/           # Vue composables
├── services/              # Supabase client
├── router/                # Vue Router configuration
└── config/                # Backend mode configuration
```

Each feature follows:
```
feature/
├── domain/          # Service with business logic
├── infrastructure/  # Repository (Supabase + mock)
└── presentation/    # Pinia store
```

---

## 🧪 Testing

```bash
npm test              # Run tests
npm run test:coverage # Run with coverage
npm run lint          # Lint code
npm run build         # Production build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes with tests
4. Ensure CI passes: `npm run lint && npm test`
5. Submit a pull request

---

## 📄 License

Private project for personal use.

---

Built with [Vue 3](https://vuejs.org/) • [Supabase](https://supabase.com/) • [TailwindCSS](https://tailwindcss.com/) • [Vite](https://vitejs.dev/)
