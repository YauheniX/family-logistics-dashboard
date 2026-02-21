# 📚 Family Logistics Dashboard - Documentation

Welcome to the documentation for the Family Shopping & Wishlist Planner.

---

## 🚀 Quick Links

### For AI Agents

- [📖 AI Agent Instructions](../AGENTS.md) - **START HERE** (single source of truth)

### Getting Started

- [Quickstart Guide](getting-started/quickstart.md) - Get running in 5 minutes
- [Installation Guide](getting-started/installation.md) - Detailed setup instructions
- [Configuration Guide](getting-started/configuration.md) - Environment variables

### Core Concepts

- [Architecture Overview](architecture/overview.md) - System design and patterns
- [Domain Model](domain/overview.md) - Core entities and relationships
- [Multi-Tenant Architecture](architecture/multi-tenant.md) - Household isolation
- [RBAC Permissions](architecture/rbac-permissions.md) - Role-based access control matrix ✅

### Features

- [Household Management](features/household-management.md) - Creating and managing households
- [Shopping Lists](features/shopping-lists.md) - Shared shopping lists
- [Wishlists](features/wishlists.md) - Personal wishlists with public sharing
- [Mock Mode](features/mock-mode.md) - Frontend-only mode without backend ✅

### Development

- [Project Structure](frontend/project-structure.md) - Folder organization
- [Adding Features](development/adding-features.md) - Feature development guide
- [Repository Pattern](development/repository-pattern.md) - Data access pattern
- [Testing Guide](testing/overview.md) - Testing strategy

### Backend

- [Database Schema](backend/database-schema.md) - Complete database structure ✅
- [RLS Policies](backend/rls-policies.md) - Row-Level Security
- [Supabase Setup](backend/supabase-setup.md) - Backend configuration
- [Authentication](frontend/authentication.md) - OAuth setup and configuration ✅

### Deployment & Operations

- [Deployment Overview](deployment/overview.md) - Deployment options ✅
- [GitHub Secrets Setup](deployment/github-secrets-setup.md) - CI/CD secrets configuration ✅
- [Environment Variables](deployment/environment-variables.md) - Configuration reference
- [CI/CD Pipeline](operations/ci-cd.md) - GitHub Actions workflows ✅

---

## 📖 Documentation Structure

```
docs/
├── getting-started/     # Setup and installation
├── architecture/        # System architecture
├── domain/             # Domain model and entities
├── backend/            # Database and Supabase
├── frontend/           # Vue.js and state management
├── features/           # Feature documentation
├── development/        # Developer guides
├── testing/            # Testing guides
├── deployment/         # Deployment guides
├── operations/         # Monitoring and troubleshooting
├── migration/          # Migration guides
└── adr/                # Architecture Decision Records
```

---

## 🎯 What Is This Application?

A **production-grade Family Planning System** with:

### Core Features

1. **Multi-Tenant Households** - Create households, invite members, manage roles
2. **Shared Shopping Lists** - Collaborate on shopping with family members
3. **Personal Wishlists** - Create and share wishlists publicly
4. **Role-Based Access** - Owner, admin, member, child, and viewer roles
5. **Public Sharing** - Share wishlists via unique links (no login required)
6. **Mock Mode** - Run entirely in browser without backend

### Technology Stack

- **Frontend**: Vue 3, TypeScript, Pinia, TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Architecture**: Clean Architecture with feature-based structure
- **Patterns**: Repository pattern, Service layer, Dependency injection

---

## 🧭 Navigation By Role

### New Developer

1. [Quickstart](getting-started/quickstart.md)
2. [Project Structure](frontend/project-structure.md)
3. [Architecture Overview](architecture/overview.md)
4. [Adding Features](development/adding-features.md)

### System Architect

1. [Architecture Overview](architecture/overview.md)
2. [Clean Architecture](architecture/clean-architecture.md)
3. [Multi-Tenant Design](architecture/multi-tenant.md)
4. [Domain Model](domain/overview.md)

### Backend Developer

1. [Database Schema](backend/database-schema.md)
2. [RLS Policies](backend/rls-policies.md)
3. [Repository Pattern](development/repository-pattern.md)
4. [Migrations](backend/migrations.md)

### Frontend Developer

1. [Project Structure](frontend/project-structure.md)
2. [State Management](frontend/state-management.md)
3. [Components](frontend/components.md)
4. [Authentication](frontend/authentication.md) ✅

### DevOps

1. [Deployment Overview](deployment/overview.md) ✅
2. [CI/CD Pipeline](operations/ci-cd.md) ✅
3. [Environment Variables](deployment/environment-variables.md)
4. [Supabase Production Setup](backend/supabase-setup.md)

---

## ⚠️ Important Notes

### Documentation Status

This documentation is **actively maintained** and reflects the **current state** of the codebase.

**Last Updated**: February 21, 2026

### Old Documentation

- ✅ `/wiki/` folder has been **removed** - all useful content migrated to `/docs/`
- ⚠️ `/.wiki/` folder contains design documents (future/planned features)

**Use `/docs/` as the single source of truth.**

### Migration In Progress

The application is currently migrating from `families` schema to `households` schema:

- See [Migration Guide](migration/families-to-households.md) for details
- See [Migration Progress](migration/migration-progress.md) for current status

---

## 🤝 Contributing to Documentation

### Reporting Issues

Found outdated or incorrect documentation? Please:

1. Check if it's already reported
2. Create an issue with details
3. Tag it with `documentation`

### Updating Documentation

When updating code:

1. ✅ Update related documentation
2. ✅ Add examples if needed
3. ✅ Update diagrams if architecture changes
4. ✅ Test all code examples

### Documentation Standards

- Use present tense
- Include code examples
- Test all examples
- Reference actual file paths
- Update last-modified date

---

## 📞 Getting Help

- **Setup Issues**: See [Troubleshooting](operations/troubleshooting.md)
- **Feature Questions**: See [FAQ](operations/faq.md)
- **Bug Reports**: Create an issue on GitHub
- **Feature Requests**: Create an issue with `enhancement` tag

---

**Built with** [Vue 3](https://vuejs.org/) • [Supabase](https://supabase.com/) • [TailwindCSS](https://tailwindcss.com/)
