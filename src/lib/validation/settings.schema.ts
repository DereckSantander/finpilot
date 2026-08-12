import { z } from 'zod';
import { zCurrency, zLocale, zThemeMode, zDayOfMonth, zCents } from '@/lib/validation/primitives';

/** Esquema de actualización de la configuración global (todos los campos opcionales). */

export const settingsUpdateSchema = z.object({
  currency: zCurrency.optional(),
  locale: zLocale.optional(),
  theme: zThemeMode.optional(),
  startOfMonth: zDayOfMonth.optional(),
  monthlySavingsTarget: zCents.optional(),
  // Los objetos anidados admiten parches parciales: `updateSettings` los fusiona
  // con el valor actual, así que quien solo quiere cambiar un campo no tiene que
  // releer y reenviar el resto (y arriesgarse a pisarlo con datos rancios).
  emergencyFund: z
    .object({
      targetMonths: z.array(z.number().int().positive()).min(1),
      linkedGoalId: z.string().min(1).optional(),
    })
    .partial()
    .optional(),
  autoBackup: z
    .object({
      enabled: z.boolean(),
      frequencyDays: z.number().int().positive(),
      keep: z.number().int().positive(),
    })
    .partial()
    .optional(),
  onboardingCompleted: z.boolean().optional(),
});

export type SettingsUpdateInput = z.input<typeof settingsUpdateSchema>;
