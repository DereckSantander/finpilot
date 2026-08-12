import { loadLedger } from '@/services/ledger/load';
import {
  deriveDashboardMetrics,
  deriveMonthlyTrend,
  deriveCategoryBreakdown,
  deriveEmergencyFundStatus,
} from '@/services/derive/dashboard';
import { deriveGoalsProgress } from '@/services/derive/goals';
import { deriveCardsSummary } from '@/services/derive/cards';
import { runInsights } from '@/lib/insights/engine';
import type { Insight, InsightContext } from '@/lib/insights/types';

/**
 * Inteligencia financiera (F10b). Construye el contexto y ejecuta el motor de
 * reglas. Apto para `useLiveQuery`.
 *
 * Antes esto lanzaba seis consultas en paralelo y cada una releía la base por su
 * cuenta: la tabla de movimientos se recorría tres o cuatro veces y la de pagos,
 * dos o tres, en una sola llamada. Ahora se carga el ledger **una vez** y las
 * seis métricas se derivan de esa misma foto — lo que además garantiza que
 * todas describan exactamente el mismo instante.
 */
export async function insightsQuery(): Promise<Insight[]> {
  const ledger = await loadLedger();
  if (!ledger.settings) return [];

  const ym = ledger.currentYearMonth;

  const ctx: InsightContext = {
    settings: ledger.settings,
    metrics: deriveDashboardMetrics(ledger, ym),
    trend: deriveMonthlyTrend(ledger, ym, 3),
    topCategories: deriveCategoryBreakdown(ledger, { yearMonth: ym }, 'expense'),
    goals: deriveGoalsProgress(ledger),
    cards: deriveCardsSummary(ledger),
    emergencyFund: deriveEmergencyFundStatus(ledger, 3),
  };

  return runInsights(ctx);
}
