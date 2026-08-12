import type { Cents } from '@/types/money';
import type { IsoDate, YearMonth } from '@/types/common';
import type {
  SettingsRow,
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

/**
 * El **Ledger**: una foto inmutable de los datos primarios, cargada de una sola
 * vez, de la que se derivan todas las métricas con funciones puras.
 *
 * Por qué existe (ADR: Ledger Facade). Antes cada `*Query` iba a Dexie por su
 * cuenta, y de ahí salieron dos clases de problema:
 *
 * 1. **Cálculos duplicados que discrepaban.** El saldo por tarjeta estaba
 *    implementado cuatro veces y el "total ahorrado", dos, con reglas distintas.
 *    Aquí cada magnitud vive en `LedgerIndex` una única vez, así que dos
 *    pantallas no pueden mostrar números distintos para lo mismo.
 * 2. **Lecturas repetidas.** `insightsQuery()` releía la tabla de movimientos
 *    tres o cuatro veces por llamada; ahora la lee una.
 *
 * Es el mismo patrón que `InsightRule` ya usaba en `lib/insights`: construir un
 * contexto una vez y pasarlo a funciones puras. Esto lo generaliza al resto.
 */

/** Saldo de una tarjeta derivado de sus consumos y pagos. */
export interface CardBalance {
  consumos: Cents;
  pagos: Cents;
  /** Deuda viva: consumos − pagos, nunca negativa. */
  balance: Cents;
}

/**
 * Índices y magnitudes derivadas que **más de una** métrica necesita. Todo lo
 * que esté aquí tiene, por construcción, una sola definición.
 */
export interface LedgerIndex {
  readonly categoryById: ReadonlyMap<CategoryId, CategoryRow>;
  readonly cardById: ReadonlyMap<CreditCardId, CreditCardRow>;
  readonly methodById: ReadonlyMap<PaymentMethodId, PaymentMethodRow>;
  readonly goalById: ReadonlyMap<GoalId, GoalRow>;
  readonly txByYearMonth: ReadonlyMap<YearMonth, readonly TransactionRow[]>;
  readonly contributionsByGoal: ReadonlyMap<GoalId, readonly GoalContributionRow[]>;
  /**
   * Única definición de la deuda por tarjeta. El clamp a cero es *por tarjeta*:
   * una tarjeta sobrepagada no cancela la deuda de otra. Incluye archivadas.
   */
  readonly cardBalances: ReadonlyMap<CreditCardId, CardBalance>;
  /** Única definición del ahorro por meta, con clamp **por meta**. */
  readonly savedByGoal: ReadonlyMap<GoalId, Cents>;
}

export interface Ledger {
  /** "Hoy", capturado una sola vez: todas las derivaciones comparten reloj. */
  readonly today: IsoDate;
  readonly currentYearMonth: YearMonth;
  readonly settings: SettingsRow | undefined;

  readonly transactions: readonly TransactionRow[];
  readonly categories: readonly CategoryRow[];
  readonly paymentMethods: readonly PaymentMethodRow[];
  readonly creditCards: readonly CreditCardRow[];
  readonly cardPayments: readonly CreditCardPaymentRow[];
  readonly statements: readonly CreditCardStatementRow[];
  readonly goals: readonly GoalRow[];
  readonly contributions: readonly GoalContributionRow[];
  readonly budgets: readonly BudgetRow[];

  readonly index: LedgerIndex;
}

/**
 * Una derivación es una función **pura** del ledger a un resultado. Mismo
 * contrato que `InsightRule`, generalizado a cualquier métrica.
 */
export type Derivation<Args extends unknown[], T> = (ledger: Ledger, ...args: Args) => T;

/**
 * Grupo de tablas que necesita una derivación. Acota qué lee `loadLedger` y, con
 * ello, ante qué escrituras revalida `useLiveQuery`: sin esto, cualquier cambio
 * en cualquier tabla re-ejecutaría todas las consultas de la app.
 */
export type LedgerScope = 'transactions' | 'cards' | 'goals' | 'budgets';
