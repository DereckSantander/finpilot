import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { parseOrThrow } from '@/lib/validation/parse';
import { attachmentCreateSchema } from '@/lib/validation/attachments.schema';
import { NotFoundError, QuotaExceededError } from '@/lib/errors';
import type { AttachmentRow } from '@/db/schema';
import type { AttachmentId, TransactionId } from '@/types/ids';

/**
 * Comprobantes (fotos) de los movimientos, guardados como `Blob` en su propia
 * tabla para no penalizar las lecturas de `transactions` (database.md §3.6).
 */

export async function getAttachment(id: AttachmentId): Promise<AttachmentRow> {
  const row = await db.attachments.get(id);
  if (!row) throw new NotFoundError('Comprobante', id);
  return row;
}

export function attachmentByTransactionQuery(
  transactionId: TransactionId,
): Promise<AttachmentRow | undefined> {
  return db.attachments.where('transactionId').equals(transactionId).first();
}

/** Comprueba (best-effort) que hay espacio antes de escribir un blob grande. */
async function assertStorageAvailable(bytes: number): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return;
  const { quota, usage } = await navigator.storage.estimate();
  if (typeof quota === 'number' && typeof usage === 'number' && quota - usage < bytes * 1.2) {
    throw new QuotaExceededError();
  }
}

/**
 * Crea un comprobante asociado a un movimiento. Valida tipo (imagen) y tamaño.
 * Devuelve el id para enlazarlo en `transaction.attachmentId`.
 */
export async function addAttachment(
  transactionId: TransactionId,
  file: Blob,
  mimeType?: string,
): Promise<AttachmentId> {
  const type = mimeType ?? file.type;
  parseOrThrow(attachmentCreateSchema, {
    transactionId,
    mimeType: type,
    sizeBytes: file.size,
  });

  // La cuota es un chequeo del entorno, no de la forma del dato: se queda fuera
  // del esquema a propósito.
  await assertStorageAvailable(file.size);

  const row: AttachmentRow = {
    id: newId<AttachmentId>(),
    transactionId,
    blob: file,
    mimeType: type,
    sizeBytes: file.size,
    createdAt: nowIso(),
  };
  await db.attachments.add(row);
  return row.id;
}

export async function deleteAttachment(id: AttachmentId): Promise<void> {
  await db.attachments.delete(id);
}

/** Elimina el comprobante de un movimiento (si existe). */
export async function deleteAttachmentByTransaction(transactionId: TransactionId): Promise<void> {
  await db.attachments.where('transactionId').equals(transactionId).delete();
}
