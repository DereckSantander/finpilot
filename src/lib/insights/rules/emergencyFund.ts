import { formatMoney } from '@/lib/format';
import type { Cents } from '@/types/money';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Familia 4 — Cobertura del fondo de emergencia.
 * P. ej. "tu fondo cubre 1.2 meses" o la invitación a crearlo si no existe.
 */
export const emergencyFundRule = (ctx: InsightContext): Insight | null => {
  const { emergencyFund: ef, settings } = ctx;
  if (ef.averageMonthlyExpense <= 0) return null;

  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });
  const covered = ef.monthsCovered;
  const firstTarget = ef.targetMonths[0] ?? 3;

  // Sin fondo creado: invitar a crearlo con una cifra concreta.
  if (!ef.goal) {
    const target3 = ef.milestones[0]?.target ?? ef.recommended;
    return {
      id: 'emergency-none',
      category: 'emergency',
      severity: 'warning',
      title: 'Aún no tienes fondo de emergencia',
      message: `Con un gasto medio de ${money(ef.averageMonthlyExpense)}/mes, necesitarías ${money(
        target3,
      )} para cubrir ${firstTarget} meses. Crea tu fondo y empieza poco a poco.`,
    };
  }

  const coveredText = covered.toFixed(1);

  if (covered < firstTarget) {
    return {
      id: 'emergency-low',
      category: 'emergency',
      severity: covered < 1 ? 'critical' : 'warning',
      title: `Tu fondo cubre ${coveredText} meses`,
      message: `Estás por debajo del objetivo de ${firstTarget} meses. Apunta a ${money(
        ef.recommended,
      )} para quedar protegido ante imprevistos.`,
    };
  }

  return {
    id: 'emergency-ok',
    category: 'emergency',
    severity: 'positive',
    title: `Tu fondo cubre ${coveredText} meses`,
    message: `Tu fondo de emergencia protege ${coveredText} meses de gastos. Vas bien: mantén el ritmo de aportes.`,
  };
};
