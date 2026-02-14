# ⚙️ CI/CD Pipeline

Continuous Integration and Deployment setup for the Family Logistics Dashboard.

---

## Overview

The project uses **GitHub Actions** for automated testing, linting, security scanning, and deployment.

**Key Workflows:**
1. **CI (Continuous Integration)** - Tests and linting on every push/PR
2. **Deploy** - Automatic deployment to production after CI passes
3. **CodeQL** - Security vulnerability scanning
4. **Super Linter** - Code quality enforcement

---

## Workflows

### 1. CI Workflow

**File:** `.github/workflows/ci.yml`

**Trigger:**
- Push to `main` branch
- Pull requests targeting `main`

**Steps:**
1. Checkout repository
2. Setup Node.js (LTS version)
3. Install dependencies (`npm ci`)
4. Run linter (`npm run lint`)
5. Run tests with coverage (`npm run test:coverage`)
6. Upload coverage report as artifact

**Coverage Requirements:**
- Minimum **70%** coverage for:
  - Lines
  - Branches
  - Functions
  - Statements

**Failure Conditions:**
- ❌ Lint errors found
- ❌ Any test fails
- ❌ Coverage below 70%

**Example:**
```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/
```

---

### 2. Deploy Workflow

**File:** `.github/workflows/deploy.yml`

**Trigger:**
- Push to `main` branch (only after CI passes)

**Steps:**
1. Wait for CI workflow to complete
2. Install dependencies
3. Build production bundle (`npm run build`)
4. Deploy to Vercel using Vercel CLI

**Environment Variables Required:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

**Setup Instructions:**

1. **Get Vercel Token:**
   - Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Create a new token
   - Copy the token

2. **Link Vercel Project:**
   ```bash
   npm i -g vercel
   vercel link
   ```
   This creates `.vercel/project.json` with `orgId` and `projectId`

3. **Add GitHub Secrets:**
   - Go to **Repository Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - Add:
     - `VERCEL_TOKEN` = your token
     - `VERCEL_ORG_ID` = from `.vercel/project.json`
     - `VERCEL_PROJECT_ID` = from `.vercel/project.json`

**Deployment Flow:**
```
Push to main
  ↓
CI runs (lint + test + coverage)
  ↓
CI passes ✅
  ↓
Deploy job runs
  ↓
Build project (npm run build)
  ↓
Deploy to Vercel
  ↓
Production live! 🎉
```

---

### 3. CodeQL Workflow

**File:** `.github/workflows/codeql.yml`

**Trigger:**
- Push to `main` branch
- Pull requests targeting `main`
- Scheduled: Weekly on Sundays at 00:00 UTC

**What it does:**
- Scans code for security vulnerabilities
- Analyzes TypeScript/JavaScript codebase
- Detects SQL injection, XSS, path traversal, etc.
- Uses GitHub's official CodeQL action

**Languages Analyzed:**
- TypeScript
- JavaScript

**Benefits:**
- ✅ Free for public and private repos
- ✅ Deep static analysis (not just pattern matching)
- ✅ No external API dependencies
- ✅ Results visible in **Security** tab

**Example Issues Detected:**
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Path traversal
- Insecure randomness
- Hardcoded credentials

**View Results:**
1. Go to repository **Security** tab
2. Click **Code scanning alerts**
3. Review and fix issues

---

### 4. Super Linter Workflow

**File:** `.github/workflows/super-linter.yml`

**Trigger:**
- Pull requests targeting `main`

**What it does:**
- Enforces ESLint rules on TypeScript/Vue files
- Validates code formatting with Prettier
- Checks YAML, JSON, CSS, HTML syntax
- Fails PR if quality standards not met

**Linters Enabled:**
- **ESLint** - TypeScript/JavaScript/Vue
- **Prettier** - Code formatting
- **YAML Lint** - Workflow files
- **JSON Lint** - Config files
- **CSS Lint** - Stylesheets
- **HTML Lint** - Templates

**Benefits:**
- ✅ Consistent code style
- ✅ Catches common mistakes early
- ✅ Prevents broken code from merging
- ✅ 100% free and open source

**Configuration:**
Uses existing config files:
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Prettier formatting
- `.eslintignore` - Files to ignore

---

## Branch Protection Rules

To enforce quality checks before merging:

1. **Go to Repository Settings → Branches**
2. **Click "Add rule" for `main` branch**
3. **Enable:**
   - ✅ Require status checks to pass before merging
   - ✅ Select: `test` (CI workflow)
   - ✅ Select: `Analyze (javascript-typescript)` (CodeQL)
   - ✅ Select: `Lint Code Base` (Super Linter)
   - ✅ Require branches to be up to date before merging
   - ✅ Require linear history (optional)
   - ✅ Include administrators (recommended)

