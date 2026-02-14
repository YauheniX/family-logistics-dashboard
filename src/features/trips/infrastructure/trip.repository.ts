import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type { Trip, CreateTripDto, UpdateTripDto } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Trip repository - handles all trip-related data operations
 */
export class TripRepository extends BaseRepository<Trip, CreateTripDto, UpdateTripDto> {
  constructor() {
    super(supabase, 'trips');
  }

  /**
   * Find trips by user ID (owned or shared)
   */
  async findByUserId(userId: string): Promise<ApiResponse<Trip[]>> {
    // Fetch trips owned by the user
    const ownTripsResponse = await this.findAll((builder) =>
      builder.eq('created_by', userId).order('start_date', { ascending: true }),
    );

    if (ownTripsResponse.error) {
      return ownTripsResponse;
    }

    // Fetch trips shared with the user via trip_members
    const membershipsResponse = await this.execute<{ trip_id: string }[]>(async () => {
      return await supabase.from('trip_members').select('trip_id').eq('user_id', userId);
    });

    if (membershipsResponse.error) {
      return { data: ownTripsResponse.data || [], error: null };
    }

    const sharedTripIds = (membershipsResponse.data ?? [])
      .map((m) => m.trip_id)
      .filter((id) => !(ownTripsResponse.data ?? []).some((t) => t.id === id));

    let sharedTrips: Trip[] = [];
    if (sharedTripIds.length) {
      const sharedResponse = await this.findAll((builder) =>
        builder.in('id', sharedTripIds).order('start_date', { ascending: true }),
      );

      if (!sharedResponse.error) {
        sharedTrips = sharedResponse.data ?? [];
      }
    }

    return {
      data: [...(ownTripsResponse.data ?? []), ...sharedTrips],
      error: null,
    };
  }

  /**
   * Duplicate a trip with all its related data
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

// Singleton instance
export const tripRepository = new TripRepository();
