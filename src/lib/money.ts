import { asCents, ZERO_CENTS, type Cents } from '@/types/money';

/**
 * Aritmética monetaria segura sobre enteros (centavos). Decisión DEC-A:
 * helper propio ligero en lugar de una librería externa. Ver ADR-0004.
 *
 * Regla de oro: NUNCA operar dinero con floats. Convertir a `Cents` en el borde
 * de entrada y a `number`/string solo para presentación.
 */

/** Convierte unidades (p. ej. 12.34) a centavos (1234), redondeando al centavo. */
export function toCents(amount: number): Cents {
  if (!Number.isFinite(amount)) {
    throw new TypeError(`toCents recibió un valor no finito: ${amount}`);
  }
  return asCents(Math.round(amount * 100));
}

/** Convierte centavos (1234) a unidades numéricas (12.34). Solo para formateo. */
export function fromCents(cents: Cents): number {
  return cents / 100;
}

/** Parsea un texto introducido por el usuario ("1.234,56" o "1234.56") a centavos. */
export function parseCents(input: string): Cents {
  const normalized = input
    .trim()
    .replace(/\s/g, '')
    .replace(/[^0-9.,-]/g, '');
  if (normalized === '' || normalized === '-') return ZERO_CENTS;

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');
  let cleaned: string;

  if (lastComma > lastDot) {
    // Formato con coma decimal: "1.234,56"
    cleaned = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato con punto decimal: "1,234.56"
    cleaned = normalized.replace(/,/g, '');
  }

  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new TypeError(`No se pudo interpretar el monto: "${input}"`);
  }
  return toCents(value);
}

export function addCents(a: Cents, b: Cents): Cents {
  return asCents(a + b);
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return asCents(a - b);
}

export function negateCents(a: Cents): Cents {
  return asCents(-a);
}

export function absCents(a: Cents): Cents {
  return asCents(Math.abs(a));
}

/** Suma una lista de importes. */
export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce<Cents>((acc, v) => asCents(acc + v), ZERO_CENTS);
}

/** Multiplica un importe por un factor real, redondeando al centavo. */
export function multiplyCents(cents: Cents, factor: number): Cents {
  return asCents(Math.round(cents * factor));
}

/** Devuelve `percent`% (0–100) de un importe. */
export function percentOfCents(cents: Cents, percent: number): Cents {
  return multiplyCents(cents, percent / 100);
}

/**
 * Ratio entre dos importes (0–1). Devuelve 0 si el total es 0 para evitar
 * divisiones por cero en indicadores (p. ej. utilización de cupo).
 */
export function ratioCents(part: Cents, total: Cents): number {
  if (total === 0) return 0;
  return part / total;
}

export function isZeroCents(a: Cents): boolean {
  return a === 0;
}

export function isNegativeCents(a: Cents): boolean {
  return a < 0;
}
