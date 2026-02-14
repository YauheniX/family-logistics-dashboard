/**
 * Domain entities - Family Shopping & Wishlist Planner
 */

// ─── Enums ───────────────────────────────────────────────
export type FamilyMemberRole = 'owner' | 'member';
export type ShoppingListStatus = 'active' | 'archived';
export type ItemPriority = 'low' | 'medium' | 'high';

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

// ─── Shopping List ───────────────────────────────────────
export interface ShoppingList {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
  status: ShoppingListStatus;
}

export type CreateShoppingListDto = Pick<ShoppingList, 'family_id' | 'title' | 'description'>;
export type UpdateShoppingListDto = Partial<Pick<ShoppingList, 'title' | 'description' | 'status'>>;

// ─── Shopping Item ───────────────────────────────────────
export interface ShoppingItem {
  id: string;
  list_id: string;
  title: string;
  quantity: number;
  category: string;
  is_purchased: boolean;
  added_by: string;
  purchased_by: string | null;
  created_at: string;
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
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  share_slug: string;
  created_at: string;
}

export type CreateWishlistDto = Pick<Wishlist, 'title' | 'description' | 'is_public'>;
export type UpdateWishlistDto = Partial<Pick<Wishlist, 'title' | 'description' | 'is_public'>>;

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
export type ReserveWishlistItemDto = Pick<WishlistItem, 'is_reserved' | 'reserved_by_email'>;

// ─── Dashboard Stats ─────────────────────────────────────
export interface DashboardStats {
  activeLists: number;
  itemsToBuy: number;
  reservedWishlistItems: number;
}
