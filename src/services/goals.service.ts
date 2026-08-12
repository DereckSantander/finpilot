import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { sumCents } from '@/lib/money';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import { buildPatch } from '@/lib/repository/patch';
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

/**
 * Invariante: como máximo una meta es el fondo de emergencia. Tanto
 * `emergencyFundGoalQuery` como `emergencyFundStatusQuery` lo resuelven con
 * `.first()`, así que dos metas marcadas harían que ganase una arbitraria.
 *
 * Se filtra en memoria a propósito: IndexedDB no indexa booleanos, de modo que
 * el índice `isEmergencyFund` declarado en db/migrations.ts no devuelve nada.
 */
async function setSoleEmergencyFund(keepId: GoalId): Promise<void> {
  await db.goals
    .filter((g) => g.isEmergencyFund && g.id !== keepId)
    .modify((g) => {
      g.isEmergencyFund = false;
      g.updatedAt = nowIso();
    });
}

/**
 * Desvincula `settings.emergencyFund.linkedGoalId` si apunta a esta meta. Se
 * usa al archivar y al eliminar: una meta archivada desaparece de todas las
 * consultas, así que dejar el enlace apuntándola deja la configuración mintiendo.
 */
async function unlinkEmergencyFundGoal(id: GoalId): Promise<void> {
  const settings = await db.settings.get('app');
  if (settings?.emergencyFund.linkedGoalId !== id) return;

  const { linkedGoalId: _removed, ...emergencyFund } = settings.emergencyFund;
  await db.settings.update('app', { emergencyFund, updatedAt: nowIso() });
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

  await db.transaction('rw', db.goals, async () => {
    await db.goals.add(row);
    if (row.isEmergencyFund) await setSoleEmergencyFund(row.id);
  });
  return row;
}

export async function updateGoal(id: GoalId, input: GoalUpdateInput): Promise<void> {
  const data = parseOrThrow(goalUpdateSchema, input);
  await getGoal(id);

  const { patch } = buildPatch<GoalRow, GoalUpdateInput>(data, {
    name: true,
    priority: true,
    color: true,
    icon: true,
    isEmergencyFund: true,
    isArchived: true,
    targetAmount: asCents,
    targetDate: (v) => v as IsoDate,
  });
  patch.updatedAt = nowIso();

  await db.transaction('rw', db.goals, db.settings, async () => {
    await db.goals.update(id, patch);
    if (data.isEmergencyFund === true) await setSoleEmergencyFund(id);
    if (data.isArchived === true) await unlinkEmergencyFundGoal(id);
  });
}

export async function archiveGoal(id: GoalId, archived = true): Promise<void> {
  await getGoal(id);
  await db.transaction('rw', db.goals, db.settings, async () => {
    await db.goals.update(id, { isArchived: archived, updatedAt: nowIso() });
    if (archived) await unlinkEmergencyFundGoal(id);
  });
}

/** Elimina una meta y todos sus aportes (cascada). */
export async function deleteGoal(id: GoalId): Promise<void> {
  await getGoal(id);
  await db.transaction('rw', db.goals, db.goalContributions, db.settings, async () => {
    await db.goalContributions.where('goalId').equals(id).delete();
    await unlinkEmergencyFundGoal(id);
    await db.goals.delete(id);
  });
}

/** Ahorro acumulado de una meta (suma de aportes). */
export async function savedAmount(id: GoalId): Promise<Cents> {
  const contributions = await db.goalContributions.where('goalId').equals(id).toArray();
  return contributions.length > 0 ? sumCents(contributions.map((c) => c.amount)) : ZERO_CENTS;
}
