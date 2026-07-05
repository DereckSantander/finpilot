import { formatMoney } from '@/lib/format';
import { asCents, type Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Familia 3 — Capacidad de ahorro del mes en curso.
 * Compara el balance del mes con la meta de ahorro mensual y sugiere cuánto más
 * podrías apartar (o celebra el excedente). P. ej. "puedes ahorrar 45 USD más".
 */
export const savingCapacityRule = (ctx: InsightContext): Insight | null => {
  const { metrics, settings } = ctx;
  if (metrics.monthIncome <= 0) return null;

  const target = settings.monthlySavingsTarget;
  const balance = metrics.monthBalance;
  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });

  if (target <= 0) {
    if (balance > 0) {
      return {
        id: 'saving-capacity',
        category: 'saving',
        severity: 'suggestion',
        title: 'Tienes margen para ahorrar',
        message: `Este mes te sobran ${money(balance)}. Define una meta de ahorro mensual para no gastarlos sin darte cuenta.`,
      };
    }
    return null;
  }

  if (balance <= 0) return null;

  if (balance >= target) {
    const extra = asCents(balance - target);
    if (extra <= 0) return null;
    return {
      id: 'saving-capacity',
      category: 'saving',
      severity: 'positive',
      title: 'Superas tu meta de ahorro',
      message: `Ya cubriste tu meta mensual de ${money(target)} y aún te quedan ${money(extra)}. Podrías adelantarlos a una meta o al fondo de emergencia.`,
    };
  }

  const missing = asCents(target - balance);
  return {
    id: 'saving-capacity',
    category: 'saving',
    severity: 'suggestion',
    title: `Puedes ahorrar ${money(missing)} más`,
    message: `Llevas ${money(balance)} de ahorro este mes; te faltan ${money(missing)} para tu meta de ${money(target)}. Recorta un gasto pequeño y lo alcanzas.`,
  };
};
