# 🏗️ Domain Model

Complete domain model documentation for the Family Logistics Dashboard.

**Last Updated**: February 21, 2026

---

## Overview

The domain model represents the core business entities and their relationships. This application follows **Domain-Driven Design (DDD)** principles with a clear separation between:

- **Domain Entities** - Pure business objects
- **DTOs** - Data Transfer Objects for API boundaries
- **Database Types** - Raw database representations

---

## Core Entities

### Entity Hierarchy

```
User (Supabase Auth)
  │
  ├─── UserProfile (extended profile)
  │
  └─── Family Membership
         │
         ├─── Family (multi-user group)
         │      │
         │      ├─── FamilyMember (with role)
         │      │
         │      └─── ShoppingList (family shared)
         │             │
         │             └─── ShoppingItem
         │
         └─── Wishlist (personal)
                │
                └─── WishlistItem (with reservation)
```

---

## 1. UserProfile

Extended user profile linked to Supabase Auth.

**File**: `src/features/shared/domain/entities.ts`

```typescript
export interface UserProfile {
  id: string; // UUID (matches auth.users.id)
  display_name: string; // Display name
  avatar_url: string | null; // Profile picture URL
  created_at: string; // ISO timestamp
}
```

**Relationships**:

- 1:1 with `auth.users`
- 1:N with `families` (via family_members)
- 1:N with `wishlists`

**Business Rules**:

- Must have display name
- Avatar is optional
- Auto-created on user signup

**DTOs**:

```typescript
export type CreateUserProfileDto = Omit<UserProfile, 'created_at'>;
export type UpdateUserProfileDto = Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>;
```

---

## 2. Family (Current) / Household (Future)

Multi-user groups for collaboration.

### Current: Family

```typescript
export interface Family {
  id: string; // UUID
  name: string; // Family name
  created_by: string; // Creator user_id
  created_at: string; // ISO timestamp
}
```

**Relationships**:

- N:1 with `auth.users` (creator)
- 1:N with `family_members`
- 1:N with `shopping_lists`

**Business Rules**:

- Creator automatically becomes owner
- Name required (1-100 chars)
- Cannot be deleted if has shopping lists with items

### Future: Household

```typescript
export interface Household {
  id: string; // UUID
  name: string; // Household name
  slug: string; // URL-friendly unique identifier
  created_by: string; // Creator user_id
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  is_active: boolean; // Soft delete flag
  settings: Record<string, unknown>; // Household settings (JSONB)
  migrated_from_family_id?: string | null; // Migration tracking
}
```

**New Features**:

- Unique slug for URLs
- Soft delete via `is_active`
- Settings for customization
- Migration tracking

**DTOs**:

```typescript
export type CreateHouseholdDto = Pick<Household, 'name'>;
export type UpdateHouseholdDto = Partial<Pick<Household, 'name' | 'settings'>>;
```

---

## 3. FamilyMember (Current) / Member (Future)

Membership in a family/household with roles.

### Current: FamilyMember

```typescript
export interface FamilyMember {
  id: string; // UUID
  family_id: string; // FK to families
  user_id: string; // FK to auth.users (required)
  role: 'owner' | 'member'; // Role
  joined_at: string; // ISO timestamp
}
```

**Roles**:

- `owner` - Full control, cannot be removed
- `member` - Can create/edit content

**Limitations**:

- ❌ No support for members without accounts (children)
- ❌ Limited role granularity

### Future: Member

```typescript
export interface Member {
  id: string; // UUID
  household_id: string; // FK to households
  user_id: string | null; // FK to auth.users (nullable!)
  role: MemberRole; // Enhanced roles
  display_name: string; // Member display name
  date_of_birth: string | null; // Date of birth (ISO date)
  avatar_url: string | null; // Member avatar
  is_active: boolean; // Soft delete
  joined_at: string; // ISO timestamp
  invited_by: string | null; // FK to member who invited
  metadata: Record<string, unknown>; // Custom data (JSONB)
  migrated_from_family_member_id?: string | null;

  // Populated fields (not in DB)
  email?: string; // User email (if has account)
}
```

