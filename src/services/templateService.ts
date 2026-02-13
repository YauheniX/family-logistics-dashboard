import { supabase } from './supabaseClient';
import type {
  NewPackingTemplatePayload,
  PackingTemplate,
  PackingTemplateItem,
} from '@/types/entities';

export async function fetchTemplates(userId: string): Promise<PackingTemplate[]> {
  const { data, error } = await supabase
    .from('packing_templates')
    .select('*')
    .eq('created_by', userId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function fetchTemplateItems(templateId: string): Promise<PackingTemplateItem[]> {
  const { data, error } = await supabase
    .from('packing_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('title');

  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(
  payload: NewPackingTemplatePayload,
  items: string[],
): Promise<PackingTemplate> {
  const { data: template, error: templateError } = await supabase
    .from('packing_templates')
    .insert(payload)
    .select()
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Failed to create template');

  if (items.length) {
    const itemPayload = items.map((title) => ({
      template_id: template.id,
      title,
    }));
    const { error: itemsError } = await supabase
      .from('packing_template_items')
      .insert(itemPayload);

    if (itemsError) {
      await supabase.from('packing_templates').delete().eq('id', template.id);
      throw itemsError;
    }
  }

  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('packing_templates').delete().eq('id', id);
  if (error) throw error;
}
