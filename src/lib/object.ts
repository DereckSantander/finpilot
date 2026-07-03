/**
 * Utilidades de objetos.
 *
 * `stripUndefined` elimina las claves cuyo valor es `undefined` y devuelve un
 * `Partial<T>`. Es útil con `exactOptionalPropertyTypes` para construir *patches*
 * de actualización sin fijar propiedades opcionales a `undefined`.
 */
export function stripUndefined<T extends object>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as { [K in keyof T]?: Exclude<T[K], undefined> };
}
