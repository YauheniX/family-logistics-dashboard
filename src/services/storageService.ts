import { supabase } from './supabaseClient';
import type { ApiResponse } from '@/types/api';

const bucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string) || 'documents';

export async function uploadDocument(file: File, userId: string): Promise<ApiResponse<string>> {
  try {
    const filePath = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
      upsert: false,
    });

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          details: error,
        },
      };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      data: publicUrl,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Failed to upload document',
        details: err,
      },
    };
  }
}
