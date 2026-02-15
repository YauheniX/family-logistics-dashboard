/**
 * Domain entities - Family Shopping & Wishlist Planner
 * Updated for multi-tenant household architecture
 */

// ─── Enums ───────────────────────────────────────────────
export type FamilyMemberRole = 'owner' | 'member';
export type MemberRole = 'owner' | 'admin' | 'member' | 'child' | 'viewer';
export type ShoppingListStatus = 'active' | 'archived';
export type ItemPriority = 'low' | 'medium' | 'high';
export type WishlistVisibility = 'private' | 'household' | 'public';
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ─── User Profile ────────────────────────────────────────
export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export type CreateUserProfileDto = Omit<UserProfile, 'created_at'>;
export type UpdateUserProfileDto = Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>;

// ─── Family ──────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export type CreateFamilyDto = Pick<Family, 'name'>;
export type UpdateFamilyDto = Partial<Pick<Family, 'name'>>;

// ─── Family Member ───────────────────────────────────────
export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: FamilyMemberRole;
  joined_at: string;
  display_name?: string;
  email?: string;
}

export type CreateFamilyMemberDto = Pick<FamilyMember, 'family_id' | 'user_id' | 'role'>;

// ─── Household (New Multi-Tenant Entity) ────────────────
export interface Household {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  migrated_from_family_id?: string | null;
}

export type CreateHouseholdDto = Pick<Household, 'name'>;
export type UpdateHouseholdDto = Partial<Pick<Household, 'name' | 'settings'>>;

// ─── Member (New Flexible Member Entity) ────────────────
export interface Member {
  id: string;
  household_id: string;
  user_id: string | null; // Nullable for soft members (children without accounts)
  role: MemberRole;
  display_name: string;
  date_of_birth: string | null;
  avatar_url: string | null;
  is_active: boolean;
  joined_at: string;
  invited_by: string | null;
  metadata: Record<string, unknown>;
  migrated_from_family_member_id?: string | null;
  
  // Populated fields (not in DB)
  email?: string;
}

export type CreateMemberDto = Pick<
  Member,
  'household_id' | 'role' | 'display_name' | 'date_of_birth' | 'avatar_url'
> & {
  user_id?: string | null; // Optional for soft members
};

export type UpdateMemberDto = Partial<
  Pick<Member, 'role' | 'display_name' | 'date_of_birth' | 'avatar_url' | 'is_active' | 'metadata'>
>;

// ─── Invitation (New Invitation System) ─────────────────
export interface Invitation {
  id: string;
  household_id: string;
  email: string;
  role: Exclude<MemberRole, 'owner' | 'child'>; // Cannot invite as owner or child
  invited_by: string; // member_id who sent invitation
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  
  // Populated fields
  invited_by_name?: string;
  household_name?: string;
}

export type CreateInvitationDto = Pick<Invitation, 'household_id' | 'email' | 'role'>;
export type UpdateInvitationDto = Partial<Pick<Invitation, 'status' | 'accepted_at'>>;

// ─── Activity Log (New Audit Trail) ─────────────────────
export interface ActivityLog {
  id: string;
  household_id: string;
  member_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  
  // Populated fields
  member_name?: string;
  member_avatar?: string;
}

export type CreateActivityLogDto = Pick<
  ActivityLog,
  'household_id' | 'member_id' | 'action' | 'entity_type' | 'entity_id' | 'metadata'
>;

// ─── Shopping List ───────────────────────────────────────
export interface ShoppingList {
  id: string;
  family_id: string; // Legacy - kept for backward compatibility
  household_id?: string; // New multi-tenant field
  title: string;
  description: string | null;
  created_by: string; // Legacy - user_id
  created_by_member_id?: string; // New - references members
  created_at: string;
  updated_at?: string;
  status: ShoppingListStatus;
}

export type CreateShoppingListDto = Pick<ShoppingList, 'title' | 'description'> & {
  family_id?: string; // Legacy
  household_id?: string; // New
};
export type UpdateShoppingListDto = Partial<Pick<ShoppingList, 'title' | 'description' | 'status'>>;

// ─── Shopping Item ───────────────────────────────────────
export interface ShoppingItem {
  id: string;
  list_id: string;
  title: string;
  quantity: number;
  category: string;
  is_purchased: boolean;
  added_by: string; // Legacy - user_id
  added_by_member_id?: string; // New - references members
  purchased_by: string | null; // Legacy - user_id
  purchased_by_member_id?: string | null; // New - references members
  purchased_at?: string | null;
  created_at: string;
  
  // Populated fields
  added_by_name?: string;
  purchased_by_name?: string;
}

export type CreateShoppingItemDto = Pick<
  ShoppingItem,
  'list_id' | 'title' | 'quantity' | 'category'
>;
export type UpdateShoppingItemDto = Partial<
  Pick<ShoppingItem, 'title' | 'quantity' | 'category' | 'is_purchased' | 'purchased_by'>
>;

// ─── Wishlist ────────────────────────────────────────────
export interface Wishlist {
  id: string;
  user_id: string; // Legacy - kept for backward compatibility
  member_id?: string; // New - owner member
  household_id?: string; // New - household context
  title: string;
  description: string | null;
  is_public: boolean; // Legacy - kept for backward compatibility
  visibility?: WishlistVisibility; // New - private/household/public
  share_slug: string;
  created_at: string;
  updated_at?: string;
  
  // Populated fields
  member_name?: string;
  owner_name?: string;
}

export type CreateWishlistDto = Pick<Wishlist, 'title' | 'description'> & {
  is_public?: boolean; // Legacy
  visibility?: WishlistVisibility; // New
  member_id?: string; // New
  household_id?: string; // New
};
export type UpdateWishlistDto = Partial<
  Pick<Wishlist, 'title' | 'description' | 'is_public' | 'visibility'>
>;

// ─── Wishlist Item ───────────────────────────────────────
export interface WishlistItem {
  id: string;
  wishlist_id: string;
  title: string;
  description: string | null;
  link: string | null;
  price: number | null;
  currency: string;
  image_url: string | null;
  priority: ItemPriority;
  is_reserved: boolean;
  reserved_by_email: string | null;
  reserved_by_name: string | null; // New field
  reserved_at: string | null; // New field
  created_at: string;
}

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

// ─── Dashboard Stats ─────────────────────────────────────
export interface DashboardStats {
  activeLists: number;
  itemsToBuy: number;
  reservedWishlistItems: number;
}
