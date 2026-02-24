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

export class MockHouseholdRepository extends MockRepository<
  Household,
  CreateHouseholdDto,
  UpdateHouseholdDto
> {
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

export class MockMemberRepository extends MockRepository<Member, CreateMemberDto, Partial<Member>> {
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
   * Get members with their profile data (includes user_profiles join)
   */
  async getMembersWithProfiles(householdId: string): Promise<ApiResponse<Member[]>> {
    try {
      const members = await this.loadAll();
      const filtered = members.filter((m) => m.household_id === householdId && m.is_active);

      // In mock mode, we don't have real user_profiles, so just return members
      // with an empty user_profiles object
      const membersWithProfiles = filtered.map((m) => ({
        ...m,
        user_profiles: m.user_id ? { avatar_url: null } : undefined,
      }));

      return { data: membersWithProfiles, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch members with profiles',
        },
      };
    }
  }

  /**
   * Create a child member (mock version of create_child_member RPC)
   */
  async createChild(
    householdId: string,
    name: string,
    dateOfBirth: string | null,
    avatarUrl: string | null,
  ): Promise<ApiResponse<string>> {
    try {
      const newMember: CreateMemberDto = {
        household_id: householdId,
        user_id: null, // Children don't have user accounts
        role: 'child',
        display_name: name,
        date_of_birth: dateOfBirth,
        avatar_url: avatarUrl,
      };

      const result = await this.create(newMember);

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      return { data: result.data.id, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to create child member',
        },
      };
    }
  }

  /**
   * Send an invitation to join the household (mock version of invite_member RPC)
   */
  async sendInvitation(
    householdId: string,
    email: string,
    role: string,
  ): Promise<ApiResponse<string>> {
    try {
      // In mock mode, generate a mock invitation ID
      const invitationId = `invite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store invitation in mock storage
      const invitations = (await this.storage.get<any[]>('table:mock_invitations')) || [];
      invitations.push({
        id: invitationId,
        household_id: householdId,
        email,
        role,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      await this.storage.set('table:mock_invitations', invitations);

      return { data: invitationId, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to send invitation',
        },
      };
    }
  }

  /**
   * Soft delete a member by marking them as inactive
   */
  async softDelete(memberId: string): Promise<ApiResponse<void>> {
    try {
      // For mock mode, just call update without checking if member exists
      // This allows tests to mock the Supabase client behavior
      const updateResult = await this.update(memberId, { is_active: false });

      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }

      return { data: null, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete member',
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
