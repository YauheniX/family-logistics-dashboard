# 🚀 Deployment Guide

Deploy the Family Logistics Dashboard to production.

**Last Updated**: March 3, 2026

---

## Overview

Multiple deployment options:

1. **Vercel** (recommended for Vite apps)
2. **Netlify** (great alternative)
3. **AWS S3 + CloudFront** (enterprise)
4. **Docker + Nginx** (self-hosted)

---

## Prerequisites

Before deploying:

✅ **Supabase project** set up (see [Supabase Setup](../backend/supabase-setup.md))  
✅ **Environment variables** ready  
✅ **GitHub Secrets** configured (see [GitHub Secrets Setup](github-secrets-setup.md))  
✅ **Google OAuth** configured (see [Authentication](../frontend/authentication.md))  
✅ **Code tested** and passing CI

---

## Router History Mode

This app uses **`createWebHistory`** (HTML5 History API), which produces clean URLs like
`/wishlist/abc123` instead of hash-based URLs like `/#/wishlist/abc123`.

**Why HTML5 history mode?**

- Clean, shareable URLs (especially important for public wishlist share links)
- Better SEO
- Consistent with modern SPA conventions

**⚠️ Important deployment requirement**: Every hosting platform must serve `index.html` for
all paths that are not static assets. Without this, a direct URL or page refresh returns a 404. See each platform section below for the exact configuration.

### Rollback to Hash History

If you need to revert to hash-based routing (e.g., deploying to a platform where you cannot
configure server-side rewrites):

1. In `src/router/index.ts`, change:
   ```typescript
   // From:
   import { createRouter, createWebHistory } from 'vue-router';
   history: createWebHistory(),
   // To:
   import { createRouter, createWebHashHistory } from 'vue-router';
   history: createWebHashHistory(),
   ```
2. Remove or disable the `rewrites` block from `vercel.json` (or equivalent platform config).
3. Redeploy.

> **Note**: After rolling back, existing bookmarks and shared wishlist links that use clean
> URLs (e.g., `/wishlist/abc123`) will stop working. Users will need new hash-based links
> (e.g., `/#/wishlist/abc123`).

---

## Option 1: Vercel (Recommended)

### Why Vercel?

- ✅ Optimized for Vite apps
- ✅ Automatic HTTPS
- ✅ Git integration (auto-deploy on push)
- ✅ Preview deployments for PRs
- ✅ Edge network (fast globally)
- ✅ Free tier available

### Step-by-Step

#### 1. Install Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login

```bash
vercel login
```

#### 3. Configure `vercel.json`

A `vercel.json` is **already committed** at the project root. It includes the SPA rewrite
rule required for `createWebHistory` routing:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

> The `rewrites` rule ensures that all paths (including `/wishlist/:shareSlug` and deep
> links like `/shopping/list-id`) are served by `index.html` so Vue Router handles them
> client-side. Without this, page refreshes and direct URL access return 404.

To add Supabase environment variables, use the Vercel dashboard or CLI secrets (see step 4).

#### 4. Add Secrets

```bash
vercel secrets add supabase-url "https://xxx.supabase.co"
vercel secrets add supabase-anon-key "your-anon-key-here"
```

#### 5. Deploy

**First deployment**:

```bash
vercel
```

**Production deployment**:

```bash
vercel --prod
```

#### 6. Update Google OAuth

Add Vercel URL to authorized redirect URIs:

```
https://your-project.vercel.app
```

And Supabase callback:

```
https://xxx.supabase.co/auth/v1/callback
```

### Vercel Dashboard Setup

**Alternative to CLI**:

