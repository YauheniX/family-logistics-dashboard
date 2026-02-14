import { familyRepository, familyMemberRepository } from '../infrastructure/family.factory';
import type {
  Family,
  CreateFamilyDto,
  UpdateFamilyDto,
  FamilyMember,
  CreateFamilyMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Family service - contains business logic for families
 */
export class FamilyService {
  /**
   * Get all families for a user
   */
  async getUserFamilies(userId: string): Promise<ApiResponse<Family[]>> {
    return await familyRepository.findByUserId(userId);
  }

  /**
   * Get a single family by ID
   */
  async getFamily(id: string): Promise<ApiResponse<Family>> {
    return await familyRepository.findById(id);
  }

  /**
   * Create a new family and auto-add the user as owner
   */
  async createFamily(name: string, userId: string): Promise<ApiResponse<Family>> {
    const dto: CreateFamilyDto = { name };

    const familyResponse = await familyRepository.create({
      ...dto,
      created_by: userId,
    } as CreateFamilyDto & { created_by: string });

    if (familyResponse.error || !familyResponse.data) {
      return familyResponse;
    }

    // Auto-add creator as owner
    const memberDto: CreateFamilyMemberDto = {
      family_id: familyResponse.data.id,
      user_id: userId,
      role: 'owner',
    };

    const memberResponse = await familyMemberRepository.create(memberDto);
    if (memberResponse.error) {
      // Rollback: delete the family if adding owner membership fails
      await familyRepository.delete(familyResponse.data.id);
      return { data: null, error: memberResponse.error };
    }

    return familyResponse;
  }

  /**
   * Update a family
   */
  async updateFamily(id: string, data: UpdateFamilyDto): Promise<ApiResponse<Family>> {
    return await familyRepository.update(id, data);
  }

  /**
   * Delete a family
   */
  async deleteFamily(id: string): Promise<ApiResponse<void>> {
    return await familyRepository.delete(id);
  }

  /**
   * Get members of a family
   */
  async getFamilyMembers(familyId: string): Promise<ApiResponse<FamilyMember[]>> {
    return await familyMemberRepository.findByFamilyId(familyId);
  }

  /**
   * Invite a member by email
   */
  async inviteMemberByEmail(
    familyId: string,
    email: string,
    currentUserId?: string,
  ): Promise<ApiResponse<FamilyMember>> {
    return await familyMemberRepository.inviteByEmail(familyId, email, currentUserId);
  }

  /**
   * Remove a member
   */
  async removeMember(memberId: string): Promise<ApiResponse<void>> {
    return await familyMemberRepository.delete(memberId);
  }
}

// Singleton instance
export const familyService = new FamilyService();
