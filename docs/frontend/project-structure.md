# 📁 Project Structure

Directory layout and organisation of the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Top-Level Structure

```
family-logistics-dashboard/
├── src/                    # Application source code
├── supabase/               # Database schema and migrations
├── docs/                   # Project documentation
├── public/                 # Static assets (copied to dist/)
├── scripts/                # Utility scripts (db, deployment)
├── .github/                # GitHub Actions workflows
├── env.example             # Environment variable template
├── index.html              # Vite HTML entry point
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.cjs     # TailwindCSS configuration
├── postcss.config.cjs      # PostCSS configuration
├── .eslintrc.cjs           # ESLint configuration
└── package.json            # Dependencies and scripts
```

---

## Source Code: `src/`

```
src/
├── features/               # Feature modules (Clean Architecture)
│   ├── auth/               # Authentication
│   ├── household/          # Household management
│   ├── shopping/           # Shopping lists and items
│   ├── wishlist/           # Wishlists and items
│   └── shared/             # Shared domain entities
├── stores/                 # Global Pinia stores
│   ├── auth.ts             # Re-export of feature auth store
│   ├── household.ts        # Global household store
│   └── toast.ts            # Toast notification store
├── components/             # Reusable UI components
│   └── shared/             # Shared across features
├── composables/            # Vue composables
│   ├── useMembers.ts
│   ├── useInvitations.ts
│   ├── useLinkPreview.ts
│   └── ...
├── views/                  # Page-level Vue components
├── router/                 # Vue Router configuration
│   └── index.ts
├── services/               # Cross-cutting services
│   ├── supabaseClient.ts   # Supabase client singleton
│   └── issueReporter.ts    # In-app issue reporting
├── config/                 # Application configuration
│   └── backend.config.ts   # Mock/Supabase mode detection
├── i18n/                   # Internationalisation (if used)
├── styles/                 # Global CSS
├── types/                  # Global TypeScript type declarations
├── utils/                  # Utility functions
├── App.vue                 # Root Vue component
├── main.ts                 # Application entry point
└── global.d.ts             # Global type declarations
```

---

## Feature Module Structure

Each feature follows Clean Architecture layers:

```
src/features/<feature>/
├── domain/
│   ├── entities.ts                    # TypeScript interfaces (entities, DTOs)
│   ├── <feature>.service.ts           # Domain service (optional)
│   └── <feature>.repository.interface.ts  # Repository contract
├── infrastructure/
│   ├── <feature>.repository.ts        # Supabase implementation
│   ├── <feature>.mock-repository.ts   # localStorage implementation
│   └── <feature>.factory.ts           # Factory: picks implementation
├── presentation/
│   └── <feature>.store.ts             # Pinia store
├── __tests__/                         # Feature tests
└── index.ts                           # Public re-exports
```

**Example: shopping feature**

```
src/features/shopping/
├── domain/
│   ├── shopping.entities.ts
│   └── shopping.repository.interface.ts
├── infrastructure/
│   ├── shopping.repository.ts
│   ├── shopping.mock-repository.ts
│   └── shopping.factory.ts
├── presentation/
│   └── shopping.store.ts
└── index.ts
```

---

## Global Stores: `src/stores/`

These are application-level stores shared across features:

| File           | Store ID    | Purpose                        |
| -------------- | ----------- | ------------------------------ |
| `auth.ts`      | `auth`      | User session, login state      |
| `household.ts` | `household` | Current household, memberships |
| `toast.ts`     | `toast`     | Toast notification queue       |

Feature-level stores live in `src/features/<feature>/presentation/`.

---

## Database: `supabase/`

```
supabase/
├── schema.sql              # Full current schema (generated)
└── migrations/
    ├── 001_initial.sql
    ├── 002_households.sql
    └── ...
```

---

## Documentation: `docs/`

```
docs/
├── README.md               # Documentation index
├── audit-report.md         # Documentation audit report
├── user-guide.md           # End-user guide
├── getting-started/        # Setup guides
├── architecture/           # System architecture docs
├── domain/                 # Domain model docs
├── backend/                # Database and Supabase docs
├── frontend/               # Vue.js and state management docs
├── features/               # Feature-level docs
├── development/            # Developer guides
├── testing/                # Testing strategy
├── deployment/             # Deployment guides
└── operations/             # CI/CD, troubleshooting, FAQ
```

---

## Configuration Files

| File                  | Purpose                            |
| --------------------- | ---------------------------------- |
| `vite.config.ts`      | Vite dev server and build settings |
| `tsconfig.json`       | TypeScript compiler options        |
| `tailwind.config.cjs` | TailwindCSS theme and plugins      |
| `.eslintrc.cjs`       | ESLint rules                       |
| `.prettierrc`         | Prettier formatting rules          |
| `env.example`         | Environment variable template      |

---

## See Also

- [Architecture Overview](../architecture/overview.md) — System design
- [Clean Architecture](../architecture/clean-architecture.md) — Layer pattern
- [Adding Features](../development/adding-features.md) — Creating new modules
