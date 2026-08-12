import { addMonths, format, getDate, getDaysInMonth, parseISO } from 'date-fns';
import { sumCents } from '@/lib/money';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { monthSeries } from '@/services/derive/series';
import { deriveTotalCardDebt } from '@/services/derive/cards';
import { deriveTotalSaved, deriveActiveSaved } from '@/services/derive/goals';
import type { Ledger } from '@/services/ledger/types';
import type { GoalRow } from '@/db/schema';
import type { CategoryId, GoalId } from '@/types/ids';
import type { TransactionType, YearMonth } from '@/types/common';

export interface DashboardMetrics {
  yearMonth: YearMonth;
  monthIncome: Cents;
  monthExpense: Cents;
  monthBalance: Cents;
  savingsRate: number; // 0–1
  /** Ahorro en TODAS las metas, archivadas incluidas (lo que salió de la caja). */
  totalSaved: Cents;
  /** Ahorro solo en metas activas: es lo que suma la pantalla de Metas. */
  activeSaved: Cents;
  available: Cents;
  cardDebt: Cents;
  netWorth: Cents;
  transactionsCount: number;
}

export interface CategorySlice {
  categoryId: CategoryId;
  name: string;
  color: string;
  total: Cents;
  percent: number; // 0–1 respecto al total del periodo
}

export interface TrendPoint {
  yearMonth: YearMonth;
  label: string;
  income: Cents;
  expense: Cents;
  balance: Cents;
}

export interface NetWorthPoint {
  yearMonth: YearMonth;
  label: string;
  netWorth: Cents;
}

export function deriveDashboardMetrics(ledger: Ledger, yearMonth: YearMonth): DashboardMetrics {
  const income = ledger.transactions.filter((t) => t.type === 'income');
  const expense = ledger.transactions.filter((t) => t.type === 'expense');

  const monthIncome = sumCents(
    income.filter((t) => t.yearMonth === yearMonth).map((t) => t.amount),
  );
  const monthExpense = sumCents(
    expense.filter((t) => t.yearMonth === yearMonth).map((t) => t.amount),
  );
  const monthBalance = asCents(monthIncome - monthExpense);
  const savingsRate = monthIncome > 0 ? monthBalance / monthIncome : 0;

  const lifetimeIncome = sumCents(income.map((t) => t.amount));
  const lifetimeExpense = sumCents(expense.map((t) => t.amount));

  const totalSaved = deriveTotalSaved(ledger);
  const activeSaved = deriveActiveSaved(ledger);
  const cardDebt = deriveTotalCardDebt(ledger);

  // Dinero líquido disponible: un consumo con tarjeta NO sale de la caja hasta
  // que se paga, por lo que no resta aquí (aparece como deuda); los pagos de
  // tarjeta sí restan. Evita descontar el consumo dos veces.
  const cardConsumos = sumCents(
    expense.filter((t) => t.creditCardId !== undefined).map((t) => t.amount),
  );
  const cardPagos =
    ledger.cardPayments.length > 0
      ? sumCents(ledger.cardPayments.map((p) => p.amount))
      : ZERO_CENTS;
  const nonCardExpense = asCents(lifetimeExpense - cardConsumos);
  const available = asCents(lifetimeIncome - nonCardExpense - cardPagos - totalSaved);

  // Patrimonio = ingresos − gastos (el consumo con tarjeta ya es un gasto;
  // pagarla no altera el patrimonio). Misma definición que la serie histórica.
  const netWorth = asCents(lifetimeIncome - lifetimeExpense);

  return {
    yearMonth,
    monthIncome,
    monthExpense,
    monthBalance,
    savingsRate,
    totalSaved,
    activeSaved,
    available,
    cardDebt,
    netWorth,
    transactionsCount: ledger.transactions.length,
  };
}

/**
 * Desglose por categoría de un mes o de un año completo. Antes eran dos
 * funciones casi idénticas que solo diferían en el predicado del filtro.
 */
