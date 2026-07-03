import type { z } from 'zod';
import { ValidationError } from '@/lib/errors';

/**
 * Parsea `data` con `schema` y devuelve el valor tipado, o lanza `ValidationError`
 * con la lista de problemas. Es el único punto donde los servicios validan la
 * entrada antes de escribir en la base de datos (ADR-0003, ADR-0006).
 */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    throw new ValidationError('Los datos no son válidos.', issues);
  }
  return result.data;
}