1. Go to [vercel.com](https://vercel.com)
2. Click **Import Project**
3. Connect GitHub repo
4. Configure:
   - Framework: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add **Environment Variables**:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```
6. Click **Deploy**

### Automatic Deployments

Once connected:

- Push to `main` → auto-deploys to production
- Open PR → creates preview deployment

---

## Option 2: Netlify

### Why Netlify?

- ✅ Simple deployment
- ✅ Built-in forms (if needed)
- ✅ Split testing
- ✅ Git integration
- ✅ Free tier available

### Step-by-Step

#### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Create netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

# Required for createWebHistory: serve index.html for all paths
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_SUPABASE_URL = "https://xxx.supabase.co"
  VITE_SUPABASE_ANON_KEY = "your-anon-key"
```

⚠️ **Security Note**: Don't commit real keys. Use Netlify dashboard for production.

#### 4. Deploy

**First deployment**:

```bash
netlify deploy
```

**Production deployment**:

```bash
netlify deploy --prod
```

#### 5. Update OAuth

Add Netlify URL to Google OAuth:

```
https://your-site.netlify.app
```

### Netlify Dashboard Setup

1. Go to [netlify.com](https://netlify.com)
2. **New site from Git**
3. Connect GitHub repo
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. **Site settings → Environment variables**:
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key
   ```
6. Click **Deploy site**

---

## Option 3: AWS (S3 + CloudFront)

### Why AWS?

- ✅ Enterprise-grade
- ✅ Full control
- ✅ Integrate with other AWS services
- ✅ Custom domain + SSL

### Architecture

```
Route 53 (DNS)
     ↓
CloudFront (CDN)
     ↓
S3 Bucket (Static files)
```

### Step-by-Step

#### 1. Build Application

```bash
npm run build
```

#### 2. Create S3 Bucket

```bash
aws s3 mb s3://your-app-bucket --region us-east-1
```

#### 3. Configure Bucket for Static Hosting

```bash
aws s3 website s3://your-app-bucket \
  --index-document index.html \
  --error-document index.html
```

#### 4. Upload Files

```bash
aws s3 sync dist/ s3://your-app-bucket --delete
```

#### 5. Set Bucket Policy

Create `bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-app-bucket/*"
    }
  ]
}
```

Apply:

```bash
aws s3api put-bucket-policy \
  --bucket your-app-bucket \
  --policy file://bucket-policy.json
```

#### 6. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name your-app-bucket.s3.amazonaws.com \
  --default-root-object index.html
```

#### 7. Configure Custom Domain

1. Create SSL certificate in ACM
2. Add CNAME record in Route 53
3. Update CloudFront distribution

### Environment Variables

**Problem**: S3 doesn't support runtime environment variables.

**Solution 1 - Build-time**:

```bash
VITE_SUPABASE_URL=xxx npm run build
```

**Solution 2 - config.js**:

Create `public/config.js`:

```javascript
window.APP_CONFIG = {
  supabaseUrl: 'https://xxx.supabase.co',
  supabaseAnonKey: 'your-key',
};
```

Load in `index.html`:

```html
<script src="/config.js"></script>
```

---

## Option 4: Docker + Nginx

### Why Docker?

- ✅ Self-hosted
- ✅ Full control
- ✅ Can run on any platform
- ✅ Consistent environment

### Dockerfile

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Create `nginx.conf`:

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Gzip compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

  # SPA routing
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
}
```

### Build & Run

```bash
# Build image
docker build -t family-logistics-app .

# Run container
docker run -d \
  -p 80:80 \
  --name family-logistics \
  family-logistics-app
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '80:80'
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

Run:

```bash
docker-compose up -d
```

---

## Environment Variables

### Required Variables

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Optional Variables

```env
# Mock mode (for demo deployments)
VITE_USE_MOCK_BACKEND=false

# Analytics (future)
VITE_ANALYTICS_ID=G-XXXXXXXXXX
```

### Security Best Practices

✅ **DO**:

- Use environment variables for configs
- Keep anon key (safe to expose)
- Use different projects for dev/prod

❌ **DON'T**:

- Commit `.env` to Git
- Expose service role keys
- Use prod credentials in dev

---

## Custom Domain

### Vercel

1. **Settings → Domains**
2. Add your domain
3. Configure DNS:
   ```
   CNAME  www   cname.vercel-dns.com
   A      @     76.76.21.21
   ```

### Netlify

1. **Domain settings → Add custom domain**
2. Configure DNS:
   ```
   CNAME  www   your-site.netlify.app
   A      @     75.2.60.5
   ```

### AWS

1. Create Route 53 hosted zone
2. Add A record pointing to CloudFront
3. Add SSL certificate from ACM

---

## SSL/HTTPS

### Automatic (Vercel/Netlify)

HTTPS is automatic and free with Let's Encrypt.

### AWS

1. Request certificate in ACM
2. Validate via DNS
3. Attach to CloudFront distribution

### Self-Hosted

Use Let's Encrypt with Certbot:

```bash
certbot --nginx -d yourdomain.com
```

---

## Post-Deployment Checklist

After deploying:

✅ **Test authentication**

- Try Google OAuth
- Try email/password
- Verify sessions persist

✅ **Test core features**

- Create household
- Add shopping list
- Add wishlist
- Share public wishlist

✅ **Verify data persistence**

- Refresh page
- Close/reopen browser
- Test on different devices

✅ **Check performance**

- Run Lighthouse audit
- Verify load times
- Test on slow connections

✅ **Security review**

- Check HTTPS works
- Verify RLS policies
- Test unauthorized access

---

## Monitoring & Analytics

### Recommended Tools

1. **Vercel Analytics** (if using Vercel)
2. **Google Analytics 4**
3. **Sentry** (error tracking)
4. **LogRocket** (session replay)

### Supabase Monitoring

**Dashboard → Logs**:

- API requests
- Database queries
- Auth events
- Errors

---

## Troubleshooting

### Blank Page After Deployment

**Causes**:

- Base URL misconfigured
- Assets not loading

**Solution**:
Check `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/', // Should be '/' for most deployments
});
```

### OAuth Redirect Errors

**Cause**: Redirect URI not configured

**Solution**:

1. Add production URL to Google Console
2. Verify Supabase callback URL
3. Check exact match (no trailing slashes)

### Environment Variables Not Working

**Vercel/Netlify**:

- Redeploy after adding variables
- Check variable names (must start with `VITE_`)

**AWS S3**:

- Variables baked into build
- Rebuild with correct values

### 404 on Refresh

**Cause**: SPA routing requires all paths to be served by `index.html`. With
`createWebHistory` (HTML5 History API), the server must be configured to fall back to
`index.html` for any path that is not a static file.

**Solution**:

**Vercel** — already handled by the committed `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify** — Add `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Scaling Considerations

### Frontend (CDN)

- Vercel/Netlify: Auto-scales
- AWS CloudFront: Configure caching
- Global edge locations

### Backend (Supabase)

**Free tier limits**:

- 500 MB database
- 50,000 monthly active users
- 2 GB storage

**Pro tier** ($25/month):

- 8 GB database
- 100,000 MAU
- 100 GB storage

**Upgrade when**:

- Database > 400 MB
- Users > 40,000
- Need custom domains

---

## Cost Estimates

### Vercel

- **Hobby**: Free (personal projects)
- **Pro**: $20/month (commercial use)

### Netlify

- **Free**: 100 GB bandwidth
- **Pro**: $19/month (1 TB bandwidth)

### AWS

- **S3**: $0.023/GB storage + $0.09/GB transfer
- **CloudFront**: $0.085/GB (first 10 TB)
- **Route 53**: $0.50/hosted zone/month

**Example**: $5-15/month for typical app

### Supabase

- **Free**: $0 (hobby projects)
- **Pro**: $25/month (production)

---

## Related Documentation

- [Backend Setup](../backend/supabase-setup.md)
- [Authentication](../frontend/authentication.md)
- [CI/CD](../operations/ci-cd.md)
- [Environment Configuration](../getting-started/configuration.md)

---

**Last Updated**: March 3, 2026
