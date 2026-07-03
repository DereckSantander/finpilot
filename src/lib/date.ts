import { format, parseISO, startOfMonth, endOfMonth, differenceInCalendarDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import type { IsoDate, IsoDateTime, YearMonth, Locale } from '@/types/common';

/**
 * Helpers de fecha sobre date-fns. El dominio guarda fechas como strings ISO
 * (branded); estas funciones convierten en el borde. Ver database.md §1.
 */

const locales = { es, en: enUS } as const;

/** Marca de tiempo actual como ISO completa. */
export function nowIso(): IsoDateTime {
  return new Date().toISOString() as IsoDateTime;
}

/** Fecha de hoy como IsoDate ("YYYY-MM-DD"). */
export function todayIso(): IsoDate {
  return format(new Date(), 'yyyy-MM-dd') as IsoDate;
}

/** Hora actual como "HH:mm". */
export function currentTime(): string {
  return format(new Date(), 'HH:mm');
}

/** Convierte un `Date` a IsoDate. */
export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd') as IsoDate;
}

/** Convierte una IsoDate/IsoDateTime a `Date`. */
export function fromIso(value: IsoDate | IsoDateTime): Date {
  return parseISO(value);
}

/** Deriva el agrupador mensual "YYYY-MM" de una fecha. */
export function toYearMonth(value: IsoDate | Date): YearMonth {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return format(date, 'yyyy-MM') as YearMonth;
}

/** YearMonth del mes actual. */
export function currentYearMonth(): YearMonth {
  return format(new Date(), 'yyyy-MM') as YearMonth;
}

/** Primer día del mes de una YearMonth. */
export function startOfYearMonth(ym: YearMonth): Date {
  return startOfMonth(parseISO(`${ym}-01`));
}

/** Último día del mes de una YearMonth. */
export function endOfYearMonth(ym: YearMonth): Date {
  return endOfMonth(parseISO(`${ym}-01`));
}

/** Días de diferencia entre dos fechas (b - a). Negativo si `b` es anterior. */
export function daysBetween(a: Date, b: Date): number {
  return differenceInCalendarDays(b, a);
}

/** Formatea una fecha ISO para mostrar según locale (p. ej. "2 jul 2026"). */
export function formatDate(
  value: IsoDate | IsoDateTime,
  pattern = 'd MMM yyyy',
  locale: Locale = 'es',
): string {
  return format(parseISO(value), pattern, { locale: locales[locale] });
}
