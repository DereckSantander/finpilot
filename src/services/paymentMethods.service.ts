import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  paymentMethodCreateSchema,
  paymentMethodUpdateSchema,
  type PaymentMethodCreateInput,
  type PaymentMethodUpdateInput,
} from '@/lib/validation/catalog.schema';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { PaymentMethodRow } from '@/db/schema';
import type { PaymentMethodId, CreditCardId } from '@/types/ids';

/** CRUD de métodos de pago. */

export function paymentMethodsQuery(): Promise<PaymentMethodRow[]> {
  return db.paymentMethods.filter((m) => !m.isArchived).toArray();
}

export function allPaymentMethodsQuery(): Promise<PaymentMethodRow[]> {
  return db.paymentMethods.toArray();
}

export async function getPaymentMethod(id: PaymentMethodId): Promise<PaymentMethodRow> {
  const row = await db.paymentMethods.get(id);
  if (!row) throw new NotFoundError('Método de pago', id);
  return row;
}

export async function createPaymentMethod(
  input: PaymentMethodCreateInput,
): Promise<PaymentMethodRow> {
  const data = parseOrThrow(paymentMethodCreateSchema, input);
  const timestamp = nowIso();

  const row: PaymentMethodRow = {
    id: newId<PaymentMethodId>(),
    name: data.name,
    type: data.type,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(data.creditCardId !== undefined && {
      creditCardId: data.creditCardId as CreditCardId,
    }),
  };

  await db.paymentMethods.add(row);
  return row;
}

export async function updatePaymentMethod(
  id: PaymentMethodId,
  input: PaymentMethodUpdateInput,
): Promise<void> {
  const data = parseOrThrow(paymentMethodUpdateSchema, input);
  await getPaymentMethod(id);

  const patch: Partial<PaymentMethodRow> = {
    updatedAt: nowIso(),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.type !== undefined && { type: data.type }),
    ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
    ...(data.creditCardId !== undefined && {
      creditCardId: data.creditCardId as CreditCardId,
    }),
  };
  await db.paymentMethods.update(id, patch);
}

export async function archivePaymentMethod(id: PaymentMethodId, archived = true): Promise<void> {
  await getPaymentMethod(id);
  await db.paymentMethods.update(id, { isArchived: archived, updatedAt: nowIso() });
}

export function countPaymentMethodUsage(id: PaymentMethodId): Promise<number> {
  return db.transactions.where('paymentMethodId').equals(id).count();
}

/**
 * Elimina un método de pago. Si está en uso, por defecto se bloquea; con
 * `detachTransactions` se desvincula de los movimientos (quedan sin método).
 */
export async function deletePaymentMethod(
  id: PaymentMethodId,
  options: { detachTransactions?: boolean } = {},
): Promise<void> {
  await getPaymentMethod(id);
  await db.transaction('rw', db.transactions, db.paymentMethods, async () => {
    const usage = await db.transactions.where('paymentMethodId').equals(id).count();
    if (usage > 0) {
      if (!options.detachTransactions) {
        throw new ConflictError(`El método de pago está en uso por ${usage} movimiento(s).`);
      }
      await db.transactions
        .where('paymentMethodId')
        .equals(id)
        .modify((tx) => {
          delete tx.paymentMethodId;
          tx.updatedAt = nowIso();
        });
    }
    await db.paymentMethods.delete(id);
  });
}