4. **Save changes**

Now all PRs must pass all checks before merge! 🎉

---

## Environment Variables

### Development (.env)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Production (Vercel)

Add these in **Vercel Dashboard → Project Settings → Environment Variables**:

```bash
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

**Important:**
- Use **different Supabase projects** for dev/staging/production
- Never commit `.env` file to Git
- Keep `.env.example` updated

---

## Deployment Targets

### Vercel (Current)

**Pros:**
- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Free tier available

**Configuration:**
- Handled via `vercel.json` (optional)
- Environment variables in Vercel dashboard

### Alternative Platforms

**Netlify:**
- Similar to Vercel
- Good for static sites
- Serverless functions

**AWS Amplify:**
- Full AWS integration
- More control
- Higher complexity

**Cloudflare Pages:**
- Fast global CDN
- Free tier
- Workers for serverless

---

## Monitoring & Logs

### Build Logs

**View in GitHub:**
1. Go to **Actions** tab
2. Select workflow run
3. Click on job to see logs

**View in Vercel:**
1. Go to Vercel dashboard
2. Select project
3. Click **Deployments**
4. Click on deployment to see logs

### Error Tracking

**Recommended Tools:**
- **Sentry** - Error tracking and monitoring
- **LogRocket** - Session replay
- **Datadog** - Full observability

**Setup Sentry (Example):**
```typescript
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
})
```

---

## Performance Optimization

### Build Optimization

**Vite Configuration:**
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'supabase': ['@supabase/supabase-js']
        }
      }
    }
  }
})
```

**Benefits:**
- Smaller bundle sizes
- Better caching
- Faster page loads

### Asset Optimization

- **Images:** Use WebP format
- **Fonts:** Self-host or use CDN
- **Icons:** Use icon fonts or SVG sprites

---

## Troubleshooting

### CI Fails on Lint

**Cause:** ESLint errors in code

**Solution:**
```bash
npm run lint         # See errors
npm run lint -- --fix  # Auto-fix (if possible)
```

### CI Fails on Tests

**Cause:** Test failures or low coverage

**Solution:**
```bash
npm test             # Run tests
npm run test:coverage  # Check coverage
```

Add tests or fix failing ones.

### Deploy Fails on Build

**Cause:** Build errors or missing env vars

**Solution:**
1. Check Vercel logs for errors
2. Verify environment variables are set
3. Test build locally: `npm run build`

### CodeQL False Positives

**Cause:** CodeQL may flag non-issues

**Solution:**
1. Review the alert carefully
2. If it's a false positive, dismiss it with a reason
3. Add a comment explaining why it's safe

---

## Best Practices

### 1. Test Before Push

Always run locally before pushing:
```bash
npm run lint
npm test
npm run build
```

### 2. Use Feature Branches

```bash
git checkout -b feature/my-feature
# Make changes
git push origin feature/my-feature
# Create PR
```

### 3. Write Good Commit Messages

```
feat: add trip sharing feature
fix: resolve packing item duplicate bug
docs: update README with Wiki links
test: add budget calculation tests
```

### 4. Keep Dependencies Updated

```bash
npm outdated        # Check for updates
npm update          # Update dependencies
npm audit fix       # Fix security issues
```

### 5. Monitor Build Times

Keep CI fast:
- Use `npm ci` instead of `npm install`
- Cache dependencies
- Parallelize jobs when possible

---

## Security Scanning

### GitHub Security Features

**Enabled:**
- ✅ **Dependabot** - Automated dependency updates
- ✅ **CodeQL** - Vulnerability scanning
- ✅ **Secret scanning** - Detects leaked secrets

**View Alerts:**
1. Go to **Security** tab
2. Review alerts
3. Create issues for fixes
4. Merge Dependabot PRs

### Manual Security Audit

```bash
npm audit           # Check for vulnerabilities
npm audit fix       # Auto-fix (if possible)
npm audit fix --force  # Force fix (breaking changes)
```

---

## Future Improvements

**Planned:**
- [ ] Add E2E tests with Playwright
- [ ] Set up staging environment
- [ ] Implement blue-green deployments
- [ ] Add performance budgets
- [ ] Setup Lighthouse CI

**Considering:**
- Docker containerization
- Kubernetes orchestration
- Multi-region deployments
- A/B testing infrastructure

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Documentation](https://vercel.com/docs)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Vite Build Optimization](https://vitejs.dev/guide/build.html)

---

**Next Steps:**
- [Testing Guide](Testing.md) - Learn about test structure
- [Deployment Guide](Deployment.md) - Deploy to production
- [Architecture](Architecture.md) - Understand the codebase
