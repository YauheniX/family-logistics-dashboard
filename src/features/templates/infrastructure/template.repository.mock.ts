/**
 * Mock template repository for frontend-only mode
 */

import { MockRepository } from '../../shared/infrastructure/mock.repository';
import type {
  PackingTemplate,
  CreatePackingTemplateDto,
  UpdatePackingTemplateDto,
  PackingTemplateItem,
  CreatePackingTemplateItemDto,
} from '../../shared/domain/entities';
import type { ApiResponse } from '../../shared/domain/repository.interface';

export class MockPackingTemplateRepository extends MockRepository<
  PackingTemplate,
  CreatePackingTemplateDto,
  UpdatePackingTemplateDto
> {
  constructor() {
    super('packing_templates');
  }

  async findByUserId(userId: string): Promise<ApiResponse<PackingTemplate[]>> {
    try {
      const templates = await this.loadAll();
      const filtered = templates.filter((template) => template.created_by === userId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch templates',
        },
      };
    }
  }
}

export class MockPackingTemplateItemRepository extends MockRepository<
  PackingTemplateItem,
  CreatePackingTemplateItemDto,
  Partial<PackingTemplateItem>
> {
  constructor() {
    super('packing_template_items');
  }

  async findByTemplateId(templateId: string): Promise<ApiResponse<PackingTemplateItem[]>> {
    try {
      const items = await this.loadAll();
      const filtered = items.filter((item) => item.template_id === templateId);
      return { data: filtered, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch template items',
        },
      };
    }
  }

  async deleteByTemplateId(templateId: string): Promise<ApiResponse<void>> {
    try {
      const items = await this.loadAll();
      const filtered = items.filter((item) => item.template_id !== templateId);
      await this.saveAll(filtered);
      return { data: undefined as void, error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete template items',
        },
      };
    }
  }
}
