import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { asCents } from '@/types/money';
import { toYearMonth } from '@/lib/date';
import type {
  SettingsRow,
  CategoryRow,
  GoalRow,
  GoalContributionRow,
  BudgetRow,
  CreditCardRow,
  CreditCardPaymentRow,
  CreditCardStatementRow,
  StatementStatus,
  PaymentMethodRow,
  TransactionRow,
} from '@/db/schema';
import type {
  CategoryId,
  GoalId,
  GoalContributionId,
  BudgetId,
  CreditCardId,
  CreditCardPaymentId,
  CreditCardStatementId,
  PaymentMethodId,
  TransactionId,
} from '@/types/ids';
import type { IsoDate, IsoDateTime, YearMonth } from '@/types/common';

/** Categorías fijas usadas en las pruebas de servicios. */
export const EXPENSE_CAT = 'cat-exp' as CategoryId;
export const INCOME_CAT = 'cat-inc' as CategoryId;

const NOW = '2026-01-01T00:00:00.000Z' as IsoDateTime;

/** Limpia todas las tablas y siembra configuración + dos categorías conocidas. */
export async function resetDb(): Promise<void> {
  if (!db.isOpen()) await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));

  const settings: SettingsRow = {
    id: 'app',
    currency: 'USD',
    locale: 'es',
    theme: 'system',
    startOfMonth: 1,
    monthlySavingsTarget: asCents(30_000),
    emergencyFund: { targetMonths: [3, 6, 12] },
    autoBackup: { enabled: false, frequencyDays: 7, keep: 5 },
    onboardingCompleted: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.settings.put(settings);

  const cat = (id: CategoryId, name: string, type: CategoryRow['type']): CategoryRow => ({
    id,
    name,
    type,
    color: '#0d9488',
    icon: 'Tag',
    isSystem: true,
    isArchived: false,
    sortOrder: 0,
    createdAt: NOW,
    updatedAt: NOW,
  });
  await db.categories.bulkPut([
    cat(EXPENSE_CAT, 'Gastos', 'expense'),
    cat(INCOME_CAT, 'Sueldo', 'income'),
  ]);
}

/** Inserta una aportación a una meta (para controlar el ahorro). */
export async function addContribution(goalId: GoalId, amount: number, date: string): Promise<void> {
  const row: GoalContributionRow = {
    id: newId<GoalContributionId>(),
    goalId,
    amount: asCents(amount),
    date: date as IsoDate,
    createdAt: NOW,
  };
  await db.goalContributions.add(row);
}

