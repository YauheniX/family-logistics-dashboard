import { BaseRepository } from './base.repository';
import { supabase } from './supabase.client';
import type { UserProfile, CreateUserProfileDto, UpdateUserProfileDto } from '../domain/entities';
import type { ApiResponse } from '../domain/repository.interface';

/**
 * User profile repository - handles user profile data operations via Supabase
 */
export class UserProfileRepository extends BaseRepository<
  UserProfile,
  CreateUserProfileDto,
  UpdateUserProfileDto
> {
  constructor() {
    super(supabase, 'user_profiles');
  }

  /**
   * Get profile by user ID
   */
  async findById(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.query(async () => {
      return await supabase.from('user_profiles').select('*').eq('id', userId).maybeSingle();
    });
  }

  /**
   * Create a new user profile
   */
  async create(dto: CreateUserProfileDto): Promise<ApiResponse<UserProfile>> {
    return this.query(async () => {
      return await supabase.from('user_profiles').insert(dto).select().single();
    });
  }

  /**
   * Update user profile
   */
  async update(userId: string, dto: UpdateUserProfileDto): Promise<ApiResponse<UserProfile>> {
    return this.query(async () => {
      return await supabase.from('user_profiles').update(dto).eq('id', userId).select().single();
    });
  }

  /**
   * Save user profile (upsert - insert or update)
   * Checks if profile exists and inserts or updates accordingly
   */
  async saveProfile(userId: string, dto: UpdateUserProfileDto): Promise<ApiResponse<UserProfile>> {
    // First check if profile exists
    const existingProfile = await this.findById(userId);

    if (existingProfile.error && existingProfile.error.message !== 'No rows found') {
      return existingProfile;
    }

    if (existingProfile.data) {
      // Profile exists, update it
      return this.update(userId, dto);
    } else {
      // Profile doesn't exist, create it
      return this.create({
        id: userId,
        display_name: dto.display_name || '',
        avatar_url: dto.avatar_url || null,
      });
    }
  }
}
