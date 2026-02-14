import { BaseRepository } from '../../shared/infrastructure/base.repository';
import { supabase } from '../../shared/infrastructure/supabase.client';
import type { 
  PackingTemplate, 
  CreatePackingTemplateDto, 
  UpdatePackingTemplateDto,
  PackingTemplateItem,
  CreatePackingTemplateItemDto
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

/**
 * Packing templates repository
 */
export class PackingTemplateRepository extends BaseRepository<
  PackingTemplate,
  CreatePackingTemplateDto,
  UpdatePackingTemplateDto
> {
  constructor() {
    super(supabase, 'packing_templates');
  }

  async findByUserId(userId: string): Promise<ApiResponse<PackingTemplate[]>> {
    return this.findAll((builder) =>
      builder.eq('created_by', userId).order('name')
    );
  }
}

/**
 * Packing template items repository
 */
export class PackingTemplateItemRepository extends BaseRepository<
  PackingTemplateItem,
  CreatePackingTemplateItemDto
> {
  constructor() {
    super(supabase, 'packing_template_items');
  }

  async findByTemplateId(templateId: string): Promise<ApiResponse<PackingTemplateItem[]>> {
    return this.findAll((builder) =>
      builder.eq('template_id', templateId).order('title')
    );
  }

  async deleteByTemplateId(templateId: string): Promise<ApiResponse<void>> {
    return this.execute(async () => {
      const { error } = await supabase
        .from('packing_template_items')
        .delete()
        .eq('template_id', templateId);
      return { data: null as any, error };
    });
  }
}

// Singleton instances
export const packingTemplateRepository = new PackingTemplateRepository();
export const packingTemplateItemRepository = new PackingTemplateItemRepository();
