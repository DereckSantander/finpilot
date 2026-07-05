import { formatMoney, formatPercent } from '@/lib/format';
import type { Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Familia 5 — Utilización del cupo de tarjetas.
 * Señala la tarjeta con mayor utilización. P. ej. "usas el 42 % del cupo".
 */
export const cardUtilizationRule = (ctx: InsightContext): Insight | null => {
  const { cards, settings } = ctx;
  const withDebt = cards.filter((c) => c.currentBalance > 0 && c.card.creditLimit > 0);
  if (withDebt.length === 0) return null;

  const worst = withDebt.reduce((acc, c) => (c.utilization > acc.utilization ? c : acc));
  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });
  const pct = formatPercent(worst.utilization, settings.locale);

  if (worst.utilization >= 0.7) {
    return {
      id: 'card-util-high',
      category: 'cards',
      severity: worst.utilization >= 0.9 ? 'critical' : 'warning',
      title: `Usas el ${pct} del cupo de ${worst.card.name}`,
      message: `Una utilización alta encarece tu crédito y baja tu margen. Prioriza abonar a ${worst.card.name} (deuda ${money(worst.currentBalance)}).`,
    };
  }

  if (worst.utilization >= 0.3) {
    return {
      id: 'card-util-mid',
      category: 'cards',
      severity: 'info',
      title: `Usas el ${pct} del cupo de ${worst.card.name}`,
      message: `Estás dentro de un rango razonable. Mantén la utilización por debajo del 30 % para cuidar tu salud crediticia.`,
    };
  }

  return {
    id: 'card-util-low',
    category: 'cards',
    severity: 'positive',
    title: 'Buen uso de tus tarjetas',
    message: `Tu mayor utilización es del ${pct} en ${worst.card.name}. Excelente manejo del crédito.`,
  };
};
