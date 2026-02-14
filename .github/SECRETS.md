# GitHub Repository Secrets

This document describes the GitHub repository secrets required for CI/CD workflows.

## Required Secrets

### Supabase Credentials

#### `VITE_SUPABASE_URL`

- **Description**: Production Supabase project URL
- **Format**: `https://xxxxxxxxxxxxx.supabase.co`
- **Where to get it**: Supabase Dashboard → Project Settings → API → Project URL
- **Used in**:
  - `.github/workflows/deploy.yml` (production builds)
  - `.github/workflows/supabase-health-check.yml` (health monitoring)

#### `VITE_SUPABASE_ANON_KEY`

- **Description**: Production Supabase anon/public key
- **Format**: Long JWT token starting with `eyJ...`
- **Where to get it**: Supabase Dashboard → Project Settings → API → anon/public key
- **⚠️ Important**: Use the **anon/public** key, NOT the service_role key
- **Used in**:
  - `.github/workflows/deploy.yml` (production builds)
  - `.github/workflows/supabase-health-check.yml` (health monitoring)

### Vercel Deployment

#### `VERCEL_TOKEN`

- **Description**: Vercel authentication token for deployments
- **Where to get it**:
  1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
  2. Click "Create Token"
  3. Name it (e.g., "GitHub Actions")
  4. Copy the token
- **Used in**: `.github/workflows/deploy.yml`

#### `VERCEL_ORG_ID`

- **Description**: Vercel organization/team ID
- **Where to get it**:
  1. Go to your Vercel project settings
  2. Look for "Project ID" section
  3. Or run: `vercel project ls` in your local project
  4. Or check `.vercel/project.json` after running `vercel link`
- **Format**: Alphanumeric string
- **Used in**: `.github/workflows/deploy.yml`

#### `VERCEL_PROJECT_ID`

- **Description**: Vercel project ID
- **Where to get it**:
  1. Go to Vercel project → Settings → General
  2. Look for "Project ID"
  3. Or run: `vercel project ls` in your local project
  4. Or check `.vercel/project.json` after running `vercel link`
- **Format**: Alphanumeric string
- **Used in**: `.github/workflows/deploy.yml`

## How to Add Secrets

### Via GitHub Web Interface

1. Go to your repository on GitHub
2. Click **Settings** (repository settings, not account settings)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the **Name** (e.g., `VITE_SUPABASE_URL`)
6. Enter the **Secret** value
7. Click **Add secret**
8. Repeat for each secret

### Via GitHub CLI

```bash
# Set Supabase URL
gh secret set VITE_SUPABASE_URL --body "https://xxxxxxxxxxxxx.supabase.co"

# Set Supabase anon key
gh secret set VITE_SUPABASE_ANON_KEY --body "eyJ..."

# Set Vercel token
gh secret set VERCEL_TOKEN --body "your-vercel-token"

# Set Vercel org ID
gh secret set VERCEL_ORG_ID --body "your-org-id"

# Set Vercel project ID
gh secret set VERCEL_PROJECT_ID --body "your-project-id"
```

## Security Best Practices

### ✅ DO

- **Rotate secrets regularly** (every 3-6 months)
- **Use different credentials** for production and development
- **Limit secret scope** to only the workflows that need them
- **Review secret usage** in workflow logs (secrets are masked)
- **Use environment-specific secrets** for different deployment targets

### ❌ DON'T

- **Never commit secrets** to version control
- **Don't share secrets** in plain text (Slack, email, etc.)
- **Don't use production secrets** in development
- **Don't hardcode secrets** in workflow files
- **Don't log secret values** in debug output

## Verifying Secrets

To verify secrets are properly set:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. You should see all secrets listed (values are hidden)
3. Check the "Updated" timestamp to ensure they're current

## Updating Secrets

To update a secret:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click on the secret name
3. Click **Update secret**
4. Enter the new value
5. Click **Update secret**

Or via CLI:

```bash
gh secret set SECRET_NAME --body "new-value"
```

## Secrets Used by Workflow

### CI Workflow (`.github/workflows/ci.yml`)

**Environment Variables Set**:

- `VITE_USE_MOCK_BACKEND: 'true'` (hardcoded, no secret needed)

**Purpose**: Tests always run in mock mode (no Supabase needed)

### Deploy Workflow (`.github/workflows/deploy.yml`)

**Secrets Required**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Purpose**: Production deployment to Vercel with real Supabase backend

### Supabase Health Check Workflow (`.github/workflows/supabase-health-check.yml`)

**Secrets Required**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Purpose**: Periodic health checks of Supabase connection and database

## Troubleshooting

### Problem: Workflow fails with "Secret not found"

**Solution**:

- Verify secret name matches exactly (case-sensitive)
- Check that secret is set in repository settings
- Ensure you're looking at repository secrets, not organization secrets

### Problem: "Invalid Supabase credentials"

**Solution**:

- Verify you copied the full URL and key
- Check for extra spaces or newlines
- Ensure you're using the anon/public key, not service_role key
- Test credentials locally first

### Problem: Vercel deployment fails with "Invalid token"

**Solution**:

- Regenerate Vercel token
- Ensure token has correct permissions
- Check that token hasn't expired
- Verify org ID and project ID are correct

---

## Additional Resources

- [GitHub Actions Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Supabase API Settings](https://supabase.com/docs/guides/api#api-url-and-keys)

---

**Last updated**: February 2026
