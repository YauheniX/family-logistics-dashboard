# 🔧 Troubleshooting Guide

Solutions to common problems in the Family Logistics Dashboard.

**Last Updated**: March 2026

---

## Development Setup

### `npm install` fails

**Symptoms**: npm errors during installation, missing packages.

**Solutions**:

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

If you're on Node.js < 18, upgrade:
```bash
nvm install 18
nvm use 18
```

---

### Port 5173 already in use

**Error**:
```
Port 5173 is in use, trying another one...
```

**Solutions**:

```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

---

### Blank white screen after `npm run dev`

**Check**:
1. Browser console (F12 → Console) for JavaScript errors
2. Network tab for failed requests
3. Terminal for Vite errors

**Common causes**:
- Missing environment variables
- TypeScript compilation error
- Failed import

---

### TypeScript errors in IDE

**Run the type checker**:
```bash
npm run type-check
```

**If `@/` imports are not resolved**: Check `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Mock Mode

### Mock mode banner not appearing

**Expected**: Blue info banner at the top: "Mock Mode — Using localStorage"

**Check**:
1. Is `VITE_USE_MOCK_BACKEND=true` in `.env.local`?
2. Are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` absent or empty?

```typescript
// src/config/backend.config.ts — isMockMode() logic
```

---

### Data lost after browser refresh (Mock Mode)

**Cause**: localStorage was cleared (private browsing, browser settings, explicit clear).

**Solution**: Mock mode data is intentionally ephemeral. Use Supabase for persistent data.

---

## Supabase Connection

### "Invalid API key" error

**Cause**: Wrong Supabase key in environment variables.

**Check**:
1. Verify `VITE_SUPABASE_ANON_KEY` is the **anon/public** key — not the `service_role` key
2. No extra spaces in `.env.local`
3. File is named `.env.local` (not `.env` or `.env.local.txt`)

---

### "Permission denied" on database queries

**Cause**: RLS policies blocking access.

**Solutions**:
1. Verify the user is a member of the household they're querying
2. Re-apply the schema: `npx supabase db push`
3. Check RLS policies in Supabase Dashboard → Database → Policies

---

### Authentication redirects fail (Google OAuth)

**Cause**: Redirect URI not configured.

**Solution**:
1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth credentials
2. Add your app's URL to **Authorized redirect URIs**:
   - `http://localhost:5173` for development
   - `https://your-domain.com` for production

---

### Storage upload fails

**Cause**: Storage bucket not created or not public.

**Solution**:
1. Supabase Dashboard → Storage → Create bucket named `wishlist-images`
2. Set bucket to **Public**
3. Verify `VITE_SUPABASE_STORAGE_BUCKET=wishlist-images`

---

## Testing

### Tests fail with "Cannot find module"

**Solution**:
```bash
npm install
npm test
```

---

### Coverage below 70%

**CI error**: "Coverage threshold not met"

**Solution**: Add tests for uncovered code:
```bash
# See which files need coverage
npm run test:coverage
# Open coverage/index.html in browser
```

---

### Pinia "no active Pinia" error in tests

**Cause**: Pinia not initialised in test.

**Fix**:
```typescript
beforeEach(() => {
  setActivePinia(createPinia());
});
```

---

## Build & Deployment

### Build fails with TypeScript errors

```bash
npm run type-check
npm run lint
npm run build
```

Fix all TypeScript and lint errors before building.

---

### GitHub Pages — app loads but all routes show 404

**Cause**: Single-page app routing requires server-side fallback.

**Solution**: Ensure GitHub Pages is configured with a `404.html` that redirects to `index.html`. This is handled automatically by the Vite build config.

Check `VITE_BASE_PATH` matches your repository name:
```env
VITE_BASE_PATH=/family-logistics-dashboard/
```

---

### Vercel/Netlify — environment variables not applied

**Cause**: Variables not set in hosting dashboard.

**Solution**:
1. Set variables in the hosting provider's dashboard (not just `.env.local`)
2. Redeploy after setting variables

---

## Getting More Help

- **GitHub Issues**: [Create an issue](https://github.com/YauheniX/family-logistics-dashboard/issues)
- **Quickstart Guide**: [docs/getting-started/quickstart.md](../getting-started/quickstart.md)
- **FAQ**: [docs/operations/faq.md](faq.md)