**MemberRole**:

```typescript
export type MemberRole = 'owner' | 'admin' | 'member' | 'child' | 'viewer';
```

**Role Hierarchy**:

| Role   | Description       | Account Required | Can Invite | Can Edit |
| ------ | ----------------- | ---------------- | ---------- | -------- |
| owner  | Created household | Yes              | Yes        | Yes      |
| admin  | Co-manager        | Yes              | Yes        | Yes      |
| member | Regular member    | Yes              | No         | Yes      |
| child  | Limited access    | No               | No         | Partial  |
| viewer | Read-only         | No               | No         | No       |

**New Features**:

- Nullable `user_id` - Supports "soft members" (children without accounts)
- More granular roles
- Birth date tracking
- Invitation tracking
- Custom metadata

**DTOs**:

```typescript
export type CreateMemberDto = Pick<
  Member,
  'household_id' | 'role' | 'display_name' | 'date_of_birth' | 'avatar_url'
> & {
  user_id?: string | null;
};

export type UpdateMemberDto = Partial<
  Pick<Member, 'role' | 'display_name' | 'date_of_birth' | 'avatar_url' | 'is_active' | 'metadata'>
>;
```

---

## 4. ShoppingList

Shared shopping lists within a family.

```typescript
export interface ShoppingList {
  id: string; // UUID
  household_id: string; // FK to households (was family_id)
  title: string; // List title
  description: string | null; // Optional description
  created_by: string; // Legacy: user_id
  created_by_member_id?: string; // New: member_id
  created_at: string; // ISO timestamp
  updated_at?: string; // ISO timestamp
  status: ShoppingListStatus; // active | archived
}

export type ShoppingListStatus = 'active' | 'archived';
```

**Relationships**:

- N:1 with `households`
- 1:N with `shopping_items`
- N:1 with `auth.users` (creator, legacy)
- N:1 with `members` (creator, new)

**Business Rules**:

- Title required (1-200 chars)
- All household members can view
- Only creator or admin can delete
- Archived lists are read-only

**DTOs**:

```typescript
export type CreateShoppingListDto = Pick<ShoppingList, 'title' | 'description' | 'household_id'>;
export type UpdateShoppingListDto = Partial<Pick<ShoppingList, 'title' | 'description' | 'status'>>;
```

**Status Transitions**:

```
active ──────> archived
  ^                │
  └────────────────┘ (can unarchive)
```

---

## 5. ShoppingItem

Items in a shopping list.

```typescript
export interface ShoppingItem {
  id: string; // UUID
  list_id: string; // FK to shopping_lists
  title: string; // Item title
  quantity: number; // Quantity to buy
  category: string; // Category (free text)
  is_purchased: boolean; // Purchase status
  added_by: string; // Legacy: user_id
  added_by_member_id?: string; // New: member_id
  purchased_by: string | null; // Legacy: user_id
  purchased_by_member_id?: string | null; // New: member_id
  purchased_at?: string | null; // ISO timestamp
  created_at: string; // ISO timestamp

  // Populated fields (not in DB)
  added_by_name?: string;
  purchased_by_name?: string;
}
```

**Relationships**:

- N:1 with `shopping_lists`
- N:1 with `auth.users` (creator, purchaser - legacy)
- N:1 with `members` (creator, purchaser - new)

**Business Rules**:

- Title required (1-200 chars)
- Quantity >= 1
- Category defaults to "General"
- Purchased by tracked when marked purchased

**DTOs**:

```typescript
export type CreateShoppingItemDto = Pick<
  ShoppingItem,
  'list_id' | 'title' | 'quantity' | 'category'
>;

export type UpdateShoppingItemDto = Partial<
  Pick<ShoppingItem, 'title' | 'quantity' | 'category' | 'is_purchased' | 'purchased_by'>
>;
```

