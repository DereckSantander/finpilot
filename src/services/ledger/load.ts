import { db } from '@/db/db';
import { todayIso, toYearMonth } from '@/lib/date';
import { asCents } from '@/types/money';
import type { Cents } from '@/types/money';
import type { Ledger, LedgerIndex, LedgerScope, CardBalance } from '@/services/ledger/types';
import type {
  TransactionRow,
  CategoryRow,
  PaymentMethodRow,
  CreditCardRow,
  CreditCardPaymentRow,
  CreditCardStatementRow,
  GoalRow,
  GoalContributionRow,
  BudgetRow,
} from '@/db/schema';
import type { CategoryId, CreditCardId, GoalId, PaymentMethodId } from '@/types/ids';
import type { YearMonth } from '@/types/common';

/** Tablas primarias que puede leer el ledger. */
type LedgerTable =
  | 'transactions'
  | 'categories'
  | 'paymentMethods'
  | 'creditCards'
  | 'creditCardPayments'
  | 'creditCardStatements'
  | 'goals'
  | 'goalContributions'
  | 'budgets';

/**
 * Qué tablas necesita cada ámbito. `transactions` aparece en varios porque los
 * consumos con tarjeta y el gasto presupuestado salen de la misma tabla.
 */
const TABLES_BY_SCOPE: Record<LedgerScope, readonly LedgerTable[]> = {
  transactions: ['transactions', 'categories', 'paymentMethods'],
  cards: ['transactions', 'creditCards', 'creditCardPayments', 'creditCardStatements'],
  goals: ['goals', 'goalContributions'],
  budgets: ['transactions', 'categories', 'budgets'],
};

const ALL_SCOPES: readonly LedgerScope[] = ['transactions', 'cards', 'goals', 'budgets'];

/**
 * Carga los datos primarios y construye los índices derivados.
 *
 * Sin `scopes` carga todo. Pasar los ámbitos justos evita leer tablas que la
 * derivación no usa y, sobre todo, evita que `useLiveQuery` revalide esa
 * consulta cuando cambia una tabla que no le incumbe.
 */
export async function loadLedger(scopes: readonly LedgerScope[] = ALL_SCOPES): Promise<Ledger> {
  const needed = new Set<LedgerTable>();
  for (const scope of scopes) {
    for (const table of TABLES_BY_SCOPE[scope]) needed.add(table);
  }

  const read = <T>(table: LedgerTable, load: () => Promise<T[]>): Promise<T[]> =>
    needed.has(table) ? load() : Promise.resolve([]);

  const [
    settings,
    transactions,
    categories,
    paymentMethods,
    creditCards,
    cardPayments,
    statements,
    goals,
    contributions,
    budgets,
  ] = await Promise.all([
    db.settings.get('app'),
    read<TransactionRow>('transactions', () => db.transactions.toArray()),
    read<CategoryRow>('categories', () => db.categories.toArray()),
    read<PaymentMethodRow>('paymentMethods', () => db.paymentMethods.toArray()),
    read<CreditCardRow>('creditCards', () => db.creditCards.toArray()),
    read<CreditCardPaymentRow>('creditCardPayments', () => db.creditCardPayments.toArray()),
    read<CreditCardStatementRow>('creditCardStatements', () => db.creditCardStatements.toArray()),
    read<GoalRow>('goals', () => db.goals.toArray()),
    read<GoalContributionRow>('goalContributions', () => db.goalContributions.toArray()),
    read<BudgetRow>('budgets', () => db.budgets.toArray()),
  ]);

  const today = todayIso();

  return {
    today,
    currentYearMonth: toYearMonth(today),
    settings,
    transactions,
    categories,
    paymentMethods,
    creditCards,
    cardPayments,
    statements,
    goals,
    contributions,
    budgets,
    index: buildIndex({
      transactions,
      categories,
      paymentMethods,
      creditCards,
      cardPayments,
      goals,
      contributions,
    }),
  };
}

/** Construye los índices y las magnitudes compartidas del ledger. */
function buildIndex(data: {
  transactions: readonly TransactionRow[];
  categories: readonly CategoryRow[];
  paymentMethods: readonly PaymentMethodRow[];
  creditCards: readonly CreditCardRow[];
  cardPayments: readonly CreditCardPaymentRow[];
  goals: readonly GoalRow[];
  contributions: readonly GoalContributionRow[];
}): LedgerIndex {
  const txByYearMonth = new Map<YearMonth, TransactionRow[]>();
  for (const tx of data.transactions) {
    const bucket = txByYearMonth.get(tx.yearMonth);
    if (bucket) bucket.push(tx);
    else txByYearMonth.set(tx.yearMonth, [tx]);
  }

  const contributionsByGoal = new Map<GoalId, GoalContributionRow[]>();
  for (const c of data.contributions) {
    const bucket = contributionsByGoal.get(c.goalId);
    if (bucket) bucket.push(c);
    else contributionsByGoal.set(c.goalId, [c]);
  }

  // Ahorro por meta, con clamp POR META: es el número que el usuario puede
  // verificar sumando las tarjetas de la pantalla de Metas.
  const savedByGoal = new Map<GoalId, Cents>();
  for (const [goalId, rows] of contributionsByGoal) {
    const net = rows.reduce((acc, c) => acc + c.amount, 0);
    savedByGoal.set(goalId, asCents(Math.max(net, 0)));
  }

  return {
    categoryById: new Map(data.categories.map((c) => [c.id as CategoryId, c])),
    cardById: new Map(data.creditCards.map((c) => [c.id, c])),
    methodById: new Map(data.paymentMethods.map((m) => [m.id as PaymentMethodId, m])),
    goalById: new Map(data.goals.map((g) => [g.id, g])),
    txByYearMonth,
    contributionsByGoal,
    cardBalances: buildCardBalances(data.transactions, data.cardPayments),
    savedByGoal,
  };
}

/**
 * Saldo por tarjeta: consumos (gastos con `creditCardId`) menos pagos, con el
 * clamp a cero aplicado **por tarjeta**. Única definición en toda la app.
 */
function buildCardBalances(
  transactions: readonly TransactionRow[],
  payments: readonly CreditCardPaymentRow[],
): ReadonlyMap<CreditCardId, CardBalance> {
  const totals = new Map<CreditCardId, { consumos: number; pagos: number }>();
  const entry = (cardId: CreditCardId) => {
    const found = totals.get(cardId) ?? { consumos: 0, pagos: 0 };
    totals.set(cardId, found);
    return found;
  };

  for (const tx of transactions) {
    if (tx.type === 'expense' && tx.creditCardId !== undefined) {
      entry(tx.creditCardId).consumos += tx.amount;
    }
  }
  for (const payment of payments) entry(payment.creditCardId).pagos += payment.amount;

  return new Map(
    [...totals.entries()].map(([cardId, { consumos, pagos }]) => [
      cardId,
      {
        consumos: asCents(consumos),
        pagos: asCents(pagos),
        balance: asCents(Math.max(consumos - pagos, 0)),
      },
    ]),
  );
}
