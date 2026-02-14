# 🚀 Deployment Guide

Complete deployment instructions for the Family Logistics Dashboard.

---

## Overview

The application can be deployed to various platforms. This guide covers:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Cloudflare Pages
- Self-hosted options

---

## Prerequisites

Before deploying:
- ✅ Code pushed to GitHub repository
- ✅ Supabase production project created
- ✅ All tests passing
- ✅ Build succeeds locally

---

## Vercel Deployment (Recommended)

### Why Vercel?

- ✅ Zero-config deployment
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for PRs
- ✅ Free tier (generous limits)
- ✅ Excellent Vue/Vite support

### Initial Setup

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Link Project

```bash
vercel link
```

Follow prompts:
- Select your Vercel account/organization
- Link to existing project or create new one

This creates `.vercel/` folder with:
- `project.json` - Contains `orgId` and `projectId`
- `.gitignore` entry

#### 3. Configure Environment Variables

In Vercel dashboard:
1. Go to **Project Settings → Environment Variables**
2. Add variables for all environments:

**Production:**
```
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
```

**Preview:**
```
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-staging-anon-key
```

**Development:**
```
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
```

#### 4. Deploy

```bash
# Production deployment
vercel --prod

# Preview deployment
vercel
```

### Automated Deployment via GitHub

#### 1. Get Vercel Token

1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Create new token
3. Copy token value

#### 2. Add GitHub Secrets

Go to **GitHub Repository → Settings → Secrets and variables → Actions**

Add:
- `VERCEL_TOKEN` - Your Vercel token
- `VERCEL_ORG_ID` - From `.vercel/project.json`
- `VERCEL_PROJECT_ID` - From `.vercel/project.json`

#### 3. Push to Main

GitHub Actions will automatically:
1. Run tests
2. Build project
3. Deploy to Vercel

---

## Netlify Deployment

### Via Netlify CLI

#### 1. Install CLI

```bash
npm i -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Initialize

```bash
netlify init
```

Follow prompts to create new site or link existing.

#### 4. Configure Build Settings

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

#### 5. Set Environment Variables

```bash
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

#### 6. Deploy

```bash
# Production
netlify deploy --prod

# Preview
netlify deploy
```

### Via Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables
6. Click "Deploy site"

---

## AWS Amplify

### Setup

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect GitHub repository
4. Configure build settings:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

5. Add environment variables
6. Save and deploy

---

## Cloudflare Pages

### Via Cloudflare Dashboard

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Connect GitHub repository
4. Configure:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variables: Add Supabase credentials
5. Click "Save and Deploy"

### Via Wrangler CLI

```bash
npm i -g wrangler
wrangler login
wrangler pages project create family-logistics
wrangler pages publish dist
```

---

## Self-Hosted (Docker)

### Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS build

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

### Create nginx.conf

```nginx
server {
  listen 80;
  server_name _;
  
  root /usr/share/nginx/html;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  gzip on;
  gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

### Build and Run

```bash
# Build image
docker build -t family-logistics .

# Run container
docker run -d \
  -p 80:80 \
  --name family-logistics \
  family-logistics
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---

## Post-Deployment Checklist

### 1. Verify Deployment

- [ ] Visit production URL
- [ ] Test authentication (Google OAuth)
- [ ] Create test trip
- [ ] Upload test document
- [ ] Check all features work

### 2. Configure Custom Domain

**Vercel:**
1. Go to **Project Settings → Domains**
2. Add custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate

**Netlify:**
1. Go to **Site settings → Domain management**
2. Add custom domain
3. Configure DNS
4. Enable HTTPS

### 3. Update Google OAuth

Add production URL to authorized redirect URIs:
```
https://your-domain.com/auth/callback
https://<your-ref>.supabase.co/auth/v1/callback
```

### 4. Set Up Monitoring

**Recommended Tools:**
- **Sentry** - Error tracking
- **Google Analytics** - User analytics
- **LogRocket** - Session replay
- **Vercel Analytics** - Performance monitoring

### 5. Configure Redirects

Ensure SPA routing works:

**Vercel:** Automatic
**Netlify:** Via `netlify.toml`
**Others:** Configure web server

### 6. Enable HTTPS

All platforms automatically provide SSL certificates.

### 7. Set Up Backups

**Supabase:**
- Automatic daily backups on paid plans
- Manual backups via dashboard

**Storage:**
- Regular backups of document bucket
- Version control for configuration

---

## Performance Optimization

### Build Optimization

**1. Code Splitting**

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['vue', 'vue-router', 'pinia'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['chart.js', 'vue-chartjs']
        }
      }
    }
  }
})
```

**2. Lazy Loading**

```typescript
// router/index.ts
const routes = [
  {
    path: '/trips',
    component: () => import('@/views/TripsView.vue')
  }
]
```

**3. Asset Optimization**

- Compress images (WebP format)
- Minify CSS/JS (Vite does this)
- Use CDN for static assets

### Runtime Optimization

**1. Vue Optimization**

```typescript
// Use v-memo for expensive lists
<div v-for="trip in trips" v-memo="[trip.id, trip.status]">
```

**2. Pinia Optimization**

```typescript
// Use getters for computed values
const getters = {
  packedPercentage: (state) => {
    const packed = state.items.filter(i => i.isPacked).length
    return (packed / state.items.length) * 100
  }
}
```

**3. Supabase Optimization**

```typescript
// Only select needed columns
const { data } = await supabase
  .from('trips')
  .select('id, name, status')  // Not 'select('*')'
```

---

## Rollback Strategy

### Vercel

1. Go to **Deployments** page
2. Find previous working deployment
3. Click "⋯" → "Promote to Production"

### Netlify

1. Go to **Deploys** page
2. Find previous deploy
3. Click "Publish deploy"

### Git Revert

```bash
git revert HEAD
git push origin main
```

---

## Monitoring & Alerts

### Health Checks

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

**Set up alerts for:**
- Site down
- Response time > 3s
- Error rate > 1%

### Error Tracking

**Sentry Setup:**

```typescript
// main.ts
import * as Sentry from '@sentry/vue'

Sentry.init({
  app,
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.vueRouterInstrumentation(router)
    }),
    new Sentry.Replay()
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
})
```

---

## Troubleshooting

### Build Fails

**Check:**
1. Dependencies installed: `npm ci`
2. Tests passing: `npm test`
3. Build works locally: `npm run build`
4. Environment variables set correctly

### Authentication Not Working

**Check:**
1. Supabase URL and keys correct
2. Google OAuth redirect URIs updated
3. CORS settings in Supabase

### 404 Errors on Routes

**Cause:** SPA routing not configured

**Solution:**
- Vercel: Automatic
- Netlify: Add redirects in `netlify.toml`
- Others: Configure web server

### Slow Load Times

**Solutions:**
1. Enable code splitting
2. Lazy load routes
3. Optimize images
4. Use CDN
5. Enable compression

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] No secrets in code
- [ ] CSP headers configured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Regular dependency updates
- [ ] Security scans (CodeQL) passing

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)

---

**Next Steps:**
- [CI/CD Guide](CI-CD.md) - Automated deployment
- [Testing](Testing.md) - Pre-deployment testing
- [FAQ](FAQ.md) - Common issues
