# 🚀 Auto-Apply Migrations Setup

## What is this?

When you merge a PR to `main` - database migrations automatically apply to your Supabase database.

---

## ⚠️ Important: Different Secrets for Different Purposes

You already have these secrets (for your **frontend app**):

- ✅ `VITE_SUPABASE_URL` - Frontend connects to Supabase
- ✅ `VITE_SUPABASE_ANON_KEY` - Frontend authentication

**These are NOT enough for migrations!** You need **3 additional secrets** for the migration workflow:

```
SUPABASE_ACCESS_TOKEN       ← CLI token (DIFFERENT from anon key)
SUPABASE_PROJECT_ID         ← Project reference ID
PRODUCTION_DB_PASSWORD      ← Database admin password
```

**Why different?**

- Frontend secrets = read/write data via API (limited permissions)
- Migration secrets = apply schema changes via CLI (admin permissions)

---

## ⚡ Setup in 5 Minutes

### Step 1: Get Migration Secrets

#### 1. SUPABASE_ACCESS_TOKEN

```bash
# Option A: Via CLI
supabase login  # Opens browser, copy token from URL

# Option B: Via Dashboard
# Go to: https://app.supabase.com/account/tokens
# Click "Generate new token" → Copy it
```

#### 2. SUPABASE_PROJECT_ID

```
Dashboard → Your Project → Settings → General → Reference ID
Example: abcdefghijklmnop
```

#### 3. PRODUCTION_DB_PASSWORD

```
Dashboard → Settings → Database → Database password
(The password you created when setting up the project)
```

### Step 2: Add Secrets to GitHub

Go to: **GitHub Repo → Settings → Secrets → Actions**

Add these 3 NEW secrets (keep your existing VITE\_\* secrets):

