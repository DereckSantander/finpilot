import Dexie, { type Table } from 'dexie';
import { defineSchema } from '@/db/migrations';
import type {
  SettingsRow,
  CategoryRow,
  PaymentMethodRow,
  TransactionRow,
  TagRow,
  AttachmentRow,
  CreditCardRow,
  CreditCardStatementRow,
  CreditCardPaymentRow,
  GoalRow,
  GoalContributionRow,
  BudgetRow,
  DepositScenarioRow,
  NetWorthSnapshotRow,
  ReminderRow,
  BackupRow,
} from '@/db/schema';

/**
 * Instancia única de la base de datos IndexedDB gestionada por Dexie.
 * La declaración de índices sigue database.md §2. El sembrado inicial se hace
 * en `db.on('populate')` (solo la primera vez que se crea la base).
 */
export class FinPilotDB extends Dexie {
  settings!: Table<SettingsRow, string>;
  categories!: Table<CategoryRow, string>;
  paymentMethods!: Table<PaymentMethodRow, string>;
  transactions!: Table<TransactionRow, string>;
  tags!: Table<TagRow, string>;
  attachments!: Table<AttachmentRow, string>;
  creditCards!: Table<CreditCardRow, string>;
  creditCardStatements!: Table<CreditCardStatementRow, string>;
  creditCardPayments!: Table<CreditCardPaymentRow, string>;
  goals!: Table<GoalRow, string>;
  goalContributions!: Table<GoalContributionRow, string>;
  budgets!: Table<BudgetRow, string>;
  depositScenarios!: Table<DepositScenarioRow, string>;
  netWorthSnapshots!: Table<NetWorthSnapshotRow, string>;
  reminders!: Table<ReminderRow, string>;
  backups!: Table<BackupRow, string>;

  constructor() {
    super('finpilot');
    defineSchema(this);
  }
}

/** Singleton exportado. Todos los `services` consumen esta instancia. */
export const db = new FinPilotDB();

/**
 * Garantiza que la base esté abierta. Se invoca en el arranque (main.tsx) para
 * detectar fallos de apertura de IndexedDB antes de renderizar la UI.
 */
export async function openDatabase(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}
