import { formatMoney, formatPercent } from '@/lib/format';
import { asCents, type Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

const REDUCTION = 0.2; // 20 %

/**
 * Familia 2 — Oportunidad de optimización por categoría.
 * Toma la categoría de mayor gasto del mes y cuantifica cuánto liberarías al
 * reducirla un 20 %, orientándolo a la meta activa más cercana si existe.
 * P. ej. "si reduces entretenimiento un 20 %, liberarías 30 USD para tu carro".
 */
export const categoryOpportunityRule = (ctx: InsightContext): Insight | null => {
  const { topCategories, goals, settings } = ctx;
  const top = topCategories[0];
  if (!top || top.total <= 0) return null;
  // Solo si la categoría pesa lo suficiente como para que reducirla importe.
  if (top.percent < 0.2) return null;

  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });
  const freed = asCents(Math.round(top.total * REDUCTION));
  if (freed <= 0) return null;

  const share = formatPercent(top.percent, settings.locale);
  const target = goals.find((g) => g.percent < 1 && g.remaining > 0);

  if (target) {
    return {
      id: 'category-opportunity',
      category: 'spending',
      severity: 'suggestion',
      title: `«${top.name}» es tu mayor gasto (${share})`,
      message: `Si reduces «${top.name}» un 20 % liberarías ${money(freed)} al mes que podrías destinar a tu meta «${target.goal.name}» (te faltan ${money(target.remaining)}).`,
    };
  }

  return {
    id: 'category-opportunity',
    category: 'spending',
    severity: 'suggestion',
    title: `«${top.name}» concentra el ${share} de tu gasto`,
    message: `Reducir «${top.name}» un 20 % te ahorraría unos ${money(freed)} al mes. Es tu palanca de ahorro más grande.`,
  };
};
