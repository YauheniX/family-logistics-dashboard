import { ref } from 'vue';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Composable for form validation using Zod schemas
 * 
 * @example
 * ```typescript
 * import { useFormValidation } from '@/features/shared/presentation/useFormValidation';
 * import { TripFormSchema } from '@/features/shared/domain/validation.schemas';
 * 
 * const { validate, errors, clearErrors } = useFormValidation(TripFormSchema);
 * 
 * const formData = ref({
 *   name: '',
 *   start_date: null,
 *   end_date: null,
 *   status: 'planning'
 * });
 * 
 * const handleSubmit = () => {
 *   const result = validate(formData.value);
 *   if (result.success) {
 *     // Form is valid, submit data
 *     await createTrip(result.data);
 *   }
 * };
 * ```
 */
export function useFormValidation<T>(schema: ZodSchema<T>) {
  const errors = ref<Record<string, string>>({});

  /**
   * Validate data against the schema
   */
  function validate(data: unknown): { success: boolean; data?: T } {
    try {
      const result = schema.parse(data);
      errors.value = {};
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof Error && 'issues' in error) {
        const zodError = error as ZodError;
        errors.value = zodError.issues.reduce((acc, issue) => {
          const path = issue.path.join('.');
          acc[path] = issue.message;
          return acc;
        }, {} as Record<string, string>);
      }
      return { success: false };
    }
  }

  /**
   * Validate a single field
   */
  function validateField(field: string, value: unknown): string | null {
    try {
      // For field validation, we need to validate the whole object
      // This is a simplified version - in practice you might want to use
      // schema.pick() or schema.shape[field] for better field validation
      const result = schema.safeParse({ [field]: value });
      if (!result.success) {
        const fieldError = result.error.issues.find(
          (issue) => issue.path.join('.') === field
        );
        return fieldError?.message || null;
      }
      delete errors.value[field];
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all validation errors
   */
  function clearErrors() {
    errors.value = {};
  }

  /**
   * Clear a specific field's error
   */
  function clearFieldError(field: string) {
    delete errors.value[field];
  }

  /**
   * Check if a field has an error
   */
  function hasError(field: string): boolean {
    return field in errors.value;
  }

  /**
   * Get error message for a field
   */
  function getError(field: string): string | undefined {
    return errors.value[field];
  }

  return {
    errors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    hasError,
    getError,
  };
}
