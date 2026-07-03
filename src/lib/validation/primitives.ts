import { z } from 'zod';

/**
 * Primitivas de validación reutilizables (Zod). Son la fuente de verdad de la
 * forma de los datos que entran al dominio (ADR-0003). Los servicios parsean con
 * estos esquemas antes de escribir en la base de datos.
 */

/** Importe monetario en centavos: entero ≥ 0. */
export const zCents = z
  .number({ invalid_type_error: 'El monto debe ser un número.' })
  .int('El monto debe estar en centavos (entero).')
  .nonnegative('El monto no puede ser negativo.');

/** Importe monetario que admite valores negativos (p. ej. retiros de una meta). */
export const zSignedCents = z
  .number({ invalid_type_error: 'El monto debe ser un número.' })
  .int('El monto debe estar en centavos (entero).');

/** Importe estrictamente positivo (ingresos, gastos: no tiene sentido 0). */
export const zPositiveCents = zCents.refine((v) => v > 0, {
  message: 'El monto debe ser mayor a cero.',
});

/** Texto obligatorio, recortado. */
export const zNonEmptyString = z.string().trim().min(1, 'Este campo es obligatorio.');

/** Texto opcional que se normaliza: vacío → undefined. */
export const zOptionalText = z
  .string()
  .trim()
  .transform((v) => (v.length === 0 ? undefined : v))
  .optional();

/** Fecha ISO "YYYY-MM-DD". */
export const zIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD).');

/** Hora "HH:mm". */
export const zTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm).');

/** Agrupador mensual "YYYY-MM". */
export const zYearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'Mes inválido (formato YYYY-MM).');

/** Color en HEX (#rgb / #rrggbb). */
export const zColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color inválido.');

/** Nombre de icono (lucide) — string no vacío. */
export const zIcon = zNonEmptyString;

/** Día del mes (1–31). */
export const zDayOfMonth = z
  .number()
  .int()
  .min(1, 'El día debe ser 1–31.')
  .max(31, 'El día debe ser 1–31.');

/** Código de moneda ISO 4217 (3 letras). */
export const zCurrency = z.string().regex(/^[A-Z]{3}$/, 'Código de moneda inválido.');

/** Enumeraciones del dominio. */
export const zTransactionType = z.enum(['income', 'expense']);
export const zPriority = z.enum(['low', 'medium', 'high']);
export const zPaymentMethodType = z.enum(['cash', 'debit', 'credit', 'transfer', 'other']);
export const zStatementStatus = z.enum(['open', 'paid', 'partial', 'overdue']);
export const zCompounding = z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'atMaturity']);
export const zReminderRelatedType = z.enum(['creditCard', 'goal', 'custom']);
export const zThemeMode = z.enum(['light', 'dark', 'system']);
export const zLocale = z.enum(['es', 'en']);

/** Lista de etiquetas: nombres únicos y no vacíos. */
export const zTags = z
  .array(z.string().trim().min(1))
  .transform((tags) => Array.from(new Set(tags)))
  .default([]);

/** Tasa anual como decimal (0–1, p. ej. 0.085 = 8.5%). */
export const zAnnualRate = z
  .number()
  .min(0, 'La tasa no puede ser negativa.')
  .max(1, 'La tasa debe expresarse como decimal (0–1).');

/** Plazo en meses (entero positivo). */
export const zTermMonths = z.number().int().positive('El plazo debe ser mayor a cero.');
