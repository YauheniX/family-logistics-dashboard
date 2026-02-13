import { ref } from 'vue';

export function useAsyncState<T>() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<T | null>(null);

  const run = async (fn: () => Promise<T>) => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fn();
      return data.value;
    } catch (err: any) {
      error.value = err.message ?? 'Something went wrong';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, data, run };
}
