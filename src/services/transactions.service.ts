import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso, todayIso, currentTime, toYearMonth } from '@/lib/date';
import { sumCents } from '@/lib/money';
import { asCents, type Cents } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  transactionCreateSchema,
  transactionUpdateSchema,
  quickExpenseSchema,
  type TransactionCreateInput,
  type TransactionUpdateInput,
  type QuickExpenseInput,
} from '@/lib/validation/transactions.schema';
import { ensureTagsExist } from '@/services/tags.service';
import { deleteAttachmentByTransaction } from '@/services/attachments.service';
import { NotFoundError } from '@/lib/errors';
import type { TransactionRow } from '@/db/schema';
import type { TransactionType, YearMonth, IsoDate } from '@/types/common';
import type {
  TransactionId,
  CategoryId,
  PaymentMethodId,
  CreditCardId,
  AttachmentId,
} from '@/types/ids';

/**
 * Servicio de movimientos: núcleo de la Fase 2 (ingresos y gastos). Deriva
 * `yearMonth` de la fecha, sincroniza etiquetas y mantiene la integridad con
 * adjuntos. Todas las lecturas se exponen como *queries* para `useLiveQuery`.
 */

export interface TransactionFilter {
  type?: TransactionType;
  yearMonth?: YearMonth;
  categoryId?: CategoryId;
  paymentMethodId?: PaymentMethodId;
  creditCardId?: CreditCardId;
  /** Filtra por una etiqueta concreta. */
  tag?: string;
  /** Búsqueda en descripción, notas y etiquetas. */
  search?: string;
  from?: IsoDate;
  to?: IsoDate;
}

export interface MonthlyTotals {
  income: Cents;
  expense: Cents;
  balance: Cents;
  count: number;
}

// --- Lecturas -------------------------------------------------------------

export async function getTransaction(id: TransactionId): Promise<TransactionRow> {
  const row = await db.transactions.get(id);
  if (!row) throw new NotFoundError('Movimiento', id);
  return row;
}

