# ❓ FAQ - Frequently Asked Questions

Common questions and troubleshooting for the Family Logistics Dashboard.

---

## General Questions

### What is this project?

The Family Logistics Dashboard is a production-grade family travel planning application built with Vue 3 and Supabase. It helps families organize trips, packing lists, budgets, documents, and itineraries.

### Is it free to use?

Yes! The application is free for personal use. You'll need free accounts for:
- Supabase (free tier available)
- Vercel or similar (for hosting)
- Google Cloud Console (for OAuth, free)

### Can I use it for commercial purposes?

This is a private project for personal use. Contact the maintainers for commercial licensing.

### What platforms does it support?

- **Web** - Desktop and mobile browsers
- **PWA** - Progressive Web App (planned)
- **Mobile App** - React Native version (planned)

---

## Setup & Installation

### Q: I get "Cannot find module '@supabase/supabase-js'"

**A:** Install dependencies:
```bash
npm install
```

### Q: "VITE_SUPABASE_URL is not defined"

**A:** Create `.env` file in project root:
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Q: How do I get Supabase credentials?

**A:** 
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → API
4. Copy "Project URL" and "anon public" key

### Q: Do I need to install Supabase CLI?

**A:** No, it's optional. You can run SQL scripts directly in the Supabase dashboard SQL Editor.

### Q: Build fails with TypeScript errors

**A:** Ensure you're using compatible versions:
```bash
npm install typescript@^5.4.5 vue-tsc@^1.8.27
```

---

## Authentication

### Q: "Redirect URI mismatch" error with Google OAuth

**A:** The redirect URI in Google Cloud Console must exactly match:
```
https://<your-supabase-ref>.supabase.co/auth/v1/callback
```

Find your ref in your Supabase project URL.

### Q: Can I use email/password without Google OAuth?

**A:** Yes! Email/password authentication is enabled by default. Just skip the Google OAuth setup.

### Q: Users aren't receiving confirmation emails

