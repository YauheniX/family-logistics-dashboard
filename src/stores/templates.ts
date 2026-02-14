import { defineStore } from 'pinia';
import {
  createTemplate,
  deleteTemplate,
  fetchTemplateItems,
  fetchTemplates,
} from '@/services/templateService';
import { upsertPackingItem, fetchPackingItems } from '@/services/tripService';
import { useToastStore } from '@/stores/toast';
import type {
  NewPackingTemplatePayload,
  PackingTemplate,
} from '@/types/entities';

interface TemplateState {
  templates: PackingTemplate[];
  loading: boolean;
  applying: boolean;
  error: string | null;
}

export const useTemplateStore = defineStore('templates', {
  state: (): TemplateState => ({
    templates: [],
    loading: false,
    applying: false,
    error: null,
  }),
  actions: {
    async loadTemplates(userId: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetchTemplates(userId);
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

    async createTemplate(payload: NewPackingTemplatePayload, items: string[]) {
      this.loading = true;
      this.error = null;
      try {
        const response = await createTemplate(payload, items);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to create template: ${response.error.message}`);
          throw new Error(response.error.message);
        }
        if (response.data) {
          this.templates.push(response.data);
          useToastStore().success('Template created successfully!');
          return response.data;
        }
        return null;
      } finally {
        this.loading = false;
      }
    },

    async removeTemplate(id: string) {
      this.loading = true;
      this.error = null;
      try {
        const response = await deleteTemplate(id);
        if (response.error) {
          this.error = response.error.message;
          useToastStore().error(`Failed to delete template: ${response.error.message}`);
          throw new Error(response.error.message);
        }
        this.templates = this.templates.filter((t) => t.id !== id);
        useToastStore().success('Template deleted successfully!');
      } finally {
        this.loading = false;
      }
    },

    async applyTemplate(
      templateId: string,
      tripId: string,
    ): Promise<{ added: number; skipped: number }> {
      this.applying = true;
      this.error = null;
      try {
        const [templateItemsResponse, existingItemsResponse] = await Promise.all([
          fetchTemplateItems(templateId),
          fetchPackingItems(tripId),
        ]);

        if (templateItemsResponse.error) {
          this.error = templateItemsResponse.error.message;
          useToastStore().error(`Failed to fetch template items: ${templateItemsResponse.error.message}`);
          throw new Error(templateItemsResponse.error.message);
        }

        if (existingItemsResponse.error) {
          this.error = existingItemsResponse.error.message;
          useToastStore().error(`Failed to fetch existing items: ${existingItemsResponse.error.message}`);
          throw new Error(existingItemsResponse.error.message);
        }

        const templateItems = templateItemsResponse.data ?? [];
        const existingItems = existingItemsResponse.data ?? [];

        const existingTitles = new Set(
          existingItems.map((item) => item.title.toLowerCase()),
        );

        const template = this.templates.find((t) => t.id === templateId);
        const category = template?.category ?? 'custom';

        const newItems = templateItems.filter(
          (item) => !existingTitles.has(item.title.toLowerCase()),
        );

        for (const item of newItems) {
          await upsertPackingItem({
            trip_id: tripId,
            title: item.title,
            category,
            is_packed: false,
          });
        }

        const result = {
          added: newItems.length,
          skipped: templateItems.length - newItems.length,
        };

        useToastStore().success(`Template applied: ${result.added} items added, ${result.skipped} skipped`);
        return result;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to apply template';
        throw err;
      } finally {
        this.applying = false;
      }
    },
  },
});
