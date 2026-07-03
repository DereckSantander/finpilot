import { useLiveQuery } from 'dexie-react-hooks';
import {
  dashboardMetricsQuery,
  categoryBreakdownQuery,
  monthlyTrendQuery,
  goalsProgressQuery,
  cardsSummaryQuery,
  emergencyFundStatusQuery,
  type DashboardMetrics,
  type CategorySlice,
  type TrendPoint,
  type GoalProgress,
  type CardSummary,
  type EmergencyFundStatus,
} from '@/services/metrics.service';
import type { YearMonth } from '@/types/common';

/**
 * Hooks reactivos del Dashboard. Cada uno observa las tablas implicadas vía
 * `useLiveQuery`, de modo que cualquier cambio en IndexedDB refresca la vista.
 * Devuelven `undefined` mientras cargan (para mostrar skeletons).
 */

export function useDashboardMetrics(yearMonth: YearMonth): DashboardMetrics | undefined {
  return useLiveQuery(() => dashboardMetricsQuery(yearMonth), [yearMonth]);
}

export function useCategoryBreakdown(yearMonth: YearMonth): CategorySlice[] | undefined {
  return useLiveQuery(() => categoryBreakdownQuery(yearMonth), [yearMonth]);
}

export function useMonthlyTrend(yearMonth: YearMonth, months = 6): TrendPoint[] | undefined {
  return useLiveQuery(() => monthlyTrendQuery(yearMonth, months), [yearMonth, months]);
}

export function useGoalsProgress(): GoalProgress[] | undefined {
  return useLiveQuery(() => goalsProgressQuery(), []);
}

export function useCardsSummary(): CardSummary[] | undefined {
  return useLiveQuery(() => cardsSummaryQuery(), []);
}

export function useEmergencyFund(months = 3): EmergencyFundStatus | undefined {
  return useLiveQuery(() => emergencyFundStatusQuery(months), [months]);
}
