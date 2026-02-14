import { SupabaseService } from './supabaseService';
import type {
  NewPackingTemplatePayload,
  PackingTemplate,
  PackingTemplateItem,
} from '@/types/entities';
import type { ApiResponse } from '@/types/api';

export async function fetchTemplates(userId: string): Promise<ApiResponse<PackingTemplate[]>> {
  return SupabaseService.select<PackingTemplate>('packing_templates', (builder) =>
    builder.eq('created_by', userId).order('name'),
  );
}

export async function fetchTemplateItems(
  templateId: string,
): Promise<ApiResponse<PackingTemplateItem[]>> {
  return SupabaseService.select<PackingTemplateItem>('packing_template_items', (builder) =>
    builder.eq('template_id', templateId).order('title'),
  );
}

export async function createTemplate(
  payload: NewPackingTemplatePayload,
  items: string[],
): Promise<ApiResponse<PackingTemplate>> {
  const templateResponse = await SupabaseService.insert<PackingTemplate>(
    'packing_templates',
    payload,
  );

  if (templateResponse.error || !templateResponse.data) {
    return templateResponse;
  }

  const template = templateResponse.data;

  if (items.length) {
    const itemPayload = items.map((title) => ({
      template_id: template.id,
      title,
    }));

    const itemsResponse = await SupabaseService.insertMany<PackingTemplateItem>(
      'packing_template_items',
      itemPayload,
    );

    if (itemsResponse.error) {
      // Clean up template if items insertion failed
      await SupabaseService.delete('packing_templates', template.id);
      return {
        data: null,
        error: itemsResponse.error,
      };
    }
  }

  return { data: template, error: null };
}

export async function deleteTemplate(id: string): Promise<ApiResponse<null>> {
  return SupabaseService.delete('packing_templates', id);
}
