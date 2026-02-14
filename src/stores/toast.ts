import { defineStore } from 'pinia';
import type { Toast, ToastType } from '@/types/api';

interface ToastState {
  toasts: Toast[];
}

export const useToastStore = defineStore('toast', {
  state: (): ToastState => ({
    toasts: [],
  }),
  actions: {
    show(message: string, type: ToastType = 'info', duration = 5000) {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type, duration };
      
      this.toasts.push(toast);
      
      if (duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, duration);
      }
      
      return id;
    },
    
    success(message: string, duration = 3000) {
      return this.show(message, 'success', duration);
    },
    
    error(message: string, duration = 5000) {
      return this.show(message, 'error', duration);
    },
    
    warning(message: string, duration = 4000) {
      return this.show(message, 'warning', duration);
    },
    
    info(message: string, duration = 3000) {
      return this.show(message, 'info', duration);
    },
    
    remove(id: string) {
      this.toasts = this.toasts.filter(t => t.id !== id);
    },
    
    clear() {
      this.toasts = [];
    },
  },
});
