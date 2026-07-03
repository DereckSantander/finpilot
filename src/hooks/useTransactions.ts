import { useLiveQuery } from 'dexie-react-hooks';
import {
  transactionsQuery,
  monthlyTotals,
  type TransactionFilter,
  type MonthlyTotals,
} from '@/services/transactions.service';
import type { TransactionRow } from '@/db/schema';
import type { YearMonth } from '@/types/common';

/**
 * Movimientos que cumplen el filtro (reactivo). Los deps se derivan de los
 * campos del filtro para re-ejecutar la consulta cuando cambian.
 */
export function useTransactions(filter: TransactionFilter = {}): TransactionRow[] | undefined {
  return useLiveQuery(
    () => transactionsQuery(filter),
    [
      filter.type,
      filter.yearMonth,
      filter.categoryId,
      filter.paymentMethodId,
      filter.creditCardId,
      filter.search,
      filter.from,
      filter.to,
    ],
  );
}

/** Totales del mes (ingresos, gastos, balance). Reactivo. */
export function useMonthlyTotals(yearMonth: YearMonth): MonthlyTotals | undefined {
  return useLiveQuery(() => monthlyTotals(yearMonth), [yearMonth]);
}
