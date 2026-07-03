import { z } from 'zod';
import {
  zTransactionType,
  zPaymentMethodType,
  zNonEmptyString,
  zColor,
  zIcon,
} from '@/lib/validation/primitives';

/** Esquemas de catálogos: categorías, métodos de pago y etiquetas. */

export const categoryCreateSchema = z.object({
  name: zNonEmptyString.max(40, 'Máximo 40 caracteres.'),
  type: zTransactionType,
  color: zColor,
  icon: zIcon,
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .extend({ isArchived: z.boolean().optional(), sortOrder: z.number().int().optional() });

export const paymentMethodCreateSchema = z.object({
  name: zNonEmptyString.max(40, 'Máximo 40 caracteres.'),
  type: zPaymentMethodType,
  creditCardId: zNonEmptyString.optional(),
});

export const paymentMethodUpdateSchema = paymentMethodCreateSchema
  .partial()
  .extend({ isArchived: z.boolean().optional() });

export const tagCreateSchema = z.object({
  name: zNonEmptyString.max(30, 'Máximo 30 caracteres.'),
});

export type CategoryCreateInput = z.input<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.input<typeof categoryUpdateSchema>;
export type PaymentMethodCreateInput = z.input<typeof paymentMethodCreateSchema>;
export type PaymentMethodUpdateInput = z.input<typeof paymentMethodUpdateSchema>;
export type TagCreateInput = z.input<typeof tagCreateSchema>;
