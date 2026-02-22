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
   * Save user profile (atomic upsert)
   * Uses database upsert to avoid race conditions
   */
  async saveProfile(userId: string, dto: UpdateUserProfileDto): Promise<ApiResponse<UserProfile>> {
    // Use atomic upsert to avoid TOCTOU race conditions
    return this.upsert({
      id: userId,
      display_name: dto.display_name || '',
      avatar_url: dto.avatar_url || null,
    } as Partial<UserProfile>);
  }
}
