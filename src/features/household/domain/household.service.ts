import { householdRepository, memberRepository } from '../infrastructure/household.factory';
import type { Household, UpdateHouseholdDto, Member } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Household service - contains business logic for households
 */
export class HouseholdService {
  /**
   * Get all households for a user
   */
  async getUserHouseholds(userId: string): Promise<ApiResponse<Household[]>> {
    return await householdRepository.findByUserId(userId);
  }

  /**
   * Get a single household by ID
   */
  async getHousehold(id: string): Promise<ApiResponse<Household>> {
    return await householdRepository.findById(id);
  }

  /**
   * Create a new household and auto-add the user as owner
   * Uses atomic database transaction to prevent orphaned household records
   */
  async createHousehold(name: string, userId: string): Promise<ApiResponse<Household>> {
    // Use atomic RPC to create household and owner member in a single transaction
    return await householdRepository.createWithOwner(name, userId);
  }

  /**
   * Update a household
   */
  async updateHousehold(id: string, data: UpdateHouseholdDto): Promise<ApiResponse<Household>> {
    return await householdRepository.update(id, data);
  }

  /**
   * Delete a household
   */
  async deleteHousehold(id: string): Promise<ApiResponse<void>> {
    return await householdRepository.delete(id);
  }

  /**
   * Get members of a household
   */
  async getMembers(householdId: string): Promise<ApiResponse<Member[]>> {
    return await memberRepository.findByHouseholdId(householdId);
  }

  /**
   * Invite a member by email
   */
  async inviteMemberByEmail(
    householdId: string,
    email: string,
    currentUserId?: string,
  ): Promise<ApiResponse<Member>> {
    return await memberRepository.inviteByEmail(householdId, email, currentUserId);
  }

  /**
   * Remove a member (soft delete)
   */
  async removeMember(memberId: string): Promise<ApiResponse<void>> {
    return await memberRepository.softDelete(memberId);
  }
}

// Singleton instance
export const householdService = new HouseholdService();
