# 📦 Database Migrations

Managing database schema changes for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

Database schema changes are managed through sequential migration files in `supabase/migrations/`. Each migration is a plain SQL file that is applied in order.

```
supabase/
├── schema.sql          # Full current schema (generated from migrations)
└── migrations/
    ├── 001_initial.sql
    ├── 002_households.sql
    ├── ...
    └── 0NN_description.sql
```

---

## Migration Naming Convention

Migration files use numeric prefixes for ordering:

```
{NNN}_{description}.sql

Examples:
001_initial_schema.sql
002_add_households.sql
019_security_hardening.sql
```

Rules:

- Numbers are zero-padded to 3 digits
- Descriptions are lowercase with underscores
- Each file contains exactly one logical change

---

## Applying Migrations

### Development (Supabase CLI)

```bash
# Apply all pending migrations
npx supabase db push

# Check migration status
npx supabase db diff

# Reset to clean state (⚠️ destroys all data)
npx supabase db reset
```

### Production

Migrations are applied automatically via CI/CD. See [CI/CD Pipeline](../operations/ci-cd.md).

For manual production migrations:

```bash
npx supabase db push --project-ref your-project-ref
```

---

## Writing a New Migration

### 1. Create the File

```bash
# Use next sequential number
touch supabase/migrations/020_add_new_feature.sql
```

### 2. Write Idempotent SQL

Migrations should be idempotent where possible (safe to run twice):

```sql
-- ✅ Idempotent — uses IF NOT EXISTS / OR REPLACE
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION my_function()
RETURNS VOID AS $$
  -- function body
$$ LANGUAGE SQL;

-- ✅ Add column safely
ALTER TABLE existing_table
  ADD COLUMN IF NOT EXISTS new_column TEXT;
```

### 3. Include RLS Policies

Every new table must have RLS enabled:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "new_table_select"
  ON new_table FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE household_id = new_table.household_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );
```

### 4. Add Indexes for RLS Predicates

```sql
-- Index columns used in RLS WHERE clauses
CREATE INDEX idx_new_table_household_id ON new_table(household_id);
```

### 5. Security Checklist

Before submitting a migration:

- [ ] SECURITY DEFINER functions have `SET search_path = public`
- [ ] RLS policies use `EXISTS` (not `IN`)
- [ ] Email columns use `extensions.citext` type
- [ ] RPC functions validate permissions with `has_min_role()`
- [ ] All RLS predicate columns are indexed

---

## Rollback Strategy

Supabase does not support automatic rollbacks. Each migration should include a corresponding undo script if needed:

```sql
-- migration: 020_add_new_feature.sql
ALTER TABLE households ADD COLUMN IF NOT EXISTS feature_flag BOOLEAN DEFAULT false;

-- rollback (store in scripts/db/rollbacks/ — not in migrations/)
ALTER TABLE households DROP COLUMN IF EXISTS feature_flag;
```

---

## Utility Scripts

Non-migration SQL scripts belong in `scripts/db/`, not in `supabase/migrations/`:

```
scripts/
└── db/
    ├── check-migration-state.sql
    ├── seed-test-data.sql
    └── rollbacks/
```

---

## See Also

- [Database Schema](database-schema.md) — Current schema reference
- [RLS Policies](rls-policies.md) — Security policy documentation
- [Security Hardening Guide](security-hardening-guide.md) — SQL security patterns
