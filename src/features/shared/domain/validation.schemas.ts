import { z } from 'zod';

/**
 * Trip status enum
 */
export const TripStatusSchema = z.enum(['planning', 'booked', 'ready', 'done']);

/**
 * Packing category enum
 */
export const PackingCategorySchema = z.enum(['adult', 'kid', 'baby', 'roadtrip', 'custom']);

/**
 * Trip member role enum
 */
export const TripMemberRoleSchema = z.enum(['owner', 'editor', 'viewer']);

/**
 * Trip creation/update schema
 */
export const TripFormSchema = z
  .object({
    name: z.string().min(1, 'Trip name is required').max(200, 'Trip name is too long'),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    status: TripStatusSchema.default('planning'),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['end_date'],
    },
  );

export type TripFormData = z.infer<typeof TripFormSchema>;

/**
 * Packing item schema
 */
export const PackingItemFormSchema = z.object({
  title: z.string().min(1, 'Item title is required').max(200, 'Title is too long'),
  category: PackingCategorySchema.default('custom'),
  is_packed: z.boolean().default(false),
});

export type PackingItemFormData = z.infer<typeof PackingItemFormSchema>;

/**
 * Budget entry schema
 */
export const BudgetEntryFormSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)').default('USD'),
  is_planned: z.boolean().default(false),
});

export type BudgetEntryFormData = z.infer<typeof BudgetEntryFormSchema>;

/**
 * Timeline event schema
 */
export const TimelineEventFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  date_time: z.string().min(1, 'Date and time are required'),
  notes: z.string().max(1000, 'Notes are too long').nullable().optional(),
});

export type TimelineEventFormData = z.infer<typeof TimelineEventFormSchema>;

/**
 * Document schema
 */
export const DocumentFormSchema = z.object({
  title: z.string().min(1, 'Document title is required').max(200, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').nullable().optional(),
  file_url: z.string().url('Invalid file URL'),
});

export type DocumentFormData = z.infer<typeof DocumentFormSchema>;

/**
 * Packing template schema
 */
export const PackingTemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200, 'Name is too long'),
  category: PackingCategorySchema.default('custom'),
});

export type PackingTemplateFormData = z.infer<typeof PackingTemplateFormSchema>;

/**
 * Trip member invitation schema
 */
export const TripMemberInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: TripMemberRoleSchema.default('viewer'),
});

export type TripMemberInviteData = z.infer<typeof TripMemberInviteSchema>;

/**
 * Login schema
 */
export const LoginFormSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof LoginFormSchema>;

/**
 * Register schema
 */
export const RegisterFormSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof RegisterFormSchema>;