| Secret Name              | Value          | Where to Find                                             |
| ------------------------ | -------------- | --------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN`  | CLI token      | [Account tokens](https://app.supabase.com/account/tokens) |
| `SUPABASE_PROJECT_ID`    | Project ref ID | Dashboard → Settings → General                            |
| `PRODUCTION_DB_PASSWORD` | DB password    | Dashboard → Settings → Database                           |

### Step 3: Done! 🎉

Workflow file already created: `.github/workflows/supabase-migrations.yml` ✅

Now when you:

1. Create a PR with changes to `supabase/migrations/*.sql`
2. Merge the PR to `main`
3. **Migrations automatically apply to your database** ⚡

---

## 🔍 How to Verify It's Working?

### Method 1: Via GitHub Actions

```
Your Repo → Actions → "Auto-Apply Supabase Migrations"
```

You'll see workflow runs after each merge.

### Method 2: Via Database

```sql
-- In Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

You should see new migrations (e.g., `019_security_hardening`).

---

## 🛡️ Safety Features

### What the workflow does before applying:

✅ **Security Scan** - checks migrations for vulnerabilities  
✅ **Change Detection** - applies only new files  
✅ **Verification** - confirms successful application  
✅ **Notifications** - alerts on success/failure

### Workflow will NOT apply migrations if:

❌ Files outside `supabase/migrations/`  
❌ Non-SQL files  
❌ Migration already applied  
⚠️ Security scan emits warnings (does not block)

---

## 🧪 Testing

### Test the Workflow

#### Method 1: Manual Trigger (workflow_dispatch)

```bash
# Trigger the workflow manually without changes
# Go to: GitHub → Actions → "Auto-Apply Supabase Migrations"
# Click: "Run workflow" button → select branch → Run
```

#### Method 2: Create PR with Migration Changes (Recommended)

```bash
# Create feature branch
git checkout -b test/migration-workflow

# Touch or edit a migration file
touch supabase/migrations/019_security_hardening.sql
git add supabase/migrations/
git commit -m "test: trigger migration workflow"
git push origin test/migration-workflow

# Open PR on GitHub
# Merge PR to main → workflow runs automatically

# Check: GitHub → Actions → should show "Auto-Apply Supabase Migrations" running
```

**Note:** Direct pushes to main will also trigger the workflow, but the recommended flow is to use PRs for better code review.

### Apply Migration 019 (Security Hardening)

```bash
# Create branch
git checkout -b feat/security-hardening

# Add files
git add supabase/migrations/019_security_hardening.sql
git add docs/backend/*.md
git add .github/workflows/supabase-migrations.yml

# Commit and push
git commit -m "feat: apply security hardening + auto-migrations"
git push origin feat/security-hardening

# Create PR, merge it → migrations apply automatically!
```

---

## 🔍 Verification

### Check if Migration Applied

**Method 1: GitHub Actions**

```
Repo → Actions → "Auto-Apply Supabase Migrations" → Should show ✅
```

**Method 2: Database Query**

```sql
-- In Supabase SQL Editor
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- Should see: 019_security_hardening
```

**Method 3: Check CITEXT Extension**

```sql
-- Verify migration 019 worked
SELECT * FROM pg_extension WHERE extname = 'citext';
-- Should return 1 row
```

---

## 🐛 Troubleshooting

### "Permission denied" or "Authentication failed"

**Problem:** `SUPABASE_ACCESS_TOKEN` is wrong/expired

**Solution:**

```bash
# Get new token
supabase login  # Copy token from browser URL

# Or generate via Dashboard
# https://app.supabase.com/account/tokens → Generate new token
```

### "Database password authentication failed"

**Problem:** `PRODUCTION_DB_PASSWORD` is incorrect

**Solution:**

```
Dashboard → Settings → Database → Reset password → Update secret
```

### "Project not found"

**Problem:** `SUPABASE_PROJECT_ID` is wrong

**Solution:**

```
Dashboard → Settings → General → Copy "Reference ID" (NOT "Project ID")
Example: abcdefghijk (short alphanumeric string)
```

### "Migration already exists" (NOT an error!)

**This is normal!** Supabase skips already-applied migrations. This means:

- ✅ Migration was applied successfully in the past
- ✅ Workflow is working correctly
- ✅ No action needed

### "Syntax error in migration SQL"

**DON'T** edit the old migration file!

**DO THIS:**

```bash
# Create new fix migration
echo "-- Fix for migration 019" > supabase/migrations/020_fix_syntax_error.sql

# Add your fix in the new file
# Commit and merge → will apply automatically
```

### Workflow doesn't trigger

**Check:**

1. ✅ Secrets are added to **Actions** (not Dependabot/Codespaces)
2. ✅ Changed files are in `supabase/migrations/*.sql`
3. ✅ Merged to `main` branch (not other branch)
4. ✅ Workflow file exists: `.github/workflows/supabase-migrations.yml`

**Debug:**

```bash
# Check workflow file exists
git ls-files | grep supabase-migrations.yml

# Check migrations path
git log -1 --name-only | grep migrations
```

---

## ⚙️ Workflow Customization

### Enable Manual Approval (Recommended for Production)

Edit `.github/workflows/supabase-migrations.yml` and uncomment:

```yaml
environment:
  name: production
  url: https://app.supabase.com/project/${{ secrets.SUPABASE_PROJECT_ID }}
```

Then setup GitHub Environment:

1. Settings → Environments → New "production"
2. Add protection rules → Required reviewers
3. Select yourself

Now workflow waits for your approval before applying migrations! 🔒

### Add Staging Environment (Optional)

Add 2 more secrets:

```
SUPABASE_STAGING_PROJECT_ID
STAGING_DB_PASSWORD
```

Workflow will apply to staging first, then production.

---

## 📋 Checklist Before Merging PR

- [ ] Migration tested locally (`supabase db push` on local)
- [ ] Security warnings reviewed
- [ ] All tests passing
- [ ] Code review completed
- [ ] Migration has comments explaining changes
- [ ] Database backup exists (for critical changes)

---

## ✅ Summary: What Secrets Do I Need?

### For Frontend App (already have ✅):

```
VITE_SUPABASE_URL           ← Frontend API endpoint
VITE_SUPABASE_ANON_KEY      ← Frontend authentication
```

### For Migration Workflow (need to add ⚠️):

```
SUPABASE_ACCESS_TOKEN       ← CLI admin token
SUPABASE_PROJECT_ID         ← Project reference ID
PRODUCTION_DB_PASSWORD      ← Database password
```

### Optional (for staging):

```
SUPABASE_STAGING_PROJECT_ID
STAGING_DB_PASSWORD
```

**Total:** 5 secrets minimum (2 existing + 3 new)

---

**Questions?** See [Security Hardening Guide](../backend/security-hardening-guide.md) or [Security Audit Report](../backend/security-audit-report.md)
