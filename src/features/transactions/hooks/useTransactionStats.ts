import { useLiveQuery } from 'dexie-react-hooks';
import { categoryBreakdownQuery, type CategorySlice } from '@/services/metrics.service';
import type { TransactionType, YearMonth } from '@/types/common';

/** Desglose por categoría (reactivo) para el mes y tipo indicados. */
export function useCategoryBreakdown(
  yearMonth: YearMonth,
  type: TransactionType,
): CategorySlice[] | undefined {
  return useLiveQuery(() => categoryBreakdownQuery(yearMonth, type), [yearMonth, type]);
}
