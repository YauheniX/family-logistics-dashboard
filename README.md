# 🏠 Family Logistics Dashboard

> **Production-grade family travel planner** built with Vue 3, TypeScript, and Supabase.  
> Organize trips, packing lists, budgets, documents, and timelines with ease.

[![CI](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml)

---

## 🎯 Deployment Options

This application supports **two modes of operation**:

### 1️⃣ **Frontend-Only Mode (Mock Backend)**
Run the app entirely in the browser with **no backend required**. Perfect for:
- Local development and testing
- Static hosting (GitHub Pages, Netlify, Vercel)
- Demos and prototyping
- Offline usage

**Data Storage:** localStorage (persists in browser)  
**Authentication:** Simple mock auth (no Google OAuth setup needed)

### 2️⃣ **Full-Stack Mode (Supabase Backend)**
Production-ready deployment with real backend. Includes:
- PostgreSQL database with Row Level Security (RLS)
- Google OAuth authentication
- Cloud file storage for documents
- Multi-user trip sharing

**Data Storage:** Supabase PostgreSQL  
**Authentication:** Google OAuth + email/password

---

## ✨ Key Features

- 🧳 **Trip Management** - Create, edit, duplicate, and organize trips
- 🎒 **Packing Lists** - Categorized items with progress tracking
- 💰 **Budget Tracking** - Expense management by category
- 📄 **Document Storage** - Upload and organize trip documents
- 📅 **Timeline/Itinerary** - Schedule events and activities
- 🤝 **Trip Sharing** - Collaborate with role-based access (owner, editor, viewer) *(Supabase mode only)*
- 🔐 **Secure Auth** - Google OAuth + email/password *(Supabase mode only)*
- ✅ **Production-Ready** - Clean architecture, 70%+ test coverage, CI/CD pipeline

---

## 🛠 Tech Stack

**Frontend:**  
Vue 3 • TypeScript • Pinia • Vue Router • TailwindCSS • Vite • Zod

**Backend (Optional):**  
Supabase (PostgreSQL + Auth + Storage + RLS)

**Architecture:**  
Feature-based • Repository pattern • Clean architecture • Type-safe end-to-end

---

## 🚀 Quick Start

### Option A: Frontend-Only Mode (No Backend)

Perfect for local development and static hosting. **No Supabase account needed!**

```bash
# Clone repository
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard

# Install dependencies
npm install

# Run in mock mode (uses localStorage)
npm run dev
```

Visit `http://localhost:5173` 🎉

**Sign in:** Click "Sign in with Google" - it will auto-create a demo user without requiring actual OAuth setup.

**Data persistence:** All data is stored in browser localStorage. Clear browser data to reset.

### Option B: Full-Stack Mode (Supabase Backend)

For production deployments with real backend.

#### Prerequisites

- Node.js 18+ (LTS recommended)
- Supabase account ([free tier](https://supabase.com))
- Google Cloud Console account (for OAuth)

#### Installation

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

#### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key to `.env`
3. Run SQL scripts in Supabase SQL Editor (in order):
   - `supabase/schema.sql` - Database tables
   - `supabase/rls.sql` - Security policies
   - `supabase/migrations/002_architecture_refactoring.sql` - Indexes

#### Google OAuth Setup

See detailed guide in [📚 Wiki → Authentication](wiki/Authentication.md)

Quick steps:

1. Create OAuth credentials in Google Cloud Console
2. Configure authorized redirect URI:
   ```
   https://<your-supabase-ref>.supabase.co/auth/v1/callback
   ```
3. Add Client ID and Secret to Supabase **Authentication → Providers → Google**

#### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` 🎉

---

## 📦 Deploy to GitHub Pages

Deploy the app as a static site to GitHub Pages (or any static host).

### 1. Configure for GitHub Pages

```bash
# Create .env for production
cat > .env << EOF
# Enable mock mode (no backend)
VITE_USE_MOCK_BACKEND=true

# Set base path to your repo name
VITE_BASE_PATH=/family-logistics-dashboard/
EOF
```

### 2. Build

```bash
npm run build
```

This creates a `dist/` folder with optimized static files.

### 3. Deploy

**Option 1: GitHub Actions (Automated)**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        env:
          VITE_USE_MOCK_BACKEND: 'true'
          VITE_BASE_PATH: '/family-logistics-dashboard/'
        run: npm run build
        
      - name: Setup Pages
        uses: actions/configure-pages@v4
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
          
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```

**Option 2: Manual Deploy**

```bash
# Build
npm run build

# Deploy dist folder to gh-pages branch
npx gh-pages -d dist
```

Then enable GitHub Pages in repository settings → Pages → Source: gh-pages branch.

### 4. Access

Your app will be available at: `https://yourusername.github.io/family-logistics-dashboard/`

---

## 🔄 Switching Between Modes

The app automatically detects which mode to use based on environment variables.

### Force Mock Mode

```bash
# .env
VITE_USE_MOCK_BACKEND=true
```

### Force Supabase Mode

```bash
# .env
VITE_USE_MOCK_BACKEND=false
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Auto-Detect Mode

If `VITE_USE_MOCK_BACKEND` is not set, the app will:
- Use **mock mode** if Supabase credentials are missing
- Use **Supabase mode** if credentials are present

---

## ⚠️ Feature Limitations in Mock Mode

| Feature | Mock Mode | Supabase Mode |
|---------|-----------|---------------|
| Trip CRUD | ✅ Full support | ✅ Full support |
| Packing lists | ✅ Full support | ✅ Full support |
| Budget tracking | ✅ Full support | ✅ Full support |
| Timeline/Itinerary | ✅ Full support | ✅ Full support |
| Packing templates | ✅ Full support | ✅ Full support |
| Authentication | ⚠️ Mock only (no real OAuth) | ✅ Google OAuth + email/password |
| Trip sharing | ⚠️ Limited (no real users) | ✅ Multi-user with roles |
| Document upload | ⚠️ Base64 only (browser storage) | ✅ Cloud storage (Supabase) |
| Data persistence | ⚠️ Browser only (localStorage) | ✅ Cloud database (PostgreSQL) |
| Multi-device sync | ❌ Not available | ✅ Syncs across devices |

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
- **[Developer Guides](wiki/Developer-Guides.md)** - Error handling, async patterns, migration guide
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
