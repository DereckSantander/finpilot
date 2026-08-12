import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { asCents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import { buildPatch } from '@/lib/repository/patch';
import {
  depositCreateSchema,
  depositUpdateSchema,
  type DepositCreateInput,
  type DepositUpdateInput,
} from '@/lib/validation/deposits.schema';
import { NotFoundError } from '@/lib/errors';
import type { DepositScenarioRow } from '@/db/schema';
import type { DepositScenarioId } from '@/types/ids';

/** CRUD de escenarios del simulador de depósitos a plazo (pólizas). */

export function depositScenariosQuery(): Promise<DepositScenarioRow[]> {
  return db.depositScenarios.orderBy('createdAt').reverse().toArray();
}

export async function getDepositScenario(id: DepositScenarioId): Promise<DepositScenarioRow> {
  const row = await db.depositScenarios.get(id);
  if (!row) throw new NotFoundError('Escenario de depósito', id);
  return row;
}

export async function createDepositScenario(
  input: DepositCreateInput,
): Promise<DepositScenarioRow> {
  const data = parseOrThrow(depositCreateSchema, input);
  const timestamp = nowIso();

  const row: DepositScenarioRow = {
    id: newId<DepositScenarioId>(),
    name: data.name,
    principal: asCents(data.principal),
    annualRate: data.annualRate,
    termMonths: data.termMonths,
    compounding: data.compounding,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.depositScenarios.add(row);
  return row;
}

export async function updateDepositScenario(
  id: DepositScenarioId,
  input: DepositUpdateInput,
): Promise<void> {
  const data = parseOrThrow(depositUpdateSchema, input);
  await getDepositScenario(id);

  const { patch } = buildPatch<DepositScenarioRow, DepositUpdateInput>(data, {
    name: true,
    annualRate: true,
    termMonths: true,
    compounding: true,
    principal: asCents,
  });
  patch.updatedAt = nowIso();

  await db.depositScenarios.update(id, patch);
}

export async function deleteDepositScenario(id: DepositScenarioId): Promise<void> {
  await db.depositScenarios.delete(id);
}
