import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { sumCents } from '@/lib/money';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  goalCreateSchema,
  goalUpdateSchema,
  type GoalCreateInput,
  type GoalUpdateInput,
} from '@/lib/validation/goals.schema';
import { NotFoundError } from '@/lib/errors';
import type { GoalRow } from '@/db/schema';
import type { GoalId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

/** CRUD de metas. El ahorro acumulado se deriva de los aportes (ADR-0007). */

export function goalsQuery(): Promise<GoalRow[]> {
  return db.goals.filter((g) => !g.isArchived).toArray();
}

export function emergencyFundGoalQuery(): Promise<GoalRow | undefined> {
  return db.goals.filter((g) => g.isEmergencyFund && !g.isArchived).first();
}

export async function getGoal(id: GoalId): Promise<GoalRow> {
  const row = await db.goals.get(id);
  if (!row) throw new NotFoundError('Meta', id);
  return row;
}

export async function createGoal(input: GoalCreateInput): Promise<GoalRow> {
  const data = parseOrThrow(goalCreateSchema, input);
  const timestamp = nowIso();

  const row: GoalRow = {
    id: newId<GoalId>(),
    name: data.name,
    targetAmount: asCents(data.targetAmount),
    priority: data.priority,
    color: data.color,
    icon: data.icon,
    isEmergencyFund: data.isEmergencyFund,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(data.targetDate !== undefined && { targetDate: data.targetDate as IsoDate }),
  };

  await db.goals.add(row);
  return row;
}

export async function updateGoal(id: GoalId, input: GoalUpdateInput): Promise<void> {
  const data = parseOrThrow(goalUpdateSchema, input);
  await getGoal(id);

  const patch: Partial<GoalRow> = {
    updatedAt: nowIso(),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.targetAmount !== undefined && { targetAmount: asCents(data.targetAmount) }),
    ...(data.targetDate !== undefined && { targetDate: data.targetDate as IsoDate }),
    ...(data.priority !== undefined && { priority: data.priority }),
    ...(data.color !== undefined && { color: data.color }),
    ...(data.icon !== undefined && { icon: data.icon }),
    ...(data.isEmergencyFund !== undefined && { isEmergencyFund: data.isEmergencyFund }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
  };
  await db.goals.update(id, patch);
}

export async function archiveGoal(id: GoalId, archived = true): Promise<void> {
  await getGoal(id);
  await db.goals.update(id, { isArchived: archived, updatedAt: nowIso() });
}

/** Elimina una meta y todos sus aportes (cascada). */
export async function deleteGoal(id: GoalId): Promise<void> {
  await getGoal(id);
  await db.transaction('rw', db.goals, db.goalContributions, db.settings, async () => {
    await db.goalContributions.where('goalId').equals(id).delete();
    // Si la meta estaba vinculada como fondo de emergencia en settings, se desvincula.
    const settings = await db.settings.get('app');
    if (settings?.emergencyFund.linkedGoalId === id) {
      const { linkedGoalId: _removed, ...emergencyFund } = settings.emergencyFund;
      await db.settings.update('app', { emergencyFund, updatedAt: nowIso() });
    }
    await db.goals.delete(id);
  });
}

/** Ahorro acumulado de una meta (suma de aportes). */
export async function savedAmount(id: GoalId): Promise<Cents> {
  const contributions = await db.goalContributions.where('goalId').equals(id).toArray();
  return contributions.length > 0 ? sumCents(contributions.map((c) => c.amount)) : ZERO_CENTS;
}