**A:** 
1. Check Supabase **Authentication → Email Templates**
2. Verify SMTP settings (or use Supabase's default)
3. Check spam folder
4. For development, disable email confirmation

### Q: "User not found" when sharing trips

**A:** The user must:
1. Have a Supabase account (signed up)
2. Use the exact same email address
3. Be in the same Supabase project

### Q: How do I sign out?

**A:** Click your profile icon → "Sign Out" or call:
```typescript
await supabase.auth.signOut()
```

---

## Database & Data

### Q: How do I reset the database?

**A:** In Supabase SQL Editor:
```sql
-- WARNING: Deletes all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then re-run:
-- schema.sql
-- rls.sql
-- migrations
```

### Q: Can I export my data?

**A:** Yes, use Supabase dashboard:
1. Go to Table Editor
2. Select table
3. Click "Export" → "CSV"

Or programmatically:
```typescript
const { data } = await supabase.from('trips').select('*')
console.log(JSON.stringify(data, null, 2))
```

### Q: How do I backup documents?

**A:** In Supabase dashboard:
1. Go to Storage
2. Select "documents" bucket
3. Download files manually

Or use Supabase CLI:
```bash
supabase storage download documents/*
```

### Q: What happens when I delete a trip?

**A:** Cascade delete removes:
- All packing items
- All budget entries
- All timeline events
- All documents (metadata only, files remain in storage)
- All trip memberships

### Q: Can I recover deleted trips?

**A:** No, deletions are permanent. Consider:
- Adding a "soft delete" feature (archived status)
- Regular backups
- Confirmation dialogs before deletion

---

## Features

### Q: How do I duplicate a trip?

**A:**
1. Find trip card on dashboard
2. Click "Duplicate" button
3. New trip created with "(Copy)" suffix
4. All data copied (packing, budget, timeline)

### Q: Packing progress not updating

**A:** 
1. Refresh the page
2. Check browser console for errors
3. Verify RLS policies allow updates

### Q: Can I share trips with non-users?

**A:** No, they must have a Supabase account (signed up). Consider:
- Inviting them to sign up first
- Creating a guest account
- Adding a "public share link" feature (future)

### Q: How many files can I upload?

**A:** Supabase free tier:
- Storage: 1 GB
- File size: No limit per file
- Bandwidth: 2 GB/month

### Q: Supported file types for documents?

**A:** All file types are supported:
- PDFs (recommended for documents)
- Images (JPG, PNG, WebP)
- Office files (Word, Excel)
- Text files

### Q: Can I organize documents into folders?

**A:** Not yet, but planned. Current workaround:
- Use descriptive titles
- Add category in description
- Use search functionality

---

## Development

### Q: Tests are failing

**A:**
```bash
# Clear cache
rm -rf node_modules
npm install

# Run tests
npm test
```

### Q: Linter errors

**A:**
```bash
# Auto-fix
npm run lint -- --fix

# Check remaining errors
npm run lint
```

### Q: How do I add a new feature?

**A:** Follow the feature-based architecture:
```
src/features/my-feature/
├── domain/
│   ├── entities.ts
│   ├── my-feature.service.ts
│   └── repository.interface.ts
├── infrastructure/
│   └── my-feature.repository.ts
└── index.ts
```

See [Architecture Guide](Architecture.md).

### Q: How do I generate TypeScript types from database?

**A:**
```bash
npx supabase gen types typescript \
  --project-id <your-ref> \
  > src/features/shared/infrastructure/database.types.ts
```

### Q: Hot reload not working

**A:**
```bash
# Stop dev server
# Clear Vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

---

## Deployment

### Q: Build fails in production

**A:** Common causes:
1. Missing environment variables
2. TypeScript errors (strict mode)
3. Dependency issues

```bash
# Test build locally
npm run build

# Check for errors
npm run lint
npm test
```

### Q: "404 Not Found" on routes in production

**A:** Configure SPA routing:

**Vercel:** Automatic

**Netlify:** Add to `netlify.toml`:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Nginx:**
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Q: Environment variables not working in production

**A:**
1. Verify variables are prefixed with `VITE_`
2. Check deployment platform (Vercel/Netlify) settings
3. Rebuild after adding variables

### Q: How do I use different Supabase projects for dev/prod?

**A:**

**Development (.env):**
```bash
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-key
```

**Production (Vercel/Netlify):**
```bash
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-key
```

---

## Performance

### Q: App is slow to load

**A:** Optimize:
1. Enable code splitting (Vite does this)
2. Lazy load routes
3. Compress images
4. Use CDN for static assets
5. Check Network tab in DevTools

### Q: Supabase queries are slow

**A:**
1. Add indexes on frequently queried columns
2. Select only needed columns
3. Use pagination for large datasets
4. Check query explain plan in Supabase

### Q: Large bundle size

**A:**
```bash
# Analyze bundle
npm run build
npx vite-bundle-visualizer

# Optimize
# 1. Remove unused dependencies
# 2. Lazy load routes
# 3. Code splitting
```

---

## Security

### Q: Is it safe to expose Supabase anon key?

**A:** Yes! The anon key is designed to be public. Security is enforced via:
- Row Level Security (RLS) policies
- Secure database functions
- API rate limiting

Never expose:
- Service role key
- Database password
- OAuth client secrets

### Q: How do I protect user data?

**A:**
1. RLS policies enforce access control
2. Authentication required for all operations
3. HTTPS encrypts data in transit
4. Supabase encrypts data at rest

### Q: Someone can see my trips!

**A:** Check:
1. RLS enabled on `trips` table
2. Policies are correct
3. User is authenticated
4. No shared trips with that user

### Q: How do I report a security issue?

**A:** Open a private security advisory on GitHub or email the maintainers directly.

---

## Known Issues

### Issue: Google OAuth redirects to wrong URL

**Status:** Known  
**Workaround:** Ensure redirect URI in Google Cloud Console exactly matches Supabase callback URL.

### Issue: Files not uploading

**Status:** Known  
**Cause:** Storage bucket not created or RLS not configured  
**Fix:** Create `documents` bucket in Supabase Storage

### Issue: Coverage reports not generated

**Status:** Fixed in v2.0  
**Solution:** Update to latest version

---

## Getting Help

### Where can I get help?

1. **Check this FAQ**
2. **Read the Wiki** - [Home](Home.md)
3. **Search GitHub Issues**
4. **Open a new issue** with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if UI issue)
   - Console errors

### How do I report a bug?

**GitHub Issues:**
1. Search for existing issues first
2. Use bug report template
3. Provide reproduction steps
4. Include logs and screenshots

### How do I request a feature?

**GitHub Discussions:**
1. Describe the feature
2. Explain use case
3. Suggest implementation (optional)

### How do I contribute?

See [Architecture Guide](Architecture.md) and follow:
1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

---

## Troubleshooting Checklist

When things go wrong, check:

- [ ] Environment variables set correctly
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema applied
- [ ] RLS policies created
- [ ] Supabase credentials correct
- [ ] Google OAuth configured (if using)
- [ ] Browser console for errors
- [ ] Network tab for failed requests
- [ ] Tests passing (`npm test`)
- [ ] Build succeeds (`npm run build`)

---

## Additional Resources

- [Home](Home.md) - Getting started
- [Architecture](Architecture.md) - Code structure
- [Features](Features.md) - How to use features
- [Testing](Testing.md) - Testing guide
- [CI/CD](CI-CD.md) - Deployment pipeline
- [GitHub Issues](https://github.com/YauheniX/family-logistics-dashboard/issues)

---

**Still stuck?** Open a GitHub issue with details!

---

**Last Updated:** February 2026
