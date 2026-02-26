import { describe, it, expect } from 'vitest';
import {
  getVisibilityVariant,
  getVisibilityLabel,
  type WishlistVisibility,
} from '@/composables/useVisibilityDisplay';

describe('useVisibilityDisplay', () => {
  describe('getVisibilityVariant', () => {
    it('should return success for public visibility', () => {
      expect(getVisibilityVariant('public')).toBe('success');
    });

    it('should return warning for household visibility', () => {
      expect(getVisibilityVariant('household')).toBe('warning');
    });

    it('should return neutral for private visibility', () => {
      expect(getVisibilityVariant('private')).toBe('neutral');
    });

    it('should return neutral for null visibility', () => {
      expect(getVisibilityVariant(null)).toBe('neutral');
    });

    it('should return neutral for undefined visibility', () => {
      expect(getVisibilityVariant(undefined)).toBe('neutral');
    });

    it('should return neutral for invalid visibility values', () => {
      expect(getVisibilityVariant('invalid')).toBe('neutral');
      expect(getVisibilityVariant('')).toBe('neutral');
    });
  });

  describe('getVisibilityLabel', () => {
    it('should return Public for public visibility', () => {
      expect(getVisibilityLabel('public')).toBe('Public');
    });

    it('should return Household for household visibility', () => {
      expect(getVisibilityLabel('household')).toBe('Household');
    });

    it('should return Private for private visibility', () => {
      expect(getVisibilityLabel('private')).toBe('Private');
    });

    it('should return Private for null visibility', () => {
      expect(getVisibilityLabel(null)).toBe('Private');
    });

    it('should return Private for undefined visibility', () => {
      expect(getVisibilityLabel(undefined)).toBe('Private');
    });

    it('should return Private for invalid visibility values', () => {
      expect(getVisibilityLabel('invalid')).toBe('Private');
      expect(getVisibilityLabel('')).toBe('Private');
    });
  });

  describe('type exports', () => {
    it('should export WishlistVisibility type', () => {
      // Type-level assertion using expectTypeOf
      type ActualType = WishlistVisibility;
      type ExpectedType = 'public' | 'household' | 'private';
      // This will fail at compile time if types don't match
      const _typeCheck: ActualType = 'public' as ExpectedType;
      expect(_typeCheck).toBe('public');
    });
  });
});
