import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type {
  TripMember,
  CreateTripMemberDto,
  UpdateTripMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Trip members repository
 */
export class TripMemberRepository extends BaseRepository<
  TripMember,
  CreateTripMemberDto,
  UpdateTripMemberDto
> {
  constructor() {
    super(supabase, 'trip_members');
  }

  /**
   * Find members by trip ID with email populated
   */
  async findByTripId(tripId: string): Promise<ApiResponse<TripMember[]>> {
    const membersResponse = await this.findAll((builder) =>
      builder.eq('trip_id', tripId).order('created_at'),
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
    tripId: string,
    email: string,
    role: 'owner' | 'editor' | 'viewer',
    currentUserId?: string,
  ): Promise<ApiResponse<TripMember>> {
    // First, look up the user ID by email
    const userIdResponse = await this.execute<string>(async () => {
      return await supabase.rpc('get_user_id_by_email', {
        lookup_email: email,
      });
    });

    if (userIdResponse.error) {
      return {
        data: null,
        error: {
          message: 'User not found with that email',
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

    // Prevent adding the trip owner as a member
    if (currentUserId && userId === currentUserId) {
      return {
        data: null,
        error: { message: 'Cannot add yourself as a member' },
      };
    }

    // Create the trip member
    const memberDto: CreateTripMemberDto = {
      trip_id: tripId,
      user_id: userId,
      role,
    };

    const memberResponse = await this.create(memberDto);

    if (memberResponse.error || !memberResponse.data) {
      return memberResponse;
    }

    // Return with email populated
    return {
      data: {
        ...memberResponse.data,
        email,
      },
      error: null,
    };
  }
}

// Singleton instance
export const tripMemberRepository = new TripMemberRepository();
