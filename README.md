# 🛒 Family Shopping & Wishlist Planner

> **Production-grade Family Planner** built with Vue 3, TypeScript, and Supabase.  
> Create shared shopping lists, manage personal wishlists, and collaborate with family members.

[![CI](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/ci.yml)
[![CodeQL](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml/badge.svg)](https://github.com/YauheniX/family-logistics-dashboard/actions/workflows/codeql.yml)

---

## 🎯 What Is This?

A **Family Planner** system with:

1. **Shared Shopping Lists** — Create and manage shopping lists within your family group. Family members can add items, mark purchases, and see who bought what.
2. **Personal Wishlists** — Create wish lists that can be publicly shared via a unique link. Anyone (no login required) can view and reserve items.
3. **Family Groups** — Create a family, invite members by email, and collaborate on shared shopping lists.
4. **Role-Based Access** — Family owners can manage members; all members can create and edit shopping lists.
5. **Public Wishlist Sharing** — Share wishlists via `/w/:share_slug` — visitors can reserve items without logging in.

---

## ✨ Key Features

- 👨‍👩‍👧‍👦 **Family Groups** — Create families, invite members, manage roles (owner/member)
- 🛒 **Shared Shopping Lists** — Add items, mark purchased, see who bought what, archive lists
- 🎁 **Personal Wishlists** — Create wishlists with priority, price, links, and images
- 🌐 **Public Wishlist Sharing** — Share via unique link, visitors can reserve items without login
- 🔐 **Secure Auth** — Google OAuth + email/password (Supabase mode)
- 📊 **Dashboard** — Stats for active lists, items to buy, reserved wishlist items
- ✅ **Production-Ready** — Clean architecture, comprehensive tests, CI/CD pipeline

---

## 🛠 Tech Stack

| Layer          | Technology                                              |
| -------------- | ------------------------------------------------------- |
| **Frontend**   | Vue 3 (Composition API) • TypeScript • Pinia • Tailwind |
| **Backend**    | Supabase (PostgreSQL + Auth + Storage + RLS)            |
| **Validation** | Zod                                                     |
| **Build**      | Vite                                                    |
| **Deployment** | Vercel / GitHub Pages / Any static host                 |

---

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes with tests
4. Ensure CI passes: `npm run lint && npm test`
5. Submit a pull request

---

## 📄 License

Private project for personal use.

---

Built with [Vue 3](https://vuejs.org/) • [Supabase](https://supabase.com/) • [TailwindCSS](https://tailwindcss.com/) • [Vite](https://vitejs.dev/)
