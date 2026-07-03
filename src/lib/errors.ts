/**
 * Jerarquía de errores de dominio (ADR-0006).
 *
 * Los `services` lanzan subclases de `AppError`; la UI nunca ve errores crudos
 * de Dexie/IndexedDB. `handleError` los mapea a mensajes legibles.
 */

export type AppErrorCode =
  'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'QUOTA_EXCEEDED' | 'BACKUP' | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (cause !== undefined) this.cause = cause;
    // Mantiene la cadena de prototipos correcta al transpilar a ES5/ES6.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  readonly issues?: readonly string[];
  constructor(message: string, issues?: readonly string[], cause?: unknown) {
    super('VALIDATION', message, cause);
    this.name = 'ValidationError';
    if (issues !== undefined) this.issues = issues;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', id ? `${entity} no encontrado (id: ${id})` : `${entity} no encontrado`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('CONFLICT', message, cause);
    this.name = 'ConflictError';
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = 'Se alcanzó el límite de almacenamiento local.', cause?: unknown) {
    super('QUOTA_EXCEEDED', message, cause);
    this.name = 'QuotaExceededError';
  }
}

export class BackupError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('BACKUP', message, cause);
    this.name = 'BackupError';
  }
}

/** Normaliza cualquier valor lanzado a un `AppError`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    // Cuota de IndexedDB / almacenamiento.
    if (error.name === 'QuotaExceededError') {
      return new QuotaExceededError(undefined, error);
    }
    return new AppError('UNKNOWN', error.message, error);
  }
  return new AppError('UNKNOWN', 'Ocurrió un error inesperado.', error);
}
