/**
 * Mock trip repository for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type { Trip, CreateTripDto, UpdateTripDto } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockTripRepository extends MockRepository<Trip, CreateTripDto, UpdateTripDto> {
  constructor() {
    super('trips');
  }

  /**
   * Find trips by user ID (owned or shared)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    try {
      const trips = await this.loadAll();
      // Filter trips created by user
      const ownTrips = trips.filter((trip) => trip.created_by === userId);

      // In mock mode, we also check trip_members table
      const members =
        await this.storage.get<{ trip_id: string; user_id: string }[]>('table:trip_members');
      const sharedTripIds =
        members
          ?.filter((m) => m.user_id === userId)
          .map((m) => m.trip_id)
          .filter((id) => !ownTrips.some((t) => t.id === id)) ?? [];

      const sharedTrips = trips.filter((trip) => sharedTripIds.includes(trip.id));

      const allTrips = [...ownTrips, ...sharedTrips].sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
        return dateA - dateB;
      });

      return { data: allTrips, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch trips',
        },
      };
    }
  }

  /**
   * Duplicate a trip
   */
  async duplicate(trip: Trip): Promise<ApiResponse<Trip>> {
    const clone: CreateTripDto = {
      name: `Copy of ${trip.name}`,
      start_date: trip.start_date,
      end_date: trip.end_date,
      status: 'planning',
      created_by: trip.created_by,
    };

    return await this.create(clone);
  }
}
