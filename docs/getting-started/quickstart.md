# ⚡ Quickstart Guide

Get the Family Logistics Dashboard running in 5 minutes.

**Last Updated**: February 21, 2026

---

## Start

```bash
# Clone
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard

# Install
npm install

# Run (Mock Mode - No Backend Required)
npm run dev

# Open browser
# http://localhost:5173
# Click "Sign in with Google" - auto-creates demo user
```

---

## Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** (optional, for cloning)

**Verify installation**:

```bash
node -v   # Should show v18 or higher
npm -v    # Should show v9 or higher
```

---

## Quick Setup (Mock Mode)

### Step 1: Get the Code

**Option A: Clone with Git**

```bash
git clone https://github.com/YauheniX/family-logistics-dashboard.git
cd family-logistics-dashboard
```

**Option B: Download ZIP**

1. Download from GitHub
2. Extract archive
3. Open terminal in extracted folder

### Step 2: Install Dependencies

```bash
npm install
```

**What gets installed**:

- Vue 3 (UI framework)
- Pinia (state management)
- Vue Router (routing)
- TailwindCSS (styling)
- TypeScript (type safety)
- Vite (dev server)

**Install time**: ~2-3 minutes (depending on network)

### Step 3: Start Development Server

```bash
npm run dev
```

**Expected output**:

```
  VITE v7.3.1  ready in 892 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 4: Open in Browser

Navigate to: [http://localhost:5173](http://localhost:5173)

### Step 5: Sign In

1. Click **"Sign in with Google"** button
2. Mock mode auto-creates a demo user
3. ✅ You're in!

**Mock User**:

- Name: Demo User
- Email: demo@example.com
- Password: (not needed in mock mode)

---

## What You Can Do (Mock Mode)

### ✅ Create a Household

1. Click **"Create Household"**
2. Enter name: "Smith Family"
3. Created!

### ✅ Add a Shopping List

1. Navigate to **Shopping Lists**
2. Click **"New List"**
3. Enter title: "Groceries"
4. Add items: Milk, Eggs, Bread

### ✅ Mark Items Purchased

1. Open shopping list
2. Click checkbox next to items
3. See purchase tracking

### ✅ Create a Wishlist

1. Navigate to **Wishlists**
2. Click **"New Wishlist"**
3. Enter title: "Birthday Wishlist"
4. Add items with prices

### ✅ Share Wishlist Publicly

1. Open wishlist
2. Click **"Share"**
3. Copy public link
4. Share with anyone (no login required)

---

## Mock Mode Features

### What Works

✅ Full application functionality  
✅ Data persists in browser (localStorage)  
✅ No backend/network required  
✅ Perfect for demos and testing  
✅ Offline capable

### Limitations

⚠️ Data stored locally (browser only)  
⚠️ No multi-device sync  
⚠️ Data lost if localStorage cleared  
⚠️ No real authentication  
⚠️ Single user only

---

## Next Steps

### Option 1: Continue with Mock Mode

Perfect for:

- Learning the application
- Local development
- Testing features
- Creating demos

**No additional setup needed!**

### Option 2: Connect to Supabase (Real Backend)

Get multi-user, cloud sync, real auth:

1. **Create Supabase account** (free)
2. **Create project** in Supabase
3. **Apply database schema**
4. **Configure environment variables**
5. **Restart dev server**

**See**: [Installation Guide](installation.md) for full Supabase setup

---

## Troubleshooting

### Port 5173 already in use

**Error**:

```
Port 5173 is in use, trying another one...
```

**Solution**: Another app is using the port. Either:

- Stop the other app
- Use the new port Vite assigns
- Change port in `vite.config.ts`

### Module not found errors

**Error**:

```
Cannot find module 'xxx'
```

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Blank white screen

**Check**:

1. Browser console (F12) for errors
2. Network tab - any failed requests?
3. Terminal - any errors in Vite output?

**Common cause**: JavaScript error in code

**Solution**: Check browser console, fix error, or report issue

### "Mock mode" banner doesn't appear

**Expected**: Info banner at top saying "Mock Mode - Using localStorage"

**If missing**: Check `src/config/backend.config.ts` - `isMockMode()` should return `true`

---

## Development Commands

### Start Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
npm test
```

### Run Linter

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

---

## Project Structure

```
family-logistics-dashboard/
├── src/
│   ├── features/          # Feature modules (clean architecture)
│   ├── views/             # Page components
│   ├── components/        # Reusable components
│   ├── stores/            # Pinia state management
│   ├── router/            # Vue Router setup
│   └── main.ts            # Application entry point
├── public/                # Static assets
├── docs/                  # Documentation (you are here!)
├── supabase/              # Database schema & migrations
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

---

## Learning Path

### 1. Understand the UI

- Explore all pages
- Create sample data
- Test all features

### 2. Read the Docs

- [Architecture Overview](../architecture/overview.md)
- [Domain Model](../domain/overview.md)
- [Database Schema](../backend/database-schema.md)

### 3. Check the Code

- `src/features/` - Feature modules
- `src/stores/` - State management
- `src/views/` - Page components

### 4. Make Changes

- [Adding Features Guide](../development/adding-features.md)
- [Testing Guide](../testing/overview.md)

---

## Getting Help

- **Setup Issues**: See [Troubleshooting](../operations/troubleshooting.md)
- **Feature Questions**: See [FAQ](../operations/faq.md)
- **Bug Reports**: [Create GitHub Issue](https://github.com/YauheniX/family-logistics-dashboard/issues)

---

## What's Next?

✅ You now have a working development environment!

**Recommended next steps**:

1. **Explore the app** - Create households, lists, wishlists
2. **Read architecture docs** - Understand the design
3. **Set up Supabase** - Get real backend (optional)
4. **Write some code** - Make your first contribution!

---

**Ready to dive deeper?** See [Installation Guide](installation.md) for full setup including Supabase.

---

**Last Updated**: February 21, 2026
