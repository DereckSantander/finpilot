import { addMonths, format, getDaysInMonth, isBefore, parseISO } from 'date-fns';
import { sumCents } from '@/lib/money';
import { toYearMonth } from '@/lib/date';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { CARD_UTILIZATION_DANGER } from '@/constants/config';
import { monthSeries } from '@/services/derive/series';
import type { Ledger, CardBalance } from '@/services/ledger/types';
import type { CreditCardRow, StatementStatus } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';
import type { IsoDate, YearMonth } from '@/types/common';

/**
 * Derivaciones de tarjetas de crédito. Todas leen el saldo de
 * `ledger.index.cardBalances`, que es la única definición de la deuda: antes el
 * detalle, el listado, el historial y los movimientos consultaban la base por
 * separado y recalculaban `consumos − pagos` cada uno por su cuenta.
 */

export interface CardSummary {
  card: CreditCardRow;
  currentBalance: Cents;
  utilization: number; // 0–1
  dueDate: IsoDate;
  daysUntilDue: number;
  status: StatementStatus | 'noStatement';
  isOverLimitWarning: boolean;
}

export interface CardDetail {
  card: CreditCardRow;
  consumosTotal: Cents;
  pagosTotal: Cents;
  currentBalance: Cents;
  available: Cents;
  utilization: number;
  dueDate: IsoDate;
  cutoffDate: IsoDate;
  daysUntilDue: number;
  monthConsumo: Cents;
  monthPago: Cents;
}

export interface CardHistoryMonth {
  yearMonth: YearMonth;
  label: string;
  consumo: Cents;
  pago: Cents;
  balance: Cents;
}

export interface CardMovement {
  id: string;
  kind: 'consumo' | 'pago';
  date: IsoDate;
  amount: Cents;
  description: string;
}

const EMPTY_BALANCE: CardBalance = {
  consumos: ZERO_CENTS,
  pagos: ZERO_CENTS,
  balance: ZERO_CENTS,
};

/**
 * Próxima ocurrencia mensual de un día (corte y pago). Si el mes no tiene ese
 * día (p. ej. el 31 en febrero) se usa el último día del mes, en lugar de
 * recortar todos los días al 28 como se hacía antes.
 */
function nextMonthlyDate(dayOfMonth: number, today: IsoDate): IsoDate {
  const now = parseISO(today);
  const onMonth = (year: number, month: number) => {
    const lastDay = getDaysInMonth(new Date(year, month, 1));
    return new Date(year, month, Math.min(dayOfMonth, lastDay));
  };

  let next = onMonth(now.getFullYear(), now.getMonth());
  if (isBefore(next, new Date(now.getFullYear(), now.getMonth(), now.getDate()))) {
    const following = addMonths(new Date(now.getFullYear(), now.getMonth(), 1), 1);
    next = onMonth(following.getFullYear(), following.getMonth());
  }
  return format(next, 'yyyy-MM-dd') as IsoDate;
}

/** Días desde `today` hasta una fecha ISO (0 si ya pasó). */
function daysUntil(iso: IsoDate, today: IsoDate): number {
  const ms = parseISO(iso).getTime() - parseISO(today).getTime();
  return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 0);
}

/** Deuda total de tarjetas = suma de las deudas de cada tarjeta. */
export function deriveTotalCardDebt(ledger: Ledger): Cents {
  return asCents([...ledger.index.cardBalances.values()].reduce((acc, b) => acc + b.balance, 0));
}

