import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { asCents } from '@/types/money';
import type {
  SettingsRow,
  CategoryRow,
  GoalRow,
  GoalContributionRow,
  BudgetRow,
} from '@/db/schema';
import type { CategoryId, GoalId, GoalContributionId, BudgetId } from '@/types/ids';
import type { IsoDate, IsoDateTime, YearMonth } from '@/types/common';

/** Categorías fijas usadas en las pruebas de servicios. */
export const EXPENSE_CAT = 'cat-exp' as CategoryId;
export const INCOME_CAT = 'cat-inc' as CategoryId;

const NOW = '2026-01-01T00:00:00.000Z' as IsoDateTime;

/** Limpia todas las tablas y siembra configuración + dos categorías conocidas. */
export async function resetDb(): Promise<void> {
  if (!db.isOpen()) await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));

  const settings: SettingsRow = {
    id: 'app',
    currency: 'USD',
    locale: 'es',
    theme: 'system',
    startOfMonth: 1,
    monthlySavingsTarget: asCents(30_000),
    emergencyFund: { targetMonths: [3, 6, 12] },
    autoBackup: { enabled: false, frequencyDays: 7, keep: 5 },
    onboardingCompleted: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.settings.put(settings);

  const cat = (id: CategoryId, name: string, type: CategoryRow['type']): CategoryRow => ({
    id,
    name,
    type,
    color: '#0d9488',
    icon: 'Tag',
    isSystem: true,
    isArchived: false,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.categories.bulkPut([
    cat(EXPENSE_CAT, 'Gastos', 'expense'),
    cat(INCOME_CAT, 'Sueldo', 'income'),
  ]);
}

/** Inserta una aportación a una meta (para controlar el ahorro). */
export async function addContribution(goalId: GoalId, amount: number, date: string): Promise<void> {
  const row: GoalContributionRow = {
    id: newId<GoalContributionId>(),
    goalId,
    amount: asCents(amount),
    date: date as IsoDate,
    createdAt: NOW,
  };
  await db.goalContributions.add(row);
}

/** Inserta una meta y devuelve su id. */
export async function addGoal(
  name: string,
  target: number,
  opts: { isEmergencyFund?: boolean } = {},
): Promise<GoalId> {
  const id = newId<GoalId>();
  const row: GoalRow = {
    id,
    name,
    targetAmount: asCents(target),
    priority: 'medium',
    color: '#0d9488',
    icon: 'Target',
    isEmergencyFund: opts.isEmergencyFund ?? false,
    isArchived: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.goals.add(row);
  return id;
}

/** Inserta un presupuesto para un mes/categoría. */
export async function addBudget(
  yearMonth: string,
  amount: number,
  categoryId?: CategoryId,
): Promise<void> {
  const row: BudgetRow = {
    id: newId<BudgetId>(),
    yearMonth: yearMonth as YearMonth,
    amount: asCents(amount),
    createdAt: NOW,
    updatedAt: NOW,
    ...(categoryId ? { categoryId } : {}),
  };
  await db.budgets.add(row);
}
