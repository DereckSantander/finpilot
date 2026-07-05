import { asCents, type Cents } from '@/types/money';
import type { Compounding } from '@/db/schema';

/**
 * Fórmulas de interés para el simulador de depósitos a plazo (pólizas, F09).
 * Funciones puras. El capital se maneja en centavos (`Cents`) y las tasas como
 * decimal anual (0.085 = 8.5 %). Ver features.md §F09.
 *
 *   Capitalización periódica: A = P·(1 + r/n)^(n·t)
 *   A vencimiento (simple):   A = P·(1 + r·t)
 */

/** Periodos de capitalización por año según la periodicidad. */
export function periodsPerYear(compounding: Compounding): number {
  switch (compounding) {
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'semiannual':
      return 2;
    case 'annual':
      return 1;
    case 'atMaturity':
      // No capitaliza: el interés se liquida una sola vez al vencimiento.
      return 1;
  }
}

/** Etiqueta legible de cada periodicidad (UI). */
export const COMPOUNDING_LABELS: Record<Compounding, string> = {
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  atMaturity: 'Al vencimiento',
};

/** Saldo bruto (sin redondear) del depósito tras `years` años. */
function depositBalance(
  principal: number,
  annualRate: number,
  years: number,
  compounding: Compounding,
): number {
  if (compounding === 'atMaturity') {
    return principal * (1 + annualRate * years);
  }
  const n = periodsPerYear(compounding);
  return principal * Math.pow(1 + annualRate / n, n * years);
}

export interface DepositResult {
  principal: Cents;
  finalAmount: Cents;
  /** Intereses ganados = monto final − capital. */
  interest: Cents;
  /** Rentabilidad total sobre el capital (0.12 = 12 %). */
  roi: number;
  /** Tasa efectiva anual equivalente (APY). */
  effectiveAnnualRate: number;
}

/**
 * Simula un depósito a plazo fijo y devuelve monto final, intereses,
 * rentabilidad total y tasa efectiva anual.
 */
export function simulateDeposit(params: {
  principal: number; // centavos
  annualRate: number; // decimal
  termMonths: number;
  compounding: Compounding;
}): DepositResult {
  const { principal, annualRate, termMonths, compounding } = params;
  const years = termMonths / 12;

  const finalRaw = depositBalance(principal, annualRate, years, compounding);
  const roundedFinal = asCents(Math.round(finalRaw));
  const roundedPrincipal = asCents(Math.round(principal));
  const interest = asCents(roundedFinal - roundedPrincipal);

  const roi = principal > 0 ? (finalRaw - principal) / principal : 0;
  const effectiveAnnualRate =
    principal > 0 && years > 0 ? Math.pow(finalRaw / principal, 1 / years) - 1 : 0;

  return {
    principal: roundedPrincipal,
    finalAmount: roundedFinal,
    interest,
    roi,
    effectiveAnnualRate,
  };
}

export interface DepositPoint {
  month: number;
  label: string;
  value: Cents;
}

/**
 * Serie del saldo del depósito mes a mes (para graficar la curva de crecimiento).
 * Evalúa la misma fórmula que `simulateDeposit` en cada mes del plazo.
 */
export function depositSchedule(params: {
  principal: number; // centavos
  annualRate: number;
  termMonths: number;
  compounding: Compounding;
}): DepositPoint[] {
  const { principal, annualRate, termMonths, compounding } = params;
  const points: DepositPoint[] = [];
  for (let month = 0; month <= termMonths; month += 1) {
    const raw = depositBalance(principal, annualRate, month / 12, compounding);
    points.push({
      month,
      label: month === 0 ? 'Inicio' : `Mes ${month}`,
      value: asCents(Math.round(raw)),
    });
  }
  return points;
}
