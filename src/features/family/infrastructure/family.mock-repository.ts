/**
 * Mock family repositories for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  Family,
  CreateFamilyDto,
  UpdateFamilyDto,
  FamilyMember,
  CreateFamilyMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockFamilyRepository extends MockRepository<Family, CreateFamilyDto, UpdateFamilyDto> {
  constructor() {
    super('mock_families');
  }

  /**
   * Find families the user belongs to (as owner or member)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Family[]>> {
    try {
      const families = await this.loadAll();
      const ownFamilies = families.filter((f) => f.created_by === userId);

      // Also check family_members table
      const members =
        await this.storage.get<{ family_id: string; user_id: string }[]>('table:mock_family_members');
      const memberFamilyIds =
        members
          ?.filter((m) => m.user_id === userId)
          .map((m) => m.family_id)
          .filter((id) => !ownFamilies.some((f) => f.id === id)) ?? [];

      const memberFamilies = families.filter((f) => memberFamilyIds.includes(f.id));

      const allFamilies = [...ownFamilies, ...memberFamilies].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      });

      return { data: allFamilies, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch families',
        },
      };
    }
  }
}

export class MockFamilyMemberRepository extends MockRepository<
  FamilyMember,
  CreateFamilyMemberDto,
  Partial<FamilyMember>
> {
  constructor() {
    super('mock_family_members');
  }

  /**
   * Find members by family ID
   */
  async findByFamilyId(familyId: string): Promise<ApiResponse<FamilyMember[]>> {
    try {
      const members = await this.loadAll();
      const filtered = members.filter((m) => m.family_id === familyId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch family members',
        },
      };
    }
  }

  /**
   * Invite a member by email (mock version)
   */
  async inviteByEmail(
    familyId: string,
    email: string,
  ): Promise<ApiResponse<FamilyMember>> {
    try {
      // In mock mode, simulate user lookup by generating a mock user ID
      const mockUserId = `user-${email.replace(/[^a-z0-9]/gi, '-')}`;

      const newMember: CreateFamilyMemberDto = {
        family_id: familyId,
        user_id: mockUserId,
        role: 'member',
      };

      const result = await this.create(newMember);

      if (result.data) {
        (result.data as FamilyMember & { email: string }).email = email;
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to invite member',
        },
      };
    }
  }
}
