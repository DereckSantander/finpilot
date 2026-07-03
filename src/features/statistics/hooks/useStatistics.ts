import { useLiveQuery } from 'dexie-react-hooks';
import {
  yearlyTotalsQuery,
  monthlyTotalsForYearQuery,
  categoryBreakdownYearQuery,
  paymentMethodBreakdownYearQuery,
  netWorthSeriesQuery,
  goalsProgressQuery,
  cardsSummaryQuery,
  dashboardMetricsQuery,
  type YearTotals,
  type TrendPoint,
  type CategorySlice,
  type MethodSlice,
  type NetWorthPoint,
  type GoalProgress,
  type CardSummary,
  type DashboardMetrics,
} from '@/services/metrics.service';
import { currentYearMonth } from '@/lib/date';
import type { TransactionType } from '@/types/common';

export function useYearlyTotals(years = 5): YearTotals[] | undefined {
  return useLiveQuery(() => yearlyTotalsQuery(years), [years]);
}

export function useMonthlyForYear(year: number): TrendPoint[] | undefined {
  return useLiveQuery(() => monthlyTotalsForYearQuery(year), [year]);
}

export function useCategoryYear(year: number, type: TransactionType): CategorySlice[] | undefined {
  return useLiveQuery(() => categoryBreakdownYearQuery(year, type), [year, type]);
}

export function useMethodYear(year: number, type: TransactionType): MethodSlice[] | undefined {
  return useLiveQuery(() => paymentMethodBreakdownYearQuery(year, type), [year, type]);
}

export function useNetWorthSeries(months = 12): NetWorthPoint[] | undefined {
  return useLiveQuery(() => netWorthSeriesQuery(months), [months]);
}

export function useGoalsStat(): GoalProgress[] | undefined {
  return useLiveQuery(() => goalsProgressQuery(), []);
}

export function useCardsStat(): CardSummary[] | undefined {
  return useLiveQuery(() => cardsSummaryQuery(), []);
}

export function useCurrentMetrics(): DashboardMetrics | undefined {
  return useLiveQuery(() => dashboardMetricsQuery(currentYearMonth()), []);
}