/** Ordena por fecha y hora descendente (más recientes primero). */
function sortByDateTimeDesc(rows: TransactionRow[]): TransactionRow[] {
  return rows.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    const at = a.time ?? '';
    const bt = b.time ?? '';
    if (at !== bt) return at < bt ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/**
 * Construye la consulta de movimientos aplicando el filtro. Elige el índice más
 * selectivo disponible y afina el resto en memoria. Devuelve una promesa apta
 * para `useLiveQuery`.
 */
export async function transactionsQuery(filter: TransactionFilter = {}): Promise<TransactionRow[]> {
  const { type, yearMonth, categoryId, paymentMethodId, creditCardId, tag, from, to } = filter;
  const search = filter.search?.trim().toLowerCase();

  let rows: TransactionRow[];
  if (type && yearMonth) {
    rows = await db.transactions.where('[type+yearMonth]').equals([type, yearMonth]).toArray();
  } else if (yearMonth) {
    rows = await db.transactions.where('yearMonth').equals(yearMonth).toArray();
  } else if (type) {
    rows = await db.transactions.where('type').equals(type).toArray();
  } else if (categoryId) {
    rows = await db.transactions.where('categoryId').equals(categoryId).toArray();
  } else {
    rows = await db.transactions.toArray();
  }

  const filtered = rows.filter((tx) => {
    if (categoryId && tx.categoryId !== categoryId) return false;
    if (paymentMethodId && tx.paymentMethodId !== paymentMethodId) return false;
    if (creditCardId && tx.creditCardId !== creditCardId) return false;
    if (tag && !tx.tags.includes(tag)) return false;
    if (from && tx.date < from) return false;
    if (to && tx.date > to) return false;
    if (search) {
      const haystack = [tx.description, tx.notes ?? '', tx.tags.join(' ')].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return sortByDateTimeDesc(filtered);
}

/** Totales agregados de un mes (ingresos, gastos, balance, número de movimientos). */
export async function monthlyTotals(yearMonth: YearMonth): Promise<MonthlyTotals> {
  const rows = await db.transactions.where('yearMonth').equals(yearMonth).toArray();
  const income = sumCents(rows.filter((r) => r.type === 'income').map((r) => r.amount));
  const expense = sumCents(rows.filter((r) => r.type === 'expense').map((r) => r.amount));
  return {
    income,
    expense,
    balance: asCents(income - expense),
    count: rows.length,
  };
}

/** Método de pago usado más recientemente (para el valor por defecto del quick-add). */
export async function lastUsedPaymentMethodId(): Promise<PaymentMethodId | undefined> {
  const recent = await db.transactions
    .orderBy('date')
    .reverse()
    .filter((tx) => tx.paymentMethodId !== undefined)
    .first();
  return recent?.paymentMethodId;
}

// --- Escrituras -----------------------------------------------------------

async function assertReferences(data: {
  categoryId: string;
  paymentMethodId?: string | undefined;
  creditCardId?: string | undefined;
}): Promise<void> {
  const category = await db.categories.get(data.categoryId);
  if (!category) throw new NotFoundError('Categoría', data.categoryId);
  if (data.paymentMethodId) {
    const method = await db.paymentMethods.get(data.paymentMethodId);
    if (!method) throw new NotFoundError('Método de pago', data.paymentMethodId);
  }
  if (data.creditCardId) {
    const card = await db.creditCards.get(data.creditCardId);
    if (!card) throw new NotFoundError('Tarjeta', data.creditCardId);
  }
}

export async function createTransaction(input: TransactionCreateInput): Promise<TransactionRow> {
  const data = parseOrThrow(transactionCreateSchema, input);
  const timestamp = nowIso();

  const row: TransactionRow = {
    id: newId<TransactionId>(),
    type: data.type,
    amount: asCents(data.amount),
    date: data.date as IsoDate,
    yearMonth: toYearMonth(data.date as IsoDate),
    categoryId: data.categoryId as CategoryId,
    description: data.description,
    tags: data.tags,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(data.time !== undefined && { time: data.time }),
    ...(data.paymentMethodId !== undefined && {
      paymentMethodId: data.paymentMethodId as PaymentMethodId,
    }),
    ...(data.creditCardId !== undefined && {
      creditCardId: data.creditCardId as CreditCardId,
    }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.attachmentId !== undefined && {
      attachmentId: data.attachmentId as AttachmentId,
    }),
  };

  await db.transaction(
    'rw',
    db.transactions,
    db.categories,
    db.paymentMethods,
    db.creditCards,
    db.tags,
    async () => {
      await assertReferences(data);
      await ensureTagsExist(data.tags);
      await db.transactions.add(row);
    },
  );

  return row;
}

/**
 * Alta rápida de gasto (< 5 s). Completa fecha/hora = ahora y método de pago =
 * el último usado si no se indica otro (features.md F03).
 */
export async function createQuickExpense(input: QuickExpenseInput): Promise<TransactionRow> {
  const data = parseOrThrow(quickExpenseSchema, input);
  const paymentMethodId = data.paymentMethodId ?? (await lastUsedPaymentMethodId());

  return createTransaction({
    type: 'expense',
    amount: data.amount,
    date: todayIso(),
    time: currentTime(),
    categoryId: data.categoryId,
    description: data.description,
    tags: [],
    ...(paymentMethodId !== undefined && { paymentMethodId }),
  });
}

export async function updateTransaction(
  id: TransactionId,
  input: TransactionUpdateInput,
): Promise<void> {
  const data = parseOrThrow(transactionUpdateSchema, input);
  await getTransaction(id);

  const patch: Partial<TransactionRow> = {
    updatedAt: nowIso(),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.amount !== undefined && { amount: asCents(data.amount) }),
    ...(data.date !== undefined && {
      date: data.date as IsoDate,
      yearMonth: toYearMonth(data.date as IsoDate),
    }),
    ...(data.time !== undefined && { time: data.time }),
    ...(data.categoryId !== undefined && { categoryId: data.categoryId as CategoryId }),
    ...(data.paymentMethodId !== undefined && {
      paymentMethodId: data.paymentMethodId as PaymentMethodId,
    }),
    ...(data.creditCardId !== undefined && {
      creditCardId: data.creditCardId as CreditCardId,
    }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.tags !== undefined && { tags: data.tags }),
    ...(data.attachmentId !== undefined && {
      attachmentId: data.attachmentId as AttachmentId,
    }),
  };

  await db.transaction('rw', db.transactions, db.tags, async () => {
    if (data.tags !== undefined) await ensureTagsExist(data.tags);
    await db.transactions.update(id, patch);
  });
}

/** Enlaza o desenlaza el comprobante de un movimiento (null = quitar). */
export async function setTransactionAttachment(
  id: TransactionId,
  attachmentId: AttachmentId | null,
): Promise<void> {
  await db.transactions
    .where('id')
    .equals(id)
    .modify((tx) => {
      if (attachmentId) {
        tx.attachmentId = attachmentId;
      } else {
        delete tx.attachmentId;
      }
      tx.updatedAt = nowIso();
    });
}

export async function deleteTransaction(id: TransactionId): Promise<void> {
  await db.transaction('rw', db.transactions, db.attachments, async () => {
    await deleteAttachmentByTransaction(id);
    await db.transactions.delete(id);
  });
}
