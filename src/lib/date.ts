import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  getDaysInMonth,
  getDate,
} from 'date-fns';
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

/**
 * Días transcurridos y totales de un mes. El mes en curso cuenta solo los días
 * ya vividos; un mes pasado cuenta entero y uno futuro, cero.
 *
 * Es el denominador correcto para cualquier "promedio diario" o proyección a
 * fin de mes: dividir el gasto del mes en curso entre los días *totales*
 * subestima el ritmo real durante todo el mes.
 */
export function monthProgress(
  yearMonth: YearMonth,
  today: IsoDate = todayIso(),
): { elapsed: number; total: number } {
  const total = getDaysInMonth(parseISO(`${yearMonth}-01`));
  const currentYm = toYearMonth(today);
  if (yearMonth === currentYm) {
    return { elapsed: Math.max(getDate(parseISO(today)), 1), total };
  }
  return yearMonth < currentYm ? { elapsed: total, total } : { elapsed: 0, total };
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
