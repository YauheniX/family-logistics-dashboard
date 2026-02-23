import { describe, it, expect } from 'vitest';
import {
  HouseholdFormSchema,
  ShoppingItemFormSchema,
  WishlistFormSchema,
  WishlistItemFormSchema,
  ReserveItemFormSchema,
} from '@/features/shared/domain/validation.schemas';

describe('Validation Schemas', () => {
  // ─── HouseholdFormSchema ─────────────────────────────────────

  describe('HouseholdFormSchema', () => {
    it('accepts valid household name', () => {
      const result = HouseholdFormSchema.safeParse({ name: 'Smith Household' });
      expect(result.success).toBe(true);
    });

    it('rejects empty household name', () => {
      const result = HouseholdFormSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects household name exceeding max length', () => {
      const result = HouseholdFormSchema.safeParse({ name: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('rejects missing name field', () => {
      const result = HouseholdFormSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ─── ShoppingItemFormSchema ───────────────────────────────

  describe('ShoppingItemFormSchema', () => {
    it('accepts valid shopping item', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: 'Milk',
        quantity: 2,
        category: 'Dairy',
      });
      expect(result.success).toBe(true);
    });

    it('uses defaults for quantity and category', () => {
      const result = ShoppingItemFormSchema.safeParse({ title: 'Bread' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(1);
        expect(result.data.category).toBe('General');
      }
    });

    it('rejects empty title', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: '',
        quantity: 1,
        category: 'General',
      });
      expect(result.success).toBe(false);
    });

    it('rejects quantity less than 1', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: 'Milk',
        quantity: 0,
        category: 'Dairy',
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer quantity', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: 'Milk',
        quantity: 1.5,
        category: 'Dairy',
      });
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: 'a'.repeat(201),
        quantity: 1,
        category: 'General',
      });
      expect(result.success).toBe(false);
    });

    it('rejects category exceeding max length', () => {
      const result = ShoppingItemFormSchema.safeParse({
        title: 'Milk',
        quantity: 1,
        category: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── WishlistFormSchema ───────────────────────────────────

  describe('WishlistFormSchema', () => {
    it('accepts valid wishlist', () => {
      const result = WishlistFormSchema.safeParse({
        title: 'Birthday Wishes',
        description: 'My birthday list',
        is_public: true,
      });
      expect(result.success).toBe(true);
    });

    it('uses default for is_public', () => {
      const result = WishlistFormSchema.safeParse({ title: 'Wishes' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_public).toBe(false);
      }
    });

    it('accepts null description', () => {
      const result = WishlistFormSchema.safeParse({
        title: 'Wishes',
        description: null,
        is_public: false,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = WishlistFormSchema.safeParse({ title: '', is_public: false });
      expect(result.success).toBe(false);
    });

    it('rejects title exceeding max length', () => {
      const result = WishlistFormSchema.safeParse({
        title: 'a'.repeat(201),
        is_public: false,
      });
      expect(result.success).toBe(false);
    });

    it('rejects description exceeding max length', () => {
      const result = WishlistFormSchema.safeParse({
        title: 'Wishes',
        description: 'a'.repeat(501),
        is_public: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── WishlistItemFormSchema ───────────────────────────────

  describe('WishlistItemFormSchema', () => {
    it('accepts valid wishlist item with all fields', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Headphones',
        description: 'Noise cancelling',
        link: 'https://example.com/headphones',
        price: 99.99,
        currency: 'USD',
        priority: 'high',
      });
      expect(result.success).toBe(true);
    });

    it('accepts minimal wishlist item with defaults', () => {
      const result = WishlistItemFormSchema.safeParse({ title: 'Book' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe('USD');
        expect(result.data.priority).toBe('medium');
      }
    });

    it('accepts null optional fields', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Book',
        description: null,
        link: null,
        price: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = WishlistItemFormSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Headphones',
        price: -10,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid link URL', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Headphones',
        link: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid currency length', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Headphones',
        currency: 'US',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid priority', () => {
      const result = WishlistItemFormSchema.safeParse({
        title: 'Headphones',
        priority: 'urgent',
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── ReserveItemFormSchema ────────────────────────────────

  describe('ReserveItemFormSchema', () => {
    it('accepts valid email', () => {
      const result = ReserveItemFormSchema.safeParse({
        reserved_by_email: 'gift@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts null email', () => {
      const result = ReserveItemFormSchema.safeParse({
        reserved_by_email: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty object (optional field)', () => {
      const result = ReserveItemFormSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = ReserveItemFormSchema.safeParse({
        reserved_by_email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });
});
