import { householdRepository, memberRepository } from '../infrastructure/household.factory';
import type {
  Household,
  CreateHouseholdDto,
  UpdateHouseholdDto,
  Member,
  CreateMemberDto,
} from '../../shared/domain/entities';
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
   */
  async createHousehold(name: string, userId: string): Promise<ApiResponse<Household>> {
    const dto: CreateHouseholdDto = { name };

    const householdResponse = await householdRepository.create({
      ...dto,
      created_by: userId,
    } as CreateHouseholdDto & { created_by: string });

    if (householdResponse.error || !householdResponse.data) {
      return householdResponse;
    }

    // Auto-add creator as owner
    const memberDto: CreateMemberDto = {
      household_id: householdResponse.data.id,
      user_id: userId,
      role: 'owner',
    };

    const memberResponse = await memberRepository.create(memberDto);
    if (memberResponse.error) {
      // Rollback: delete the household if adding owner membership fails
      await householdRepository.delete(householdResponse.data.id);
      return { data: null, error: memberResponse.error };
    }

    return householdResponse;
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
   * Remove a member
   */
  async removeMember(memberId: string): Promise<ApiResponse<void>> {
    return await memberRepository.delete(memberId);
  }
}

// Singleton instance
export const householdService = new HouseholdService();
