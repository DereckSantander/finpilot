import { z } from 'zod';
import { MAX_ATTACHMENT_BYTES } from '@/constants/config';
import { zNonEmptyString } from '@/lib/validation/primitives';

/**
 * Esquema de comprobantes adjuntos (ADR-0003: Zod es la única fuente de verdad
 * de la validación). Antes este servicio validaba con `if` imperativos, siendo
 * el único que se salía de la convención.
 *
 * Nota: la comprobación de cuota de almacenamiento **no** vive aquí. Es un
 * chequeo del entorno (cuánto espacio queda en el dispositivo), no de la forma
 * del dato, así que sigue siendo imperativa en el servicio.
 */

const MAX_MB = (MAX_ATTACHMENT_BYTES / (1024 * 1024)).toFixed(0);

export const attachmentCreateSchema = z.object({
  transactionId: zNonEmptyString,
  mimeType: z.string().startsWith('image/', { message: 'El comprobante debe ser una imagen.' }),
  sizeBytes: z
    .number()
    .int()
    .positive({ message: 'El comprobante está vacío.' })
    .max(MAX_ATTACHMENT_BYTES, {
      message: `El comprobante supera el tamaño máximo (${MAX_MB} MB).`,
    }),
});

export type AttachmentCreateInput = z.input<typeof attachmentCreateSchema>;
