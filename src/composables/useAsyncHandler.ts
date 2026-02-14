import { ref } from 'vue';
import { useToastStore } from '@/stores/toast';
import type { ApiResponse, ApiError } from '@/types/api';

export interface UseAsyncHandlerOptions {
  /**
   * Show success toast on completion
   */
  successMessage?: string;
  /**
   * Show error toast on failure (default: true)
   */
  showErrorToast?: boolean;
  /**
   * Custom error message prefix
   */
  errorPrefix?: string;
}

export interface UseAsyncHandlerReturn<T> {
  loading: Readonly<typeof loading>;
  error: Readonly<typeof error>;
  execute: (fn: () => Promise<ApiResponse<T>>) => Promise<T | null>;
  executeRaw: (fn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Composable for handling async operations with loading states and error handling
 *
 * @example
 * const { loading, error, execute } = useAsyncHandler({
 *   successMessage: 'Trip created successfully!',
 * });
 *
 * const result = await execute(() => tripService.createTrip(payload));
 */
export function useAsyncHandler<T = unknown>(
  options: UseAsyncHandlerOptions = {},
): UseAsyncHandlerReturn<T> {
  const { successMessage, showErrorToast = true, errorPrefix = 'Error' } = options;

  const loading = ref(false);
  const error = ref<ApiError | null>(null);
  const toastStore = useToastStore();

  /**
   * Execute an async operation that returns ApiResponse
   */
  const execute = async (fn: () => Promise<ApiResponse<T>>): Promise<T | null> => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fn();

      if (response.error) {
        error.value = response.error;
        if (showErrorToast) {
          toastStore.error(`${errorPrefix}: ${response.error.message}`);
        }
        return null;
      }

      if (successMessage) {
        toastStore.success(successMessage);
      }

      return response.data;
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        details: err,
      };
      error.value = apiError;

      if (showErrorToast) {
        toastStore.error(`${errorPrefix}: ${apiError.message}`);
      }

      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Execute an async operation that throws errors (legacy support)
   */
  const executeRaw = async (fn: () => Promise<T>): Promise<T | null> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await fn();

      if (successMessage) {
        toastStore.success(successMessage);
      }

      return result;
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        details: err,
      };
      error.value = apiError;

      if (showErrorToast) {
        toastStore.error(`${errorPrefix}: ${apiError.message}`);
      }

      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading: readonly(loading),
    error: readonly(error),
    execute,
    executeRaw,
  };
}

/**
 * Helper to make a value readonly
 */
function readonly<T>(value: { value: T }): { readonly value: T } {
  return value as { readonly value: T };
}
