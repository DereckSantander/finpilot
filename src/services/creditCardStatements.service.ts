import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { asCents, ZERO_CENTS } from '@/types/money';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  statementCreateSchema,
  statementUpdateSchema,
  type StatementCreateInput,
  type StatementUpdateInput,
} from '@/lib/validation/creditCards.schema';
import { NotFoundError } from '@/lib/errors';
import type { CreditCardStatementRow } from '@/db/schema';
import type { CreditCardId, CreditCardStatementId } from '@/types/ids';
import type { IsoDate, YearMonth } from '@/types/common';

/** CRUD de cortes mensuales de tarjeta (historial). */

export function statementsByCardQuery(
  creditCardId: CreditCardId,
): Promise<CreditCardStatementRow[]> {
  return db.creditCardStatements
    .where('creditCardId')
    .equals(creditCardId)
    .reverse()
    .sortBy('yearMonth');
}

export async function getStatement(id: CreditCardStatementId): Promise<CreditCardStatementRow> {
  const row = await db.creditCardStatements.get(id);
  if (!row) throw new NotFoundError('Corte de tarjeta', id);
  return row;
}

export async function createStatement(
  input: StatementCreateInput,
): Promise<CreditCardStatementRow> {
  const data = parseOrThrow(statementCreateSchema, input);
  const timestamp = nowIso();

  const row: CreditCardStatementRow = {
    id: newId<CreditCardStatementId>(),
    creditCardId: data.creditCardId as CreditCardId,
    yearMonth: data.yearMonth as YearMonth,
    cutoffDate: data.cutoffDate as IsoDate,
    dueDate: data.dueDate as IsoDate,
    statementBalance: asCents(data.statementBalance),
    minimumPayment: asCents(data.minimumPayment),
    paidAmount: ZERO_CENTS,
    status: data.status ?? 'open',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.creditCardStatements.add(row);
  return row;
}

export async function updateStatement(
  id: CreditCardStatementId,
  input: StatementUpdateInput,
): Promise<void> {
  const data = parseOrThrow(statementUpdateSchema, input);
  await getStatement(id);

  const patch: Partial<CreditCardStatementRow> = {
    updatedAt: nowIso(),
    ...(data.yearMonth !== undefined && { yearMonth: data.yearMonth as YearMonth }),
    ...(data.cutoffDate !== undefined && { cutoffDate: data.cutoffDate as IsoDate }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate as IsoDate }),
    ...(data.statementBalance !== undefined && {
      statementBalance: asCents(data.statementBalance),
    }),
    ...(data.minimumPayment !== undefined && { minimumPayment: asCents(data.minimumPayment) }),
    ...(data.paidAmount !== undefined && { paidAmount: asCents(data.paidAmount) }),
    ...(data.status !== undefined && { status: data.status }),
  };
  await db.creditCardStatements.update(id, patch);
}

export async function deleteStatement(id: CreditCardStatementId): Promise<void> {
  await db.transaction('rw', db.creditCardStatements, db.creditCardPayments, async () => {
    await db.creditCardPayments
      .where('statementId')
      .equals(id)
      .modify((p) => {
        delete p.statementId;
      });
    await db.creditCardStatements.delete(id);
  });
}
