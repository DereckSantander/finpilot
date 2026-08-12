import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { asCents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  contributionCreateSchema,
  contributionUpdateSchema,
  type ContributionCreateInput,
  type ContributionUpdateInput,
} from '@/lib/validation/goals.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { GoalContributionRow } from '@/db/schema';
import type { GoalContributionId, GoalId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

/** CRUD de aportes a metas. */

export function contributionsByGoalQuery(goalId: GoalId): Promise<GoalContributionRow[]> {
  return db.goalContributions.where('goalId').equals(goalId).reverse().sortBy('date');
}

export async function createContribution(
  input: ContributionCreateInput,
): Promise<GoalContributionRow> {
  const data = parseOrThrow(contributionCreateSchema, input);

  const row: GoalContributionRow = {
    id: newId<GoalContributionId>(),
    goalId: data.goalId as GoalId,
    amount: asCents(data.amount),
    date: data.date as IsoDate,
    createdAt: nowIso(),
    ...(data.note !== undefined && { note: data.note }),
  };

  await db.transaction('rw', db.goalContributions, db.goals, async () => {
    const goal = await db.goals.get(row.goalId);
    if (!goal) throw new NotFoundError('Meta', row.goalId);
    if (goal.isArchived) {
      throw new ConflictError('La meta está archivada; reactívala para registrar aportes.');
    }
    await assertWithdrawalFits(row.goalId, row.amount);
    await db.goalContributions.add(row);
  });

  return row;
}

/**
 * Impide que un retiro deje la meta en negativo. No puede vivir en el esquema
 * Zod: depende del saldo acumulado en la base, no de la forma del dato.
 * `excludeId` permite reeditar un aporte sin contarse a sí mismo.
 */
async function assertWithdrawalFits(
  goalId: GoalId,
  amount: number,
  excludeId?: GoalContributionId,
): Promise<void> {
  if (amount >= 0) return;

  const rows = await db.goalContributions.where('goalId').equals(goalId).toArray();
  const balance = rows.filter((c) => c.id !== excludeId).reduce((acc, c) => acc + c.amount, 0);

  if (balance + amount < 0) {
    throw new ConflictError('El retiro supera el ahorro acumulado de la meta.');
  }
}

export async function updateContribution(
  id: GoalContributionId,
  input: ContributionUpdateInput,
): Promise<void> {
  const data = parseOrThrow(contributionUpdateSchema, input);

  await db.transaction('rw', db.goalContributions, async () => {
    const existing = await db.goalContributions.get(id);
    if (!existing) throw new NotFoundError('Aporte', id);

    const patch: Partial<GoalContributionRow> = {
      ...(data.amount !== undefined && { amount: asCents(data.amount) }),
      ...(data.date !== undefined && { date: data.date as IsoDate }),
      ...(data.note !== undefined && { note: data.note }),
    };

    // Editar también puede dejar la meta en negativo (p. ej. convertir un aporte
    // de +100 en un retiro de −100): mismo control que al crear.
    if (patch.amount !== undefined) {
      await assertWithdrawalFits(existing.goalId, patch.amount, id);
    }

    await db.goalContributions.update(id, patch);
  });
}

export async function deleteContribution(id: GoalContributionId): Promise<void> {
  const existing = await db.goalContributions.get(id);
  if (!existing) throw new NotFoundError('Aporte', id);
  await db.goalContributions.delete(id);
}
