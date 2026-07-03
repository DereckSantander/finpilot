import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { sumCents } from '@/lib/money';
import { asCents, ZERO_CENTS } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  cardPaymentCreateSchema,
  type CardPaymentCreateInput,
} from '@/lib/validation/creditCards.schema';
import { NotFoundError } from '@/lib/errors';
import type { CreditCardPaymentRow, StatementStatus } from '@/db/schema';
import type { CreditCardId, CreditCardPaymentId, CreditCardStatementId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

/** CRUD de pagos de tarjeta. Mantiene sincronizado el `paidAmount`/estado del corte. */

export function paymentsByCardQuery(creditCardId: CreditCardId): Promise<CreditCardPaymentRow[]> {
  return db.creditCardPayments.where('creditCardId').equals(creditCardId).reverse().sortBy('date');
}

/** Recalcula el importe pagado y el estado de un corte a partir de sus pagos. */
async function recomputeStatement(statementId: CreditCardStatementId): Promise<void> {
  const statement = await db.creditCardStatements.get(statementId);
  if (!statement) return;

  const payments = await db.creditCardPayments.where('statementId').equals(statementId).toArray();
  const paid = sumCents(payments.map((p) => p.amount));

  let status: StatementStatus;
  if (paid >= statement.statementBalance && statement.statementBalance > 0) {
    status = 'paid';
  } else if (paid > 0) {
    status = 'partial';
  } else {
    status = statement.status === 'overdue' ? 'overdue' : 'open';
  }

  await db.creditCardStatements.update(statementId, {
    paidAmount: paid,
    status,
    updatedAt: nowIso(),
  });
}

export async function createCardPayment(
  input: CardPaymentCreateInput,
): Promise<CreditCardPaymentRow> {
  const data = parseOrThrow(cardPaymentCreateSchema, input);

  const row: CreditCardPaymentRow = {
    id: newId<CreditCardPaymentId>(),
    creditCardId: data.creditCardId as CreditCardId,
    amount: asCents(data.amount),
    date: data.date as IsoDate,
    createdAt: nowIso(),
    ...(data.statementId !== undefined && {
      statementId: data.statementId as CreditCardStatementId,
    }),
  };

  await db.transaction(
    'rw',
    [db.creditCardPayments, db.creditCardStatements, db.creditCards],
    async () => {
      const card = await db.creditCards.get(row.creditCardId);
      if (!card) throw new NotFoundError('Tarjeta', row.creditCardId);
      await db.creditCardPayments.add(row);
      if (row.statementId) await recomputeStatement(row.statementId);
    },
  );

  return row;
}

export async function deleteCardPayment(id: CreditCardPaymentId): Promise<void> {
  await db.transaction('rw', db.creditCardPayments, db.creditCardStatements, async () => {
    const payment = await db.creditCardPayments.get(id);
    if (!payment) return;
    await db.creditCardPayments.delete(id);
    if (payment.statementId) await recomputeStatement(payment.statementId);
  });
}

/** Total pagado de una tarjeta (todos los pagos registrados). */
export async function totalPaidByCard(creditCardId: CreditCardId) {
  const payments = await db.creditCardPayments.where('creditCardId').equals(creditCardId).toArray();
  return payments.length > 0 ? sumCents(payments.map((p) => p.amount)) : ZERO_CENTS;
}
