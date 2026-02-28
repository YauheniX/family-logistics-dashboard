# 🎁 Wishlists & Reservations

**Feature Status**: ✅ Implemented (Migration 030 - Household Reservations)  
**Last Updated**: February 27, 2026

---

## Overview

Personal wishlists allow users to create and share gift wishlists with anyone via public links. Items can be reserved so multiple people don't buy the same gift. The system supports three visibility levels and uses **email-based reservation verification** for security and user convenience.

### Key Features

- ✅ **Personal Wishlists** - Each user creates their own wishlists
- ✅ **Multiple Visibility Levels** - Private, Household, or Public
- ✅ **Public Sharing** - Share via unique slug URL (no login required)
- ✅ **Email-Based Reservations** - Reserve items with name and email
- ✅ **Auto-Reservation for Authenticated Users** - Instant reservation without modal (Feb 2026)
- ✅ **Owner Privileges** - See who reserved items, unreserve without email
- ✅ **Link Previews** - Auto-fetch previews from URLs
- ✅ **Price Tracking** - Track item prices with currency support

---

## Visibility Levels

| Level         | Who Can View          | Who Can Reserve             | Use Case                             |
| ------------- | --------------------- | --------------------------- | ------------------------------------ |
| **Private**   | Owner only            | ❌ No one                   | Personal shopping ideas              |
| **Household** | All household members | ✅ Household members only   | Share with family, gift coordination |
| **Public**    | Anyone with link      | ✅ Anyone (incl. anonymous) | Share with friends, extended family  |

---

## Household Scoping

Wishlists are scoped to the **currently selected household** in the UI:

### Creating Wishlists

When a user creates a wishlist, it is automatically associated with their **currently selected household**.

**Children's Wishlists**: Parents can create wishlists for their children members. These wishlists:

- Have `user_id` = parent (creator)
- Have `member_id` = child member
- Appear in parent's "Children's Wishlists" section (private view)
- Appear in "Household Wishlists" section for ALL members (if visibility = household/public)

This allows families to coordinate gift-giving for children.

```typescript
// In WishlistListView.vue
const handleCreate = async (dto: CreateWishlistDto) => {
  await wishlistStore.createWishlist({
    ...dto,
    household_id: currentHouseholdId.value, // Uses selected household
    member_id: currentMember.id,
  });
};
```

### Viewing Wishlists

The wishlist list displays only wishlists belonging to the **current household**:

```typescript
// When household changes, reload wishlists
watch(currentHouseholdId, (newHouseholdId) => {
  if (userId && newHouseholdId) {
    wishlistStore.loadWishlistsByHousehold(userId, newHouseholdId);
  }
});
```

**Household Wishlists Filter Logic**:

The "Household Wishlists" section shows wishlists from other household members based on `member_id` filtering:

- ✅ Includes: Wishlists where `member_id` ≠ current user's member (with household/public visibility)
- ✅ Includes: Children's wishlists created by current user BUT assigned to child members (if visibility = household/public)
- ❌ Excludes: Current user's personal wishlists (where `member_id` = current user's member)
- ❌ Excludes: Private wishlists from any member

This ensures children's wishlists are visible to the whole family for gift coordination.

### Switching Households

When users switch households:

1. **Dashboard** automatically reloads wishlists for the new household
2. **Wishlist List** automatically filters to show only that household's wishlists
3. **Creating** a new wishlist assigns it to the newly selected household

This ensures proper **multi-tenant isolation** - users only see and create wishlists within their current household context.

---

## Reservation System (Email-Based)

### User Flow

#### Reserving an Item

##### Public/Anonymous User

```text
Public User
  → Opens public wishlist link
  → Sees unreserved item
  → Clicks "Reserve This"
  → Enters name + email (both required)
  → Submits reservation
  ✅ Item marked as reserved
  ✅ Success: "Use your email to unreserve it later"
```

**Backend**: Calls `reserve_wishlist_item(item_id, reserved: true, email, name)`

##### Authenticated User (Non-Owner)

```text
Authenticated User
  → Opens any public wishlist
  → Sees unreserved item
  → Clicks "Reserve"
  ✅ Item instantly reserved (no modal)
  ✅ Uses email from auth session automatically
  ✅ Uses displayName or full_name from profile
  ✅ Success: "Item reserved successfully"
```

**Implementation**: Automatic email/name detection from authentication session

##### Authenticated Household Member (Household Wishlist)

