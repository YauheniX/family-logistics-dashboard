import { defineStore } from 'pinia';
import { useToastStore } from '@/stores/toast';
import { packingTemplateRepository, packingTemplateItemRepository } from '@/features/templates';
import type {
  PackingTemplate,
  CreatePackingTemplateDto,
  PackingTemplateItem,
  CreatePackingTemplateItemDto,
} from '@/features/shared/domain/entities';

interface TemplatesState {
  templates: PackingTemplate[];
  currentTemplate: PackingTemplate | null;
  currentItems: PackingTemplateItem[];
  loading: boolean;
  error: string | null;
}

export const useTemplatesStore = defineStore('templates', {
  state: (): TemplatesState => ({
    templates: [],
    currentTemplate: null,
    currentItems: [],
    loading: false,
    error: null,
  }),

  actions: {
    async loadTemplates(userId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await packingTemplateRepository.findByUserId(userId);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to load templates: ${response.error.message}`);
        } else {
          this.templates = response.data ?? [];
        }
      } finally {
        this.loading = false;
      }
    },

    async loadTemplate(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const [templateResponse, itemsResponse] = await Promise.all([
          packingTemplateRepository.findById(id),
          packingTemplateItemRepository.findByTemplateId(id),
        ]);

        if (templateResponse.error) {
          this.error = templateResponse.error.message;
          useToastStore().error(`Failed to load template: ${templateResponse.error.message}`);
        } else {
          this.currentTemplate = templateResponse.data;
          this.currentItems = itemsResponse.data ?? [];
        }
      } finally {
        this.loading = false;
      }
    },

    async createTemplate(payload: CreatePackingTemplateDto) {
      this.loading = true;
      try {
        const response = await packingTemplateRepository.create(payload);
        if (response.error) {
          useToastStore().error(`Failed to create template: ${response.error.message}`);
          return null;
        }
        if (response.data) {
          this.templates.unshift(response.data);
          useToastStore().success('Template created successfully!');
        }
        return response.data;
      } finally {
        this.loading = false;
      }
    },

    async deleteTemplate(id: string) {
      this.loading = true;
      try {
        const response = await packingTemplateRepository.delete(id);
        if (response.error) {
          useToastStore().error(`Failed to delete template: ${response.error.message}`);
        } else {
          this.templates = this.templates.filter((t) => t.id !== id);
          useToastStore().success('Template deleted successfully!');
        }
      } finally {
        this.loading = false;
      }
    },

    async addTemplateItem(item: CreatePackingTemplateItemDto) {
      const response = await packingTemplateItemRepository.create(item);
      if (response.error) {
        useToastStore().error(`Failed to add item: ${response.error.message}`);
      } else if (response.data) {
        this.currentItems.push(response.data);
        useToastStore().success('Item added successfully!');
      }
    },

    async removeTemplateItem(id: string) {
      const response = await packingTemplateItemRepository.delete(id);
      if (response.error) {
        useToastStore().error(`Failed to remove item: ${response.error.message}`);
      } else {
        this.currentItems = this.currentItems.filter((i) => i.id !== id);
        useToastStore().success('Item removed successfully!');
      }
    },

    async getTemplateItems(templateId: string): Promise<PackingTemplateItem[]> {
      const response = await packingTemplateItemRepository.findByTemplateId(templateId);
      if (response.error) {
        useToastStore().error(`Failed to load template items: ${response.error.message}`);
        return [];
      }
      return response.data ?? [];
    },
  },
});