**Common Categories**:

- General, Groceries, Household, Electronics, Clothing, Toys, Health, Pet Supplies

---

## 6. Wishlist

Personal wishlists that can be publicly shared.

```typescript
export interface Wishlist {
  id: string; // UUID
  user_id: string; // Legacy: FK to auth.users
  member_id?: string; // New: FK to members
  household_id?: string; // New: FK to households (context)
  title: string; // Wishlist title
  description: string | null; // Optional description
  is_public: boolean; // Legacy: public/private flag
  visibility?: WishlistVisibility; // New: visibility level
  share_slug: string; // Unique share slug
  created_at: string; // ISO timestamp
  updated_at?: string; // ISO timestamp

  // Populated fields (not in DB)
  member_name?: string;
  owner_name?: string;
}

export type WishlistVisibility = 'private' | 'household' | 'public';
```

**Relationships**:

- N:1 with `auth.users` (owner, legacy)
- N:1 with `members` (owner, new)
- N:1 with `households` (context, new)
- 1:N with `wishlist_items`

**Business Rules**:

- Title required (1-200 chars)
- Share slug is unique across all wishlists
- Public wishlists accessible via `/w/:share_slug`
- Private wishlists only visible to owner

**Visibility Levels** (future):

- `private` - Only owner can see
- `household` - All household members can see
- `public` - Anyone with link can see

**DTOs**:

```typescript
export type CreateWishlistDto = Pick<Wishlist, 'title' | 'description'> & {
  is_public?: boolean;
  visibility?: WishlistVisibility;
  member_id?: string;
  household_id?: string;
};

export type UpdateWishlistDto = Partial<
  Pick<Wishlist, 'title' | 'description' | 'is_public' | 'visibility'>
>;
```

**Share Slug Generation**:

- Random alphanumeric (8-12 chars)
- Collision-resistant
- URL-safe characters only

---

## 7. WishlistItem

Items in a wishlist with reservation support.

```typescript
export interface WishlistItem {
  id: string; // UUID
  wishlist_id: string; // FK to wishlists
  title: string; // Item title
  description: string | null; // Optional description
  link: string | null; // Product URL
  price: number | null; // Price (nullable)
  currency: string; // Currency code (ISO 4217)
  image_url: string | null; // Image URL
  priority: ItemPriority; // low | medium | high
  is_reserved: boolean; // Reservation status
  reserved_by_email: string | null; // Reserver email
  reserved_by_name: string | null; // Reserver name
  reserved_at: string | null; // ISO timestamp
  created_at: string; // ISO timestamp
}

export type ItemPriority = 'low' | 'medium' | 'high';
```

**Relationships**:

- N:1 with `wishlists`

**Business Rules**:

- Title required (1-200 chars)
- Price is optional (for tracking)
- Currency defaults to USD
- Anonymous users can reserve items (email only)
- One email can reserve multiple items
- Reservations can be cancelled

**DTOs**:

```typescript
export type CreateWishlistItemDto = Pick<
  WishlistItem,
  'wishlist_id' | 'title' | 'description' | 'link' | 'price' | 'currency' | 'image_url' | 'priority'
>;

export type UpdateWishlistItemDto = Partial<
  Pick<
    WishlistItem,
    'title' | 'description' | 'link' | 'price' | 'currency' | 'image_url' | 'priority'
  >
>;

export type ReserveWishlistItemDto = Pick<
  WishlistItem,
  'is_reserved' | 'reserved_by_email' | 'reserved_by_name'
>;
```

**Priority Semantics**:

- `low` - Nice to have, not urgent
- `medium` - Would like to have
- `high` - Really want, high priority

---

## Future Entities (Planned)

### Invitation

**In-app invitation system** (no email server required).

Invitations are displayed on the dashboard when users log in with the invited email address. Users can accept or decline directly in the app.

