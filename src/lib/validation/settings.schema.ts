import { z } from 'zod';
import { zCurrency, zLocale, zThemeMode, zDayOfMonth, zCents } from '@/lib/validation/primitives';

/** Esquema de actualización de la configuración global (todos los campos opcionales). */

export const settingsUpdateSchema = z.object({
  currency: zCurrency.optional(),
  locale: zLocale.optional(),
  theme: zThemeMode.optional(),
  startOfMonth: zDayOfMonth.optional(),
  monthlySavingsTarget: zCents.optional(),
  emergencyFund: z
    .object({
      targetMonths: z.array(z.number().int().positive()).min(1),
      linkedGoalId: z.string().min(1).optional(),
    })
    .optional(),
  autoBackup: z
    .object({
      enabled: z.boolean(),
      frequencyDays: z.number().int().positive(),
      keep: z.number().int().positive(),
    })
    .optional(),
  onboardingCompleted: z.boolean().optional(),
});

export type SettingsUpdateInput = z.input<typeof settingsUpdateSchema>;
