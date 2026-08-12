import { sumCents } from '@/lib/money';
import { asCents, type Cents } from '@/types/money';
import { monthsOfYear, inYear } from '@/services/derive/series';
import type { Ledger } from '@/services/ledger/types';
import type { TrendPoint } from '@/services/derive/dashboard';
import type { PaymentMethodId } from '@/types/ids';
import type { TransactionType } from '@/types/common';

/** Paleta de colores para series sin color propio (p. ej. métodos de pago). */
export const CHART_PALETTE = [
  '#0d9488',
  '#6366f1',
  '#f59e0b',
  '#e11d48',
  '#0ea5e9',
  '#8b5cf6',
  '#16a34a',
  '#94a3b8',
];

export interface YearTotals {
  year: number;
  label: string;
  income: Cents;
  expense: Cents;
  balance: Cents;
}

export interface MethodSlice {
  methodId: string;
  name: string;
  total: Cents;
  percent: number;
  color: string;
}

/** Totales por año (últimos `years` años) para la comparación anual. */
export function deriveYearlyTotals(ledger: Ledger, years = 5): YearTotals[] {
  const currentYear = Number(ledger.currentYearMonth.slice(0, 4));
  const result: YearTotals[] = [];

  for (let i = years - 1; i >= 0; i -= 1) {
    const year = currentYear - i;
    const yearTx = ledger.transactions.filter((t) => inYear(t.yearMonth, year));
    const income = sumCents(yearTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(yearTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    result.push({ year, label: String(year), income, expense, balance: asCents(income - expense) });
  }

  return result;
}

/** 12 meses de un año con ingresos, gastos y balance. */
export function deriveMonthlyTotalsForYear(ledger: Ledger, year: number): TrendPoint[] {
  return monthsOfYear(year, (ym) => {
    const monthTx = ledger.index.txByYearMonth.get(ym) ?? [];
    const income = sumCents(monthTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(monthTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    return { income, expense, balance: asCents(income - expense) };
  });
}

/** Desglose por método de pago de un año completo y tipo. */
export function derivePaymentMethodBreakdownYear(
  ledger: Ledger,
  year: number,
  type: TransactionType = 'expense',
): MethodSlice[] {
  const NONE = '__none__';
  const byMethod = new Map<string, number>();

  for (const tx of ledger.transactions) {
    if (tx.type !== type || !inYear(tx.yearMonth, year)) continue;
    const key = tx.paymentMethodId ?? NONE;
    byMethod.set(key, (byMethod.get(key) ?? 0) + tx.amount);
  }

  const total = [...byMethod.values()].reduce((a, b) => a + b, 0);

  // El color se asigna **después** de ordenar, para que la porción más grande
  // reciba siempre el primer color de la paleta en lugar de depender del orden
  // de iteración del Map.
  return [...byMethod.entries()]
    .map(([methodId, amount]) => ({
      methodId,
      name:
        methodId === NONE
          ? 'Sin método'
          : (ledger.index.methodById.get(methodId as PaymentMethodId)?.name ?? 'Método'),
      total: asCents(amount),
      percent: total > 0 ? amount / total : 0,
      color: '',
    }))
    .sort((a, b) => b.total - a.total)
    .map((slice, index) => ({
      ...slice,
      color: CHART_PALETTE[index % CHART_PALETTE.length]!,
    }));
}
