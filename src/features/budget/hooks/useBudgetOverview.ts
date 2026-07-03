import { useLiveQuery } from 'dexie-react-hooks';
import { budgetStatusQuery, type BudgetOverview } from '@/services/metrics.service';
import type { YearMonth } from '@/types/common';

/** Estado reactivo de los presupuestos del mes (gastado, disponible, proyección). */
export function useBudgetOverview(yearMonth: YearMonth): BudgetOverview | undefined {
  return useLiveQuery(() => budgetStatusQuery(yearMonth), [yearMonth]);
}
