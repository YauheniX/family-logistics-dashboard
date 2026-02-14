import { tripRepository } from '../infrastructure/trip.repository';
import { 
  packingItemRepository, 
  budgetEntryRepository, 
  timelineEventRepository, 
  documentRepository 
} from '../infrastructure/trip-data.repository';
import type { Trip, CreateTripDto, UpdateTripDto } from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Trip service - contains business logic for trips
 */
export class TripService {
  /**
   * Get all trips for a user
   */
  async getUserTrips(userId: string): Promise<ApiResponse<Trip[]>> {
    return await tripRepository.findByUserId(userId);
  }

  /**
   * Get a single trip by ID
   */
  async getTrip(id: string): Promise<ApiResponse<Trip>> {
    return await tripRepository.findById(id);
  }

  /**
   * Create a new trip
   */
  async createTrip(dto: CreateTripDto): Promise<ApiResponse<Trip>> {
    return await tripRepository.create(dto);
  }

  /**
   * Update a trip
   */
  async updateTrip(id: string, dto: UpdateTripDto): Promise<ApiResponse<Trip>> {
    return await tripRepository.update(id, dto);
  }

  /**
   * Delete a trip
   */
  async deleteTrip(id: string): Promise<ApiResponse<void>> {
    return await tripRepository.delete(id);
  }

  /**
   * Duplicate a trip with all its related data
   */
  async duplicateTrip(trip: Trip): Promise<ApiResponse<Trip>> {
    // Create the duplicated trip
    const duplicatedTripResponse = await tripRepository.duplicate(trip);
    if (duplicatedTripResponse.error || !duplicatedTripResponse.data) {
      return duplicatedTripResponse;
    }

    const duplicatedTrip = duplicatedTripResponse.data;

    try {
      // Fetch all related data from the original trip
      const [packingResponse, budgetResponse, timelineResponse] = await Promise.all([
        packingItemRepository.findByTripId(trip.id),
        budgetEntryRepository.findByTripId(trip.id),
        timelineEventRepository.findByTripId(trip.id),
      ]);

      const packingItems = packingResponse.data ?? [];
      const budgetEntries = budgetResponse.data ?? [];
      const timelineEvents = timelineResponse.data ?? [];

      // Copy packing items
      if (packingItems.length) {
        const packingPayload = packingItems.map((item) => ({
          trip_id: duplicatedTrip.id,
          title: item.title,
          category: item.category,
          is_packed: item.is_packed,
        }));
        await packingItemRepository.createMany(packingPayload);
      }

      // Copy budget entries
      if (budgetEntries.length) {
        const budgetPayload = budgetEntries.map((entry) => ({
          trip_id: duplicatedTrip.id,
          category: entry.category,
          amount: entry.amount,
          currency: entry.currency,
          is_planned: entry.is_planned,
        }));
        await budgetEntryRepository.createMany(budgetPayload);
      }

      // Copy timeline events
      if (timelineEvents.length) {
        const timelinePayload = timelineEvents.map((event) => ({
          trip_id: duplicatedTrip.id,
          title: event.title,
          date_time: event.date_time,
          notes: event.notes,
        }));
        await timelineEventRepository.createMany(timelinePayload);
      }

      return { data: duplicatedTrip, error: null };
    } catch (error) {
      // Clean up the duplicated trip if copying failed
      await tripRepository.delete(duplicatedTrip.id);
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to duplicate trip data',
          details: error,
        },
      };
    }
  }
}

// Singleton instance
export const tripService = new TripService();
