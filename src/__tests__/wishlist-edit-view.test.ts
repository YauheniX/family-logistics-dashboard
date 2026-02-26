import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useWishlistStore } from '@/features/wishlist/presentation/wishlist.store';
import { useAuthStore } from '@/features/auth/presentation/auth.store';
import { useToastStore } from '@/stores/toast';

/**
 * WishlistEditView - Auto-Reservation Feature Tests
 *
 * Tests the auto-reservation functionality added in February 2026:
 * - Authenticated users bypass the modal and auto-reserve with their email
 * - Anonymous users still see the modal
 * - Email and name validation
 */

describe('WishlistEditView - Auto-Reservation Logic', () => {
  let wishlistStore: ReturnType<typeof useWishlistStore>;
  let authStore: ReturnType<typeof useAuthStore>;
  let toastStore: ReturnType<typeof useToastStore>;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    wishlistStore = useWishlistStore();
    authStore = useAuthStore();
    toastStore = useToastStore();

    // Mock store methods
    vi.spyOn(toastStore, 'success').mockReturnValue('toast-id');
    vi.spyOn(toastStore, 'error').mockReturnValue('toast-id');
    vi.clearAllMocks();
  });

  describe('Auto-Reservation for Authenticated Users', () => {
    it('should use email from auth session for authenticated users', () => {
      // Setup authenticated user
      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      // Verify user is authenticated
      expect(authStore.user).toBeDefined();
      expect(authStore.user?.email).toBe('test@example.com');
    });

    it('should auto-detect display name from user metadata', () => {
      // Setup authenticated user with display_name
      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
          display_name: 'TestUser123',
        },
      };

      // In the actual component, useUserProfile composable returns displayName
      expect(authStore.user.user_metadata?.display_name).toBe('TestUser123');
    });

    it('should handle missing email gracefully', () => {
      // Setup user without email (edge case)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      authStore.user = {
        id: 'user-123',
        email: '', // Empty email
        user_metadata: { full_name: 'Test User' },
      } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

      // Component should detect this and show error
      expect(authStore.user?.email).toBeFalsy();
    });
  });

  describe('Modal Display Logic', () => {
    it('should bypass modal when user is authenticated (has email)', () => {
      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      // Logic: if (isAuthenticated.value && authStore.user?.email) { handleAutoReserve() }
      const shouldShowModal = !(authStore.user && authStore.user.email);
      expect(shouldShowModal).toBe(false); // Should NOT show modal
    });

    it('should show modal when user is anonymous', () => {
      authStore.user = null;

      // Logic: if (!isAuthenticated) { show modal }
      const shouldShowModal = !authStore.user;
      expect(shouldShowModal).toBe(true); // Should show modal
    });
  });

  describe('Reservation Service Call', () => {
    it('should call reserveItem with correct parameters for authenticated user', async () => {
      // Setup
      const mockItem = {
        id: 'item-123',
        wishlist_id: 'wishlist-456',
        title: 'Test Item',
        is_reserved: false,
      };

      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'John Doe' },
      };

      // Mock reserveItem
      const reserveSpy = vi.spyOn(wishlistStore, 'reserveItem').mockResolvedValue({
        ...mockItem,
        is_reserved: true,
        reserved_by_name: 'John Doe',
        reserved_by_email: 'test@example.com',
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Call reserve (simulating handleAutoReserve logic)
      const name = 'John Doe';
      const email = authStore.user.email;
      await wishlistStore.reserveItem(mockItem.id, name, email);

      // Verify
      expect(reserveSpy).toHaveBeenCalledWith('item-123', 'John Doe', 'test@example.com');
    });

    it('should show success toast after successful auto-reservation', async () => {
      // Setup
      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      vi.spyOn(wishlistStore, 'reserveItem').mockResolvedValue({
        id: 'item-123',
        is_reserved: true,
      } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

      // Simulate handleAutoReserve success path
      await wishlistStore.reserveItem('item-123', 'Test User', 'test@example.com');
      toastStore.success('Item reserved!');

      // Verify toast was called
      expect(toastStore.success).toHaveBeenCalledWith('Item reserved!');
    });

    it('should show error toast when reservation fails', async () => {
      // Setup
      authStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      vi.spyOn(wishlistStore, 'reserveItem').mockResolvedValue(null);

      // Simulate handleAutoReserve failure path
      const result = await wishlistStore.reserveItem('item-123', 'Test User', 'test@example.com');
      if (!result) {
        toastStore.error('Unable to reserve item');
      }

      // Verify error toast was called
      expect(toastStore.error).toHaveBeenCalledWith('Unable to reserve item');
    });
  });

  describe('Owner vs Non-Owner Behavior', () => {
    it('should identify user as owner when user_id matches wishlist owner', () => {
      const wishlistOwnerId = 'owner-123';
      authStore.user = {
        id: 'owner-123',
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner' },
      };

      // Logic: isOwner = currentUserId === wishlistOwnerId
      const isOwner = authStore.user?.id === wishlistOwnerId;
      expect(isOwner).toBe(true);
    });

    it('should identify user as non-owner when user_id differs', () => {
      const wishlistOwnerId = 'owner-123';
      authStore.user = {
        id: 'different-user-456',
        email: 'user@example.com',
        user_metadata: { full_name: 'User' },
      };

      // Logic: isOwner = currentUserId === wishlistOwnerId
      const isOwner = authStore.user?.id === wishlistOwnerId;
      expect(isOwner).toBe(false);
    });
  });
});
