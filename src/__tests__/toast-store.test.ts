import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useToastStore } from '@/stores/toast';

describe('Toast Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast with default type', () => {
    const store = useToastStore();
    const id = store.show('Hello');

    expect(id).toBeDefined();
    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].message).toBe('Hello');
    expect(store.toasts[0].type).toBe('info');
  });

  it('shows a success toast', () => {
    const store = useToastStore();
    store.success('Done!');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('success');
  });

  it('shows an error toast', () => {
    const store = useToastStore();
    store.error('Failed!');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('error');
  });

  it('shows a warning toast', () => {
    const store = useToastStore();
    store.warning('Watch out!');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('warning');
  });

  it('shows an info toast', () => {
    const store = useToastStore();
    store.info('FYI');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('info');
  });

  it('removes a toast by id', () => {
    const store = useToastStore();
    const id = store.show('Test', 'info', 0);
    expect(store.toasts).toHaveLength(1);

    store.remove(id);
    expect(store.toasts).toHaveLength(0);
  });

  it('clears all toasts', () => {
    const store = useToastStore();
    store.show('One', 'info', 0);
    store.show('Two', 'info', 0);
    expect(store.toasts).toHaveLength(2);

    store.clear();
    expect(store.toasts).toHaveLength(0);
  });

  it('auto-removes toast after duration', () => {
    const store = useToastStore();
    store.show('Auto remove', 'info', 3000);

    expect(store.toasts).toHaveLength(1);

    vi.advanceTimersByTime(3000);

    expect(store.toasts).toHaveLength(0);
  });
});
