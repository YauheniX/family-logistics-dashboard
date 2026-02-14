# Wiki Documentation Structure

This document outlines the Wiki structure created for the Family Logistics Dashboard.

## Wiki Pages Overview

The project documentation has been moved from the lengthy README.md (644 lines) to a comprehensive Wiki with 10 dedicated pages, reducing the README to 228 lines.

### Wiki Files

1. **[Home.md](wiki/Home.md)** - 195 lines
   - Quick start guide
   - Project overview
   - Installation instructions
   - Navigation to other Wiki pages

2. **[Architecture.md](wiki/Architecture.md)** - 649 lines
   - Clean architecture overview
   - Feature-based structure
   - Design patterns (Repository, Service, Singleton)
   - Type safety and validation
   - Error handling
   - Data flow diagrams
   - Testing strategy
   - Best practices

3. **[Database-Schema.md](wiki/Database-Schema.md)** - 616 lines
   - Complete database schema
   - All table definitions
   - Row Level Security (RLS) policies
   - Helper functions
   - Storage buckets
   - Entity-relationship diagram
   - Type generation instructions

4. **[Authentication.md](wiki/Authentication.md)** - 287 lines
   - Google OAuth setup (detailed)
   - Email/password authentication
   - Frontend implementation
   - Protected routes
   - Testing authentication locally
   - Common issues and solutions
   - Security best practices
   - Production deployment auth setup

5. **[CI-CD.md](wiki/CI-CD.md)** - 508 lines
   - CI workflow (testing, linting)
   - Deploy workflow (Vercel)
   - CodeQL security scanning
   - Super Linter quality checks
   - Branch protection rules
   - Environment variables
   - Deployment targets
   - Monitoring and logs
   - Performance optimization
   - Troubleshooting

6. **[Testing.md](wiki/Testing.md)** - 569 lines
   - Test structure and organization
   - Running tests
   - Coverage requirements (70%)
   - Writing tests (unit, integration, component)
   - Mocking Supabase
   - Best practices
   - CI integration
   - Debugging tests
   - Common issues

7. **[Features.md](wiki/Features.md)** - 586 lines
   - Trip Management
   - Packing Lists
   - Budget Tracking
   - Document Storage
   - Timeline/Itinerary
   - Trip Sharing (roles and permissions)
   - Packing Templates
   - Feature roadmap
   - Integration examples

8. **[Deployment.md](wiki/Deployment.md)** - 584 lines
   - Vercel deployment (recommended)
   - Netlify deployment
   - AWS Amplify
   - Cloudflare Pages
   - Self-hosted (Docker)
   - Post-deployment checklist
   - Performance optimization
   - Rollback strategy
   - Monitoring and alerts
   - Troubleshooting
   - Security checklist

9. **[Multi-Language-and-Dark-Mode.md](wiki/Multi-Language-and-Dark-Mode.md)** - 552 lines
   - Multi-language support (planned)
   - Vue i18n setup
   - Locale files structure
   - Dark mode implementation
   - TailwindCSS dark mode
   - Color palette
   - Accessibility
   - System preference detection
   - Implementation roadmap
   - Best practices

10. **[Developer-Guides.md](wiki/Developer-Guides.md)** - 608 lines
    - Error handling architecture
    - Toast notification system
    - useAsyncHandler composable
    - Migration guide (old → new architecture)
    - Code examples and best practices
    - References to detailed docs in docs/ folder

11. **[FAQ.md](wiki/FAQ.md)** - 507 lines
    - General questions
    - Setup and installation
    - Authentication
    - Database and data
    - Features
    - Development
    - Deployment
    - Performance
    - Security
    - Known issues
    - Getting help
    - Troubleshooting checklist

## New README.md Structure (228 lines)

The refactored README is concise and developer-friendly:

1. **Header** - Project title, description, badges
2. **Key Features** - Bullet point list (8 items)
3. **Tech Stack** - Frontend, Backend, Architecture
4. **Quick Start** - Prerequisites, Installation, Setup, Run
5. **Testing & CI** - Commands and pipeline overview
6. **Documentation** - Links to all Wiki pages
7. **Project Structure** - High-level folder structure
8. **Contributing** - Guidelines and workflow
9. **Roadmap** - Completed, In Progress, Planned
10. **License & Acknowledgments**

## Benefits

### For New Contributors

- ✅ Quick overview in README (under 250 lines)
- ✅ Clear navigation to detailed topics
- ✅ Self-serve answers in FAQ
- ✅ Step-by-step guides in Wiki

### For Documentation Maintenance

- ✅ Modular structure - easy to update
- ✅ Separation of concerns (architecture vs. deployment vs. features)
- ✅ Comprehensive coverage (5,053 total Wiki lines)
- ✅ Searchable and linkable sections

### For Project Quality

- ✅ Professional documentation structure
- ✅ Production-ready appearance
- ✅ Easy onboarding for new developers
- ✅ Clear technical documentation

## Total Line Counts

- **Old README**: 644 lines
- **New README**: 229 lines (64% reduction)
- **Wiki Pages**: 5,661 lines (comprehensive)
- **Total Documentation**: 5,890 lines (with README)
- **Original docs/ folder**: 3,483 lines (preserved, key content integrated into wiki)

## Next Steps for GitHub Wiki

To publish to GitHub Wiki:

1. Go to your repository's Wiki tab
2. Create pages matching the file names (without `.md` extension)
3. Copy content from each `wiki/*.md` file
4. Verify all internal links work
5. Update README links if needed (from `wiki/Page.md` to `wiki/Page`)

Alternatively, you can keep the Wiki in the repository (as `wiki/` folder) for version control and easier maintenance.

## Integration with docs/ Folder

The new **Developer-Guides.md** consolidates key technical information from the `docs/` folder:

**Content Integrated:**

- **docs/ERROR_HANDLING.md** → Developer-Guides.md (Error Handling section)
- **docs/TOAST_GUIDE.md** → Developer-Guides.md (Toast Notifications section)
- **docs/USE_ASYNC_HANDLER_GUIDE.md** → Developer-Guides.md (Async Handler section)
- **docs/MIGRATION_GUIDE.md** → Developer-Guides.md (Migration Guide section)
- **docs/ARCHITECTURE.md** → Already covered in wiki/Architecture.md
- **docs/SETUP.md** → Already covered in wiki/Home.md and wiki/Authentication.md

**Preserved in docs/ folder:**
The original detailed documentation files are preserved in the `docs/` folder for:

- Developers who need the full detailed guides
- Reference for advanced use cases
- Historical documentation

**Best Practice:**

- Quick start: Use Wiki pages
- Deep dive: Reference original docs/ files (linked from Wiki)
- Both are version-controlled and maintained

---

**Created:** February 2026  
**Purpose:** README refactoring and comprehensive Wiki documentation
