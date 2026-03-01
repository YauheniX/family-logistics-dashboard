# ⚙️ Configuration Guide

Environment variable reference for the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Overview

Configuration is managed through environment variables. Copy `env.example` to `.env.local` to get started:

```bash
cp env.example .env.local
```

`.env.local` is ignored by Git (it is in `.gitignore`). Never commit real credentials.

---

## Variable Reference

### Supabase

| Variable | Required | Example | Description |
| -------- | -------- | ------- | ----------- |
| `VITE_SUPABASE_URL` | No* | `https://abc.supabase.co` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | No* | `eyJhb...` | Supabase anon/public JWT key |
| `VITE_SUPABASE_STORAGE_BUCKET` | No | `wishlist-images` | Storage bucket for wishlist images |

> \* If absent, the app falls back to Mock Mode automatically.

### Backend Mode

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `VITE_USE_MOCK_BACKEND` | No | `false` | Force mock mode (`true`) or Supabase mode (`false`) |

**Mock Mode behaviour**:
- `true` → Always use localStorage (no Supabase needed)
- `false` or absent → Use Supabase if credentials are present, else mock
- Missing credentials → Auto-fallback to mock mode

### Deployment

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `VITE_BASE_PATH` | No | `/` | Base URL path for the app |

**Base path examples**:
- Root deployment (Vercel, Netlify): `/`
- GitHub Pages: `/family-logistics-dashboard/`

### Link Preview (Microlink)

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `VITE_MICROLINK_KEY` | No | — | Microlink Pro API key for higher rate limits |

Free tier provides 50 requests/day per IP with no key required.

---

## Environment Files

| File | Purpose | Committed? |
| ---- | ------- | ---------- |
| `env.example` | Template with documentation | ✅ Yes |
| `.env.local` | Local development secrets | ❌ No (gitignored) |
| `.env.production` | Production overrides | ❌ No (use CI secrets) |
| `.env.test` | Test environment | ❌ No |

---

## Server-Side Secrets (Supabase Edge Functions)

These are **never** prefixed with `VITE_` and are **never** exposed to the browser. Configure via Supabase:

```bash
supabase secrets set GITHUB_TOKEN=ghp_...
supabase secrets set GITHUB_OWNER=YauheniX
supabase secrets set GITHUB_REPO=family-logistics-dashboard
```

| Secret | Purpose |
| ------ | ------- |
| `GITHUB_TOKEN` | GitHub token for in-app issue reporting |
| `GITHUB_OWNER` | GitHub owner for issue creation |
| `GITHUB_REPO` | GitHub repo name for issue creation |

---

## Configuration for Different Environments

### Local Development (Mock Mode)

```env
# .env.local
VITE_USE_MOCK_BACKEND=true
```

### Local Development (Supabase)

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_USE_MOCK_BACKEND=false
```

### GitHub Pages (Static Hosting)

```env
VITE_USE_MOCK_BACKEND=true
VITE_BASE_PATH=/family-logistics-dashboard/
```

### Vercel / Netlify Production

Set via dashboard or CLI. See [Deployment Guide](../deployment/overview.md).

---

## Security Notes

- ✅ The `VITE_SUPABASE_ANON_KEY` is safe to expose in the browser — Supabase RLS policies enforce data access.
- ❌ Never expose the Supabase `service_role` key in the frontend.
- ❌ Never commit `.env.local` to version control.
- ❌ Never prefix server-side secrets with `VITE_`.

---

## See Also

- [Environment Variables Reference](../deployment/environment-variables.md) — Full deployment reference
- [Supabase Setup](../backend/supabase-setup.md) — Backend configuration
- [Deployment Guide](../deployment/overview.md) — Deployment options
