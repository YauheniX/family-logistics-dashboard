import { supabase } from './supabase.client';
import type { DashboardAggregate } from '../domain/entities';
import type { ApiResponse } from '../domain/repository.interface';
import { toApiError } from './base.repository';

/**
 * Repository for the get_dashboard_summary RPC.
 *
 * Replaces three separate Supabase queries with a single server-side
 * aggregate call, reducing dashboard round-trips from 3 → 1.
 */
export class DashboardRepository {
  /**
   * Fetch all dashboard data for a household in one RPC call.
   *
   * @param householdId - The UUID of the household to load data for.
   * @param userId      - The UUID of the currently authenticated user.
   *                      Must equal auth.uid() (enforced server-side).
   * @returns Shopping lists, the user's personal wishlists (non-child),
   *          and other members' shared wishlists — all in a single response.
   */
  async getDashboardSummary(
    householdId: string,
    userId: string,
  ): Promise<ApiResponse<DashboardAggregate>> {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_summary', {
        p_household_id: householdId,
        p_user_id: userId,
      });

      if (error) {
        return { data: null, error: toApiError(error) };
      }

      if (!data) {
        return { data: null, error: { message: 'No data returned from dashboard summary' } };
      }

      const raw = data as unknown as {
        shopping_lists: DashboardAggregate['shoppingLists'];
        my_wishlists: DashboardAggregate['myWishlists'];
        household_wishlists: DashboardAggregate['householdWishlists'];
      };

      return {
        data: {
          shoppingLists: Array.isArray(raw.shopping_lists) ? raw.shopping_lists : [],
          myWishlists: Array.isArray(raw.my_wishlists) ? raw.my_wishlists : [],
          householdWishlists: Array.isArray(raw.household_wishlists) ? raw.household_wishlists : [],
        },
        error: null,
      };
    } catch (err) {
      return { data: null, error: toApiError(err) };
    }
  }
}

/** Singleton instance used by the dashboard view. */
export const dashboardRepository = new DashboardRepository();
