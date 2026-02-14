import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type {
  Family,
  CreateFamilyDto,
  UpdateFamilyDto,
  FamilyMember,
  CreateFamilyMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Family repository - handles family data operations via Supabase
 */
export class FamilyRepository extends BaseRepository<Family, CreateFamilyDto, UpdateFamilyDto> {
  constructor() {
    super(supabase, 'families');
  }

  /**
   * Find families the user belongs to (as owner or member)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Family[]>> {
    // Fetch families created by user
    const ownResponse = await this.findAll((builder) =>
      builder.eq('created_by', userId).order('created_at', { ascending: true }),
    );

    if (ownResponse.error) {
      return ownResponse;
    }

    // Fetch families user is a member of via family_members
    const membershipsResponse = await this.execute<{ family_id: string }[]>(async () => {
      return await supabase.from('family_members').select('family_id').eq('user_id', userId);
    });

    if (membershipsResponse.error) {
      return { data: ownResponse.data || [], error: null };
    }

    const memberFamilyIds = (membershipsResponse.data ?? [])
      .map((m) => m.family_id)
      .filter((id) => !(ownResponse.data ?? []).some((f) => f.id === id));

    let memberFamilies: Family[] = [];
    if (memberFamilyIds.length) {
      const memberResponse = await this.findAll((builder) =>
        builder.in('id', memberFamilyIds).order('created_at', { ascending: true }),
      );

      if (!memberResponse.error) {
        memberFamilies = memberResponse.data ?? [];
      }
    }

    return {
      data: [...(ownResponse.data ?? []), ...memberFamilies],
      error: null,
    };
  }
}

/**
 * Family member repository - handles family member data operations via Supabase
 */
export class FamilyMemberRepository extends BaseRepository<
  FamilyMember,
  CreateFamilyMemberDto,
  Partial<FamilyMember>
> {
  constructor() {
    super(supabase, 'family_members');
  }

  /**
   * Find members by family ID with email populated
   */
  async findByFamilyId(familyId: string): Promise<ApiResponse<FamilyMember[]>> {
    const membersResponse = await this.findAll((builder) =>
      builder.eq('family_id', familyId).order('joined_at'),
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
    familyId: string,
    email: string,
    currentUserId?: string,
  ): Promise<ApiResponse<FamilyMember>> {
    // Look up user ID by email
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

    // Prevent adding yourself
    if (currentUserId && userId === currentUserId) {
      return {
        data: null,
        error: { message: 'Cannot add yourself as a member' },
      };
    }

    const memberDto: CreateFamilyMemberDto = {
      family_id: familyId,
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
