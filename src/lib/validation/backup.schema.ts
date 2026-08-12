import { z } from 'zod';

/**
 * Esquema de validación del archivo de respaldo (F11). Valida la envoltura y que
 * cada tabla sea un arreglo de registros; la forma fina de cada fila ya la
 * garantizan los servicios al haberla escrito. Import defensivo: un JSON ajeno
 * o corrupto se rechaza con `ValidationError` antes de tocar la base.
 */

/** Un arreglo de filas (objetos). Permisivo con los campos internos. */
const zTable = z.array(z.record(z.string(), z.unknown()));

/**
 * `settings` es la única tabla con fila obligatoria: la app entera se bloquea en
 * el splash si `settings/app` no existe (SettingsProvider) y `db.on('populate')`
 * solo dispara al crear la base, así que no habría forma de recuperarse desde la
 * interfaz. Un respaldo sin ella se rechaza antes de tocar nada.
 */
const zSettingsTable = zTable
  .length(1, { message: 'El respaldo no contiene la configuración de la aplicación.' })
  .refine((rows) => rows[0]?.id === 'app', {
    message: 'La configuración del respaldo es inválida (falta la fila `app`).',
  });

/** Tablas incluidas en el respaldo (los binarios de adjuntos se omiten). */
export const backupTablesSchema = z.object({
  settings: zSettingsTable,
  categories: zTable,
  paymentMethods: zTable,
  transactions: zTable,
  tags: zTable,
  creditCards: zTable,
  creditCardStatements: zTable,
  creditCardPayments: zTable,
  goals: zTable,
  goalContributions: zTable,
  budgets: zTable,
  depositScenarios: zTable,
  netWorthSnapshots: zTable,
  reminders: zTable,
});

export const backupFileSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string().min(1),
  tables: backupTablesSchema,
});

export type BackupFile = z.infer<typeof backupFileSchema>;
export type BackupTables = z.infer<typeof backupTablesSchema>;

/** Nombres de las tablas restaurables, en orden de dependencia. */
export const RESTORABLE_TABLES = Object.keys(backupTablesSchema.shape) as (keyof BackupTables)[];
