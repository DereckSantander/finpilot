import { addMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { YearMonth } from '@/types/common';

/**
 * Punto de una serie mensual: el mes y su etiqueta corta ("ene", "feb"…).
 */
export interface MonthPoint {
  yearMonth: YearMonth;
  label: string;
}

/**
 * Serie mensual hacia atrás desde `anchor` (incluido), de la más antigua a la
 * más reciente.
 *
 * Es el **único** bucle de meses de la aplicación: seis funciones distintas lo
 * reimplementaban con el mismo `for (let i = months - 1; i >= 0; i -= 1)`
 * (tendencia mensual, historial de tarjeta, aportes por mes, evolución del
 * patrimonio, totales del año y comparación anual).
 */
export function monthSeries<T>(
  anchor: YearMonth,
  months: number,
  build: (yearMonth: YearMonth, date: Date) => T,
): (T & MonthPoint)[] {
  const anchorDate = parseISO(`${anchor}-01`);
  const points: (T & MonthPoint)[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = addMonths(anchorDate, -i);
    const yearMonth = format(date, 'yyyy-MM') as YearMonth;
    points.push({
      ...build(yearMonth, date),
      yearMonth,
      label: format(date, 'LLL', { locale: es }),
    });
  }

  return points;
}

/** Los 12 meses de un año natural, de enero a diciembre. */
export function monthsOfYear<T>(
  year: number,
  build: (yearMonth: YearMonth, date: Date) => T,
): (T & MonthPoint)[] {
  return monthSeries(`${year}-12` as YearMonth, 12, build);
}

/** `true` si un "YYYY-MM" pertenece al año indicado. */
export function inYear(yearMonth: string, year: number): boolean {
  return yearMonth.slice(0, 4) === String(year);
}
