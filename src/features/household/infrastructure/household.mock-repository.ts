/**
 * Mock household repositories for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  Household,
  CreateHouseholdDto,
  UpdateHouseholdDto,
  Member,
  CreateMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockHouseholdRepository extends MockRepository<Household, CreateHouseholdDto, UpdateHouseholdDto> {
  private memberRepository: MockMemberRepository;

  constructor(memberRepository?: MockMemberRepository) {
    super('mock_households');
    this.memberRepository = memberRepository || new MockMemberRepository();
  }

  /**
   * Find households the user belongs to (as owner or member)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Household[]>> {
    try {
      const households = await this.loadAll();
      const ownHouseholds = households.filter((f) => f.created_by === userId);

      // Also check household_members table
      const members = await this.storage.get<{ household_id: string; user_id: string }[]>(
        'table:mock_household_members',
      );
      const memberHouseholdIds =
        members
          ?.filter((m) => m.user_id === userId)
          .map((m) => m.household_id)
          .filter((id) => !ownHouseholds.some((household) => household.id === id)) ?? [];

      const memberHouseholds = households.filter((f) => memberHouseholdIds.includes(f.id));

      const allHouseholds = [...ownHouseholds, ...memberHouseholds].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      });

      return { data: allHouseholds, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch households',
        },
      };
    }
  }

  /**
   * Atomically create a household with an owner member (mock version)
   * Simulates the database RPC behavior for consistency
   */
  async createWithOwner(
    name: string,
    userId: string,
    displayName?: string,
  ): Promise<ApiResponse<Household>> {
    try {
      // Create household
      const householdDto: CreateHouseholdDto = { name };
      const householdResult = await this.create({
        ...householdDto,
        created_by: userId,
      } as CreateHouseholdDto & { created_by: string });

      if (householdResult.error || !householdResult.data) {
        return householdResult;
      }

      // Create owner member using injected repository
      const memberDto: CreateMemberDto = {
        household_id: householdResult.data.id,
        user_id: userId,
        role: 'owner',
        display_name: displayName || 'Owner',
        date_of_birth: null,
        avatar_url: null,
      };

      const memberResult = await this.memberRepository.create(memberDto);

      if (memberResult.error) {
        // Rollback: delete the household
        await this.delete(householdResult.data.id);
        return { data: null, error: memberResult.error };
      }

      return householdResult;
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create household',
        },
      };
    }
  }
}

export class MockMemberRepository extends MockRepository<
  Member,
  CreateMemberDto,
  Partial<Member>
> {
  constructor() {
    super('mock_household_members');
  }

  /**
   * Find members by household ID
   */
  async findByHouseholdId(householdId: string): Promise<ApiResponse<Member[]>> {
    try {
      const members = await this.loadAll();
      const filtered = members.filter((m) => m.household_id === householdId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch household members',
        },
      };
    }
  }

  /**
   * Invite a member by email (mock version)
   */
  async inviteByEmail(
    householdId: string,
    email: string,
    currentUserId?: string,
  ): Promise<ApiResponse<Member>> {
    try {
      // In mock mode, simulate user lookup by generating a mock user ID
      const mockUserId = `user-${email.replace(/[^a-z0-9]/gi, '-')}`;

      // Prevent adding yourself
      if (currentUserId && mockUserId === currentUserId) {
        return {
          data: null,
          error: { message: 'Cannot add yourself as a member' },
        };
      }

      const newMember: CreateMemberDto = {
        household_id: householdId,
        user_id: mockUserId,
        role: 'member',
        display_name: email.split('@')[0], // Use email prefix as display name
        date_of_birth: null,
        avatar_url: null,
      };

      const result = await this.create(newMember);

      if (result.data) {
        (result.data as Member & { email: string }).email = email;
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