```text
Household Member
  → Views household member's wishlist (visibility = 'household')
  → Sees unreserved item
  → Clicks "Reserve"
  ✅ Item instantly reserved (no modal)
  ✅ Uses email from auth session automatically
  ✅ Uses displayName or full_name from profile
  ✅ Success: "Item reserved successfully"
```

**Backend**: Requires authentication + membership verification in same household

#### Unreserving an Item

```text
Public User
  → Opens public wishlist link
  → Sees "Reserved" badge on item
  → Clicks "Unreserve"
  → Enters email used for reservation
  → Submits unreservation
  ✅ Item unmarked, available again
```

**Backend**: Validates email matches `reserved_by_email`, then unreserves

#### Owner View

```text
Wishlist Owner
  → Opens their wishlist
  → Sees "Reserved by [Name]" badge
  → Can click "Unreserve" (no email required)
  ✅ Owner can unreserve any item
```

---

## Technical Implementation

### Database Schema

**wishlists table**:

```sql
create table wishlists (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id),
  member_id        uuid not null references members(id),
  household_id     uuid not null references households(id),
  title            text not null,
  description      text,
  visibility       text not null default 'private'
                   check (visibility in ('private', 'household', 'public')),
  share_slug       text not null unique,
  created_at       timestamptz not null default now()
);
```

**wishlist_items table**:

```sql
create table wishlist_items (
  id                uuid primary key default gen_random_uuid(),
  wishlist_id       uuid not null references wishlists(id) on delete cascade,
  title             text not null,
  description       text,
  link              text,
  price             numeric(10, 2),
  currency          text not null default 'USD',
  priority          text not null default 'medium'
                    check (priority in ('low', 'medium', 'high')),
  is_reserved       boolean not null default false,
  reserved_by_email text,
  reserved_by_name  text,
  reserved_at       timestamptz,
  created_at        timestamptz not null default now()
);
```

### Reservation Function (Migration 029)

Function: `reserve_wishlist_item()`

```sql
create or replace function reserve_wishlist_item(
  p_item_id uuid,
  p_reserved boolean,
  p_email text default null,
  p_name text default null,
  p_code text default null  -- Ignored (backward compatibility)
)
returns jsonb
```

**Logic**:

1. **Owner Check**: Verify if caller is wishlist owner
2. **Public Check**: Verify wishlist is public
3. **Email Requirement** (if not owner):
   - **Required for reserving**: Non-owners must provide email
   - **Required for unreserving**: Email must match `reserved_by_email`
   - Format validation: `^[^@\s]+@[^@\s]+\.[^@\s]+$`
   - Length check: max 255 characters
4. **Reserving**:
   - Check item not already reserved (atomic guard)
   - Set `is_reserved = true`, store email + name
5. **Unreserving**:
   - Validate email matches `reserved_by_email`
   - Atomic WHERE clause prevents race conditions
   - Clear reservation fields

**Security**:

- `SECURITY DEFINER` with `SET search_path = public`
- Email validation prevents injection
- Atomic updates prevent race conditions
- Owner bypass for easy management

---

## Migration History

### Migration 030: Household Wishlist Reservations (Feb 2026)

**Changes**:

- ✅ Added: Support for reserving items from household-visibility wishlists
- ✅ Updated: `reserve_wishlist_item()` to check household membership
- ✅ Authenticated household members can now reserve from each other's wishlists

**Access Control by Visibility**:

| Visibility | Public Users | Authenticated (non-member) | Household Member |
| ---------- | ------------ | -------------------------- | ---------------- |
| private    | ❌ No        | ❌ No                      | ❌ No            |
| household  | ❌ No        | ❌ No                      | ✅ Yes           |
| public     | ✅ Yes       | ✅ Yes                     | ✅ Yes           |

### Migration 029: Email-Based Reservations (Feb 2026)

**Changes**:

- ❌ Removed: `reservation_code` column (4-digit codes)
- ✅ Added: Email-based verification for unreserving
- ✅ Updated: `reserve_wishlist_item()` to require email

**Rationale**:

| Old System (Code-Based) | New System (Email-Based)       |
| ----------------------- | ------------------------------ |
| 4-digit code generated  | Email address required         |
| User must save code     | User remembers their own email |
| 10,000 possible codes   | Infinite unique emails         |
| No contact info         | Owner has email for contact    |
| Must copy/store code    | No extra step needed           |

**Benefits**:

1. **Better UX**: Users don't need to save random codes
2. **More Secure**: Emails harder to guess than 4-digit codes
3. **Contact Info**: Owners can reach out if needed
4. **Simpler**: One less field to manage

