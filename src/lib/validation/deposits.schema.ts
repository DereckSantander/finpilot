import { z } from 'zod';
import {
  zNonEmptyString,
  zPositiveCents,
  zAnnualRate,
  zTermMonths,
  zCompounding,
} from '@/lib/validation/primitives';

/** Esquema del simulador de depósitos a plazo (pólizas). */

export const depositCreateSchema = z.object({
  name: zNonEmptyString.max(60),
  principal: zPositiveCents,
  annualRate: zAnnualRate,
  termMonths: zTermMonths,
  compounding: zCompounding.default('monthly'),
});

export const depositUpdateSchema = depositCreateSchema.partial();

export type DepositCreateInput = z.input<typeof depositCreateSchema>;
export type DepositUpdateInput = z.input<typeof depositUpdateSchema>;
