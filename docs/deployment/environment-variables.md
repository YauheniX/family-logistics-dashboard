# 🌍 Environment Variables Reference

Complete environment variable reference for all deployment environments.

**Last Updated**: March 2026

---

## All Variables

| Variable                       | Required | Default           | Environments | Description              |
| ------------------------------ | -------- | ----------------- | ------------ | ------------------------ |
| `VITE_SUPABASE_URL`            | No\*     | —                 | All          | Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY`       | No\*     | —                 | All          | Supabase anon/public key |
| `VITE_USE_MOCK_BACKEND`        | No       | `false`           | All          | Force mock mode          |
| `VITE_SUPABASE_STORAGE_BUCKET` | No       | `wishlist-images` | All          | Storage bucket name      |
| `VITE_BASE_PATH`               | No       | `/`               | All          | App base URL path        |
| `VITE_MICROLINK_KEY`           | No       | —                 | All          | Microlink Pro API key    |

> \* If absent, auto-falls back to Mock Mode.

---

## Detailed Reference

### `VITE_SUPABASE_URL`

The URL of your Supabase project.

```env
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
```

**Where to find it**: Supabase Dashboard → Settings → API → Project URL

---

### `VITE_SUPABASE_ANON_KEY`

The anonymous public key for your Supabase project. This key is safe to expose in the browser because Supabase RLS policies restrict what each user can access.

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find it**: Supabase Dashboard → Settings → API → Project API Keys → `anon` / `public`

⚠️ **Never use the `service_role` key** — it bypasses all RLS policies.

---

### `VITE_USE_MOCK_BACKEND`

Controls whether the app uses Supabase or localStorage.

```env
# Force mock mode (no Supabase needed)
VITE_USE_MOCK_BACKEND=true

# Use Supabase (requires URL and key above)
VITE_USE_MOCK_BACKEND=false
```

**Behaviour**:

- `true` → Always use mock (localStorage)
- `false` → Use Supabase if credentials present, else mock
- Missing → Same as `false`

---

### `VITE_SUPABASE_STORAGE_BUCKET`

The Supabase Storage bucket name for wishlist item images.

```env
VITE_SUPABASE_STORAGE_BUCKET=wishlist-images
```

**Default**: `wishlist-images`

The bucket must be created in Supabase Dashboard → Storage before uploading images.

---

### `VITE_BASE_PATH`

The base URL path for the application. Required when hosting at a sub-path.

```env
# Root deployment (Vercel, Netlify)
VITE_BASE_PATH=/

# GitHub Pages
VITE_BASE_PATH=/family-logistics-dashboard/
```

This value is used by Vite as the `base` configuration option.

---

### `VITE_MICROLINK_KEY`

Optional API key for [Microlink](https://microlink.io) link preview service. No key is needed for the free tier (50 req/day per IP).

```env
VITE_MICROLINK_KEY=your-pro-key-here
```

---

## CI/CD Environment Setup

### GitHub Actions

Set secrets in **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**:

| Secret Name              | Value                |
| ------------------------ | -------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key    |

See [GitHub Secrets Setup](../deployment/github-secrets-setup.md) for details.

### Vercel

Set in Vercel Dashboard → **Settings** → **Environment Variables**.

### Netlify

Set in Netlify Dashboard → **Site configuration** → **Environment variables**.

---

## Environment Files

| File              | Committed | Purpose                                             |
| ----------------- | --------- | --------------------------------------------------- |
| `env.example`     | ✅        | Template with documentation                         |
| `.env.local`      | ❌        | Local overrides (gitignored)                        |
| `.env.production` | ❌        | Production build overrides (use CI secrets instead) |
| `.env.test`       | ❌        | Test environment variables                          |

---

## Security Notes

- ✅ `VITE_*` variables are embedded in the browser bundle — only use public values
- ❌ Never put secrets (passwords, private keys) in `VITE_*` variables
- ❌ Never commit `.env.local` to version control
- ✅ Use Supabase Edge Function secrets for server-side operations (no `VITE_` prefix)