**Breaking Changes**:

- Existing reservations with codes cannot be unreserved via code
- Users must use email (or contact owner) to unreserve
- UI no longer displays codes

---

## API Endpoints (Service Layer)

### WishlistService

```typescript
class WishlistService {
  // Get user's wishlists (all households)
  async getUserWishlists(userId: string): Promise<ApiResponse<Wishlist[]>>;

  // Get user's wishlists filtered by household (recommended)
  async getUserWishlistsByHousehold(
    userId: string,
    householdId: string,
  ): Promise<ApiResponse<Wishlist[]>>;

  // Get single wishlist (authenticated)
  async getWishlist(id: string): Promise<ApiResponse<Wishlist>>;

  // Get wishlist by public slug (anonymous)
  async getWishlistBySlug(slug: string): Promise<ApiResponse<Wishlist>>;

  // Get household wishlists (filtered by visibility)
  // Includes other members' wishlists AND children's wishlists
  // with household/public visibility (even if created by current user)
  async getHouseholdWishlists(
    householdId: string,
    excludeUserId: string,
  ): Promise<ApiResponse<Wishlist[]>>;

  // CRUD operations
  async createWishlist(data: CreateWishlistDto): Promise<ApiResponse<Wishlist>>;
  async updateWishlist(id: string, data: UpdateWishlistDto): Promise<ApiResponse<Wishlist>>;
  async deleteWishlist(id: string): Promise<ApiResponse<void>>;

  // Item management
  async getWishlistItems(wishlistId: string): Promise<ApiResponse<WishlistItem[]>>;
  async addItem(data: CreateWishlistItemDto): Promise<ApiResponse<WishlistItem>>;
  async updateItem(id: string, data: UpdateWishlistItemDto): Promise<ApiResponse<WishlistItem>>;
  async deleteItem(id: string): Promise<ApiResponse<void>>;

  // Reservations (email-based)
  async reserveItem(id: string, name?: string, email?: string): Promise<ApiResponse<WishlistItem>>;
}
```

---

## UI Components

### Routes

| Path                   | Component          | Auth Required | Purpose                |
| ---------------------- | ------------------ | ------------- | ---------------------- |
| `/wishlists`           | WishlistsView      | ✅ Yes        | List user's wishlists  |
| `/wishlists/:id`       | WishlistEditView   | ✅ Yes        | View/edit own wishlist |
| `/wishlist/:shareSlug` | PublicWishlistView | ❌ No         | Public view (anyone)   |

### PublicWishlistView.vue

**Reserve Modal** (Anonymous users only):

```vue
<ModalDialog title="Reserve Item">
  <BaseInput v-model="reserveName" label="Your Name" required />
  <BaseInput v-model="reserveEmail" type="email" label="Your Email" required />
  <p class="text-xs">You'll need this email to unreserve later.</p>
  <BaseButton @click="handleReserve">Confirm Reservation</BaseButton>
</ModalDialog>
```

**Note**: Authenticated users bypass the modal - email auto-detected from auth session.

**Unreserve Modal**:

```vue
<ModalDialog title="Unreserve Item">
  <BaseInput v-model="unreserveEmail" type="email" label="Your Email" required />
  <p class="text-sm">Enter the email you used to reserve this item.</p>
  <BaseButton @click="handleUnreserve">Confirm Unreserve</BaseButton>
</ModalDialog>
```

### WishlistEditView.vue

**Features**:

- View all items with reservation status
- See who reserved items (name only, email hidden)
- Unreserve as owner (no email needed)
- Standard CRUD for items
- **Auto-reservation for authenticated users** (February 2026):
  - When authenticated users click "Reserve" on an item
  - Email automatically detected from auth session
  - Name automatically detected from user profile (displayName or full_name)
  - No modal required - instant reservation
  - Improves UX by eliminating redundant email entry

**Auto-Reservation Implementation**:

```typescript
// handleAutoReserve() in WishlistEditView.vue
const email = authStore.user?.email;
const name = profile.value?.display_name ?? profile.value?.full_name ?? '';

if (!email || !name) {
  toastStore.error('Email/Name required');
  return;
}

await wishlistStore.reserveItem(item.id, name, email);
toastStore.success('Item reserved successfully');
```

**Testing**:

- Feature manually tested with authenticated and anonymous users
- Store-level reservation logic covered by existing `wishlist-store.test.ts` (25 tests)
- UI integration tests added to verify: authenticated users trigger `reserveItem` directly, anonymous users see modal

---

## Security Considerations

### RLS Policies

