# ⚙️ CI/CD Pipeline

Continuous Integration and Deployment setup for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026

---

## Overview

The project uses **GitHub Actions** for automated testing, linting, security scanning, and deployment.

**Workflows**:

1. **CI** - Tests and linting on every push/PR
2. **CodeQL** - Security vulnerability scanning

---

## CI Workflow

**File**: `.github/workflows/ci.yml`

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

- Runs on push to `main`
- Runs on pull requests to `main`

### Steps

1. ✅ Checkout repository
2. ✅ Setup Node.js (LTS version)
3. ✅ Install dependencies (`npm ci`)
4. ✅ Run linter (`npm run lint`)
5. ✅ Run tests with coverage (`npm run test:coverage`)
6. ✅ Upload coverage report

### Coverage Requirements

**Minimum 70% coverage** for:

- Lines
- Branches
- Functions
- Statements

### Failure Conditions

Pipeline fails if:

- ❌ Lint errors found
- ❌ Any test fails
- ❌ Coverage below 70%

### Example Configuration

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
```

---

## CodeQL Workflow

**File**: `.github/workflows/codeql.yml`

### What It Does

- Scans code for security vulnerabilities
- Analyzes TypeScript/JavaScript
- Detects common security issues

### Triggers

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sundays
```

### Languages Analyzed

- TypeScript
- JavaScript

### Issues Detected

- SQL injection
- Cross-site scripting (XSS)
- Path traversal
- Insecure randomness
- Hardcoded credentials

### View Results

1. Go to repository **Security** tab
2. Click **Code scanning alerts**
3. Review and fix issues

### Example Configuration

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript,typescript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

---

## Local CI Validation

Run checks locally before pushing:

### Full CI Check

```bash
# Run linter
npm run lint

# Run tests with coverage
npm run test:coverage

# Check coverage meets minimum
# (Vitest will fail if below threshold)
```

### Fix Issues

```bash
# Auto-fix lint issues
npm run format

# Re-run tests
npm test
```

---

## Pull Request Workflow

### 1. Create Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

- Write code
- Add tests
- Update docs if needed

### 3. Verify Locally

```bash
npm run lint
npm test
```

### 4. Commit & Push

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature
```

### 5. Create PR

- GitHub automatically runs CI
- CodeQL scans for vulnerabilities
- Review results before merging

### 6. CI Status Checks

PR shows status:

- ✅ CI passed
- ✅ CodeQL passed
- ✅ Coverage adequate

### 7. Merge

Once all checks pass:

- Merge to `main`
- CI runs again on `main`

---

## Deployment

### Manual Deployment

See [Deployment Guide](../deployment/overview.md) for detailed instructions.

### Automated Deployment (Future)

To add automated deployment:

1. Create `.github/workflows/deploy.yml`
2. Add deployment steps
3. Configure secrets

**Example** (Vercel):

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [test] # Wait for CI

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4

      - run: npm ci
      - run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Branch Protection

### Recommended Settings

**Repository Settings → Branches → Add rule**:

For branch: `main`

- ✅ Require pull request before merging
- ✅ Require status checks to pass:
  - `test` (CI workflow)
  - `analyze` (CodeQL workflow)
- ✅ Require branches to be up to date
- ✅ Require linear history
- ❌ Allow force pushes (keep disabled)

---

## Coverage Reports

### View Coverage

**After CI runs**:

1. Go to Actions tab
2. Click on workflow run
3. Download `coverage-report` artifact
4. Extract and open `index.html`

### Coverage Badges

Add to README:

```markdown
[![Coverage](https://img.shields.io/badge/coverage-70%25-green)](link-to-report)
```

### Coverage Trends

Track coverage over time:

- Use Codecov or Coveralls (optional)
- CI uploads reports automatically

---

## Troubleshooting

### CI Fails: "npm ci" Error

**Cause**: `package-lock.json` out of sync

**Solution**:

```bash
rm package-lock.json
npm install
git add package-lock.json
git commit -m "chore: update package-lock"
```

### CI Fails: Lint Errors

**Solution**:

```bash
npm run lint     # See errors
npm run format   # Auto-fix
```

### CI Fails: Test Failures

**Solution**:

```bash
npm test         # Run locally
# Fix failing tests
```

### CI Fails: Coverage Below 70%

**Solution**:

- Add more tests
- Remove untested code
- Or adjust threshold in `vitest.config.ts` (not recommended)

### CodeQL Alerts

**View alerts**:

1. Security tab → Code scanning
2. Click alert
3. See recommendation
4. Fix code
5. Push changes

---

## Performance Optimization

### Cache Dependencies

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 'lts/*'
    cache: 'npm' # Caches node_modules
```

### Parallel Jobs

Run tests and linting in parallel:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

### Skip CI (When Needed)

Add to commit message:

```bash
git commit -m "docs: update README [skip ci]"
```

---

## Best Practices

### 1. Always Run CI Locally First

```bash
npm run lint && npm test
```

### 2. Keep CI Fast

- Use npm cache
- Run jobs in parallel
- Only test what changed (future)

### 3. Fix Failures Immediately

- Don't let main branch stay red
- Fix or revert broken commits

### 4. Monitor Coverage

- Maintain 70% minimum
- Aim for 80%+ on new code

### 5. Review Security Alerts

- Check CodeQL regularly
- Fix vulnerabilities promptly
- Update dependencies

---

## Related Documentation

- [Testing Guide](../testing/overview.md)
- [Deployment Guide](../deployment/overview.md)
- [Contributing Guide](#) (future)

---

**Last Updated**: February 21, 2026
