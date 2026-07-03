import type { FinPilotDB } from '@/db/db';
import { populate } from '@/db/seed';

/**
 * Definición de versiones del esquema y migraciones (database.md §6).
 *
 * Estrategia:
 * - Cada cambio de esquema incrementa `this.version(n)` y declara sus `stores`.
 * - Las migraciones son aditivas y no destructivas siempre que sea posible; una
 *   destructiva exige respaldo automático previo.
 * - `db.on('populate')` siembra los datos iniciales SOLO en la primera creación.
 * - El nº de versión aquí debe coincidir con `SCHEMA_VERSION` en constants/config.
 *
 * Para añadir una versión nueva en el futuro, NO se edita la v1: se encadena una
 * nueva llamada `db.version(2).stores({...}).upgrade(async (tx) => { ... })`.
 * Ejemplo (plantilla):
 *
 *   db.version(2)
 *     .stores({ transactions: 'id, ..., nuevoIndice' })
 *     .upgrade(async (tx) => {
 *       await tx.table('transactions').toCollection().modify((row) => {
 *         row.nuevoCampo = valorPorDefecto;
 *       });
 *     });
 */
export function defineSchema(db: FinPilotDB): void {
  // v1 — esquema base (Fase 1 + Fase 2).
  db.version(1).stores({
    settings: 'id',
    categories: 'id, type, name, isArchived, sortOrder',
    paymentMethods: 'id, type, isArchived',
    transactions:
      'id, type, date, yearMonth, categoryId, paymentMethodId, creditCardId, [type+yearMonth]',
    tags: 'id, &name',
    attachments: 'id, transactionId',
    creditCards: 'id, isArchived',
    creditCardStatements: 'id, creditCardId, yearMonth, [creditCardId+yearMonth]',
    creditCardPayments: 'id, creditCardId, statementId, date',
    goals: 'id, priority, targetDate, isArchived, isEmergencyFund',
    goalContributions: 'id, goalId, date',
    budgets: 'id, yearMonth, categoryId, [yearMonth+categoryId]',
    depositScenarios: 'id, createdAt',
    netWorthSnapshots: 'id, date',
    reminders: 'id, dueDate, isDone',
    backups: 'id, createdAt',
  });

  // El sembrado inicial se ejecuta una única vez al crear la base.
  db.on('populate', () => populate(db));
}
