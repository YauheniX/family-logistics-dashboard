import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type {
  Household,
  CreateHouseholdDto,
  UpdateHouseholdDto,
  Member,
  CreateMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Household repository - handles household data operations via Supabase
 */
export class HouseholdRepository extends BaseRepository<Household, CreateHouseholdDto, UpdateHouseholdDto> {
  constructor() {
    super(supabase, 'households');
  }

  /**
   * Find households the user belongs to (as owner or member)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Household[]>> {
    // Fetch households created by user
    const ownResponse = await this.findAll((builder) =>
      builder.eq('created_by', userId).order('created_at', { ascending: true }),
    );

    if (ownResponse.error) {
      return ownResponse;
    }

    // Fetch households user is a member of via household_members
    const membershipsResponse = await this.execute<{ household_id: string }[]>(async () => {
      return await supabase.from('members').select('household_id').eq('user_id', userId);
    });

    if (membershipsResponse.error) {
      return { data: ownResponse.data || [], error: null };
    }

    const memberHouseholdIds = (membershipsResponse.data ?? [])
      .map((m) => m.household_id)
      .filter((id) => !(ownResponse.data ?? []).some((household) => household.id === id));

    let memberHouseholds: Household[] = [];
    if (memberHouseholdIds.length) {
      const memberResponse = await this.findAll((builder) =>
        builder.in('id', memberHouseholdIds).order('created_at', { ascending: true }),
      );

      if (!memberResponse.error) {
        memberHouseholds = memberResponse.data ?? [];
      }
    }

    return {
      data: [...(ownResponse.data ?? []), ...memberHouseholds],
      error: null,
    };
  }
}

/**
 * Household member repository - handles household member data operations via Supabase
 */
export class MemberRepository extends BaseRepository<
  Member,
  CreateMemberDto,
  Partial<Member>
> {
  constructor() {
    super(supabase, 'members');
  }

  /**
   * Find members by household ID with email populated
   */
  async findByHouseholdId(householdId: string): Promise<ApiResponse<Member[]>> {
    const membersResponse = await this.findAll((builder) =>
      builder.eq('household_id', householdId).order('joined_at'),
    );

    if (membersResponse.error || !membersResponse.data) {
      return membersResponse;
    }

    // Populate emails using the database function
    const membersWithEmails = await Promise.all(
      membersResponse.data.map(async (member) => {
        const emailResponse = await this.execute<string>(async () => {
          return await supabase.rpc('get_email_by_user_id', {
            lookup_user_id: member.user_id,
          });
        });

        return {
          ...member,
          email: emailResponse.data || undefined,
        };
      }),
    );

    return { data: membersWithEmails, error: null };
  }

  /**
   * Invite a member by email
   */
  async inviteByEmail(
    householdId: string,
    email: string,
    currentUserId?: string,
  ): Promise<ApiResponse<Member>> {
    // Look up user ID by email
    const userIdResponse = await this.execute<string>(async () => {
      return await supabase.rpc('get_user_id_by_email', {
        lookup_email: email,
      });
    });

    if (userIdResponse.error) {
      const errorMessage = userIdResponse.error.message || 'Failed to look up user by email';
      const normalized = errorMessage.toLowerCase();

      if (normalized.includes('authentication required')) {
        return {
          data: null,
          error: {
            message: 'Authentication required. Please sign in again.',
            details: userIdResponse.error,
          },
        };
      }

      return {
        data: null,
        error: {
          message: errorMessage,
          details: userIdResponse.error,
        },
      };
    }

    if (!userIdResponse.data) {
      return {
        data: null,
        error: { message: 'User not found with that email' },
      };
    }

    const userId = userIdResponse.data;

    // Prevent adding yourself
    if (currentUserId && userId === currentUserId) {
      return {
        data: null,
        error: { message: 'Cannot add yourself as a member' },
      };
    }

    const memberDto: CreateMemberDto = {
      household_id: householdId,
      user_id: userId,
      role: 'member',
    };

    const memberResponse = await this.create(memberDto);

    if (memberResponse.error || !memberResponse.data) {
      return memberResponse;
    }

    return {
      data: {
        ...memberResponse.data,
        email,
      },
      error: null,
    };
  }
}
