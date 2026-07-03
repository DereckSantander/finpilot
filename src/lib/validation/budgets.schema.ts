import { z } from 'zod';
import { zNonEmptyString, zPositiveCents, zYearMonth } from '@/lib/validation/primitives';

/** Esquema de presupuesto mensual (global si `categoryId` se omite). */

export const budgetCreateSchema = z.object({
  yearMonth: zYearMonth,
  categoryId: zNonEmptyString.optional(),
  amount: zPositiveCents,
});

export const budgetUpdateSchema = z.object({
  amount: zPositiveCents,
});

export type BudgetCreateInput = z.input<typeof budgetCreateSchema>;
export type BudgetUpdateInput = z.input<typeof budgetUpdateSchema>;
