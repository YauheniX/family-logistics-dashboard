# ❓ Frequently Asked Questions

**Last Updated**: March 2026

---

## Getting Started

### Do I need to create a Supabase account to use this app?

No. The app runs in **Mock Mode** with no backend required. All data is stored in your browser's localStorage. Just run `npm install && npm run dev` and you're ready.

To get real multi-user collaboration and cloud sync, you'll need a Supabase account. See [Installation Guide](../getting-started/installation.md).

---

### What is Mock Mode?

Mock Mode replaces the Supabase backend with browser localStorage. The app looks and works identically, but:

- Data is stored only in your browser
- No real authentication (a demo user is created automatically)
- Data is lost if localStorage is cleared
- Only one user can be simulated at a time

Mock Mode activates automatically when Supabase credentials are absent.

---

### How do I switch from Mock Mode to Supabase?

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Apply the database schema (`supabase/schema.sql`)
3. Add your credentials to `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_USE_MOCK_BACKEND=false
   ```
4. Restart `npm run dev`

See [Full Setup Guide](../getting-started/installation.md#option-b-full-setup-with-supabase).

---

## Households

### What is a "household"?

A household is a private group for collaboration. Think of it as a "workspace" — all shopping lists and wishlists belong to a household. You can be a member of multiple households and switch between them.

---

### Can I be in multiple households?

Yes. You can be a member of multiple households. Use the household selector to switch between them.

---

### How do I invite someone to my household?

Go to **Household** → **Members** → **Invite Member**. Enter their email address and select their role. They will see the invitation when they next log in with that email.

Note: no automated email is sent — you need to notify the person yourself (e.g., send them a message saying "I've sent you a household invitation, log in to accept it").

---

### Can I add a child who doesn't have an account?

Yes. You can add a "soft member" — a member without an account. This is designed for young children:

1. Go to **Household** → **Members** → **Add Member (no account)**
2. Enter their display name and optional details

Soft members appear in the household but cannot log in. Their wishlists can be managed by the owner/admin.

---

### Can I delete my household?

Yes, but only the **Owner** can delete a household. Deletion is **permanent and irreversible** — all data is deleted.

Go to **Household** → **Settings** → **Delete Household**.

---

## Shopping Lists

### Who can see a shopping list?

All members of the household (Owner, Admin, Member, Child, Viewer) can see all shopping lists.

---

### Can I have multiple shopping lists?

Yes. Create as many as you need — one per store, one per event, etc. They all live under the same household.

---

### What's the difference between archiving and deleting a list?

- **Archive**: Non-destructive. The list and all items are preserved but hidden from the main view. Good for completed shopping trips.
- **Delete**: Permanent. All items are permanently removed. Cannot be undone.

---

### Can someone accidentally mark my item as purchased?

Yes — all eligible members (including Child role) can mark items as purchased or unmark them. This is by design for collaborative shopping. The `purchased_by` field records who last toggled the item.

---

## Wishlists

### Who can see my wishlist?

Depends on the visibility setting:

- **Private**: Only you (+ household Owner/Admin)
- **Household**: All household members
- **Public**: Anyone with the share link (no account required)

---

### How do I share my wishlist?

1. Set the wishlist visibility to **Public**
2. Copy the share link (e.g., `https://yourapp.com/w/abc123`)
3. Share the link — anyone can view it without an account

---

### Can I see who reserved items on my wishlist?

No — reservations are anonymous to preserve the gift surprise. You can see _how many_ items are reserved but not by whom.

---

### Can children create wishlists?

Yes. The Child role can create wishlists — great for birthday or holiday wish lists.

---

## Roles & Permissions

### What is the difference between Owner and Admin?

| Capability              | Owner | Admin |
| ----------------------- | ----- | ----- |
| Delete household        | ✅    | ❌    |
| Transfer ownership      | ✅    | ❌    |
| Promote to owner        | ✅    | ❌    |
| All other admin actions | ✅    | ✅    |

---

### Can I change someone's role?

- **Owner** can change any member's role
- **Admin** can change roles for members with equal or lower roles (cannot promote to Owner)

---

### Can a Viewer add items to shopping lists?

No. Viewer role is read-only. They can see everything but cannot create, edit, or delete anything.

---

## Technical Questions

### Is the `anon` Supabase key safe to expose in the browser?

Yes. The `anon` key is designed for browser use. Supabase Row-Level Security (RLS) policies ensure that even with this key, users can only access their own household's data. Never expose the `service_role` key.

---

### How is data isolated between households?

PostgreSQL Row-Level Security (RLS) enforces isolation at the database level. Even if there were a bug in the application code, the database would still prevent one household's users from reading another household's data.

See [Multi-Tenant Architecture](../architecture/multi-tenant.md).

---

### Does the app work offline?

In Mock Mode (localStorage), yes — it works completely offline. In Supabase mode, no — it requires an internet connection to the Supabase project.

---

### Where is user data stored?

In Supabase mode: in your Supabase project's PostgreSQL database, hosted in the region you chose when creating the project.

In Mock Mode: in your browser's localStorage — it never leaves your device.

---

## See Also

- [User Guide](../user-guide.md) — Complete feature guide
- [Troubleshooting](troubleshooting.md) — Technical issues
- [Installation Guide](../getting-started/installation.md) — Setup help
