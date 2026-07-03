/**
 * Tipo monetario de FinPilot.
 *
 * Todo el dinero se representa como un entero en la unidad mínima (centavos),
 * mediante un *branded type* que impide mezclarlo accidentalmente con un
 * `number` cualquiera. Ver ADR-0004.
 *
 *   1234 (Cents)  ⇔  12.34 (unidades)
 */
export type Cents = number & { readonly __brand: 'Cents' };

/** Construye un valor `Cents` a partir de un entero ya en centavos. */
export function asCents(value: number): Cents {
  if (!Number.isInteger(value)) {
    throw new TypeError(`asCents espera un entero de centavos, recibió: ${value}`);
  }
  return value as Cents;
}

/** Valor cero reutilizable. */
export const ZERO_CENTS = 0 as Cents;