**wishlists**:

- `SELECT`: Owner OR household members (if household visibility) OR public
- `INSERT/UPDATE/DELETE`: Owner only

**wishlist_items**:

- `SELECT`: Same as parent wishlist
- `INSERT/UPDATE/DELETE`: Owner only (except reservations)
- **Reservations**: Handled via RPC (no direct UPDATE allowed)

### Public Access

- Anonymous users can view public wishlists via slug
- Anonymous users can reserve/unreserve items (with email)
- RLS prevents viewing private/household wishlists without auth
- Share slugs are 8-character alphanumeric (2.8 trillion combinations)

### Email Privacy

- Emails are stored but **never displayed** in public view
- Only wishlist owner can see reservation emails (in future admin panel)
- Email validation prevents malformed inputs

---

## Testing

### Unit Tests

**wishlist.store.test.ts**:

```typescript
it('reserves an item successfully', async () => {
  const result = await store.reserveItem('item-id', 'Gift Giver', 'gift@example.com');
  expect(result?.is_reserved).toBe(true);
  expect(result?.reserved_by_email).toBe('gift@example.com');
});
```

### Manual Testing Checklist

- [ ] Create wishlist, set to public
- [ ] Copy public link, open in incognito
- [ ] Reserve item with name + email
- [ ] Verify "Reserved by [Name]" appears
- [ ] Try to reserve again (should fail - already reserved)
- [ ] Unreserve with correct email (should succeed)
- [ ] Unreserve with wrong email (should fail)
- [ ] As owner, unreserve without email (should succeed)

---

## Example Usage

### Creating a Public Wishlist

```typescript
const wishlist = await wishlistService.createWishlist({
  title: 'Birthday 2026',
  description: 'Things I want for my birthday',
  visibility: 'public',
  member_id: memberId,
  household_id: householdId,
});

// Auto-generated share_slug: 'abc12xyz'
const publicUrl = `${window.location.origin}/#/wishlist/${wishlist.share_slug}`;
```

### Reserving an Item (Code Example)

```typescript
// Public user reserves item
await wishlistService.reserveItem('item-123', 'John Doe', 'john@example.com');

// Later, unreserving
await wishlistService.reserveItem(
  'item-123',
  undefined, // Name not needed for unreserve
  'john@example.com', // Must match reserved_by_email
);
```

---

## Future Enhancements

### Potential Features

- 🔮 **Email Notifications**: Notify owner when items are reserved
- 🔮 **Price Tracking**: Alert when price drops on linked items
- 🔮 **Quantity Support**: Allow multiple quantities for items
- 🔮 **Gift Coordination**: Allow multiple people to split cost
- 🔮 **Purchased Status**: Mark when gift is actually purchased
- 🔮 **Admin Panel**: View all reservation emails (owner only)
- 🔮 **Export**: Export wishlist to PDF/CSV

### Migration Considerations

If implementing email notifications, we already have the email addresses stored:

```sql
SELECT
  wi.title,
  wi.reserved_by_name,
  wi.reserved_by_email,
  wi.reserved_at
FROM wishlist_items wi
WHERE wi.wishlist_id = 'wishlist-id'
  AND wi.is_reserved = true
  AND wi.reserved_by_email IS NOT NULL;
```

---

## Related Documentation

- [Domain Model - Wishlist Entities](../domain/overview.md)
- [Database Schema](../backend/database-schema.md)
- [Link Preview Feature](./link-preview-complete.md)
- [RBAC Permissions](../architecture/rbac-permissions.md)

---

## Troubleshooting

### "Email does not match the reservation"

**Cause**: User entered different email than used for reservation  
**Solution**: User must use exact email used when reserving

### "Item not found or wishlist is not public"

**Cause**: Wishlist visibility is private, OR you're trying to reserve a household wishlist without being a household member  
**Solution**: For household wishlists, log in as a household member. For private wishlists, only the owner can view.

### "You must be a member of this household to reserve items"

**Cause**: Trying to reserve from a household-visibility wishlist without being in the same household  
**Solution**: You must be an active member of the same household to reserve from household wishlists

### "Authentication required to reserve from household wishlists"

**Cause**: Trying to reserve a household item as anonymous user  
**Solution**: Log in with an account that is a member of the wishlist owner's household

### "Email is required to reserve or unreserve items"

**Cause**: User tried to unreserve without providing email (and is not owner)  
**Solution**: Enter the email used when reserving

---

**Version**: 1.1  
**Migration**: 030  
**Last Updated**: February 27, 2026
