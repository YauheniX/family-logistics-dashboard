import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────
export const FamilyMemberRoleSchema = z.enum(['owner', 'member']);
export const ShoppingListStatusSchema = z.enum(['active', 'archived']);
export const ItemPrioritySchema = z.enum(['low', 'medium', 'high']);

// ─── Auth Schemas ────────────────────────────────────────
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof LoginFormSchema>;

export const RegisterFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type RegisterFormData = z.infer<typeof RegisterFormSchema>;

// ─── User Profile Schema ────────────────────────────────
export const UserProfileFormSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100, 'Display name is too long'),
  avatar_url: z.string().url('Invalid URL').nullable().optional(),
});
export type UserProfileFormData = z.infer<typeof UserProfileFormSchema>;

// ─── Family Schemas ──────────────────────────────────────
export const FamilyFormSchema = z.object({
  name: z.string().min(1, 'Family name is required').max(200, 'Family name is too long'),
});
export type FamilyFormData = z.infer<typeof FamilyFormSchema>;

export const FamilyInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type FamilyInviteData = z.infer<typeof FamilyInviteSchema>;

// ─── Shopping List Schemas ───────────────────────────────
export const ShoppingListFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
});
export type ShoppingListFormData = z.infer<typeof ShoppingListFormSchema>;

export const ShoppingItemFormSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(200, 'Title is too long'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(100, 'Category is too long')
    .default('General'),
});
export type ShoppingItemFormData = z.infer<typeof ShoppingItemFormSchema>;

// ─── Wishlist Schemas ────────────────────────────────────
export const WishlistFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
  is_public: z.boolean().default(false),
});
export type WishlistFormData = z.infer<typeof WishlistFormSchema>;

export const WishlistItemFormSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
  link: z.string().url('Invalid URL').nullable().optional(),
  price: z.number().min(0, 'Price must be positive').nullable().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)').default('USD'),
  image_url: z.string().url('Invalid URL').nullable().optional(),
  priority: ItemPrioritySchema.default('medium'),
});
export type WishlistItemFormData = z.infer<typeof WishlistItemFormSchema>;

export const ReserveItemFormSchema = z.object({
  reserved_by_email: z.string().email('Invalid email address').nullable().optional(),
});
export type ReserveItemFormData = z.infer<typeof ReserveItemFormSchema>;