```typescript
export interface Invitation {
  id: string;
  household_id: string;
  email: string;
  role: Exclude<MemberRole, 'owner' | 'child'>;
  invited_by: string; // member_id
  status: InvitationStatus;
  token: string; // Unique token
  expires_at: string; // ISO timestamp
  created_at: string;
  accepted_at: string | null;

  // Populated
  invited_by_name?: string;
  household_name?: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
```

**Purpose**: Formal invitation flow for adding members.

### ActivityLog

Audit trail for household actions.

```typescript
export interface ActivityLog {
  id: string;
  household_id: string;
  member_id: string | null;
  action: string; // e.g., "created_shopping_list"
  entity_type: string; // e.g., "shopping_list"
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;

  // Populated
  member_name?: string;
  member_avatar?: string;
}
```

**Purpose**: Track who did what and when (audit trail).

---

## Domain Services

### Business Logic Location

Domain logic lives in **Service classes** (`*.service.ts`):

```typescript
// src/features/shopping/domain/shopping.service.ts
export class ShoppingService {
  async markItemPurchased(itemId: string, purchasedBy: string): Promise<ApiResponse<ShoppingItem>> {
    // Business logic here
  }
}
```

**Services**:

- `AuthService` - Authentication & user management
- `HouseholdService` - Household management
- `ShoppingService` - Shopping list operations
- `WishlistService` - Wishlist operations

See [Service Pattern](../development/service-pattern.md) for details.

---

## Validation

Domain validation uses **Zod schemas** for runtime type checking:

```typescript
// Example: Shopping list validation
export const ShoppingListSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  description: z.string().max(1000).optional(),
  household_id: z.string().uuid(),
});

export const ShoppingItemSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  quantity: z.number().int().min(1),
  category: z.string().min(1).max(50),
});
```

**Usage**:

```typescript
const result = ShoppingListSchema.safeParse(formData);
if (!result.success) {
  // Handle validation errors
  console.error(result.error.errors);
}
```

---

## Type Safety Flow

```
Database (PostgreSQL)
    ↓
database.types.ts (generated)
    ↓
entities.ts (domain model)
    ↓
Services (business logic)
    ↓
Stores (state management)
    ↓
Components (UI)
```

**Key Principles**:

1. Database types are auto-generated (source of truth)
2. Domain entities are clean interfaces (no DB coupling)
3. DTOs define API boundaries
4. Zod validates at runtime
5. TypeScript validates at compile time

---

## Best Practices

### 1. Use DTOs for API Boundaries

❌ **Don't**:

```typescript
const newList = await api.createShoppingList(shoppingList);
```

✅ **Do**:

```typescript
const dto: CreateShoppingListDto = {
  title: 'Groceries',
  description: 'Weekly shopping',
  household_id: householdId,
};
const newList = await api.createShoppingList(dto);
```

### 2. Validate User Input

❌ **Don't**:

```typescript
const item = { title: userInput, quantity: 1 };
```

✅ **Do**:

```typescript
const result = ShoppingItemSchema.safeParse({ title: userInput, quantity: 1 });
if (result.success) {
  const item = result.data;
}
```

### 3. Use Proper Types

❌ **Don't**:

```typescript
function updateList(data: any) { ... }
```

✅ **Do**:

```typescript
function updateList(data: UpdateShoppingListDto): Promise<ApiResponse<ShoppingList>> { ... }
```

### 4. Populate Related Data

When fetching entities with relationships:

```typescript
const items = await shoppingItemRepository.findByListId(listId);
// Populate member names
for (const item of items.data) {
  item.added_by_name = await getMemberName(item.added_by_member_id);
}
```

---

## Related Documentation

- [Database Schema](../backend/database-schema.md) - Database structure
- [Repository Pattern](../development/repository-pattern.md) - Data access
- [Service Pattern](../development/service-pattern.md) - Business logic
- [Type Safety](../development/type-safety.md) - Type safety strategy

---

**Last Updated**: February 21, 2026
