import { supabase } from '../../shared/infrastructure/supabase.client';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Storage service for file uploads to Supabase Storage
 */
export class StorageService {
  private readonly bucket = 'documents';

  /**
   * Upload a file to storage
   */
  async uploadFile(file: File, path: string): Promise<ApiResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucket)
        .getPublicUrl(data.path);

      return {
        data: urlData.publicUrl,
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Upload failed',
          details: error,
        },
      };
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.storage
        .from(this.bucket)
        .remove([path]);

      if (error) {
        return {
          data: null,
          error: { message: error.message, details: error },
        };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Delete failed',
          details: error,
        },
      };
    }
  }

  /**
   * Generate a unique file path
   */
  generateFilePath(tripId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${tripId}/${timestamp}_${sanitized}`;
  }
}

// Singleton instance
export const storageService = new StorageService();
