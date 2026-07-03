import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { SCHEMA_VERSION } from '@/constants/config';
import type { BackupRow } from '@/db/schema';
import type { BackupId } from '@/types/ids';

/**
 * Gestión de respaldos locales. Serializa las tablas de datos (los comprobantes
 * en Blob se resguardan en la Fase 10, respaldo completo) a un JSON almacenado
 * en la tabla `backups`, con política de retención.
 */

export function backupsQuery(): Promise<BackupRow[]> {
  return db.backups.orderBy('createdAt').reverse().toArray();
}

/** Ensambla un objeto serializable con el contenido de todas las tablas de datos. */
async function collectData(): Promise<Record<string, unknown>> {
  const [
    settings,
    categories,
    paymentMethods,
    transactions,
    tags,
    creditCards,
    creditCardStatements,
    creditCardPayments,
    goals,
    goalContributions,
    budgets,
    depositScenarios,
    netWorthSnapshots,
    reminders,
  ] = await Promise.all([
    db.settings.toArray(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
    db.transactions.toArray(),
    db.tags.toArray(),
    db.creditCards.toArray(),
    db.creditCardStatements.toArray(),
    db.creditCardPayments.toArray(),
    db.goals.toArray(),
    db.goalContributions.toArray(),
    db.budgets.toArray(),
    db.depositScenarios.toArray(),
    db.netWorthSnapshots.toArray(),
    db.reminders.toArray(),
  ]);

  return {
    settings,
    categories,
    paymentMethods,
    transactions,
    tags,
    creditCards,
    creditCardStatements,
    creditCardPayments,
    goals,
    goalContributions,
    budgets,
    depositScenarios,
    netWorthSnapshots,
    reminders,
  };
}

/** Crea un respaldo local y aplica la retención indicada. */
export async function createLocalBackup(keep = 5): Promise<BackupRow> {
  const data = await collectData();
  const payloadText = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    tables: data,
  });
  const payload = new Blob([payloadText], { type: 'application/json' });

  const row: BackupRow = {
    id: newId<BackupId>(),
    createdAt: nowIso(),
    schemaVersion: SCHEMA_VERSION,
    sizeBytes: payload.size,
    payload,
  };

  await db.backups.add(row);
  await pruneBackups(keep);
  return row;
}

/** Conserva solo los `keep` respaldos más recientes. */
export async function pruneBackups(keep: number): Promise<void> {
  const all = await db.backups.orderBy('createdAt').reverse().toArray();
  const excess = all.slice(keep);
  if (excess.length > 0) {
    await db.backups.bulkDelete(excess.map((b) => b.id));
  }
}

export async function deleteBackup(id: BackupId): Promise<void> {
  await db.backups.delete(id);
}
