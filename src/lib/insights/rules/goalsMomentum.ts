import { formatMoney, formatPercent } from '@/lib/format';
import type { Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Familia 6 — Avance de metas y ritmo de ahorro ("vas por buen camino").
 * Combina el estado de las metas con la tasa de ahorro del mes.
 */
export const goalsMomentumRule = (ctx: InsightContext): Insight[] => {
  const { goals, metrics, settings } = ctx;
  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });
  const out: Insight[] = [];

  // Meta recién completada.
  const done = goals.find((g) => g.goal.targetAmount > 0 && g.percent >= 1);
  if (done) {
    out.push({
      id: 'goal-done',
      category: 'goals',
      severity: 'positive',
      title: `¡Completaste «${done.goal.name}»!`,
      message: `Alcanzaste el 100 % de tu meta «${done.goal.name}». Es un buen momento para definir la siguiente.`,
    });
  }

  // Meta cercana a completarse (80–99 %).
  const near = goals.find((g) => g.percent >= 0.8 && g.percent < 1 && g.remaining > 0);
  if (near) {
    out.push({
      id: 'goal-near',
      category: 'goals',
      severity: 'suggestion',
      title: `Tu meta «${near.goal.name}» está al ${formatPercent(near.percent, settings.locale)}`,
      message: `Solo te faltan ${money(near.remaining)} para completar «${near.goal.name}». Un último empujón y la logras.`,
    });
  }

  // Ritmo de ahorro del mes respecto a la meta mensual.
  if (metrics.monthIncome > 0 && settings.monthlySavingsTarget > 0) {
    const targetRate = settings.monthlySavingsTarget / metrics.monthIncome;
    if (metrics.monthBalance > 0 && metrics.savingsRate >= targetRate) {
      out.push({
        id: 'savings-on-track',
        category: 'saving',
        severity: 'positive',
        title: 'Vas por buen camino',
        message: `Este mes ahorraste el ${formatPercent(metrics.savingsRate, settings.locale)} de tus ingresos, por encima de tu meta. ¡Sigue así!`,
      });
    }
  }

  return out;
};
