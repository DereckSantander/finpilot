/**
 * Construcción de parches de actualización para Dexie.
 *
 * Cada `updateX` de los servicios repetía la misma cadena a mano:
 *
 *   ...(data.name !== undefined && { name: data.name }),
 *   ...(data.amount !== undefined && { amount: asCents(data.amount) }),
 *
 * Diez servicios, diez copias. `buildPatch` lo declara una vez, y el mapeo de
 * campos es **obligatorio**: añadir un campo al esquema de entrada y olvidar
 * aplicarlo deja de compilar en lugar de perderse en silencio.
 */

/** Convierte el valor de entrada al tipo de la fila (p. ej. `asCents`). */
export type FieldConverter<In, Out> = (value: NonNullable<In>) => Out;

/**
 * Mapa de conversión por campo. `true` copia el valor tal cual; una función lo
 * transforma. El `-?` obliga a cubrir **todas** las claves comunes entre la
 * entrada y la fila.
 */
export type PatchSpec<Row, Input> = {
  [K in Extract<keyof Input, keyof Row>]-?: true | FieldConverter<Input[K], Row[K]>;
};

export interface BuiltPatch<Row> {
  /** Campos a escribir. */
  patch: Partial<Row>;
  /**
   * Campos enviados como `null`, es decir, a **borrar**. Dexie no elimina
   * propiedades vía `update` (asignar `undefined` no las quita), así que el
   * llamante debe hacer `delete` sobre la fila dentro de un `modify`.
   */
  unset: (keyof Row)[];
}

/**
 * Copia al parche solo los campos **definidos** de `input`, aplicando la
 * conversión declarada en `spec`.
 *
 * Convenciones, iguales a las que ya seguían los servicios a mano:
 * - `undefined` significa "no tocar este campo".
 * - `null` significa "borrar este campo" y se acumula en `unset`.
 */
export function buildPatch<Row extends object, Input extends object>(
  input: Input,
  spec: PatchSpec<Row, Input>,
): BuiltPatch<Row> {
  const patch: Partial<Row> = {};
  const unset: (keyof Row)[] = [];

  for (const key of Object.keys(spec) as (keyof Input & keyof Row)[]) {
    if (!(key in input)) continue;

    const value = input[key];
    if (value === undefined) continue;

    if (value === null) {
      unset.push(key);
      continue;
    }

    const converter = spec[key as Extract<keyof Input, keyof Row>];
    patch[key] = (
      converter === true ? value : (converter as FieldConverter<unknown, Row[typeof key]>)(value)
    ) as Row[typeof key];
  }

  return { patch, unset };
}
