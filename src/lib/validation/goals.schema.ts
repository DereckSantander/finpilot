import { z } from 'zod';
import {
  zNonEmptyString,
  zPositiveCents,
  zSignedCents,
  zPriority,
  zColor,
  zIcon,
  zIsoDate,
  zOptionalText,
} from '@/lib/validation/primitives';

/** Esquemas de metas y sus aportes. */

export const goalCreateSchema = z.object({
  name: zNonEmptyString.max(60),
  targetAmount: zPositiveCents,
  targetDate: zIsoDate.optional(),
  priority: zPriority.default('medium'),
  color: zColor,
  icon: zIcon,
  isEmergencyFund: z.boolean().default(false),
});

export const goalUpdateSchema = goalCreateSchema
  .partial()
  .extend({ isArchived: z.boolean().optional() });

export const contributionCreateSchema = z.object({
  goalId: zNonEmptyString,
  // Admite negativos (retiros); no puede ser cero.
  amount: zSignedCents.refine((v) => v !== 0, { message: 'El aporte no puede ser cero.' }),
  date: zIsoDate,
  note: zOptionalText,
});

export const contributionUpdateSchema = contributionCreateSchema.partial().omit({ goalId: true });

export type GoalCreateInput = z.input<typeof goalCreateSchema>;
export type GoalUpdateInput = z.input<typeof goalUpdateSchema>;
export type ContributionCreateInput = z.input<typeof contributionCreateSchema>;
export type ContributionUpdateInput = z.input<typeof contributionUpdateSchema>;
