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
import { NotFoundError } from '@/lib/errors';
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
    await db.goalContributions.add(row);
  });

  return row;
}

export async function updateContribution(
  id: GoalContributionId,
  input: ContributionUpdateInput,
): Promise<void> {
  const data = parseOrThrow(contributionUpdateSchema, input);
  const existing = await db.goalContributions.get(id);
  if (!existing) throw new NotFoundError('Aporte', id);

  const patch: Partial<GoalContributionRow> = {
    ...(data.amount !== undefined && { amount: asCents(data.amount) }),
    ...(data.date !== undefined && { date: data.date as IsoDate }),
    ...(data.note !== undefined && { note: data.note }),
  };
  await db.goalContributions.update(id, patch);
}

export async function deleteContribution(id: GoalContributionId): Promise<void> {
  await db.goalContributions.delete(id);
}
