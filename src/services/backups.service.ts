import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { SCHEMA_VERSION } from '@/constants/config';
import { parseOrThrow } from '@/lib/validation/parse';
import { backupFileSchema, RESTORABLE_TABLES } from '@/lib/validation/backup.schema';
import { downloadBlob, fileDateStamp } from '@/lib/download';
import { ValidationError } from '@/lib/errors';
import { APP_NAME } from '@/constants/config';
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

/** Envoltura serializable del respaldo (esquema + fecha + tablas). */
async function buildBackupEnvelope(): Promise<Record<string, unknown>> {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    tables: await collectData(),
  };
}

/** Crea un respaldo local y aplica la retención indicada. */
export async function createLocalBackup(keep = 5): Promise<BackupRow> {
  const payloadText = JSON.stringify(await buildBackupEnvelope());
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

// --- Exportar / importar a archivo ----------------------------------------

/** Descarga un respaldo completo como archivo JSON. */
export async function exportBackupFile(): Promise<void> {
  const payloadText = JSON.stringify(await buildBackupEnvelope(), null, 2);
  const blob = new Blob([payloadText], { type: 'application/json' });
  downloadBlob(blob, `${APP_NAME.toLowerCase()}-respaldo-${fileDateStamp()}.json`);
}

/** Descarga un respaldo ya almacenado en la tabla `backups`. */
export async function downloadStoredBackup(id: BackupId): Promise<void> {
  const row = await db.backups.get(id);
  if (!row) throw new ValidationError('El respaldo no existe.');
  const stamp = fileDateStamp(new Date(row.createdAt));
  downloadBlob(row.payload, `${APP_NAME.toLowerCase()}-respaldo-${stamp}.json`);
}

export interface RestoreSummary {
  tables: number;
  rows: number;
}

/**
 * Restaura un respaldo desde un archivo. Valida con Zod y reemplaza el contenido
 * de las tablas de datos dentro de una única transacción (atómico: si algo falla,
 * no se aplica nada). No toca `attachments` ni `backups`.
 */
export async function importBackupFile(file: File): Promise<RestoreSummary> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new ValidationError('El archivo de respaldo no es un JSON válido.');
  }

  const backup = parseOrThrow(backupFileSchema, raw);
  const restoreTables = RESTORABLE_TABLES.filter((name) => db.tables.some((t) => t.name === name));

  let rows = 0;
  await db.transaction(
    'rw',
    restoreTables.map((name) => db.table(name)),
    async () => {
      for (const name of restoreTables) {
        const table = db.table(name);
        const records = backup.tables[name] ?? [];
        await table.clear();
        if (records.length > 0) {
          await table.bulkPut(records);
          rows += records.length;
        }
      }
    },
  );

  return { tables: restoreTables.length, rows };
}
