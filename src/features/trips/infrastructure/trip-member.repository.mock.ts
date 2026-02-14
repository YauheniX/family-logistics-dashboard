/**
 * Mock trip member repository for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  TripMember,
  CreateTripMemberDto,
  UpdateTripMemberDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockTripMemberRepository extends MockRepository<
  TripMember,
  CreateTripMemberDto,
  UpdateTripMemberDto
> {
  constructor() {
    super('trip_members');
  }

  async findByTripId(tripId: string): Promise<ApiResponse<TripMember[]>> {
    try {
      const members = await this.loadAll();
      const filtered = members.filter((member) => member.trip_id === tripId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch trip members',
        },
      };
    }
  }

  async inviteByEmail(
    tripId: string,
    email: string,
    role: 'editor' | 'viewer',
  ): Promise<ApiResponse<TripMember>> {
    try {
      // In mock mode, we simulate user lookup by generating a mock user ID
      const mockUserId = `user-${email.replace(/[^a-z0-9]/gi, '-')}`;

      const newMember: CreateTripMemberDto = {
        trip_id: tripId,
        user_id: mockUserId,
        role,
      };

      const result = await this.create(newMember);

      // Add email to the returned member
      if (result.data) {
        (result.data as TripMember & { email: string }).email = email;
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
