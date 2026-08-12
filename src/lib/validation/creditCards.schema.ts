import { z } from 'zod';
import {
  zNonEmptyString,
  zCents,
  zPositiveCents,
  zDayOfMonth,
  zColor,
  zIsoDate,
  zYearMonth,
  zStatementStatus,
} from '@/lib/validation/primitives';

/** Esquemas de tarjetas de crédito, cortes (statements) y pagos. */

export const creditCardCreateSchema = z.object({
  name: zNonEmptyString.max(40),
  bank: zNonEmptyString.max(40),
  creditLimit: zPositiveCents,
  cutoffDay: zDayOfMonth,
  paymentDueDay: zDayOfMonth,
  color: zColor,
});

export const creditCardUpdateSchema = creditCardCreateSchema
  .partial()
  .extend({ isArchived: z.boolean().optional() });

export const statementCreateSchema = z.object({
  creditCardId: zNonEmptyString,
  yearMonth: zYearMonth,
  cutoffDate: zIsoDate,
  dueDate: zIsoDate,
  statementBalance: zCents,
  minimumPayment: zCents,
  status: zStatementStatus.optional(),
});

/**
 * `creditCardId` se omite a propósito: un corte pertenece a la tarjeta con la
 * que se creó y moverlo dejaría sus pagos huérfanos. Antes venía arrastrado por
 * el `.partial()` y `updateStatement` lo aceptaba sin aplicarlo nunca.
 */
export const statementUpdateSchema = statementCreateSchema
  .omit({ creditCardId: true })
  .partial()
  .extend({ paidAmount: zCents.optional() });

export const cardPaymentCreateSchema = z.object({
  creditCardId: zNonEmptyString,
  statementId: zNonEmptyString.optional(),
  amount: zPositiveCents,
  date: zIsoDate,
});

export type CreditCardCreateInput = z.input<typeof creditCardCreateSchema>;
export type CreditCardUpdateInput = z.input<typeof creditCardUpdateSchema>;
export type StatementCreateInput = z.input<typeof statementCreateSchema>;
export type StatementUpdateInput = z.input<typeof statementUpdateSchema>;
export type CardPaymentCreateInput = z.input<typeof cardPaymentCreateSchema>;
