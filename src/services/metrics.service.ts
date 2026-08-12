import { fromLedger } from '@/services/ledger/adapt';
import { loadLedger } from '@/services/ledger/load';
import {
  deriveDashboardMetrics,
  deriveCategoryBreakdown,
  deriveMonthlyTrend,
  deriveNetWorthSeries,
  deriveEmergencyFundStatus,
} from '@/services/derive/dashboard';
import {
  deriveCardsSummary,
  deriveCardDetail,
  deriveCardHistory,
  deriveCardMovements,
  deriveTotalCardDebt,
} from '@/services/derive/cards';
import {
  deriveGoalsProgress,
  deriveGoalDetail,
  deriveGoalMonthlyContrib,
  deriveGoalProjection,
} from '@/services/derive/goals';
import { deriveBudgetStatus } from '@/services/derive/budgets';
import {
  deriveYearlyTotals,
  deriveMonthlyTotalsForYear,
  derivePaymentMethodBreakdownYear,
} from '@/services/derive/statistics';
import type { Cents } from '@/types/money';
import type { CardBalance } from '@/services/ledger/types';
import type { CategorySlice } from '@/services/derive/dashboard';
import type { CreditCardId } from '@/types/ids';
import type { TransactionType, YearMonth } from '@/types/common';

/**
 * Fachada de métricas (ADR-0007: se calculan al vuelo desde los datos primarios,
 * nunca se almacenan).
 *
 * Cada función es una derivación pura envuelta con `fromLedger`, que carga el
 * ledger una sola vez y se la pasa. Las firmas públicas son las de siempre, así
 * que los hooks y componentes que las consumen no cambian; lo que cambia es que
 * ya no hay cuatro sitios calculando la deuda de una tarjeta ni dos calculando
 * el ahorro total.
 *
 * El segundo argumento de `fromLedger` acota las tablas que se leen: sin él,
 * `useLiveQuery` revalidaría cada consulta ante cualquier escritura de la app.
 */

// --- Reexportes de tipos (la API pública no se mueve) ----------------------

export type { CardBalance } from '@/services/ledger/types';
export type { Ledger, LedgerScope, Derivation } from '@/services/ledger/types';
export type {
  DashboardMetrics,
  CategorySlice,
  TrendPoint,
  NetWorthPoint,
  EmergencyFundStatus,
  EmergencyFundMilestone,
} from '@/services/derive/dashboard';
export type {
  CardSummary,
  CardDetail,
  CardHistoryMonth,
  CardMovement,
} from '@/services/derive/cards';
export type {
  GoalProgress,
  GoalDetail,
  GoalMonthlyPoint,
  GoalProjection,
} from '@/services/derive/goals';
export type { BudgetStatus, BudgetOverview } from '@/services/derive/budgets';
export type { YearTotals, MethodSlice } from '@/services/derive/statistics';
export { CHART_PALETTE } from '@/services/derive/statistics';

// --- Dashboard -------------------------------------------------------------

export const dashboardMetricsQuery = fromLedger(deriveDashboardMetrics, [
  'transactions',
  'cards',
  'goals',
]);

export const monthlyTrendQuery = fromLedger(deriveMonthlyTrend, ['transactions']);

export const netWorthSeriesQuery = fromLedger(deriveNetWorthSeries, ['transactions']);

const categoryBreakdown = fromLedger(deriveCategoryBreakdown, ['transactions']);

/** Desglose por categoría de un mes (para el gráfico de dona). */
export const categoryBreakdownQuery = (
  yearMonth: YearMonth,
  type: TransactionType = 'expense',
): Promise<CategorySlice[]> => categoryBreakdown({ yearMonth }, type);

/** Desglose por categoría de un año completo. */
export const categoryBreakdownYearQuery = (
  year: number,
  type: TransactionType = 'expense',
): Promise<CategorySlice[]> => categoryBreakdown({ year }, type);

// --- Tarjetas --------------------------------------------------------------

/**
 * Saldo por tarjeta. Se mantiene por compatibilidad; la fuente de verdad es
 * `ledger.index.cardBalances`, que es de donde sale este mapa.
 */
export async function cardBalancesQuery(): Promise<Map<CreditCardId, CardBalance>> {
  const ledger = await loadLedger(['cards']);
  return new Map(ledger.index.cardBalances);
}

/** Deuda total de tarjetas = suma de las deudas de cada tarjeta. */
export function totalCardDebt(balances: Map<CreditCardId, CardBalance>): Cents {
  return [...balances.values()].reduce((acc, b) => acc + b.balance, 0) as Cents;
}

export const cardsSummaryQuery = fromLedger(deriveCardsSummary, ['cards']);
export const cardDetailQuery = fromLedger(deriveCardDetail, ['cards']);
export const cardHistoryQuery = fromLedger(deriveCardHistory, ['cards']);
export const cardMovementsQuery = fromLedger(deriveCardMovements, ['cards']);
export const totalCardDebtQuery = fromLedger(deriveTotalCardDebt, ['cards']);

// --- Metas -----------------------------------------------------------------

export const goalsProgressQuery = fromLedger(deriveGoalsProgress, ['goals']);
export const goalDetailQuery = fromLedger(deriveGoalDetail, ['goals']);
export const goalMonthlyContribQuery = fromLedger(deriveGoalMonthlyContrib, ['goals']);
export const goalProjectionQuery = fromLedger(deriveGoalProjection, ['goals']);

// --- Fondo de emergencia ---------------------------------------------------

export const emergencyFundStatusQuery = fromLedger(deriveEmergencyFundStatus, [
  'transactions',
  'goals',
]);

// --- Presupuestos ----------------------------------------------------------

export const budgetStatusQuery = fromLedger(deriveBudgetStatus, ['budgets']);

// --- Estadísticas ----------------------------------------------------------

export const yearlyTotalsQuery = fromLedger(deriveYearlyTotals, ['transactions']);
export const monthlyTotalsForYearQuery = fromLedger(deriveMonthlyTotalsForYear, ['transactions']);
export const paymentMethodBreakdownYearQuery = fromLedger(derivePaymentMethodBreakdownYear, [
  'transactions',
]);