export function deriveCategoryBreakdown(
  ledger: Ledger,
  scope: { yearMonth: YearMonth } | { year: number },
  type: TransactionType = 'expense',
): CategorySlice[] {
  const matches =
    'yearMonth' in scope
      ? (ym: string) => ym === scope.yearMonth
      : (ym: string) => ym.slice(0, 4) === String(scope.year);

  const byCategory = new Map<string, number>();
  for (const tx of ledger.transactions) {
    if (tx.type !== type || !matches(tx.yearMonth)) continue;
    byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount);
  }

  const total = [...byCategory.values()].reduce((a, b) => a + b, 0);

  return [...byCategory.entries()]
    .map(([categoryId, amount]) => {
      const category = ledger.index.categoryById.get(categoryId as CategoryId);
      return {
        categoryId: categoryId as CategoryId,
        name: category?.name ?? 'Sin categoría',
        color: category?.color ?? '#94a3b8',
        total: asCents(amount),
        percent: total > 0 ? amount / total : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Ingresos/gastos de los últimos `months` meses hasta `anchor`. */
export function deriveMonthlyTrend(ledger: Ledger, anchor: YearMonth, months = 6): TrendPoint[] {
  return monthSeries(anchor, months, (ym) => {
    const monthTx = ledger.index.txByYearMonth.get(ym) ?? [];
    const income = sumCents(monthTx.filter((t) => t.type === 'income').map((t) => t.amount));
    const expense = sumCents(monthTx.filter((t) => t.type === 'expense').map((t) => t.amount));
    return { income, expense, balance: asCents(income - expense) };
  });
}

/**
 * Evolución del patrimonio al cierre de cada uno de los últimos `months` meses.
 * Coherente con `deriveDashboardMetrics`: la deuda de tarjeta ya está incluida
 * en los gastos, así que no se resta aparte.
 */
export function deriveNetWorthSeries(ledger: Ledger, months = 12): NetWorthPoint[] {
  return monthSeries(ledger.currentYearMonth, months, (ym) => {
    const upTo = ledger.transactions.filter((t) => t.yearMonth <= ym);
    const cumIncome = sumCents(upTo.filter((t) => t.type === 'income').map((t) => t.amount));
    const cumExpense = sumCents(upTo.filter((t) => t.type === 'expense').map((t) => t.amount));
    return { netWorth: asCents(cumIncome - cumExpense) };
  });
}

// --- Fondo de emergencia ---------------------------------------------------

export interface EmergencyFundMilestone {
  months: number;
  target: Cents;
  remaining: Cents;
  percent: number; // 0–1
  reached: boolean;
}

export interface EmergencyFundStatus {
  goal?: GoalRow;
  saved: Cents;
  averageMonthlyExpense: Cents;
  monthsCovered: number;
  /** Ventana usada para promediar el gasto (meses). */
  averageWindow: number;
  targetMonths: number[];
  milestones: EmergencyFundMilestone[];
  /** Objetivo recomendado (6 meses si está entre los objetivos, o el mayor). */
  recommended: Cents;
}

export function deriveEmergencyFundStatus(ledger: Ledger, months = 3): EmergencyFundStatus {
  const goal = ledger.goals.find((g) => g.isEmergencyFund && !g.isArchived);
  const expenses = ledger.transactions.filter((t) => t.type === 'expense');
  const anchor = parseISO(`${ledger.currentYearMonth}-01`);

  const monthTotal = (offset: number) => {
    const ym = format(addMonths(anchor, offset), 'yyyy-MM');
    return expenses.filter((t) => t.yearMonth === ym).reduce((acc, t) => acc + t.amount, 0);
  };

  // Se promedian los últimos `months` meses **completos**: incluir el mes en
  // curso (parcial) hundía el promedio a principios de mes e inflaba la
  // cobertura. "Sin historia" se detecta por **existencia de movimientos**, no
  // porque el promedio dé cero: un historial de gasto nulo es un dato válido.
  const windowMonths = new Set<string>();
  let totalExpense = 0;
  for (let i = 1; i <= months; i += 1) {
    windowMonths.add(format(addMonths(anchor, -i), 'yyyy-MM'));
    totalExpense += monthTotal(-i);
  }
  const hasHistory = expenses.some((t) => windowMonths.has(t.yearMonth));

  let averageMonthlyExpense = asCents(Math.round(totalExpense / months));
  if (!hasHistory) {
    const today = parseISO(ledger.today);
    const elapsedDays = Math.max(getDate(today), 1);
    averageMonthlyExpense = asCents(
      Math.round((monthTotal(0) / elapsedDays) * getDaysInMonth(today)),
    );
  }

  const saved = goal ? (ledger.index.savedByGoal.get(goal.id as GoalId) ?? ZERO_CENTS) : ZERO_CENTS;
  const monthsCovered = averageMonthlyExpense > 0 ? saved / averageMonthlyExpense : 0;

  const targetMonths = [...(ledger.settings?.emergencyFund.targetMonths ?? [3, 6, 12])].sort(
    (a, b) => a - b,
  );

  const milestones: EmergencyFundMilestone[] = targetMonths.map((m) => {
    const target = averageMonthlyExpense * m;
    return {
      months: m,
      target: asCents(target),
      remaining: asCents(Math.max(target - saved, 0)),
      percent: target > 0 ? Math.min(saved / target, 1) : 0,
      reached: target > 0 && saved >= target,
    };
  });

  const recommendedMonths = targetMonths.includes(6)
    ? 6
    : (targetMonths[targetMonths.length - 1] ?? 6);

  return {
    ...(goal ? { goal } : {}),
    saved,
    averageMonthlyExpense,
    monthsCovered,
    averageWindow: months,
    targetMonths,
    milestones,
    recommended: asCents(averageMonthlyExpense * recommendedMonths),
  };
}
