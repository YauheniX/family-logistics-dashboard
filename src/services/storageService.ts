import { supabase } from './supabaseClient';

const bucket = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string) || 'documents';

export async function uploadDocument(file: File, userId: string): Promise<string> {
  const filePath = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return publicUrl;
}
