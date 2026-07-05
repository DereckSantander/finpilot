import {
  dashboardMetricsQuery,
  monthlyTrendQuery,
  categoryBreakdownQuery,
  goalsProgressQuery,
  cardsSummaryQuery,
  emergencyFundStatusQuery,
} from '@/services/metrics.service';
import { db } from '@/db/db';
import { currentYearMonth } from '@/lib/date';
import { runInsights } from '@/lib/insights/engine';
import type { Insight, InsightContext } from '@/lib/insights/types';
import type { SettingsRow } from '@/db/schema';

/**
 * Inteligencia financiera (F10b). Construye el contexto agregando los datos
 * reales de IndexedDB y ejecuta el motor de reglas. Apto para `useLiveQuery`.
 */
export async function insightsQuery(): Promise<Insight[]> {
  const ym = currentYearMonth();

  const [settings, metrics, trend, topCategories, goals, cards, emergencyFund] = await Promise.all([
    db.settings.get('app'),
    dashboardMetricsQuery(ym),
    monthlyTrendQuery(ym, 3),
    categoryBreakdownQuery(ym, 'expense'),
    goalsProgressQuery(),
    cardsSummaryQuery(),
    emergencyFundStatusQuery(3),
  ]);

  if (!settings) return [];

  const ctx: InsightContext = {
    settings: settings as SettingsRow,
    metrics,
    trend,
    topCategories,
    goals,
    cards,
    emergencyFund,
  };

  return runInsights(ctx);
}
