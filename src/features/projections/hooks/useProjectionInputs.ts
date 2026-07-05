import { useLiveQuery } from 'dexie-react-hooks';
import { dashboardMetricsQuery, type DashboardMetrics } from '@/services/metrics.service';
import { currentYearMonth } from '@/lib/date';

/** Métricas del mes en curso para prellenar patrimonio inicial y ahorro sugerido. */
export function useProjectionInputs(): DashboardMetrics | undefined {
  return useLiveQuery(() => dashboardMetricsQuery(currentYearMonth()), []);
}
