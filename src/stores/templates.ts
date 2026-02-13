import { defineStore } from 'pinia';
import {
  createTemplate,
  deleteTemplate,
  fetchTemplateItems,
  fetchTemplates,
} from '@/services/templateService';
import { upsertPackingItem, fetchPackingItems } from '@/services/tripService';
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
        this.templates = await fetchTemplates(userId);
      } catch (err: any) {
        this.error = err.message ?? 'Unable to load templates';
      } finally {
        this.loading = false;
      }
    },

    async createTemplate(payload: NewPackingTemplatePayload, items: string[]) {
      this.loading = true;
      this.error = null;
      try {
        const template = await createTemplate(payload, items);
        this.templates.push(template);
        return template;
      } catch (err: any) {
        this.error = err.message ?? 'Unable to create template';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async removeTemplate(id: string) {
      this.loading = true;
      this.error = null;
      try {
        await deleteTemplate(id);
        this.templates = this.templates.filter((t) => t.id !== id);
      } catch (err: any) {
        this.error = err.message ?? 'Unable to delete template';
        throw err;
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
        const [templateItems, existingItems] = await Promise.all([
          fetchTemplateItems(templateId),
          fetchPackingItems(tripId),
        ]);

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

        return {
          added: newItems.length,
          skipped: templateItems.length - newItems.length,
        };
      } catch (err: any) {
        this.error = err.message ?? 'Unable to apply template';
        throw err;
      } finally {
        this.applying = false;
      }
    },
  },
});
