import { toast } from 'sonner';
import { toAppError, type AppError } from '@/lib/errors';

/** Mensajes legibles por código de error de dominio. */
const messageByCode: Record<AppError['code'], string> = {
  VALIDATION: 'Revisa los datos ingresados.',
  NOT_FOUND: 'No se encontró el registro solicitado.',
  CONFLICT: 'La operación entra en conflicto con datos existentes.',
  QUOTA_EXCEEDED: 'Se agotó el espacio de almacenamiento. Exporta un respaldo y libera espacio.',
  BACKUP: 'Ocurrió un problema con el respaldo.',
  UNKNOWN: 'Ocurrió un error inesperado.',
};

/**
 * Convierte cualquier error en un toast legible y lo registra en consola.
 * Punto único de manejo de errores para la capa de UI (ADR-0006).
 */
export function handleError(error: unknown, fallbackTitle?: string): AppError {
  const appError = toAppError(error);
  const description = appError.message || messageByCode[appError.code];
  toast.error(fallbackTitle ?? messageByCode[appError.code], { description });
  console.error('[FinPilot]', appError.code, appError.message, appError.cause);
  return appError;
}