/** Inserta una meta y devuelve su id. */
export async function addGoal(
  name: string,
  target: number,
  opts: { isEmergencyFund?: boolean } = {},
): Promise<GoalId> {
  const id = newId<GoalId>();
  const row: GoalRow = {
    id,
    name,
    targetAmount: asCents(target),
    priority: 'medium',
    color: '#0d9488',
    icon: 'Target',
    isEmergencyFund: opts.isEmergencyFund ?? false,
    isArchived: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.goals.add(row);
  return id;
}

/** Inserta un presupuesto para un mes/categoría. */
export async function addBudget(
  yearMonth: string,
  amount: number,
  categoryId?: CategoryId,
): Promise<void> {
  const row: BudgetRow = {
    id: newId<BudgetId>(),
    yearMonth: yearMonth as YearMonth,
    amount: asCents(amount),
    createdAt: NOW,
    updatedAt: NOW,
    ...(categoryId ? { categoryId } : {}),
  };
  await db.budgets.add(row);
}

/** Inserta una tarjeta de crédito y devuelve su id. */
export async function addCard(
  name: string,
  opts: {
    creditLimit?: number;
    cutoffDay?: number;
    paymentDueDay?: number;
    isArchived?: boolean;
  } = {},
): Promise<CreditCardId> {
  const id = newId<CreditCardId>();
  const row: CreditCardRow = {
    id,
    name,
    bank: 'Banco',
    creditLimit: asCents(opts.creditLimit ?? 200_000),
    cutoffDay: opts.cutoffDay ?? 5,
    paymentDueDay: opts.paymentDueDay ?? 20,
    color: '#0d9488',
    isArchived: opts.isArchived ?? false,
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.creditCards.add(row);
  return id;
}

/** Inserta un método de pago, opcionalmente vinculado a una tarjeta. */
export async function addPaymentMethod(
  name: string,
  opts: { type?: PaymentMethodRow['type']; creditCardId?: CreditCardId } = {},
): Promise<PaymentMethodId> {
  const id = newId<PaymentMethodId>();
  const row: PaymentMethodRow = {
    id,
    name,
    type: opts.type ?? 'cash',
    isArchived: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...(opts.creditCardId ? { creditCardId: opts.creditCardId } : {}),
  };
  await db.paymentMethods.add(row);
  return id;
}

/** Inserta un pago de tarjeta y devuelve su id. */
export async function addCardPayment(
  creditCardId: CreditCardId,
  amount: number,
  date: string,
  opts: { statementId?: CreditCardStatementId } = {},
): Promise<CreditCardPaymentId> {
  const id = newId<CreditCardPaymentId>();
  const row: CreditCardPaymentRow = {
    id,
    creditCardId,
    amount: asCents(amount),
    date: date as IsoDate,
    createdAt: NOW,
    ...(opts.statementId ? { statementId: opts.statementId } : {}),
  };
  await db.creditCardPayments.add(row);
  return id;
}

/** Inserta un corte mensual de tarjeta y devuelve su id. */
export async function addStatement(
  creditCardId: CreditCardId,
  opts: {
    yearMonth?: string;
    statementBalance?: number;
    minimumPayment?: number;
    paidAmount?: number;
    status?: StatementStatus;
    cutoffDate?: string;
    dueDate?: string;
  } = {},
): Promise<CreditCardStatementId> {
  const id = newId<CreditCardStatementId>();
  const yearMonth = (opts.yearMonth ?? '2026-07') as YearMonth;
  const row: CreditCardStatementRow = {
    id,
    creditCardId,
    yearMonth,
    cutoffDate: (opts.cutoffDate ?? `${yearMonth}-05`) as IsoDate,
    dueDate: (opts.dueDate ?? `${yearMonth}-20`) as IsoDate,
    statementBalance: asCents(opts.statementBalance ?? 0),
    minimumPayment: asCents(opts.minimumPayment ?? 0),
    paidAmount: asCents(opts.paidAmount ?? 0),
    status: opts.status ?? 'open',
    createdAt: NOW,
    updatedAt: NOW,
  };
  await db.creditCardStatements.add(row);
  return id;
}

/**
 * Escribe un movimiento directamente en Dexie, saltándose la validación y la
 * derivación de `creditCardId` del servicio. Permite construir en las pruebas
 * los estados inconsistentes que producen los bugs (p. ej. un gasto con método
 * de crédito pero sin tarjeta asociada), imposibles de crear vía `createTransaction`.
 */
export async function addTransactionRow(
  row: Omit<Partial<TransactionRow>, 'amount' | 'date' | 'yearMonth'> & {
    type: TransactionRow['type'];
    /** En centavos, como número plano (se marca con `asCents`). */
    amount: number;
    /** "YYYY-MM-DD". */
    date: string;
    yearMonth?: string;
  },
): Promise<TransactionId> {
  const { amount, date, yearMonth, ...rest } = row;
  const id = rest.id ?? newId<TransactionId>();
  const full: TransactionRow = {
    categoryId: row.type === 'income' ? INCOME_CAT : EXPENSE_CAT,
    description: 'Movimiento de prueba',
    tags: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...rest,
    id,
    amount: asCents(amount),
    date: date as IsoDate,
    yearMonth: (yearMonth as YearMonth | undefined) ?? toYearMonth(date as IsoDate),
  };
  await db.transactions.add(full);
  return id;
}

/** Aplica un parche a la fila única de configuración. */
export async function patchSettings(patch: Partial<SettingsRow>): Promise<void> {
  await db.settings.update('app', patch);
}
