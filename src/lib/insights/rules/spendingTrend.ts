import { formatMoney, formatPercent } from '@/lib/format';
import type { Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Familia 1 — Comparativa de gasto mes a mes.
 * Compara el último mes completo con el anterior (evita comparar contra un mes
 * en curso parcial). P. ej. "gastaste un 18 % más que el mes anterior".
 */
export const spendingTrendRule = (ctx: InsightContext): Insight | null => {
  const { trend, settings } = ctx;
  if (trend.length < 2) return null;

  // trend está ordenado ascendente; el último es el mes en curso (parcial).
  const current = trend[trend.length - 2]; // último mes completo
  const previous = trend[trend.length - 3]; // mes anterior
  if (!current || !previous) return null;
  if (previous.expense <= 0 || current.expense <= 0) return null;

  const change = (current.expense - previous.expense) / previous.expense;
  const money = (v: Cents) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });
  const pct = formatPercent(Math.abs(change), settings.locale);

  if (change >= 0.1) {
    return {
      id: 'spending-up',
      category: 'spending',
      severity: change >= 0.25 ? 'warning' : 'suggestion',
      title: `Gastaste un ${pct} más en ${current.label}`,
      message: `En ${current.label} gastaste ${money(current.expense)} frente a ${money(
        previous.expense,
      )} en ${previous.label}. Revisa qué categorías subieron.`,
    };
  }

  if (change <= -0.1) {
    return {
      id: 'spending-down',
      category: 'spending',
      severity: 'positive',
      title: `Redujiste tu gasto un ${pct}`,
      message: `En ${current.label} gastaste ${money(current.expense)}, un ${pct} menos que en ${
        previous.label
      }. ¡Buen control!`,
    };
  }

  return null;
};