/** Resumen de tarjetas para listados y dashboard. */
export function deriveCardsSummary(ledger: Ledger): CardSummary[] {
  // Se listan las activas y, además, las archivadas que aún deban dinero: si no,
  // su deuda desaparecería del listado pero seguiría contando en el dashboard.
  const visible = ledger.creditCards.filter(
    (card) => !card.isArchived || (ledger.index.cardBalances.get(card.id)?.balance ?? 0) > 0,
  );

  return visible.map((card) => {
    const balance = ledger.index.cardBalances.get(card.id)?.balance ?? ZERO_CENTS;
    const utilization = card.creditLimit > 0 ? balance / card.creditLimit : 0;
    const dueDate = nextMonthlyDate(card.paymentDueDay, ledger.today);

    return {
      card,
      currentBalance: balance,
      utilization,
      dueDate,
      daysUntilDue: daysUntil(dueDate, ledger.today),
      status: balance === 0 ? 'paid' : 'open',
      isOverLimitWarning: utilization >= CARD_UTILIZATION_DANGER,
    };
  });
}

/** Consumos (gastos) de una tarjeta. */
function consumosOf(ledger: Ledger, cardId: CreditCardId) {
  return ledger.transactions.filter((t) => t.type === 'expense' && t.creditCardId === cardId);
}

/** Pagos registrados de una tarjeta. */
function pagosOf(ledger: Ledger, cardId: CreditCardId) {
  return ledger.cardPayments.filter((p) => p.creditCardId === cardId);
}

export function deriveCardDetail(ledger: Ledger, cardId: CreditCardId): CardDetail | undefined {
  const card = ledger.index.cardById.get(cardId);
  if (!card) return undefined;

  // El saldo sale del índice compartido, no de un recuento propio: así el
  // detalle no puede discrepar del listado ni del KPI del dashboard.
  const {
    consumos: consumosTotal,
    pagos: pagosTotal,
    balance,
  } = ledger.index.cardBalances.get(cardId) ?? EMPTY_BALANCE;

  const ym = ledger.currentYearMonth;
  const monthConsumo = sumCents(
    consumosOf(ledger, cardId)
      .filter((t) => t.yearMonth === ym)
      .map((t) => t.amount),
  );
  const monthPago = sumCents(
    pagosOf(ledger, cardId)
      .filter((p) => toYearMonth(p.date) === ym)
      .map((p) => p.amount),
  );

  const dueDate = nextMonthlyDate(card.paymentDueDay, ledger.today);

  return {
    card,
    consumosTotal,
    pagosTotal,
    currentBalance: balance,
    available: asCents(Math.max(card.creditLimit - balance, 0)),
    utilization: card.creditLimit > 0 ? balance / card.creditLimit : 0,
    dueDate,
    cutoffDate: nextMonthlyDate(card.cutoffDay, ledger.today),
    daysUntilDue: daysUntil(dueDate, ledger.today),
    monthConsumo,
    monthPago,
  };
}

/** Historial mensual de una tarjeta (consumos y pagos por mes). */
export function deriveCardHistory(
  ledger: Ledger,
  cardId: CreditCardId,
  months = 6,
): CardHistoryMonth[] {
  const consumos = consumosOf(ledger, cardId);
  const pagos = pagosOf(ledger, cardId);

  return monthSeries(ledger.currentYearMonth, months, (ym) => {
    const consumo = sumCents(consumos.filter((t) => t.yearMonth === ym).map((t) => t.amount));
    const pago = sumCents(pagos.filter((p) => toYearMonth(p.date) === ym).map((p) => p.amount));
    return { consumo, pago, balance: asCents(consumo - pago) };
  });
}

/** Movimientos de una tarjeta: consumos y pagos mezclados, por fecha desc. */
export function deriveCardMovements(ledger: Ledger, cardId: CreditCardId): CardMovement[] {
  const consumos: CardMovement[] = consumosOf(ledger, cardId).map((t) => ({
    id: t.id,
    kind: 'consumo',
    date: t.date,
    amount: t.amount,
    description: t.description || 'Consumo',
  }));

  const pagos: CardMovement[] = pagosOf(ledger, cardId).map((p) => ({
    id: p.id,
    kind: 'pago',
    date: p.date,
    amount: p.amount,
    description: 'Pago',
  }));

  return [...consumos, ...pagos].sort((a, b) => (a.date < b.date ? 1 : -1));
}
