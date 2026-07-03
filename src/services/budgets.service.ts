import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { asCents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  budgetCreateSchema,
  budgetUpdateSchema,
  type BudgetCreateInput,
  type BudgetUpdateInput,
} from '@/lib/validation/budgets.schema';
import { NotFoundError } from '@/lib/errors';
import type { BudgetRow } from '@/db/schema';
import type { BudgetId, CategoryId } from '@/types/ids';
import type { YearMonth } from '@/types/common';

/** CRUD de presupuestos mensuales. `categoryId` ausente = presupuesto global del mes. */

export function budgetsByMonthQuery(yearMonth: YearMonth): Promise<BudgetRow[]> {
  return db.budgets.where('yearMonth').equals(yearMonth).toArray();
}

export async function getBudget(id: BudgetId): Promise<BudgetRow> {
  const row = await db.budgets.get(id);
  if (!row) throw new NotFoundError('Presupuesto', id);
  return row;
}

/**
 * Crea o actualiza el presupuesto de un mes/categoría (uno por combinación).
 * Evita duplicados: si ya existe, ajusta el importe.
 */
export async function upsertBudget(input: BudgetCreateInput): Promise<BudgetRow> {
  const data = parseOrThrow(budgetCreateSchema, input);
  const categoryId = data.categoryId as CategoryId | undefined;

  return db.transaction('rw', db.budgets, async () => {
    const monthBudgets = await db.budgets.where('yearMonth').equals(data.yearMonth).toArray();
    const existing = monthBudgets.find((b) => b.categoryId === categoryId);
    const timestamp = nowIso();

    if (existing) {
      await db.budgets.update(existing.id, {
        amount: asCents(data.amount),
        updatedAt: timestamp,
      });
      return { ...existing, amount: asCents(data.amount), updatedAt: timestamp };
    }

    const row: BudgetRow = {
      id: newId<BudgetId>(),
      yearMonth: data.yearMonth as YearMonth,
      amount: asCents(data.amount),
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(categoryId !== undefined && { categoryId }),
    };
    await db.budgets.add(row);
    return row;
  });
}

export async function updateBudget(id: BudgetId, input: BudgetUpdateInput): Promise<void> {
  const data = parseOrThrow(budgetUpdateSchema, input);
  await getBudget(id);
  await db.budgets.update(id, { amount: asCents(data.amount), updatedAt: nowIso() });
}

export async function deleteBudget(id: BudgetId): Promise<void> {
  await db.budgets.delete(id);
}
