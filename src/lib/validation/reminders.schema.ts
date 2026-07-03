import { z } from 'zod';
import { zNonEmptyString, zIsoDate, zReminderRelatedType } from '@/lib/validation/primitives';

/** Esquema de recordatorios. */

export const reminderCreateSchema = z.object({
  title: zNonEmptyString.max(80),
  dueDate: zIsoDate,
  relatedType: zReminderRelatedType.default('custom'),
  relatedId: zNonEmptyString.optional(),
});

export const reminderUpdateSchema = reminderCreateSchema
  .partial()
  .extend({ isDone: z.boolean().optional() });

export type ReminderCreateInput = z.input<typeof reminderCreateSchema>;
export type ReminderUpdateInput = z.input<typeof reminderUpdateSchema>;
