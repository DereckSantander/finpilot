import { nanoid } from 'nanoid';

/**
 * Generador de IDs de entidad. Devuelve un string opaco; el llamador lo castea
 * al branded id correspondiente (p. ej. `newId<GoalId>()`).
 */
export function newId<T extends string = string>(): T {
  return nanoid(16) as T;
}
