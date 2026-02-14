# 🏠 Family Logistics Dashboard - Documentation

Welcome to the Family Logistics Dashboard documentation!

This wiki contains comprehensive guides for developers and contributors working on this production-grade family travel planning application.

## 📖 Quick Navigation

### Getting Started
- **[Quick Start](Home.md#quick-start)** - Get up and running in minutes
- **[Authentication Setup](Authentication.md)** - Configure Google OAuth and email/password auth

### Architecture & Development
- **[Architecture Overview](Architecture.md)** - System design, patterns, and best practices
- **[Database Schema](Database-Schema.md)** - Tables, relationships, and RLS policies
- **[Features Guide](Features.md)** - Detailed documentation for all features

### Quality & Deployment
- **[Testing](Testing.md)** - Test structure, coverage, and best practices
- **[CI/CD](CI-CD.md)** - Continuous integration and deployment workflows
- **[Deployment](Deployment.md)** - How to deploy to production

### Additional Topics
- **[Multi-Language & Dark Mode](Multi-Language-and-Dark-Mode.md)** - Internationalization and theming
- **[FAQ](FAQ.md)** - Common questions and troubleshooting

---

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or yarn
- Supabase account (free tier available)
- Google Cloud Console account (for OAuth)

### 1. Clone & Install

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
npm install
```

### 2. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Copy your project URL and anon key

### 3. Set Environment Variables

Create a `.env` file:

```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 4. Set Up Database

Run these SQL files in your Supabase SQL Editor (in order):

1. `supabase/schema.sql` - Creates tables
2. `supabase/rls.sql` - Adds security policies
3. `supabase/migrations/002_architecture_refactoring.sql` - Performance indexes

### 5. Configure Authentication

Follow the detailed [Authentication Setup Guide](Authentication.md) to configure Google OAuth.

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## Project Overview

### What It Does

Family Logistics Dashboard helps families plan and manage trips with:
- 🧳 **Trip Management** - Create, edit, track trip status
- 🎒 **Packing Lists** - Categorized packing items with progress tracking
- 💰 **Budget Tracking** - Expense management with categories
- 📄 **Document Storage** - Upload and organize trip documents
- 📅 **Timeline/Itinerary** - Schedule events and activities
- 🤝 **Trip Sharing** - Collaborate with family members (owner, editor, viewer roles)

### Tech Stack

**Frontend**
- Vue 3 (Composition API) + TypeScript
- Pinia (state management)
- Vue Router
- TailwindCSS
- Vite (build tool)
- Zod (validation)

**Backend**
- Supabase (PostgreSQL + Auth + Storage)
- Row Level Security (RLS)

**Architecture**
- Feature-based structure
- Repository pattern
- Clean architecture layers
- Type-safe end-to-end

---

## Architecture Highlights

This project follows **clean architecture** principles:

```
┌─────────────────────────────────┐
│     Presentation Layer          │
│  (UI, Stores, Composables)      │
├─────────────────────────────────┤
│       Domain Layer              │
│  (Business Logic, Services)     │
├─────────────────────────────────┤
│    Infrastructure Layer         │
│  (Repositories, Database)       │
└─────────────────────────────────┘
```

**Key Benefits:**
- ✅ Clear separation of concerns
- ✅ Testable business logic
- ✅ Independent features
- ✅ Type-safe from DB to UI
- ✅ Easy to maintain and extend

Learn more in the [Architecture Guide](Architecture.md).

---

## Contributing

### Before You Start

1. Read the [Architecture Overview](Architecture.md)
2. Understand the [Testing Strategy](Testing.md)
3. Check the [CI/CD Pipeline](CI-CD.md)

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

All PRs must pass:
- ✅ ESLint checks
- ✅ Tests with 70% coverage
- ✅ CodeQL security analysis
- ✅ Super Linter validation

---

## Need Help?

- Check the [FAQ](FAQ.md)
- Review relevant documentation pages
- Open an issue on GitHub

---

## Documentation Structure

```
wiki/
├── Home.md                              # This page
├── Architecture.md                      # System design and patterns
├── Database-Schema.md                   # Database tables and RLS
├── Authentication.md                    # Auth setup (Google OAuth)
├── Features.md                          # Feature documentation
├── Testing.md                           # Test strategy and coverage
├── CI-CD.md                             # CI/CD pipelines
├── Deployment.md                        # Deployment guides
├── Multi-Language-and-Dark-Mode.md      # i18n and theming
└── FAQ.md                               # Troubleshooting
```

---

**Last Updated:** February 2026  
**Version:** 2.0
