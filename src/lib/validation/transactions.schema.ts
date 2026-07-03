import { z } from 'zod';
import {
  zTransactionType,
  zPositiveCents,
  zIsoDate,
  zTime,
  zNonEmptyString,
  zOptionalText,
  zTags,
} from '@/lib/validation/primitives';

/**
 * Esquemas de validación de movimientos (ingresos/gastos). El `yearMonth` no se
 * valida aquí: lo deriva el servicio a partir de `date`.
 */

export const transactionCreateSchema = z.object({
  type: zTransactionType,
  amount: zPositiveCents,
  date: zIsoDate,
  time: zTime.optional(),
  categoryId: zNonEmptyString,
  paymentMethodId: zNonEmptyString.optional(),
  creditCardId: zNonEmptyString.optional(),
  description: z.string().trim().default(''),
  notes: zOptionalText,
  tags: zTags,
  attachmentId: zNonEmptyString.optional(),
});

/**
 * Alta rápida de gasto (< 5 s): solo monto y categoría son obligatorios; el
 * servicio completa fecha/hora = ahora y método = último usado (features.md F03).
 */
export const quickExpenseSchema = z.object({
  amount: zPositiveCents,
  categoryId: zNonEmptyString,
  description: z.string().trim().default(''),
  paymentMethodId: zNonEmptyString.optional(),
});

/** Actualización parcial de un movimiento. */
export const transactionUpdateSchema = transactionCreateSchema.partial();

export type TransactionCreateInput = z.input<typeof transactionCreateSchema>;
export type TransactionCreateParsed = z.output<typeof transactionCreateSchema>;
export type QuickExpenseInput = z.input<typeof quickExpenseSchema>;
export type TransactionUpdateInput = z.input<typeof transactionUpdateSchema>;
