import { describe, it, expect, beforeEach } from 'vitest';
import { addAttachment, attachmentByTransactionQuery } from '@/services/attachments.service';
import { db } from '@/db/db';
import { resetDb, addTransactionRow } from '@/test/seed';
import { ValidationError } from '@/lib/errors';
import { MAX_ATTACHMENT_BYTES } from '@/constants/config';
import type { TransactionId } from '@/types/ids';

/** Blob de `size` bytes con el tipo indicado. */
const blobOf = (size: number, type: string) => new Blob([new Uint8Array(size)], { type });

describe('comprobantes adjuntos', () => {
  let txId: TransactionId;

  beforeEach(async () => {
    await resetDb();
    txId = await addTransactionRow({ type: 'expense', amount: 10_000, date: '2026-07-05' });
  });

  it('acepta una imagen dentro del límite', async () => {
    const id = await addAttachment(txId, blobOf(1024, 'image/png'));

    const row = await db.attachments.get(id);
    expect(row?.mimeType).toBe('image/png');
    expect(row?.sizeBytes).toBe(1024);
    expect((await attachmentByTransactionQuery(txId))?.id).toBe(id);
  });

  it('rechaza lo que no es una imagen', async () => {
    await expect(addAttachment(txId, blobOf(1024, 'application/pdf'))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await db.attachments.count()).toBe(0);
  });

  it('rechaza un archivo por encima del tamaño máximo', async () => {
    const tooBig = { size: MAX_ATTACHMENT_BYTES + 1, type: 'image/png' } as Blob;

    await expect(addAttachment(txId, tooBig)).rejects.toBeInstanceOf(ValidationError);
    expect(await db.attachments.count()).toBe(0);
  });

  it('rechaza un archivo vacío', async () => {
    await expect(addAttachment(txId, blobOf(0, 'image/png'))).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('el tipo explícito prevalece sobre el del blob', async () => {
    const id = await addAttachment(txId, blobOf(512, ''), 'image/jpeg');
    expect((await db.attachments.get(id))?.mimeType).toBe('image/jpeg');
  });
});
