# 🏠 Family Logistics Dashboard

> **Production-grade family travel planner** built with Vue 3, TypeScript, and Supabase.  
> Organize trips, packing lists, budgets, documents, and timelines with ease.

[![CI](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml)

---

## ✨ Key Features

- 🧳 **Trip Management** - Create, edit, duplicate, and organize trips
- 🎒 **Packing Lists** - Categorized items with progress tracking
- 💰 **Budget Tracking** - Expense management by category
- 📄 **Document Storage** - Upload and organize trip documents
- 📅 **Timeline/Itinerary** - Schedule events and activities
- 🤝 **Trip Sharing** - Collaborate with role-based access (owner, editor, viewer)
- 🔐 **Secure Auth** - Google OAuth + email/password via Supabase
- ✅ **Production-Ready** - Clean architecture, 70%+ test coverage, CI/CD pipeline

---

## 🛠 Tech Stack

**Frontend:**  
Vue 3 • TypeScript • Pinia • Vue Router • TailwindCSS • Vite • Zod

**Backend:**  
Supabase (PostgreSQL + Auth + Storage + RLS)

**Architecture:**  
Feature-based • Repository pattern • Clean architecture • Type-safe end-to-end

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- Supabase account ([free tier](https://supabase.com))
- Google Cloud Console account (for OAuth)

### Installation

```bash
# Clone repository
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard

# Install dependencies
npm install

# Create .env file
cp env.example .env
# Edit .env with your Supabase credentials
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key to `.env`
3. Run SQL scripts in Supabase SQL Editor (in order):
   - `supabase/schema.sql` - Database tables
   - `supabase/rls.sql` - Security policies
   - `supabase/migrations/002_architecture_refactoring.sql` - Indexes

### Google OAuth Setup

See detailed guide in [📚 Wiki → Authentication](wiki/Authentication.md)

Quick steps:
1. Create OAuth credentials in Google Cloud Console
2. Configure authorized redirect URI:
   ```
   https://<your-supabase-ref>.supabase.co/auth/v1/callback
   ```
3. Add Client ID and Secret to Supabase **Authentication → Providers → Google**

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 🧪 Testing & CI

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

**Coverage Requirements:** 70% minimum (lines, branches, functions, statements)

**CI Pipeline:**
- ✅ Automated testing on every push/PR
- ✅ ESLint + Prettier validation
- ✅ CodeQL security scanning
- ✅ Super Linter quality checks
- ✅ Automatic deployment to Vercel (on `main` branch)

---

## 📚 Documentation

**Comprehensive documentation available in the [Wiki](wiki/Home.md):**

- **[Home](wiki/Home.md)** - Getting started guide
- **[Architecture](wiki/Architecture.md)** - System design and patterns
- **[Database Schema](wiki/Database-Schema.md)** - Tables, RLS policies, functions
- **[Authentication](wiki/Authentication.md)** - Google OAuth + email/password setup
- **[Features](wiki/Features.md)** - Detailed feature documentation
- **[Testing](wiki/Testing.md)** - Test strategy and coverage
- **[CI/CD](wiki/CI-CD.md)** - Continuous integration and deployment
- **[Deployment](wiki/Deployment.md)** - Production deployment guide
- **[Multi-Language & Dark Mode](wiki/Multi-Language-and-Dark-Mode.md)** - i18n and theming
- **[FAQ](wiki/FAQ.md)** - Troubleshooting and common questions

**Additional Technical Docs:**
- [Architecture Guide](docs/ARCHITECTURE.md)
- [Migration Guide](docs/MIGRATION_GUIDE.md)
- [Error Handling](docs/ERROR_HANDLING.md)

---

## 🏗️ Project Structure

```
src/
├── features/              # Feature-based architecture
│   ├── trips/            # Trip management
│   ├── templates/        # Packing templates
│   ├── auth/             # Authentication
│   └── shared/           # Shared utilities
├── components/           # UI components
├── views/                # Page views
├── stores/               # Pinia stores
└── router/               # Vue Router config
```

**Architecture Layers:**
```
Presentation (UI, Stores) → Domain (Services, Logic) → Infrastructure (Repositories, DB)
```

Learn more in [Architecture Documentation](wiki/Architecture.md).

---

## 🤝 Contributing

We welcome contributions! Please:

1. Read the [Architecture Guide](wiki/Architecture.md)
2. Check [open issues](https://github.com/YauheniX/family-logistics-dashboard/issues)
3. Fork the repository
4. Create a feature branch
5. Make your changes (with tests!)
6. Ensure CI passes (lint + tests + coverage)
7. Submit a pull request

**Development Workflow:**
```bash
git checkout -b feature/my-feature
# Make changes
npm run lint
npm test
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR on GitHub
```

---

## 📱 Roadmap

**Completed ✅**
- Clean architecture with feature-based structure
- Repository pattern and type-safe database client
- Comprehensive test suite (70%+ coverage)
- CI/CD pipeline with automated deployment
- Trip sharing with role-based access

**In Progress 🚧**
- Multi-language support (i18n)
- Dark mode

**Planned 📋**
- Google Calendar sync
- Offline mode (PWA)
- Expense charts and analytics
- Smart packing templates with AI
- Mobile app (React Native)
- Multi-currency support
- Export trips to PDF

---

## 📄 License

Private project for personal use.

---

## 🙏 Acknowledgments

Built with:
- [Vue 3](https://vuejs.org/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

---

**Questions?** Check the [FAQ](wiki/FAQ.md) or [open an issue](https://github.com/YauheniX/family-logistics-dashboard/issues).
