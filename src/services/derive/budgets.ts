import { sumCents } from '@/lib/money';
import { monthProgress } from '@/lib/date';
import { asCents, type Cents } from '@/types/money';
import type { Ledger } from '@/services/ledger/types';
import type { BudgetRow, CategoryRow } from '@/db/schema';
import type { CategoryId } from '@/types/ids';
import type { YearMonth } from '@/types/common';

export interface BudgetStatus {
  budget: BudgetRow;
  category?: CategoryRow;
  spent: Cents;
  remaining: Cents;
  projected: Cents;
  ratio: number; // gastado / presupuesto (0–1+)
  projectedRatio: number; // proyección / presupuesto
  overBudget: boolean;
  atRisk: boolean; // la proyección supera el presupuesto
}

export interface BudgetOverview {
  yearMonth: YearMonth;
  items: BudgetStatus[];
  global?: BudgetStatus;
  totalBudget: Cents;
  totalSpent: Cents;
  totalProjected: Cents;
}

function buildStatus(
  budget: BudgetRow,
  spentAmount: number,
  category: CategoryRow | undefined,
  progress: { elapsed: number; total: number },
): BudgetStatus {
  const projectedAmount =
    progress.elapsed > 0
      ? Math.round((spentAmount / progress.elapsed) * progress.total)
      : spentAmount;
  const ratio = budget.amount > 0 ? spentAmount / budget.amount : 0;
  const projectedRatio = budget.amount > 0 ? projectedAmount / budget.amount : 0;

  return {
    budget,
    ...(category ? { category } : {}),
    spent: asCents(spentAmount),
    remaining: asCents(budget.amount - spentAmount),
    projected: asCents(projectedAmount),
    ratio,
    projectedRatio,
    overBudget: spentAmount > budget.amount,
    atRisk: projectedAmount > budget.amount,
  };
}

/**
 * Estado de los presupuestos de un mes: gastado, disponible, proyección a fin de
 * mes y alertas, derivado de los gastos reales.
 */
export function deriveBudgetStatus(ledger: Ledger, yearMonth: YearMonth): BudgetOverview {
  const budgets = ledger.budgets.filter((b) => b.yearMonth === yearMonth);
  const expenses = (ledger.index.txByYearMonth.get(yearMonth) ?? []).filter(
    (t) => t.type === 'expense',
  );
  const progress = monthProgress(yearMonth, ledger.today);

  const spentByCategory = new Map<string, number>();
  let totalExpense = 0;
  for (const tx of expenses) {
    spentByCategory.set(tx.categoryId, (spentByCategory.get(tx.categoryId) ?? 0) + tx.amount);
    totalExpense += tx.amount;
  }

  const categoryBudgets = budgets.filter((b) => b.categoryId !== undefined);
  const globalBudget = budgets.find((b) => b.categoryId === undefined);

  const items = categoryBudgets
    .map((budget) =>
      buildStatus(
        budget,
        spentByCategory.get(budget.categoryId as string) ?? 0,
        budget.categoryId
          ? ledger.index.categoryById.get(budget.categoryId as CategoryId)
          : undefined,
        progress,
      ),
    )
    .sort((a, b) => b.ratio - a.ratio);

  const global = globalBudget
    ? buildStatus(globalBudget, totalExpense, undefined, progress)
    : undefined;

  return {
    yearMonth,
    items,
    ...(global ? { global } : {}),
    totalBudget: sumCents(categoryBudgets.map((b) => b.amount)),
    totalSpent: asCents(sumCents(items.map((i) => i.spent))),
    totalProjected: asCents(items.reduce((acc, item) => acc + item.projected, 0)),
  };
}
